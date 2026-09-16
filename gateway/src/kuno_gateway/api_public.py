"""Customer-facing API. Everything a client sends here is ciphertext except pricing parameters."""

from __future__ import annotations

import asyncio
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select

from kuno_protocol.canonical import b64d
from kuno_protocol.profiles import Mode, ModelProfile, ParamError, PrivacyModeUnavailable, validate_params
from kuno_protocol.receipts import Receipt, verify_receipt
from kuno_protocol.schemas import GenerationParams, JobCreate, JobState, JobStatus, PrivacyMode, RouteResponse
from kuno_protocol.switch import RouteError, resolve_route
from sqlalchemy.orm import Session

from . import admission, identity, ledger, moderation, standard_jobs, webhooks
from .auth import SignedIn, gw, require_account, require_user
from .db import NEVER_EXPIRES, Account, Blob, Enclave, Job, LedgerEntry
from .state import GatewayState, enclave_public, job_status

router = APIRouter(prefix="/v1", tags=["public"])

BLOB_MAGIC = b"KUNOB1"


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


@router.get("/models")
async def list_models(request: Request):
    state = gw(request)
    country = state.country(request)
    switch = state.switch.config
    with state.session() as s:
        workers = state.capacity_counts(s)
        # Distinct attested workers: one worker serving six profiles counts once here.
        workers_online = len(state.fresh_enclaves(s))
    return {
        "country": country,
        "workers_online": workers_online,
        "switch": switch.model_dump(mode="json"),
        # Every price is a placeholder until the owner sets real pricing (STANDARD_MODE.md, PAYMENTS.md).
        "pricing_placeholder": True,
        "models": [
            {
                # `pricing.usd_per_second` is the Private price; `pricing.standard_usd_per_second` is null where the
                # profile is Private-only, and `privacy_modes` says the same in words.
                **profile.model_dump(mode="json"),
                "privacy_modes": profile.privacy_modes,
                "enabled": switch.profile_enabled(profile),
                "available_in_region": switch.region_allows(profile, country),
                "workers": workers.get(profile.id, 0),
            }
            for profile in state.profiles.values()
        ],
    }


@router.get("/manifest")
async def manifest(request: Request):
    return gw(request).manifest.model_dump(mode="json")


@router.get("/landmarks")
async def landmarks(request: Request):
    """The owner-signed landmark list workers ping to prove where they run (kuno_protocol.location)."""
    signed = gw(request).landmarks
    if signed is None:
        raise _error(404, "no_landmarks", "This gateway has no landmark list.")
    return signed.model_dump(mode="json")


@router.get("/manifest/signed")
async def signed_manifest(request: Request):
    """The manifest with the owner's signature, for clients that pin the owner key rather than trust this gateway."""
    signed = gw(request).signed_manifest
    if signed is None:
        raise _error(404, "unsigned_manifest", "This gateway runs an unsigned development manifest; pin a manifest instead.")
    return signed.model_dump(mode="json")


@router.get("/switch")
async def switch(request: Request):
    return gw(request).switch.model_dump(mode="json")


async def optional_account(request: Request) -> Account | None:
    """The account behind the request's credential, if it carries one that works. Routing stays public."""
    if not request.headers.get("authorization", "").lower().startswith("bearer "):
        return None
    try:
        return await require_account(request)
    except HTTPException:
        return None


