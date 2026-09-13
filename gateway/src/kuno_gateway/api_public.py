"""Customer-facing API. Everything a client sends here is ciphertext except pricing parameters."""

from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select

from kuno_protocol.canonical import b64d
from kuno_protocol.profiles import Mode, ParamError, validate_params
from kuno_protocol.receipts import Receipt, verify_receipt
from kuno_protocol.schemas import JobCreate, JobState, JobStatus, RouteResponse
from kuno_protocol.switch import RouteError, resolve_route

from . import ledger
from .auth import gw, require_account
from .db import Account, Blob, Enclave, Job, LedgerEntry
from .state import enclave_public, job_status

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
        "models": [
            {
                **profile.model_dump(mode="json"),
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


@router.get("/switch")
async def switch(request: Request):
    return gw(request).switch.model_dump(mode="json")


@router.get("/route", response_model=RouteResponse)
async def route(request: Request, mode: Mode, profile_id: str | None = None, family: str | None = None):
    state = gw(request)
    try:
        chosen = resolve_route(
            state.profiles, state.switch.config, mode, state.country(request), profile_id, family, state.has_capacity
        )
    except RouteError as exc:
        raise _error(exc.status, exc.code, exc.message) from None
    with state.session() as s:
        enclaves = [enclave_public(e) for e in state.fresh_enclaves(s, chosen.profile.id)[:5]]
    return RouteResponse(
        profile_id=chosen.profile.id,
        requested_profile_id=chosen.requested_profile_id,
        fallback_reason=chosen.fallback_reason,
        enclaves=enclaves,
    )


@router.post("/blobs", status_code=201)
async def upload_blob(request: Request, account: Account = Depends(require_account)):
    state = gw(request)
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
                expires_at=now + state.settings.blob_retention_s,
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
    if not allowed:
        raise _error(404, "not_found", "No such blob.")
    try:
        data = state.blobs.get(blob_id)
    except KeyError:
        raise _error(410, "expired", "This blob has expired.") from None
    return Response(content=data, media_type="application/octet-stream")


@router.post("/videos", status_code=201, response_model=JobStatus)
async def create_video(body: JobCreate, request: Request, account: Account = Depends(require_account)):
    state = gw(request)
    params = body.params
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
    if len(body.input_blob_ids) != len(params.input_roles) or len(set(body.input_blob_ids)) != len(body.input_blob_ids):
        raise _error(422, "invalid_inputs", "Each input role needs exactly one distinct uploaded blob.")
    try:
        b64d(body.enc), b64d(body.ciphertext)
    except ValueError:
        raise _error(422, "invalid_envelope", "enc and ciphertext must be base64url.") from None

    now = time.time()
    with state.session() as s, s.begin():
        if s.get(Job, body.job_id) is not None:
            raise _error(409, "duplicate_job", "A job with this id already exists.")
        enclave = s.get(Enclave, body.enclave_id)
        if enclave is None or not state.is_fresh(enclave) or profile.id not in json.loads(enclave.profiles):
            raise _error(409, "enclave_unavailable", "That worker is not available for this model. Ask /v1/route again.")
        for blob_id in body.input_blob_ids:
            blob = s.get(Blob, blob_id)
            if blob is None or blob.owner_kind != "account" or blob.owner_id != account.id or blob.job_id is not None:
                raise _error(422, "invalid_inputs", f"Blob {blob_id} is unknown, not yours, or already used.")
            blob.job_id = body.job_id
        price = profile.price_usd(params)
        try:
            ledger.post(
                s, account.id, -ledger.to_micros(price), kind=ledger.CHARGE, source="job",
                idempotency_key=f"charge:{body.job_id}", job_id=body.job_id, description=profile.name,
            )
        except ledger.InsufficientBalance as exc:
            balance = ledger.to_usd(exc.balance_micros)
            raise _error(402, "insufficient_balance", f"This video costs ${price:.2f}; your balance is ${balance:.2f}.") from None
        job = Job(
            id=body.job_id,
            account_id=account.id,
            profile_id=profile.id,
            enclave_id=enclave.id,
            params=params.model_dump_json(),
            enc=body.enc,
            ciphertext=body.ciphertext,
            input_blob_ids=json.dumps(body.input_blob_ids),
            status=JobState.QUEUED.value,
            stage="queued",
            progress=0.0,
            price_usd=price,
            webhook_url=body.webhook_url,
            created_at=now,
            updated_at=now,
        )
        s.add(job)
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
        },
    }
