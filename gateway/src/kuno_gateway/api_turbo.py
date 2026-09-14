"""Turbo track endpoints: the owner-signed competition spec, candidate enclaves, pinned benchmark jobs
and the hidden eval sets.

A candidate enclave runs a miner's submitted image, which is not in the golden manifest. It registers
here, is verified against the spec's base measurements plus the submission's RTMR3, and is stored with
the profile list `["turbo:<target>"]`. No real profile id has that form, so customer routing
(`/v1/route`, `/v1/videos`) can never select it; only a validator's benchmark job pinned to its image
digest reaches it. Its jobs then flow through the ordinary pull/complete endpoints, so to the enclave a
benchmark is an ordinary job: same profile id, envelope and parameters.

Nothing here needs a schema change: the spec and each candidate's submission live in `settings` rows.
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ValidationError
from sqlalchemy import select

from kuno_protocol.attestation import GoldenManifest
from kuno_protocol.canonical import b64d
from kuno_protocol.hotkey import verify_hotkey_proof
from kuno_protocol.profiles import ParamError, validate_params
from kuno_protocol.schemas import JobCreate, JobState, JobStatus, MinerRegistration
from kuno_protocol.turbo import (
    CANDIDATE_PROFILE_PREFIX,
    EvalSet,
    SignedTurboSpec,
    SignedTurboSubmission,
    TurboError,
    TurboSpec,
    candidate_profiles,
    is_candidate_profile_list,
    newer_spec,
    submission_digest,
    verify_eval_set,
    verify_submission,
)

from . import ledger
from .auth import gw, require_enclave, require_operator, require_validator, verify_enclave_signature
from .db import Account, Blob, Challenge, Enclave, Job, Setting
from .state import GatewayState, enclave_public, job_status

router = APIRouter(prefix="/turbo/v1", tags=["turbo"])

SPEC_KEY = "turbo_spec"
CANDIDATE_KEY = "turbo_candidate:"
_COMPETITION = re.compile(r"^[a-z0-9][a-z0-9-]{0,23}$")


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


class CandidateRegistration(BaseModel):
    registration: MinerRegistration
    submission: SignedTurboSubmission


class BenchmarkJobCreate(JobCreate):
    """A validator's benchmark job: an ordinary JobCreate plus the image digest the enclave must attest."""

    pin_image_digest: str


# ---------------------------------------------------------------- stored documents


def load_spec(state: GatewayState) -> SignedTurboSpec | None:
    with state.session() as s:
        row = s.get(Setting, SPEC_KEY)
    return SignedTurboSpec.model_validate_json(row.value) if row is not None else None


def store_spec(state: GatewayState, signed: SignedTurboSpec) -> None:
    with state.session() as s, s.begin():
        s.merge(Setting(key=SPEC_KEY, value=signed.model_dump_json()))


def is_candidate(enclave: Enclave) -> bool:
    try:
        return is_candidate_profile_list(json.loads(enclave.profiles))
    except (TypeError, ValueError):
        return False


def candidate_submission(state: GatewayState, enclave_id: str) -> SignedTurboSubmission | None:
    with state.session() as s:
        row = s.get(Setting, CANDIDATE_KEY + enclave_id)
    return SignedTurboSubmission.model_validate_json(row.value) if row is not None else None


def candidate_manifest(state: GatewayState, enclave: Enclave) -> GoldenManifest | None:
    """The manifest a candidate enclave's attestation is checked against, or None if it is not a
    candidate of the current competition. `api_miner.answer_challenge` should use this for candidates."""
    if not is_candidate(enclave):
        return None
    signed, submission = load_spec(state), candidate_submission(state, enclave.id)
    if signed is None or submission is None or submission.submission.competition_id != signed.spec.competition_id:
        return None
    return signed.spec.candidate_manifest(submission.submission, state.manifest)


def _open_spec(state: GatewayState) -> TurboSpec:
    signed = load_spec(state)
    if signed is None:
        raise _error(409, "no_competition", "No Turbo competition is running.")
    if time.time() >= signed.spec.windows[-1].ends_at:
        raise _error(409, "competition_closed", f"Competition {signed.spec.competition_id} has ended.")
    return signed.spec


# ---------------------------------------------------------------- spec


@router.get("/spec")
async def get_spec(request: Request):
    signed = load_spec(gw(request))
    if signed is None:
        raise _error(404, "not_found", "No Turbo competition has been published.")
    return signed.model_dump(mode="json")


@router.put("/spec", dependencies=[Depends(require_operator("admin"))])
async def put_spec(body: SignedTurboSpec, request: Request):
    state = gw(request)
    if state.owner_public_key is not None:
        if not body.verify(state.owner_public_key):
            raise _error(403, "bad_signature", "The Turbo spec is not signed by the owner key.")
    elif state.policy.production:
        raise _error(403, "no_owner_key", "Production gateways only accept owner-signed specs.")
    unknown = [p for p in (body.spec.target_profile, body.spec.reference_profile) if p not in state.profiles]
    if unknown:
        raise _error(422, "unknown_profiles", f"Unknown profiles: {', '.join(unknown)}")
    if not newer_spec(load_spec(state), body):
        raise _error(409, "stale_spec", "A newer Turbo spec is already published.")
    store_spec(state, body)
    return {"ok": True, "competition_id": body.spec.competition_id, "issued_at": body.spec.issued_at}