@router.get("/route", response_model=RouteResponse)
async def route(
    request: Request, mode: Mode, profile_id: str | None = None, family: str | None = None, privacy: PrivacyMode = "private",
    resolution: str | None = None, aspect_ratio: str | None = None, fps: int | None = None, duration_s: float | None = None,
):
    """Candidate enclaves whose tier may run a job in `privacy` mode. With a credential, the account's standing is
    checked too (an anonymous route can't be, and job creation checks it again either way).

    `resolution`, `aspect_ratio`, `fps` and `duration_s` are each optional: given, only enclaves whose serving envelope
    has room for such a request are listed (envelopes.py; an omitted field matches any value), and when workers serve the
    profile but none has room, the answer is 503 no_capacity with the longest duration available. Which profile serves
    (fallbacks) still follows per-profile capacity."""
    from kuno_protocol.envelope import EnvelopeQuery

    from .envelopes import no_fit_error

    fit = EnvelopeQuery(resolution, aspect_ratio, fps, duration_s)
    state = gw(request)
    account = await optional_account(request)
    if account is not None:
        with state.session() as s:
            moderation.enforce(s, state.settings, account, privacy)

    def has_capacity(profile: ModelProfile) -> bool:
        with state.session() as s:
            return bool(standard_jobs.enclaves_for(state, s, profile.id, privacy))

    # Only profiles sold in this mode can serve it, as the request or as a fallback: full H3 and H3 Director are Private-only.
    offered = {pid: p for pid, p in state.profiles.items() if p.offers(privacy)}
    requested = state.profiles.get(profile_id) if profile_id is not None else None
    if requested is not None and profile_id not in offered:
        raise _error(
            422, "privacy_mode_unavailable",
            f"{requested.name} is offered in Private mode only. Use Private mode, or a model that offers Standard.",
        )
    try:
        chosen = resolve_route(offered, state.switch.config, mode, state.country(request), profile_id, family, has_capacity)
    except RouteError as exc:
        if exc.code == "mode_unavailable" and not any(mode in p.modes for p in offered.values()) and any(
            mode in p.modes for p in state.profiles.values()
        ):
            raise _error(422, "privacy_mode_unavailable", f"No model offers {mode.value} in {privacy.capitalize()} mode. Use Private mode.") from None
        raise _error(exc.status, exc.code, exc.message) from None
    with state.session() as s:
        candidates = standard_jobs.enclaves_for(state, s, chosen.profile.id, privacy, fit=None if fit.empty else fit)
        if not candidates and not fit.empty and (available := standard_jobs.enclaves_for(state, s, chosen.profile.id, privacy)):
            raise no_fit_error(chosen.profile, fit, available)
        if account is not None:
            # A client seals to the first attested enclave listed, so the order is the routing (admission.py).
            candidates = admission.order_for_account(
                s, state.settings, candidates, account, profile_ids=admission.family_profile_ids(state.profiles, chosen.profile)
            )
        enclaves = [enclave_public(e) for e in candidates[:5]]
    return RouteResponse(
        profile_id=chosen.profile.id,
        requested_profile_id=chosen.requested_profile_id,
        fallback_reason=chosen.fallback_reason,
        enclaves=enclaves,
    )


@router.post("/blobs", status_code=201)
async def upload_blob(request: Request, account: Account = Depends(require_account)):
    state = gw(request)
    if not account.is_validator and not state.limiter.allow(f"uploads:{account.id}", state.settings.uploads_per_minute, 60):
        raise _error(429, "rate_limited", "Too many uploads in the last minute. Wait a moment and try again.")
    data = await request.body()
    if len(data) > state.settings.max_blob_bytes:
        raise _error(413, "too_large", "Blob exceeds the upload limit.")
    if not data.startswith(BLOB_MAGIC):
        raise _error(400, "not_encrypted", "Uploads must be encrypted with the KunoWorld blob format before sending.")
    blob_id, digest, size = state.blobs.put(data)
    now = time.time()
    with state.session() as s, s.begin():
        s.add(
            Blob(
                id=blob_id,
                owner_kind="account",
                owner_id=account.id,
                size=size,
                sha256=digest,
                created_at=now,
                # Unused uploads expire; job creation makes the blob permanent (until the owner deletes the video).
                expires_at=now + state.settings.upload_ttl_s,
            )
        )
    return {"blob_id": blob_id, "sha256": digest, "size": size}


@router.get("/blobs/{blob_id}")
async def download_blob(blob_id: str, request: Request, account: Account = Depends(require_account)):
    state = gw(request)
    with state.session() as s:
        blob = s.get(Blob, blob_id)
        allowed = blob is not None and (
            (blob.owner_kind == "account" and blob.owner_id == account.id)
            or (blob.job_id is not None and (job := s.get(Job, blob.job_id)) is not None and job.account_id == account.id)
        )
        # An expired blob is gone for its owner even while a preservation hold stops the sweep deleting it.
        allowed = allowed and blob.expires_at > time.time()
    if not allowed:
        raise _error(404, "not_found", "No such blob.")
    from . import byte_ranges

    # Served as stored, with byte ranges (byte_ranges.py): read from the store as it streams, never loaded whole.
    try:
        body = await asyncio.to_thread(byte_ranges.StoredBlob, state.blobs, blob_id)
    except KeyError:
        raise _error(410, "expired", "This blob has expired.") from None
    return byte_ranges.serve(request, body, media_type="application/octet-stream", etag=byte_ranges.strong_etag(blob.sha256))


