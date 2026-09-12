"""Endpoints the worker inside each confidential VM calls. Every call after
registration is signed with the enclave's attested Ed25519 key."""

from __future__ import annotations

import asyncio
import json
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select

from kuno_protocol.attestation import AttestationEvidence, verify_evidence
from kuno_protocol.canonical import b64d, canonical_json, sha256_hex
from kuno_protocol.receipts import Receipt, verify_receipt
from kuno_protocol.schemas import GenerationParams, JobState

from .auth import gw, require_enclave, verify_enclave_signature
from .db import Blob, Challenge, Enclave, Job

router = APIRouter(prefix="/miner/v1", tags=["miner"])


class RegisterBody(BaseModel):
    evidence: AttestationEvidence
    miner_hotkey: str | None = None
    capacity: int = Field(default=1, ge=1, le=64)


class ProgressBody(BaseModel):
    progress: float = Field(ge=0.0, le=1.0)
    stage: str = Field(max_length=64)


class CompleteBody(BaseModel):
    output_blob_id: str
    receipt: Receipt


class FailBody(BaseModel):
    code: str = Field(max_length=64)
    message: str = Field(max_length=500)


class ChallengeAnswer(BaseModel):
    evidence: AttestationEvidence


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _parse(model: type[BaseModel], body: bytes):
    try:
        return model.model_validate_json(body)
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None


@router.get("/nonce")
async def nonce(request: Request):
    return {"nonce": gw(request).issue_nonce(), "expires_in": 300}


@router.post("/enclaves")
async def register_enclave(request: Request):
    state = gw(request)
    body: RegisterBody = _parse(RegisterBody, await request.body())
    evidence = body.evidence
    await verify_enclave_signature(request, b64d(evidence.signing_public_key))
    if not state.consume_nonce(evidence.nonce):
        raise _error(401, "bad_nonce", "Unknown or expired nonce. Fetch a new one from /miner/v1/nonce.")
    unknown = [p for p in evidence.profiles if p not in state.profiles]
    if unknown:
        raise _error(422, "unknown_profiles", f"Unknown profiles: {', '.join(unknown)}")
    verdict = verify_evidence(
        evidence,
        state.manifest,
        expected_nonce=bytes.fromhex(evidence.nonce),
        quote_verifier=state.quote_verifier,
        gpu_verifier=state.gpu_verifier,
    )
    if not verdict.ok:
        raise _error(403, "attestation_failed", "; ".join(verdict.reasons))
    now = time.time()
    with state.session() as s, s.begin():
        enclave = s.get(Enclave, verdict.enclave_id)
        if enclave is None:
            enclave = Enclave(id=verdict.enclave_id, inflight=0)
            s.add(enclave)
        elif enclave.status == "revoked":
            raise _error(403, "revoked", "This enclave has been revoked.")
        enclave.miner_hotkey = body.miner_hotkey
        enclave.tee = evidence.tee
        enclave.image_digest = evidence.image_digest
        enclave.hpke_public_key = evidence.hpke_public_key
        enclave.signing_public_key = evidence.signing_public_key
        enclave.profiles = json.dumps(evidence.profiles)
        enclave.hardware = json.dumps(evidence.hardware)
        enclave.evidence = evidence.model_dump_json()
        enclave.capacity = body.capacity
        enclave.status = "active"
        enclave.verified_at = enclave.last_seen = now
    return {"enclave_id": verdict.enclave_id, "status": "active", "verified_at": now}


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
        if work is not None:
            return work.model_dump(mode="json")
        if time.time() >= deadline or await request.is_disconnected():
            return {"kind": "none"}
        await asyncio.sleep(0.2)


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
    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        if job.status == JobState.RUNNING.value:
            job.progress, job.stage, job.updated_at = body.progress, body.stage, time.time()
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
                expires_at=now + state.settings.blob_retention_s,
            )
        )
    return {"blob_id": blob_id, "sha256": digest, "size": size}


@router.post("/jobs/{job_id}/complete")
async def complete(job_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    body: CompleteBody = _parse(CompleteBody, raw)
    receipt = body.receipt
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
        if problems:
            raise _error(422, "bad_receipt", "; ".join(problems))
        job.output_blob_id = blob.id
        job.receipt = receipt.model_dump_json()
        job.content_digest = r.content_digest
        job.progress, job.stage = 1.0, "done"
        state.finish_job(s, job, JobState.SUCCEEDED)
    return {"ok": True}


@router.post("/jobs/{job_id}/fail")
async def fail(job_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    body: FailBody = _parse(FailBody, raw)
    with state.session() as s, s.begin():
        job = _assigned_job(s, job_id, enclave)
        if not JobState(job.status).terminal:
            state.finish_job(s, job, JobState.FAILED, body.code, body.message)
    return {"ok": True}


@router.post("/challenges/{challenge_id}")
async def answer_challenge(challenge_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    answer: ChallengeAnswer = _parse(ChallengeAnswer, raw)
    with state.session() as s, s.begin():
        challenge = s.get(Challenge, challenge_id)
        if challenge is None or challenge.enclave_id != enclave.id or challenge.status != "sent":
            raise _error(404, "not_found", "No outstanding challenge with this id.")
        verdict = verify_evidence(
            answer.evidence,
            state.manifest,
            expected_nonce=bytes.fromhex(challenge.nonce),
            quote_verifier=state.quote_verifier,
            gpu_verifier=state.gpu_verifier,
        )
        challenge.status = "answered"
        challenge.evidence = answer.evidence.model_dump_json()
        challenge.answered_at = time.time()
        row = s.get(Enclave, enclave.id)
        if verdict.ok and verdict.enclave_id == enclave.id:
            row.verified_at = challenge.answered_at
        elif verdict.enclave_id == enclave.id:
            row.status = "stale"
    return {"ok": verdict.ok, "reasons": verdict.reasons}
