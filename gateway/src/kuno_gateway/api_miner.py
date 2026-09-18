"""Endpoints the worker inside each confidential VM calls. Every call after
registration is signed with the enclave's attested Ed25519 key."""

from __future__ import annotations

import asyncio
import json
import re
import time
from functools import partial

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, StrictBool, ValidationError
from sqlalchemy import select

from kuno_protocol.attestation import AttestationEvidence
from kuno_protocol.canonical import b64d, canonical_json, sha256_hex
from kuno_protocol.envelope import EnvelopeError
from kuno_protocol.envelope import normalize as normalize_envelope
from kuno_protocol.hardware import capacity_limit
from kuno_protocol.receipts import Receipt, verify_receipt
from kuno_protocol.hotkey import verify_hotkey_proof
from kuno_protocol.location import verify_location
from kuno_protocol.profiles import Mode
from kuno_protocol.regions import is_excluded
from kuno_protocol.schemas import GenerationParams, JobState, MinerRegistration
from kuno_protocol.tiers import OPEN, hotkey_proof_required, tier_for_tee, tier_serves

from .auth import gw, require_enclave, verify_enclave_signature
from .db import NEVER_EXPIRES, Blob, Challenge, Enclave, Job
from .state import HardwareInUse

router = APIRouter(prefix="/miner/v1", tags=["miner"])


class ProgressBody(BaseModel):
    progress: float = Field(ge=0.0, le=1.0)
    stage: str = Field(max_length=64)


class CompleteBody(BaseModel):
    output_blob_id: str
    receipt: Receipt


class FailBody(BaseModel):
    code: str = Field(max_length=64)
    message: str = Field(max_length=500)
    # False: a `safety_blocked` whose blocked text a model inside the enclave wrote (an enhanced prompt, a plan) or whose
    # planner refused a brief that passed the checks. The job fails and is refunded all the same, with no strike on the
    # account (PROTOCOL.md "Failure reports and strikes"). Absent, as from workers before it: a strike, as before.
    # Meaningless for any other code. Strict, so a malformed value is refused rather than read as either answer.
    strike: StrictBool = True


class ChallengeAnswer(BaseModel):
    evidence: AttestationEvidence


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _parse(model: type[BaseModel], body: bytes):
    try:
        return model.model_validate_json(body)
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None


def _proven_hotkey(state, body: MinerRegistration, enclave_id: str) -> str | None:
    """The hotkey this enclave earns for: proven by its signature, or on a dev network, as claimed.

    Open-tier enclaves always need the proof, dev networks included: without a quote it is the
    only thing binding the worker's keys to a miner.
    """
    if body.hotkey_proof is None:
        tier = tier_for_tee(body.evidence.tee)
        if hotkey_proof_required(tier, state.policy.production):
            where = "Open-tier" if tier == OPEN else "Production"
            raise _error(403, "hotkey_proof_required", f"{where} registration needs a proof signed by the miner's hotkey.")
        return body.miner_hotkey
    if not body.miner_hotkey:
        raise _error(422, "invalid_body", "A hotkey proof needs the miner_hotkey it proves.")
    # The nonce, enclave id and key come from the verified evidence, so a proof can't be replayed elsewhere.
    ok, detail = verify_hotkey_proof(
        body.hotkey_proof,
        expected_nonce=body.evidence.nonce,
        enclave_id=enclave_id,
        signing_public_key=body.evidence.signing_public_key,
        hotkey=body.miner_hotkey,
    )
    if not ok:
        raise _error(403, "hotkey_proof_invalid", detail)
    return body.miner_hotkey


