"""Standard-job content for validators (STANDARD_MODE.md "Validators").

A standard job has no privacy to protect from validators, so any registered validator may read what it asked
the miner to render and re-execute it in a step audit. Private jobs are never served here.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Request

from .auth import gw, require_validator
from .db import Account, Job
from .db_moderation import StandardJob

router = APIRouter(prefix="/validator/v1", tags=["validator"])


@router.get("/standard-jobs/{job_id}")
async def standard_job(job_id: str, request: Request, _validator: Account = Depends(require_validator)):
    with gw(request).session() as s:
        job = s.get(Job, job_id)
        row = s.get(StandardJob, job_id) if job is not None else None
    if job is None or job.privacy != "standard" or row is None:
        raise HTTPException(404, {"code": "not_found", "message": "No such standard job."})
    if row.deleted_at is not None:
        raise HTTPException(410, {"code": "content_deleted", "message": "This job's content was deleted."})
    inputs = json.loads(row.inputs) if row.inputs else []
    return {
        "job_id": job.id,
        "privacy": "standard",
        "params": json.loads(job.params),
        "prompt": row.prompt,
        "negative_prompt": row.negative_prompt,
        "seed": row.seed,
        "options": json.loads(row.options) if row.options else {},
        "inputs": [{k: i.get(k) for k in ("index", "role", "sha256", "size", "mime")} for i in inputs],
        "receipt": json.loads(job.receipt) if job.receipt else None,
    }