def check_job_rate(state: GatewayState, account: Account, privacy: str) -> None:
    """Per-account job limits; private jobs also have their own, tighter one. Validators are exempt."""
    if account.is_validator:
        return
    if not state.limiter.allow(f"jobs:{account.id}", state.settings.jobs_per_minute, 60):
        raise _error(429, "rate_limited", "Too many videos started in the last minute. Wait a moment and try again.")
    if privacy == "private" and not state.limiter.allow(f"private-jobs:{account.id}", state.settings.private_jobs_per_minute, 60):
        raise _error(429, "rate_limited", "Too many private videos started in the last minute. Wait a moment and try again.")


async def validate_request(state: GatewayState, request: Request, params: GenerationParams, webhook_url: str | None) -> ModelProfile:
    """The checks every job gets before it is sealed or accepted: webhook, model, params, switch and region."""
    if webhook_url:
        try:
            # Resolves the host, so it runs off the event loop.
            await asyncio.to_thread(webhooks.check_url, webhook_url, state.settings.allow_private_webhooks)
        except webhooks.InvalidWebhookUrl as exc:
            raise _error(422, "invalid_webhook_url", str(exc)) from None
    profile = state.profiles.get(params.profile_id)
    if profile is None:
        raise _error(404, "unknown_model", f"Unknown model profile {params.profile_id!r}.")
    try:
        validate_params(profile, params)
    except ParamError as exc:
        raise _error(422, "invalid_params", str(exc)) from None
    switch = state.switch.config
    if not switch.profile_enabled(profile):
        raise _error(409, "model_disabled", f"{profile.name} is currently switched off. Ask /v1/route for an alternative.")
    if not switch.region_allows(profile, state.country(request)):
        raise _error(451, "region_restricted", f"{profile.name} is not licensed in your region.")
    return profile


def admit_job(
    s: Session, state: GatewayState, account: Account, *, job_id: str, profile: ModelProfile, params: GenerationParams,
    enclave: Enclave, enc: str, ciphertext: str, input_blob_ids: list[str], webhook_url: str | None, privacy: str, now: float,
) -> Job:
    """Charges for and records a job, inside the caller's transaction. Shared by private and standard jobs.

    First it locks the account's row and refuses a closed account, in this transaction, so a job can't be admitted
    while the account is being closed: closure takes the same lock (account_closure.lock_account)."""
    from .account_closure import lock_account

    current = lock_account(state, s, account.id)
    if current is None or current.closed_at is not None:
        raise _error(403, "account_closed", "This account is closed.")
    if s.get(Job, job_id) is not None:
        raise _error(409, "duplicate_job", "A job with this id already exists.")
    from .envelopes import admission_refusal

    # A private client picks its enclave itself: never admit a job the enclave advertised its hardware can't fit.
    if (refused := admission_refusal(enclave, profile, params)) is not None:
        raise refused
    if not account.is_validator:
        active = s.scalar(
            select(func.count())
            .select_from(Job)
            .where(Job.account_id == account.id, Job.status.in_([JobState.QUEUED.value, JobState.RUNNING.value]))
        )
        if active >= state.settings.max_active_jobs:
            raise _error(429, "too_many_active_jobs", f"You already have {active} videos in progress. Wait for one to finish.")
    if webhook_url:
        webhooks.ensure_secret(s.get(Account, account.id))
    try:
        price = profile.price_usd(params, privacy)
    except PrivacyModeUnavailable as exc:
        raise _error(422, "privacy_mode_unavailable", f"{exc}. Use Private mode, or a model that offers Standard.") from None
    except ParamError as exc:
        raise _error(422, "invalid_params", str(exc)) from None
    try:
        ledger.post(
            s, account.id, -ledger.to_micros(price), kind=ledger.CHARGE, source="job",
            idempotency_key=f"charge:{job_id}", job_id=job_id, description=profile.name,
        )
    except ledger.InsufficientBalance as exc:
        balance = ledger.to_usd(exc.balance_micros)
        raise _error(402, "insufficient_balance", f"This video costs ${price:.2f}; your balance is ${balance:.2f}.") from None
    # What real customer money this job earns the network, fixed now: none for a validator's own jobs, else the part of
    # the price the account's paid credit covers. Validators read it in the ledger feed; a refund zeroes it.
    # A dev network's seeded balance counts as paid there (never in production), so dev runs exercise that rule too.
    paid = ledger.paid_share(s, account.id, dev_balances_paid=not state.settings.production)
    billable = 0.0 if account.is_validator else round(price * paid, 6)
    job = Job(
        id=job_id,
        account_id=account.id,
        profile_id=profile.id,
        enclave_id=enclave.id,
        params=params.model_dump_json(),
        enc=enc,
        ciphertext=ciphertext,
        input_blob_ids=json.dumps(input_blob_ids),
        status=JobState.QUEUED.value,
        stage="queued",
        progress=0.0,
        price_usd=price,
        billable_usd=billable,
        webhook_url=webhook_url,
        created_at=now,
        updated_at=now,
        privacy=privacy,
    )
    s.add(job)
    return job