def _location_record(state, body: MinerRegistration, enclave_id: str) -> dict | None:
    """Checks the location proof for profiles bound to territory; refuses them when proof is required and fails."""
    evidence = body.evidence
    policies = {state.profiles[p].license.region_policy for p in evidence.profiles} - {None}
    if not policies or state.landmarks is None:
        return None
    verdicts = {
        policy: verify_location(body.location, state.landmarks.landmarks, registration_nonce=evidence.nonce,
                                enclave_id=enclave_id, region_policy=policy)
        for policy in sorted(policies)
    }
    failed = {policy: v for policy, v in verdicts.items() if not v.ok}
    if failed and state.settings.require_location_proof:
        barred = sorted(p for p in evidence.profiles if state.profiles[p].license.region_policy in failed)
        raise _error(
            403, "location_unproven",
            f"{', '.join(barred)} need proof that this machine is outside the licence's excluded territories: "
            + "; ".join(v.detail for v in failed.values()),
        )
    return {
        "nonce": evidence.nonce,
        "proof": body.location.model_dump(mode="json") if body.location is not None else None,
        "verdicts": {policy: {"ok": v.ok, "detail": v.detail, "landmark_id": v.landmark_id, "radius_km": v.radius_km,
                              "clearance_km": v.clearance_km} for policy, v in verdicts.items()},
    }


# A feature names a job kind and its version, e.g. "plan/1" (kuno_protocol.plans.PLAN_FEATURE).
FEATURE_RE = re.compile(r"[a-z0-9][a-z0-9_.-]{0,47}/[0-9]{1,6}")


def _features(body: MinerRegistration) -> list[str]:
    """The optional job kinds a registration lists, deduplicated and sorted. Unknown kinds are kept (a newer worker may
    list what this gateway doesn't route yet); a malformed entry refuses the registration."""
    features = body.features or []
    bad = [item for item in features if not FEATURE_RE.fullmatch(item)]
    if bad:
        raise _error(422, "invalid_features", f"Features are written as <kind>/<version>, e.g. plan/1; not {bad[0][:64]!r}.")
    return sorted(set(features))


@router.get("/nonce")
async def nonce(request: Request):
    return {"nonce": gw(request).issue_nonce(), "expires_in": 300}


@router.post("/enclaves")
async def register_enclave(request: Request):
    state = gw(request)
    body: MinerRegistration = _parse(MinerRegistration, await request.body())
    evidence = body.evidence
    await verify_enclave_signature(request, b64d(evidence.signing_public_key))
    if not state.consume_nonce(evidence.nonce):
        raise _error(401, "bad_nonce", "Unknown or expired nonce. Fetch a new one from /miner/v1/nonce.")
    unknown = [p for p in evidence.profiles if p not in state.profiles]
    if unknown:
        raise _error(422, "unknown_profiles", f"Unknown profiles: {', '.join(unknown)}")
    try:
        # What this hardware can fit, per profile (kuno_protocol.envelope); routing and admission hold the enclave to it.
        envelope = normalize_envelope(body.envelope, state.profiles, evidence.profiles)
    except EnvelopeError as exc:
        raise _error(422, "invalid_envelope", str(exc)) from None
    features = _features(body)
    # DCAP collateral and NRAS are network calls; keep them off the event loop. Open-tier evidence is accepted only
    # where the owner-signed manifest's open_tier policy allows the image (refused by default, production included).
    verdict = await asyncio.to_thread(
        partial(state.policy.verify, evidence, state.manifest, bytes.fromhex(evidence.nonce), allow_open=True)
    )
    if not verdict.ok:
        raise _error(403, "attestation_failed", "; ".join(verdict.reasons))
    # Where the miner runs, not where the customer is: MiniMax H3's licence bars its Excluded Territories outright,
    # so an enclave offering such a profile is refused there. An unknown country counts as excluded, as for customers.
    if state.settings.enforce_miner_region:
        country = state.country(request)
        barred = sorted(p for p in evidence.profiles if is_excluded(state.profiles[p].license.region_policy, country))
        if barred:
            raise _error(
                403, "region_not_licensed",
                f"{', '.join(barred)} may not run in {country or 'an unknown country'} under the model's licence. "
                "Register only the profiles you are licensed to serve, or run this worker in a licensed country.",
            )
    location = _location_record(state, body, verdict.enclave_id)
    # Before anything is written: an open-tier registration without a valid hotkey proof never lands.
    miner_hotkey = _proven_hotkey(state, body, verdict.enclave_id)
    if verdict.gpu_count is not None:
        needs = {p: state.profiles[p].gpus_per_worker for p in evidence.profiles}
        limit = capacity_limit(verdict.gpu_count, needs.values())
        if limit < 1:
            raise _error(
                422, "insufficient_gpus",
                f"The evidence attests {verdict.gpu_count} GPU(s), fewer than a claimed profile needs ({max(needs.values())}).",
            )
        if body.capacity > limit:
            raise _error(
                422, "capacity_exceeds_hardware",
                f"Capacity {body.capacity} needs more GPUs than the {verdict.gpu_count} attested; at most {limit} for these profiles.",
            )
    now = time.time()
    with state.hardware_lock, state.session() as s, s.begin():
        enclave = s.get(Enclave, verdict.enclave_id)
        if enclave is None:
            enclave = Enclave(id=verdict.enclave_id, inflight=0)
            s.add(enclave)
        elif enclave.status == "revoked":
            raise _error(403, "revoked", "This enclave has been revoked.")
        elif enclave.tee and tier_for_tee(enclave.tee) != verdict.tier:
            raise _error(409, "tier_changed", "These enclave keys registered on another tier; restart the worker for new keys.")
        enclave.miner_hotkey = miner_hotkey
        enclave.tee = evidence.tee
        enclave.image_digest = evidence.image_digest
        enclave.hpke_public_key = evidence.hpke_public_key
        enclave.signing_public_key = evidence.signing_public_key
        enclave.profiles = json.dumps(evidence.profiles)
        enclave.hardware = json.dumps(evidence.hardware)
        enclave.evidence = evidence.model_dump_json()
        enclave.endorsements = verdict.endorsements.model_dump_json() if verdict.endorsements is not None else None
        enclave.location = json.dumps(location) if location is not None else None
        enclave.capacity = body.capacity
        enclave.status = "active"
        enclave.verified_at = enclave.last_seen = now
        enclave.gpu_count = verdict.gpu_count
        # Replaced at every registration: one without an envelope serves its profiles' full limits.
        enclave.envelope = json.dumps(envelope, separators=(",", ":"), sort_keys=True) if envelope else None
        # Replaced at every registration too: a worker restarted without a planner stops being sent plans.
        enclave.features = json.dumps(features, separators=(",", ":")) if features else None
        try:
            replaced = state.bind_hardware(s, enclave, verdict.hardware, now)
        except HardwareInUse as exc:
            raise _error(409, "hardware_in_use", str(exc)) from None
    return {"enclave_id": verdict.enclave_id, "status": "active", "verified_at": now, "replaced": replaced}


