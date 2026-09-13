"""Relay for verified-mode step audits (see subnet/VERIFIED_MODE.md).

Validators ask to open one denoising step of a job; the enclave that ran it answers with an
opening sealed to the validator's key and signed by the enclave key. The gateway only routes
and stores ciphertext, but it enforces the privacy rule every audit depends on:

    Latents reveal content. An audit may only open a job created by the requesting
    validator's own account (its canaries). Every other job is refused.

Miners cannot tell canaries from customer jobs, so every verified-mode job is committed and
retained; only openings are restricted.

Wire-up (app.py owns the router list): `app.include_router(api_audits.router)`. Enclaves can
fetch work from `GET /miner/v1/audits`, or the pull loop can hand audits out like challenges
by calling `claim_audits` inside `GatewayState.next_work`. The janitor should call
`expire_audits(state)`.
"""

from __future__ import annotations

import json
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from kuno_protocol.canonical import b64d
from kuno_protocol.receipts import Receipt
from kuno_protocol.schemas import JobState
from kuno_protocol.verified import AuditRequest, MinerAudit, SealedOpening, verify_sealed_opening

from .auth import gw, require_enclave, require_validator
from .db import Account, Blob, Job
from .db_audits import Audit

router = APIRouter(tags=["audits"])

# An enclave must answer an audit within this long.
AUDIT_TTL_S = 600.0
# Worker retention window (KUNO_VERIFIED_RETENTION_S); older jobs can no longer be opened.
AUDIT_RETENTION_S = 3600.0
# Sealed openings (and the audit rows) are kept this long for the validator to fetch.
OPENING_TTL_S = 86400.0
MAX_AUDITS_PER_JOB = 3
CLAIM_BATCH = 4

OPEN_STATUSES = ("pending", "sent")


class AuditFailBody(BaseModel):
    code: str = Field(max_length=64)
    message: str = Field(default="", max_length=500)


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _setting(request_or_state, name: str, default: float) -> float:
    state = request_or_state if not isinstance(request_or_state, Request) else gw(request_or_state)
    return float(getattr(state.settings, name, default))


def _expire(audit: Audit, now: float) -> None:
    if audit.status in OPEN_STATUSES and audit.expires_at <= now:
        audit.status = "expired"


def audit_public(audit: Audit, opening: dict | None = None) -> dict:
    return {
        "audit_id": audit.id,
        "job_id": audit.job_id,
        "enclave_id": audit.enclave_id,
        "step": audit.step,
        "include_leaves": audit.include_leaves,
        "status": audit.status,
        "error_code": audit.error_code,
        "error": audit.error,
        "created_at": audit.created_at,
        "sent_at": audit.sent_at,
        "answered_at": audit.answered_at,
        "expires_at": audit.expires_at,
        "opening": opening,
    }


# ------------------------------------------------------------------ validators


@router.post("/validator/v1/audits", status_code=201)
async def request_audit(body: AuditRequest, request: Request, validator: Account = Depends(require_validator)):
    state = gw(request)
    now = time.time()
    with state.session() as s, s.begin():
        job = s.get(Job, body.job_id)
        # The privacy rule. Unknown and foreign jobs get the same answer, so it is not a job-id oracle either.
        if job is None or job.account_id != validator.id:
            raise _error(403, "not_audit_owner", "Audits can only open jobs created by this validator's own account.")
        if job.status != JobState.SUCCEEDED.value or not job.receipt:
            raise _error(409, "not_auditable", "Only succeeded jobs with a receipt can be audited.")
        commitment = Receipt.model_validate_json(job.receipt).body.step_commitment
        if commitment is None:
            raise _error(409, "not_auditable", "This job's receipt carries no step commitment.")
        if not 1 <= body.step < commitment.leaves:
            raise _error(422, "bad_step", f"Step must be between 1 and {commitment.leaves - 1}.")
        if now - (job.finished_at or 0.0) > _setting(state, "audit_retention_s", AUDIT_RETENTION_S):
            raise _error(410, "retention_expired", "The miner's retention window for this job has passed.")
        count = s.scalar(select(func.count()).select_from(Audit).where(Audit.job_id == job.id)) or 0
        if count >= MAX_AUDITS_PER_JOB:
            raise _error(429, "too_many_audits", f"A job can be audited at most {MAX_AUDITS_PER_JOB} times.")
        audit = Audit(
            id=secrets.token_hex(16),
            job_id=job.id,
            enclave_id=job.enclave_id,
            requested_by=validator.id,
            step=body.step,
            include_leaves=body.include_leaves,
            recipient_public_key=body.recipient_public_key,
            status="pending",
            created_at=now,
            expires_at=now + _setting(state, "audit_ttl_s", AUDIT_TTL_S),
        )
        s.add(audit)
    return {"audit_id": audit.id, "enclave_id": audit.enclave_id, "status": audit.status, "expires_at": audit.expires_at}