@router.post("/videos", status_code=201, response_model=JobStatus)
async def create_video(body: JobCreate, request: Request, account: Account = Depends(require_account)):
    """A private job, sealed by the client. Needs an eligible account and a confidential-tier enclave."""
    state = gw(request)
    with state.session() as s:
        moderation.enforce(s, state.settings, account, "private")
    check_job_rate(state, account, "private")
    params = body.params
    profile = await validate_request(state, request, params, body.webhook_url)
    if len(body.input_blob_ids) != len(params.input_roles) or len(set(body.input_blob_ids)) != len(body.input_blob_ids):
        raise _error(422, "invalid_inputs", "Each input role needs exactly one distinct uploaded blob.")
    try:
        b64d(body.enc), b64d(body.ciphertext)
    except ValueError:
        raise _error(422, "invalid_envelope", "enc and ciphertext must be base64url.") from None

    now = time.time()
    with state.session() as s, s.begin():
        from .account_closure import lock_account

        # The account's lock before the input blobs below are written, the order closure takes them in, so the two never
        # deadlock on Postgres. admit_job checks the account isn't closed.
        lock_account(state, s, account.id)
        if s.get(Job, body.job_id) is not None:
            raise _error(409, "duplicate_job", "A job with this id already exists.")
        enclave = s.get(Enclave, body.enclave_id)
        if enclave is None or not state.is_fresh(enclave) or profile.id not in json.loads(enclave.profiles):
            raise _error(409, "enclave_unavailable", "That worker is not available for this model. Ask /v1/route again.")
        if not standard_jobs.serves(enclave, "private"):
            raise _error(
                409, "enclave_unavailable",
                "That worker is not a confidential worker, and private jobs run only on confidential workers. Ask /v1/route again.",
            )
        for blob_id in body.input_blob_ids:
            blob = s.get(Blob, blob_id)
            if blob is None or blob.owner_kind != "account" or blob.owner_id != account.id or blob.job_id is not None:
                raise _error(422, "invalid_inputs", f"Blob {blob_id} is unknown, not yours, or already used.")
            if blob.expires_at <= now:
                raise _error(422, "invalid_inputs", f"Blob {blob_id} has expired. Upload it again.")
            blob.job_id = body.job_id
            blob.expires_at = NEVER_EXPIRES
        job = admit_job(
            s, state, account, job_id=body.job_id, profile=profile, params=params, enclave=enclave, enc=body.enc,
            ciphertext=body.ciphertext, input_blob_ids=body.input_blob_ids, webhook_url=body.webhook_url,
            privacy="private", now=now,
        )
    return job_status(job)


@router.get("/videos", response_model=list[JobStatus])
async def list_videos(request: Request, account: Account = Depends(require_account), limit: int = 50):
    with gw(request).session() as s:
        jobs = s.scalars(
            select(Job).where(Job.account_id == account.id).order_by(Job.created_at.desc()).limit(min(limit, 200))
        ).all()
    return [job_status(j) for j in jobs]


@router.get("/videos/{job_id}", response_model=JobStatus)
async def get_video(job_id: str, request: Request, account: Account = Depends(require_account)):
    with gw(request).session() as s:
        job = s.get(Job, job_id)
    if job is None or job.account_id != account.id:
        raise _error(404, "not_found", "No such video job.")
    return job_status(job)


@router.delete("/videos/{job_id}", status_code=204)
async def delete_video(job_id: str, request: Request, account: Account = Depends(require_account)):
    """The owner deletes a video, in either mode (API key or web session). A job still in progress is canceled and
    refunded first. Private: the sealed input and output blobs are deleted. Standard: the video, thumbnail, prompt
    and inputs too. Billing records and receipts stay; content under a preservation hold is hidden but kept."""
    state = gw(request)
    with state.session() as s, s.begin():
        job = s.get(Job, job_id)
        if job is None or job.account_id != account.id:
            raise _error(404, "not_found", "No such video job.")
        now = time.time()
        standard_jobs.delete_for_owner(state, s, job, now)
        # Destroyed now (not kept by a hold): replayed after a database or bucket restore (tombstones.py).
        from . import holds, tombstones

        if not holds.job_held(s, job.id, now):
            tombstones.record(s, tombstones.VIDEO, job.id, account.id, now)
    return Response(status_code=204)