@router.post("/retire")
async def retire(request: Request, auth=Depends(require_enclave)):
    """A worker shutting down says so, instead of leaving jobs queued until it times out.

    Enclave keys are ephemeral, so a restarted worker registers as a new enclave anyway.
    """
    state = gw(request)
    enclave, _ = auth
    released = 0
    with state.session() as s, s.begin():
        row = s.get(Enclave, enclave.id)
        if row is not None:
            row.status = "stale"
        for job in s.scalars(select(Job).where(Job.enclave_id == enclave.id, Job.status == JobState.QUEUED.value)).all():
            state.finish_job(s, job, JobState.FAILED, "enclave_unavailable", "The assigned worker left the network. Submit again.")
            released += 1
    return {"ok": True, "released": released}


@router.post("/pull")
async def pull(request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, _ = auth
    try:
        wait = min(float(request.query_params.get("wait", state.settings.pull_wait_s)), state.settings.pull_wait_s)
    except ValueError:
        wait = state.settings.pull_wait_s
    deadline = time.time() + wait
    while True:
        work = state.next_work(enclave.id)
        if work is not None and not _refused_private_job(state, enclave, work):
            return work.model_dump(mode="json")
        if time.time() >= deadline or await request.is_disconnected():
            return {"kind": "none"}
        await asyncio.sleep(0.2)


def _refused_private_job(state, enclave: Enclave, work) -> bool:
    """Defence in depth behind job creation: a private job that somehow reached an open-tier enclave is failed
    before its ciphertext leaves the gateway. Returns True when `work` was such a job."""
    if getattr(work, "kind", None) != "job" or tier_serves(tier_for_tee(enclave.tee), "private"):
        return False
    with state.session() as s, s.begin():
        job = s.get(Job, work.job_id)
        if job is None or (getattr(job, "privacy", None) or "private") != "private":
            return False
        state.finish_job(s, job, JobState.FAILED, "enclave_unavailable", "The assigned worker cannot run private jobs. Submit again.")
    return True


def _assigned_job(s, job_id: str, enclave: Enclave) -> Job:
    job = s.get(Job, job_id)
    if job is None or job.enclave_id != enclave.id:
        raise _error(404, "not_found", "No such job assigned to this enclave.")
    return job


@router.post("/jobs/{job_id}/progress")
async def progress(job_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    body: ProgressBody = _parse(ProgressBody, raw)
    now = time.time()
    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        # A worker doesn't pull while it renders, so its progress reports are what keep it counted as alive.
        state.touch(s, enclave.id, now)
        if job.status == JobState.RUNNING.value:
            job.progress, job.stage, job.updated_at = body.progress, body.stage, now
        return {"canceled": job.status == JobState.CANCELED.value}


@router.get("/blobs/{blob_id}")
async def download_input(blob_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, _ = auth
    with state.session() as s:
        blob = s.get(Blob, blob_id)
        job = s.get(Job, blob.job_id) if blob and blob.job_id else None
    if blob is None or job is None or job.enclave_id != enclave.id or job.status != JobState.RUNNING.value:
        raise _error(404, "not_found", "No such input for a running job on this enclave.")
    # Removed or held content has its blobs expired at once (holds.hide_job_blobs): stop serving it to miners too.
    if blob.expires_at is not None and blob.expires_at <= time.time():
        raise _error(404, "not_found", "No such input for a running job on this enclave.")
    return Response(content=state.blobs.get(blob_id), media_type="application/octet-stream")


@router.post("/blobs", status_code=201)
async def upload_output(request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, data = auth
    job_id = request.query_params.get("job_id", "")
    if not data.startswith(b"KUNOB1"):
        raise _error(400, "not_encrypted", "Outputs must be encrypted to the customer's output key.")
    if len(data) > state.settings.max_blob_bytes:
        raise _error(413, "too_large", "Output exceeds the upload limit.")
    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        if job.status != JobState.RUNNING.value:
            raise _error(409, "not_running", "Job is not running.")
        blob_id, digest, size = state.blobs.put(data)
        now = time.time()
        s.add(
            Blob(
                id=blob_id,
                owner_kind="enclave",
                owner_id=enclave.id,
                job_id=job.id,
                size=size,
                sha256=digest,
                created_at=now,
                # An output that never completes its job expires like an unused upload; complete() keeps it.
                expires_at=now + state.settings.upload_ttl_s,
            )
        )
    return {"blob_id": blob_id, "sha256": digest, "size": size}


@router.post("/jobs/{job_id}/complete")
async def complete(job_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    body: CompleteBody = _parse(CompleteBody, raw)
    receipt = body.receipt

    def finish() -> None:
        # Off the event loop: finishing a Standard job decrypts and scans the video (output_scan.py), which can take a
        # while for a long clip, and must not stall every other request meanwhile.
        _complete(state, job_id, enclave, body, receipt)

    await asyncio.to_thread(finish)
    return {"ok": True}


def _complete(state, job_id: str, enclave, body, receipt) -> None:
    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        if job.status != JobState.RUNNING.value:
            raise _error(409, "not_running", "Job is not running.")
        blob = s.get(Blob, body.output_blob_id)
        params = GenerationParams.model_validate_json(job.params)
        problems = []
        if blob is None or blob.job_id != job.id or blob.owner_id != enclave.id:
            problems.append("output blob does not belong to this job")
        if not verify_receipt(receipt, b64d(enclave.signing_public_key)):
            problems.append("receipt signature invalid")
        r = receipt.body
        if (r.job_id, r.enclave_id, r.profile_id) != (job.id, enclave.id, job.profile_id):
            problems.append("receipt identifies a different job, enclave or model")
        if r.params_digest != sha256_hex(canonical_json(params.model_dump(mode="json"))):
            problems.append("receipt params digest mismatch")
        if blob is not None and (r.output_digest != blob.sha256 or r.output_bytes != blob.size):
            problems.append("receipt output digest mismatch")
        # A plan job's receipt describes a plan and no video; every other job's, a video (PROTOCOL.md "Plans (Director)").
        if (params.mode is Mode.PLAN) != (r.plan is not None):
            problems.append("receipt describes a plan for a video job" if r.plan is not None else "receipt describes a video for a plan job")
        if problems:
            raise _error(422, "bad_receipt", "; ".join(problems))
        job.output_blob_id = blob.id
        # The video (or a plan's sealed JSON) stays until its owner deletes it.
        blob.expires_at = NEVER_EXPIRES
        job.receipt = receipt.model_dump_json()
        job.content_digest = r.content_digest
        job.progress, job.stage = 1.0, "done"
        state.finish_job(s, job, JobState.SUCCEEDED)


@router.post("/jobs/{job_id}/fail")
async def fail(job_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    body: FailBody = _parse(FailBody, raw)
    from .envelopes import failure_code

    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        if not JobState(job.status).terminal:
            # capacity_refused inside the envelope this enclave advertised is recorded as internal_error, a miner fault.
            code, message = failure_code(s.get(Enclave, enclave.id) or enclave, job.params, body.code, body.message)
            # `strike` is taken on the miner's word, like the code itself: leaving it out strikes an account no more than a
            # false `safety_blocked` already could, and sending it gains a miner nothing.
            state.finish_job(s, job, JobState.FAILED, code, message, strike=body.strike)
    return {"ok": True}


@router.post("/challenges/{challenge_id}")
async def answer_challenge(challenge_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    answer: ChallengeAnswer = _parse(ChallengeAnswer, raw)
    with state.session() as s:
        challenge = s.get(Challenge, challenge_id)
        if challenge is None or challenge.enclave_id != enclave.id or challenge.status != "sent":
            raise _error(404, "not_found", "No outstanding challenge with this id.")
        nonce = challenge.nonce
    # Verification can take seconds of network calls; no transaction is held open meanwhile.
    from .api_turbo import candidate_manifest  # Turbo candidates are measured against their submission

    candidate = candidate_manifest(state, enclave)
    # Open-tier enclaves answer challenges with open evidence too; Turbo candidates stay confidential-only.
    verdict = await asyncio.to_thread(
        partial(state.policy.verify, answer.evidence, candidate or state.manifest, bytes.fromhex(nonce), allow_open=candidate is None)
    )
    conflict: HardwareInUse | None = None
    reasons = list(verdict.reasons)
    with state.hardware_lock, state.session() as s, s.begin():
        challenge = s.get(Challenge, challenge_id)
        if challenge is None or challenge.status != "sent":
            raise _error(404, "not_found", "No outstanding challenge with this id.")
        challenge.status = "answered"
        challenge.evidence = answer.evidence.model_dump_json()
        challenge.answered_at = now = time.time()
        row = s.get(Enclave, enclave.id)
        if verdict.ok and verdict.enclave_id == enclave.id and verdict.tier != tier_for_tee(row.tee):
            # A running worker can't change tier; different evidence kind means different keys' owner or a relay.
            row.status = "stale"
            reasons.append("evidence tier changed since registration")
        elif verdict.ok and verdict.enclave_id == enclave.id:
            before = {b.token for b in state.enclave_hardware(s, [enclave.id]).get(enclave.id, [])}
            if before and verdict.hardware and before != verdict.hardware_tokens():
                # A running VM can't change CPU platform or GPUs; different hardware means a relay.
                row.status = "stale"
                reasons.append("hardware identity changed since registration")
            else:
                try:
                    state.bind_hardware(s, row, verdict.hardware, now)
                    row.verified_at = now
                    # Clients refuse evidence older than the manifest's max_evidence_age_s, so what routes serve is the
                    # freshest verified answer, with the signed material that verified it.
                    row.evidence = answer.evidence.model_dump_json()
                    row.endorsements = verdict.endorsements.model_dump_json() if verdict.endorsements is not None else None
                    if verdict.gpu_count is not None:
                        row.gpu_count = verdict.gpu_count
                except HardwareInUse as exc:
                    row.status = "stale"
                    conflict = exc
        elif verdict.enclave_id == enclave.id:
            row.status = "stale"
    if conflict is not None:
        raise _error(409, "hardware_in_use", str(conflict))
    return {"ok": verdict.ok and not reasons, "reasons": reasons}
