"""Endpoints validators score from. They expose receipts and attestation evidence, never content,
but job timings and models per job are still metadata worth keeping to registered validators."""

from __future__ import annotations

import json
import re
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select

from kuno_protocol.schemas import GenerationParams, JobState

from .auth import gw, require_validator
from .db import Account, Challenge, Enclave, Job
from .state import enclave_public

router = APIRouter(prefix="/validator/v1", tags=["validator"])

_NONCE = re.compile(r"^[0-9a-f]{64}$")


class ChallengeCreate(BaseModel):
    enclave_id: str
    nonce: str


@router.get("/enclaves")
async def enclaves(request: Request, _validator: Account = Depends(require_validator)):
    with gw(request).session() as s:
        return [enclave_public(e) for e in s.scalars(select(Enclave)).all()]


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