@router.post("/videos/{job_id}/cancel", response_model=JobStatus)
async def cancel_video(job_id: str, request: Request, account: Account = Depends(require_account)):
    state = gw(request)
    with state.session() as s, s.begin():
        job = s.get(Job, job_id)
        if job is None or job.account_id != account.id:
            raise _error(404, "not_found", "No such video job.")
        if not JobState(job.status).terminal:
            state.finish_job(s, job, JobState.CANCELED, "canceled", "Canceled by the customer.")
    return job_status(job)


@router.get("/account")
async def get_account(request: Request, account: Account = Depends(require_account)):
    with gw(request).session() as s:
        current = s.get(Account, account.id)
    return {"account_id": current.id, "name": current.name, "balance_usd": ledger.to_usd(current.balance_micros)}


@router.get("/account/eligibility")
async def get_eligibility(request: Request, account: Account = Depends(require_account)):
    state = gw(request)
    with state.session() as s:
        return moderation.eligibility_json(s, state.settings, s.get(Account, account.id))


@router.get("/me/eligibility")
async def get_my_eligibility(request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    with state.session() as s:
        return moderation.eligibility_json(s, state.settings, s.get(Account, _user_account_id(s, who)))


@router.get("/account/webhook-secret")
async def get_webhook_secret(request: Request, account: Account = Depends(require_account)):
    """The secret that signs this account's webhook deliveries, for verifying them."""
    with gw(request).session() as s, s.begin():
        secret = webhooks.ensure_secret(s.get(Account, account.id))
    return {"secret": secret}


@router.post("/account/webhook-secret/rotate")
async def rotate_webhook_secret(request: Request, account: Account = Depends(require_account)):
    with gw(request).session() as s, s.begin():
        current = s.get(Account, account.id)
        current.webhook_secret = None
        secret = webhooks.ensure_secret(current)
    return {"secret": secret}


# The same secret for the account page, which signs in with the web session rather than a key.


def _user_account_id(s, who: SignedIn) -> str:
    account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise HTTPException(409, {"code": "no_account", "message": "This user has no account yet. Sign in again."})
    return account.id


@router.get("/me/webhook-secret")
async def get_my_webhook_secret(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        secret = webhooks.ensure_secret(s.get(Account, _user_account_id(s, who)))
    return {"secret": secret}


@router.post("/me/webhook-secret/rotate")
async def rotate_my_webhook_secret(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        current = s.get(Account, _user_account_id(s, who))
        current.webhook_secret = None
        secret = webhooks.ensure_secret(current)
    return {"secret": secret}


@router.get("/account/ledger")
async def get_account_ledger(request: Request, account: Account = Depends(require_account), limit: int = 50):
    with gw(request).session() as s:
        entries = s.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.account_id == account.id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(min(max(limit, 1), 200))
        ).all()
    return [ledger.entry_json(e) for e in entries]


@router.get("/provenance/{content_digest}")
async def provenance(content_digest: str, request: Request):
    """Public: given the SHA-256 of a video file, prove which model and attested worker made it."""
    state = gw(request)
    with state.session() as s:
        job = s.scalars(
            select(Job).where(Job.content_digest == content_digest.lower(), Job.status == JobState.SUCCEEDED.value)
        ).first()
        enclave = s.get(Enclave, job.enclave_id) if job else None
    if job is None or enclave is None or not job.receipt:
        raise _error(404, "not_found", "No KunoWorld receipt matches this video.")
    receipt = Receipt.model_validate_json(job.receipt)
    profile = state.profiles.get(job.profile_id)
    return {
        "receipt": receipt.model_dump(mode="json"),
        "signature_valid": verify_receipt(receipt, b64d(enclave.signing_public_key)),
        "model": {
            "id": job.profile_id,
            "name": profile.name if profile else job.profile_id,
            "attribution": profile.license.attribution if profile else None,
        },
        "enclave": {
            "enclave_id": enclave.id,
            "tee": enclave.tee,
            "image_digest": enclave.image_digest,
            "hardware": json.loads(enclave.hardware),
            "evidence": json.loads(enclave.evidence),
            "endorsements": json.loads(enclave.endorsements) if enclave.endorsements else None,
        },
    }