# ---------------------------------------------------------------- candidate enclaves


@router.post("/enclaves")
async def register_candidate(request: Request):
    """Registers an enclave running a submitted image. Mirrors `/miner/v1/enclaves`, but verifies against
    the candidate manifest and always binds the enclave to the submission's hotkey."""
    state = gw(request)
    try:
        body = CandidateRegistration.model_validate_json(await request.body())
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None
    registration, signed = body.registration, body.submission
    evidence, submission = registration.evidence, signed.submission
    await verify_enclave_signature(request, b64d(evidence.signing_public_key))
    if not state.consume_nonce(evidence.nonce):
        raise _error(401, "bad_nonce", "Unknown or expired nonce. Fetch a new one from /miner/v1/nonce.")
    spec = _open_spec(state)
    if submission.competition_id != spec.competition_id:
        raise _error(409, "wrong_competition", f"The running competition is {spec.competition_id}.")
    ok, detail = verify_submission(signed)
    if not ok:
        raise _error(403, "submission_invalid", detail)
    if evidence.image_digest != submission.image_digest:
        raise _error(403, "image_mismatch", "The enclave attests a different image than the submission.")
    if evidence.profiles != [spec.target_profile]:
        raise _error(422, "wrong_profiles", f"A candidate attests exactly [{spec.target_profile}].")
    verdict = await asyncio.to_thread(
        state.policy.verify, evidence, spec.candidate_manifest(submission, state.manifest), bytes.fromhex(evidence.nonce)
    )
    if not verdict.ok:
        raise _error(403, "attestation_failed", "; ".join(verdict.reasons))
    if registration.hotkey_proof is not None:
        ok, detail = verify_hotkey_proof(
            registration.hotkey_proof, expected_nonce=evidence.nonce, enclave_id=verdict.enclave_id,
            signing_public_key=evidence.signing_public_key, hotkey=submission.hotkey,
        )
        if not ok:
            raise _error(403, "hotkey_proof_invalid", detail)
    elif state.policy.production:
        raise _error(403, "hotkey_proof_required", "Production registration needs a proof signed by the miner's hotkey.")
    elif registration.miner_hotkey not in (None, submission.hotkey):
        raise _error(403, "hotkey_mismatch", "A candidate enclave earns for the submission's hotkey only.")

    now = time.time()
    with state.session() as s, s.begin():
        enclave = s.get(Enclave, verdict.enclave_id)
        if enclave is None:
            enclave = Enclave(id=verdict.enclave_id, inflight=0)
            s.add(enclave)
        elif enclave.status == "revoked":
            raise _error(403, "revoked", "This enclave has been revoked.")
        enclave.miner_hotkey = submission.hotkey
        enclave.tee = evidence.tee
        enclave.image_digest = evidence.image_digest
        enclave.hpke_public_key = evidence.hpke_public_key
        enclave.signing_public_key = evidence.signing_public_key
        enclave.profiles = json.dumps(candidate_profiles(spec.target_profile))
        enclave.hardware = json.dumps(evidence.hardware)
        enclave.evidence = evidence.model_dump_json()
        enclave.capacity = registration.capacity
        enclave.status = "active"
        enclave.verified_at = enclave.last_seen = now
        s.merge(Setting(key=CANDIDATE_KEY + verdict.enclave_id, value=signed.model_dump_json()))
    return {"enclave_id": verdict.enclave_id, "status": "active", "verified_at": now, "submission_digest": submission_digest(signed)}


@router.get("/enclaves")
async def list_candidates(request: Request, image_digest: str | None = None, _validator: Account = Depends(require_validator)):
    state = gw(request)
    with state.session() as s:
        rows = [e for e in s.scalars(select(Enclave)).all() if is_candidate(e)]
    out = []
    for enclave in rows:
        if image_digest is not None and enclave.image_digest != image_digest:
            continue
        submission = candidate_submission(state, enclave.id)
        out.append({**enclave_public(enclave), "submission_digest": submission_digest(submission) if submission else None})
    return out


