"""Endpoints validators score from. They expose receipts and attestation evidence, never content,
but job timings and models per job are still metadata worth keeping to registered validators."""

from __future__ import annotations

import json
import re
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ValidationError
from sqlalchemy import delete, select

from kuno_protocol.findings import SignedFindings, verify_findings
from kuno_protocol.schemas import GenerationParams, JobState

from .auth import gw, require_validator
from .db import Account, Challenge, Enclave, Job, ValidatorFindings
from .state import enclave_public

router = APIRouter(prefix="/validator/v1", tags=["validator"])

_NONCE = re.compile(r"^[0-9a-f]{64}$")


class ChallengeCreate(BaseModel):
    enclave_id: str
    nonce: str


@router.get("/enclaves")
async def enclaves(request: Request, _validator: Account = Depends(require_validator)):
    state = gw(request)
    with state.session() as s:
        hardware = state.enclave_hardware(s)
        return [enclave_public(e, hardware.get(e.id)) for e in s.scalars(select(Enclave)).all()]


@router.get("/ledger")
async def ledger(request: Request, since: float = 0.0, limit: int = 1000, _validator: Account = Depends(require_validator)):
    """Finished jobs with their receipts. Canary jobs look like any other job here."""
    with gw(request).session() as s:
        rows = s.execute(
            select(Job, Enclave.miner_hotkey)
            .join(Enclave, Enclave.id == Job.enclave_id)
            .where(Job.finished_at.is_not(None), Job.finished_at > since)
            .order_by(Job.finished_at)
            .limit(min(limit, 5000))
        ).all()
    out = []
    for job, hotkey in rows:
        params = GenerationParams.model_validate_json(job.params)
        out.append(
            {
                "job_id": job.id,
                "enclave_id": job.enclave_id,
                "miner_hotkey": hotkey,
                "profile_id": job.profile_id,
                "status": job.status,
                "error_code": job.error_code,
                # "private" or "standard": validators audit standard jobs, and a private receipt from an open-tier enclave is fraud.
                "privacy": getattr(job, "privacy", None) or "private",
                # USD of real customer money the job earned the network: 0 for validator accounts' jobs (canaries and
                # benchmarks), for jobs that didn't succeed (refunded), and for credit nobody paid for (ledger.paid_share).
                "billable_usd": float(job.billable_usd or 0.0) if job.status == JobState.SUCCEEDED.value else 0.0,
                # The full public params, so validators bind what they pay for to the signed params digest.
                "params": params.model_dump(mode="json"),
                "duration_s": params.duration_s,
                "resolution": params.resolution,
                "created_at": job.created_at,
                "started_at": job.started_at,
                "finished_at": job.finished_at,
                "receipt": json.loads(job.receipt) if job.receipt else None,
            }
        )
    return out


@router.post("/challenges", status_code=201)
async def create_challenge(body: ChallengeCreate, request: Request, validator: Account = Depends(require_validator)):
    if not _NONCE.match(body.nonce):
        raise HTTPException(422, {"code": "bad_nonce", "message": "Nonce must be 32 random bytes, hex encoded."})
    state = gw(request)
    challenge_id = secrets.token_hex(16)
    with state.session() as s, s.begin():
        if s.get(Enclave, body.enclave_id) is None:
            raise HTTPException(404, {"code": "not_found", "message": "Unknown enclave."})
        s.add(
            Challenge(
                id=challenge_id,
                enclave_id=body.enclave_id,
                requested_by=validator.id,
                nonce=body.nonce,
                status="pending",
                created_at=time.time(),
            )
        )
    return {"challenge_id": challenge_id}


@router.get("/challenges/{challenge_id}")
async def get_challenge(challenge_id: str, request: Request, validator: Account = Depends(require_validator)):
    with gw(request).session() as s:
        challenge = s.get(Challenge, challenge_id)
    if challenge is None or challenge.requested_by != validator.id:
        raise HTTPException(404, {"code": "not_found", "message": "No such challenge."})
    return {
        "challenge_id": challenge.id,
        "enclave_id": challenge.enclave_id,
        "status": challenge.status,
        "evidence": json.loads(challenge.evidence) if challenge.evidence else None,
    }


# ---------------------------------------------------------------- findings: main validator -> auditors


@router.post("/findings", status_code=201)
async def publish_findings(request: Request, validator: Account = Depends(require_validator)):
    """The main validator's signed findings for a round. Auditors verify the signature themselves; the gateway checks it
    too, so a forged or foreign report is refused here rather than served."""
    state = gw(request)
    try:
        signed = SignedFindings.model_validate(await request.json())
    except (ValidationError, ValueError) as exc:
        raise HTTPException(422, {"code": "bad_findings", "message": f"Not a signed findings report: {str(exc)[:200]}"}) from None
    hotkey = signed.report.validator_hotkey
    if state.settings.main_validator_hotkey and hotkey != state.settings.main_validator_hotkey:
        raise HTTPException(403, {"code": "not_main_validator", "message": "Only the main validator publishes findings."})
    ok, detail = verify_findings(signed, hotkey)
    if not ok:
        raise HTTPException(422, {"code": "bad_signature", "message": detail})
    now = time.time()
    with state.session() as s, s.begin():
        s.execute(delete(ValidatorFindings).where(ValidatorFindings.issued_at < now - state.settings.findings_retention_s))
        s.add(ValidatorFindings(
            validator_hotkey=hotkey, issued_at=signed.report.issued_at, received_at=now, submitted_by=validator.id,
            document=signed.model_dump_json(),
        ))
    return {"accepted": True, "findings": len(signed.report.findings)}


@router.get("/findings")
async def list_findings(request: Request, since: float = 0.0, limit: int = 200, _validator: Account = Depends(require_validator)):
    """Signed findings reports issued after `since`, oldest first. Verify each against the main validator's hotkey."""
    with gw(request).session() as s:
        rows = s.scalars(
            select(ValidatorFindings).where(ValidatorFindings.issued_at > since).order_by(ValidatorFindings.issued_at).limit(min(limit, 1000))
        ).all()
    return [json.loads(row.document) for row in rows]
