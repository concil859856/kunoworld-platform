"""Public abuse reports (STANDARD_MODE.md, "Reports"). No credential needed; rate-limited per IP."""

from __future__ import annotations

import time
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from kuno_protocol.canonical import b64d
from kuno_protocol.schemas import JobState
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select

from . import holds, identity, moderation, standard_jobs
from .api_auth import _client_ip
from .auth import gw
from .db import Job
from .db_moderation import Report
from .vault import StorageKeyMissing, vault

router = APIRouter(prefix="/v1", tags=["reports"])

ReportReason = Literal["csam", "sexual_minor", "nonconsensual_intimate", "violent_extremism", "harassment", "copyright", "other"]
# The only reasons a report may carry a private video's output_key.
KEY_REASONS = ("csam", "sexual_minor")


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


class ReportCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_digest: str | None = Field(default=None, pattern=r"^[0-9a-fA-F]{64}$")
    job_id: str | None = Field(default=None, max_length=36)
    url: str | None = Field(default=None, max_length=2000)
    reason: ReportReason
    details: str | None = Field(default=None, max_length=5000)
    output_key: str | None = Field(default=None, max_length=100)
    contact_email: str | None = Field(default=None, max_length=320)

    @model_validator(mode="after")
    def _names_something(self):
        if not (self.content_digest or self.job_id or self.url):
            raise ValueError("a report needs a content_digest, job_id or url")
        return self


@router.post("/reports", status_code=202)
async def create_report(body: ReportCreate, request: Request):
    state = gw(request)
    if not state.limiter.allow(f"reports:{_client_ip(request)}", state.settings.reports_per_hour_per_ip, 3600):
        raise _error(429, "rate_limited", "Too many reports from this network. Try again later.")
    output_key = None
    if body.output_key:
        if body.reason not in KEY_REASONS:
            # Operators may only open content reported as child sexual abuse material (api_moderation.content_access),
            # so a key is taken only with those reports and never stored for any other.
            raise _error(422, "key_not_accepted", "A video key can only be included with a csam or sexual_minor report.")
        try:
            output_key = b64d(body.output_key)
        except ValueError:
            output_key = b""
        if len(output_key) != 32:
            raise _error(422, "invalid_output_key", "output_key must be the video's 32-byte key, base64url encoded.")
    email = None
    if body.contact_email:
        email = identity.normalize_email(body.contact_email)
        if email is None:
            raise _error(422, "invalid_email", "Enter a valid contact email address or leave it out.")
    try:
        store = vault(state)
    except StorageKeyMissing:
        if output_key is not None:
            raise _error(503, "report_keys_unavailable", "Reports with a key can't be accepted right now.") from None
        store = None
    now = time.time()
    report_id = moderation.new_id()
    digest = body.content_digest.lower() if body.content_digest else None
    with state.session() as s, s.begin():
        job = s.get(Job, body.job_id) if body.job_id else None
        if job is None and digest:
            job = s.scalars(select(Job).where(Job.content_digest == digest, Job.status == JobState.SUCCEEDED.value)).first()
        priority = moderation.PRIORITY.get(body.reason, moderation.DEFAULT_REPORT_PRIORITY)
        s.add(
            Report(
                id=report_id, status="open", reason=body.reason, priority=priority, job_id=job.id if job else None,
                content_digest=digest or (job.content_digest if job else None), url=body.url, details=body.details,
                output_key=store.seal_secret(standard_jobs.report_key_label(report_id), output_key) if output_key else None,
                contact_email=email, reporter_ip_hash=store.keyed_hash(_client_ip(request)) if store else None,
                account_id=job.account_id if job else None, created_at=now,
            )
        )
        # Apparent CSAM: preserve the reported job at once, so it can't be deleted or expire before review.
        holds.provisional_hold_for_report(s, state.settings, report_id, body.reason, job, now)
        moderation.add_item(
            s, "report", priority, report_id=report_id, job_id=job.id if job else None,
            account_id=job.account_id if job else None, detail={"reason": body.reason}, now=now,
        )
    # The same answer whether or not the job exists, so reports can't probe for job ids.
    return {"report_id": report_id}