@router.get("/validator/v1/audits/{audit_id}")
async def get_audit(audit_id: str, request: Request, validator: Account = Depends(require_validator)):
    state = gw(request)
    with state.session() as s, s.begin():
        audit = s.get(Audit, audit_id)
        if audit is None or audit.requested_by != validator.id:
            raise _error(404, "not_found", "No such audit.")
        _expire(audit, time.time())
        blob_id = audit.opening_blob_id if audit.status == "answered" else None
        result = audit_public(audit)
    if blob_id is not None:
        try:
            result["opening"] = json.loads(state.blobs.get(blob_id))
        except KeyError:
            result["status"] = "gone"
    return result


# ------------------------------------------------------------------ enclaves


def claim_audits(s: Session, enclave_id: str, now: float, limit: int = CLAIM_BATCH) -> list[MinerAudit]:
    """Hands pending audits to their enclave, oldest first, marking them sent."""
    rows = s.scalars(
        select(Audit)
        .where(Audit.enclave_id == enclave_id, Audit.status == "pending", Audit.expires_at > now)
        .order_by(Audit.created_at)
        .limit(limit)
    ).all()
    items = []
    for audit in rows:
        audit.status, audit.sent_at = "sent", now
        items.append(
            MinerAudit(
                audit_id=audit.id,
                job_id=audit.job_id,
                step=audit.step,
                recipient_public_key=audit.recipient_public_key,
                include_leaves=audit.include_leaves,
                expires_at=audit.expires_at,
            )
        )
    return items


@router.get("/miner/v1/audits")
async def pull_audits(request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, _ = auth
    with state.session() as s, s.begin():
        items = claim_audits(s, enclave.id, time.time())
    return {"audits": [item.model_dump(mode="json") for item in items]}


def _open_audit(s: Session, audit_id: str, enclave_id: str, now: float) -> Audit:
    audit = s.get(Audit, audit_id)
    if audit is None or audit.enclave_id != enclave_id:
        raise _error(404, "not_found", "No such audit for this enclave.")
    _expire(audit, now)
    if audit.status not in OPEN_STATUSES:
        raise _error(409, "not_open", f"This audit is {audit.status}.")
    return audit


@router.post("/miner/v1/audits/{audit_id}/opening")
async def post_opening(audit_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    try:
        sealed = SealedOpening.model_validate_json(raw)
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None
    now = time.time()
    with state.session() as s:
        audit = _open_audit(s, audit_id, enclave.id, now)
        expected = (audit.id, audit.job_id, audit.step, audit.recipient_public_key, enclave.id)
    problems = []
    if (sealed.audit_id, sealed.job_id, sealed.step, sealed.recipient_public_key, sealed.enclave_id) != expected:
        problems.append("opening names a different audit, job, step, key or enclave")
    if not verify_sealed_opening(sealed, b64d(enclave.signing_public_key)):
        problems.append("opening signature does not verify")
    if problems:
        raise _error(422, "bad_opening", "; ".join(problems))

    data = sealed.model_dump_json().encode()
    blob_id, digest, size = state.blobs.put(data)
    with state.session() as s, s.begin():
        audit = _open_audit(s, audit_id, enclave.id, now)
        s.add(
            Blob(
                id=blob_id, owner_kind="audit", owner_id=audit.id, job_id=None, size=size, sha256=digest,
                created_at=now, expires_at=now + _setting(state, "audit_opening_ttl_s", OPENING_TTL_S),
            )
        )
        audit.status, audit.answered_at, audit.opening_blob_id = "answered", now, blob_id
    return {"ok": True}


@router.post("/miner/v1/audits/{audit_id}/fail")
async def fail_audit(audit_id: str, request: Request, auth=Depends(require_enclave)):
    state = gw(request)
    enclave, raw = auth
    try:
        body = AuditFailBody.model_validate_json(raw)
    except ValidationError as exc:
        raise _error(422, "invalid_body", str(exc.errors()[:3])) from None
    with state.session() as s, s.begin():
        audit = _open_audit(s, audit_id, enclave.id, time.time())
        audit.status, audit.error_code, audit.error, audit.answered_at = "failed", body.code, body.message, time.time()
    return {"ok": True}


# ------------------------------------------------------------------ janitor


def expire_audits(state, now: float | None = None) -> int:
    """Marks audits past their deadline expired and drops rows older than the opening TTL.

    Opening blobs carry their own expiry, so the regular blob janitor deletes them.
    Returns how many audits expired in this pass.
    """
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        rows = s.scalars(select(Audit).where(Audit.status.in_(OPEN_STATUSES), Audit.expires_at <= now)).all()
        for audit in rows:
            audit.status = "expired"
        s.execute(delete(Audit).where(Audit.created_at < now - _setting(state, "audit_opening_ttl_s", OPENING_TTL_S)))
    return len(rows)