@router.post("/challenges/{challenge_id}")
async def answer_candidate_challenge(challenge_id: str, request: Request, auth=Depends(require_enclave)):
    """A candidate's answer to a validator challenge, checked against its candidate manifest. (The
    `/miner/v1` answer path checks the golden manifest and would mark a candidate stale.)"""
    from kuno_protocol.attestation import AttestationEvidence  # noqa: PLC0415

    state = gw(request)
    enclave, raw = auth
    manifest = candidate_manifest(state, enclave)
    if manifest is None:
        raise _error(404, "not_candidate", "This enclave is not a candidate in the running competition.")
    try:
        evidence = AttestationEvidence.model_validate(json.loads(raw)["evidence"])
    except (ValueError, KeyError, TypeError, ValidationError):
        raise _error(422, "invalid_body", "Expected {\"evidence\": AttestationEvidence}.") from None
    with state.session() as s:
        challenge = s.get(Challenge, challenge_id)
        if challenge is None or challenge.enclave_id != enclave.id or challenge.status != "sent":
            raise _error(404, "not_found", "No outstanding challenge with this id.")
        nonce = challenge.nonce
    verdict = await asyncio.to_thread(state.policy.verify, evidence, manifest, bytes.fromhex(nonce))
    with state.session() as s, s.begin():
        challenge = s.get(Challenge, challenge_id)
        if challenge is None or challenge.status != "sent":
            raise _error(404, "not_found", "No outstanding challenge with this id.")
        challenge.status = "answered"
        challenge.evidence = evidence.model_dump_json()
        challenge.answered_at = time.time()
        row = s.get(Enclave, enclave.id)
        if verdict.ok and verdict.enclave_id == enclave.id:
            row.verified_at = challenge.answered_at
        elif verdict.enclave_id == enclave.id:
            row.status = "stale"
    return {"ok": verdict.ok, "reasons": verdict.reasons}


# ---------------------------------------------------------------- benchmark jobs


@router.post("/videos", status_code=201, response_model=JobStatus)
async def create_benchmark(body: BenchmarkJobCreate, request: Request, validator: Account = Depends(require_validator)):
    """A validator-only job pinned to an enclave attesting `pin_image_digest`. The stored job is identical
    to a customer job, so the enclave receives exactly what organic traffic looks like."""
    state = gw(request)
    if body.webhook_url:
        raise _error(422, "invalid_body", "Benchmark jobs take no webhook.")
    params = body.params
    profile = state.profiles.get(params.profile_id)
    if profile is None:
        raise _error(404, "unknown_model", f"Unknown model profile {params.profile_id!r}.")
    try:
        validate_params(profile, params)
    except ParamError as exc:
        raise _error(422, "invalid_params", str(exc)) from None
    if not state.switch.config.region_allows(profile, state.country(request)):
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
        if enclave is None or not state.is_fresh(enclave, now):
            raise _error(409, "enclave_unavailable", "That enclave is not available.")
        if enclave.image_digest != body.pin_image_digest:
            raise _error(409, "image_mismatch", "That enclave does not attest the pinned image digest.")
        serves = json.loads(enclave.profiles)
        if profile.id not in serves and CANDIDATE_PROFILE_PREFIX + profile.id not in serves:
            raise _error(409, "enclave_unavailable", "That enclave does not serve this model.")
        for blob_id in body.input_blob_ids:
            blob = s.get(Blob, blob_id)
            if blob is None or blob.owner_kind != "account" or blob.owner_id != validator.id or blob.job_id is not None:
                raise _error(422, "invalid_inputs", f"Blob {blob_id} is unknown, not yours, or already used.")
            blob.job_id = body.job_id
        # Benchmarks are sealed by the validator like private jobs, and priced like them.
        price = profile.price_usd(params, "private")
        try:
            ledger.post(
                s, validator.id, -ledger.to_micros(price), kind=ledger.CHARGE, source="job",
                idempotency_key=f"charge:{body.job_id}", job_id=body.job_id, description=profile.name,
            )
        except ledger.InsufficientBalance as exc:
            balance = ledger.to_usd(exc.balance_micros)
            raise _error(402, "insufficient_balance", f"This benchmark costs ${price:.2f}; the balance is ${balance:.2f}.") from None
        job = Job(
            id=body.job_id,
            account_id=validator.id,
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
            webhook_url=None,
            created_at=now,
            updated_at=now,
        )
        s.add(job)
    return job_status(job)


# ---------------------------------------------------------------- eval sets


def eval_set_path(state: GatewayState, competition_id: str, window: int) -> Path:
    return state.settings.data_dir / "turbo" / "eval-sets" / competition_id / f"{window}.json"


@router.get("/eval-sets/{competition_id}/{window}")
async def get_eval_set(competition_id: str, window: int, request: Request):
    """Validator-only until the window's reveal time, then public so anyone can audit the scores."""
    state = gw(request)
    signed = load_spec(state)
    if not _COMPETITION.match(competition_id) or window < 0 or signed is None or signed.spec.competition_id != competition_id:
        raise _error(404, "not_found", "No such eval set.")
    try:
        spec_window = signed.spec.window(window)
    except TurboError:
        raise _error(404, "not_found", "No such eval set.") from None
    if time.time() < spec_window.reveals_at:
        await require_validator(request)
    path = eval_set_path(state, competition_id, window)
    if not path.exists():
        raise _error(404, "not_found", "The eval set for this window has not been provisioned.")
    try:
        eval_set = EvalSet.model_validate_json(path.read_text())
        verify_eval_set(signed.spec, eval_set)
    except (ValueError, TurboError) as exc:
        raise _error(500, "eval_set_mismatch", f"The provisioned eval set does not match the spec: {exc}") from None
    return eval_set.model_dump(mode="json")
