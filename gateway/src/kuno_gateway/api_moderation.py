"""Operator moderation (STANDARD_MODE.md "Operators", MODERATION.md). Every action lands in the audit log.

Operators sign in by email and hold a role (roles.py); the audit log records their email. Moderators handle reports,
the queue, items and holds; restricting accounts, releasing holds and reading the audit log need `admin`.

Only a video's owner can open it. An operator may open an item's content (video, blocked upload, Standard prompt)
only for an open report of `csam` or `sexual_minor`, or under an active preservation hold whose reason is
`report_csam`, `report_sexual_minor`, `upload_match`, `output_match` or `legal_request` (`content_access`). Everything
else is metadata only. Every content view is logged.
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from kuno_protocol.crypto import DecryptionError

from . import holds, moderation, roles, standard_jobs
from .auth import gw, operator_name, require_operator
from .db import Account, Blob, Job
from .db_holds import PreservationHold
from .db_moderation import ModerationItem, OperatorAction, Report, StandardJob, StandardUpload
from .vault import StorageKeyMissing, vault

router = APIRouter(prefix="/admin/v1", tags=["moderation"], dependencies=[Depends(require_operator(roles.MODERATOR))])
ADMIN_ONLY = [Depends(require_operator(roles.ADMIN))]

Action = Literal["dismiss", "remove_content", "restrict_account", "ban_account"]
DEFAULT_RESTRICTION_S = 7 * 86400

# Reports whose content an operator may review (the only reasons a report may carry a private video's key).
ILLEGAL_REPORT_REASONS = ("csam", "sexual_minor")
# Holds under which an operator may review the held content.
REVIEWABLE_HOLD_REASONS = ("report_csam", "report_sexual_minor", "upload_match", "output_match", "legal_request")


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


class ResolveBody(BaseModel):
    action: Action
    note: str = Field(min_length=1, max_length=2000)
    # restrict_account only: when the restriction ends (epoch seconds). Default: 7 days.
    until: float | None = None


class RestrictBody(BaseModel):
    # Epoch seconds; null restricts until an operator lifts it.
    until: float | None = None
    reason: str = Field(min_length=1, max_length=2000)


class UnrestrictBody(BaseModel):
    reason: str | None = Field(default=None, max_length=2000)


HoldReason = Literal["report_csam", "report_sexual_minor", "upload_match", "legal_request", "operator"]


class HoldCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str | None = Field(default=None, max_length=36)
    upload_id: str | None = Field(default=None, max_length=32)
    reason: HoldReason
    # Default: KUNO_PRESERVATION_DAYS (365).
    days: float | None = Field(default=None, gt=0, le=3650)
    note: str = Field(min_length=1, max_length=2000)

    @model_validator(mode="after")
    def _one_target(self):
        if (self.job_id is None) == (self.upload_id is None):
            raise ValueError("name exactly one of job_id and upload_id")
        return self


class HoldRelease(BaseModel):
    note: str = Field(min_length=1, max_length=2000)


# ------------------------------------------------------------------ who may see content


def content_access(
    s: Session, now: float, *, report: Report | None, job_id: str | None, upload_id: str | None = None,
) -> str | None:
    """The basis on which an operator may open this content, or None (metadata only).

    An open report of csam or sexual_minor, or an active hold with a reviewable reason on the job or upload.
    """
    if report is not None and report.status == "open" and report.reason in ILLEGAL_REPORT_REASONS:
        return f"report:{report.reason}"
    candidates: list[PreservationHold] = []
    if job_id is not None:
        candidates += holds.active_holds(s, now, job_id=job_id)
    if upload_id is not None:
        candidates += holds.active_holds(s, now, upload_id=upload_id)
    for hold in candidates:
        if hold.reason in REVIEWABLE_HOLD_REASONS:
            return f"hold:{hold.reason}"
    return None


def _item_access(s: Session, item: ModerationItem, now: float) -> str | None:
    report = s.get(Report, item.report_id) if item.report_id else None
    detail = json.loads(item.detail) if item.detail else {}
    upload_id = None if item.job_id else detail.get("upload_id")
    return content_access(s, now, report=report, job_id=item.job_id, upload_id=upload_id)


# ------------------------------------------------------------------ JSON


def _preserved(s: Session, hold: PreservationHold) -> dict:
    """What the gateway still stores for the hold's target. Counts and flags only, never content."""
    if hold.job_id is not None:
        out: dict = {
            "sealed_blobs": s.scalar(select(func.count()).select_from(Blob).where(Blob.job_id == hold.job_id)) or 0,
        }
        row = s.get(StandardJob, hold.job_id)
        if row is not None:
            out.update(
                video=row.video_blob_id is not None,
                prompt=row.prompt is not None,
                uploads=s.scalar(
                    select(func.count()).select_from(StandardUpload)
                    .where(StandardUpload.job_id == hold.job_id, StandardUpload.blob_id.is_not(None))
                ) or 0,
                hidden=row.deleted_at is not None,
            )
        if hold.blob_id is not None:
            # A refused output kept in the hold's own blob (output_scan.py).
            out["blocked_output"] = True
        return out
    upload = s.get(StandardUpload, hold.upload_id)
    return {"upload": hold.blob_id is not None or bool(upload and upload.blob_id)}


def hold_json(s: Session, hold: PreservationHold, now: float) -> dict:
    status = "released" if hold.released_at is not None else ("expired" if hold.expires_at <= now else "active")
    return {
        "hold_id": hold.id,
        "status": status,
        "reason": hold.reason,
        "job_id": hold.job_id,
        "upload_id": hold.upload_id,
        "account_id": hold.account_id,
        "report_id": hold.report_id,
        "has_output_key": hold.output_key is not None,
        "created_by": hold.created_by,
        "created_at": hold.created_at,
        "expires_at": hold.expires_at,
        "released_at": hold.released_at,
        "released_by": hold.released_by,
        "note": hold.note,
        "release_note": hold.release_note,
        "preserved": _preserved(s, hold),
    }


def _holds_for(s: Session, now: float, *, job_id: str | None = None, upload_id: str | None = None) -> list[dict]:
    if job_id is None and upload_id is None:
        return []
    column, value = (PreservationHold.job_id, job_id) if job_id is not None else (PreservationHold.upload_id, upload_id)
    rows = s.scalars(select(PreservationHold).where(column == value).order_by(PreservationHold.created_at.desc())).all()
    return [hold_json(s, h, now) for h in rows]


def report_json(report: Report) -> dict:
    return {
        "report_id": report.id,
        "status": report.status,
        "reason": report.reason,
        "priority": report.priority,
        "job_id": report.job_id,
        "content_digest": report.content_digest,
        "url": report.url,
        "details": report.details,
        "contact_email": report.contact_email,
        "has_output_key": report.output_key is not None,
        "account_id": report.account_id,
        "created_at": report.created_at,
        "resolved_at": report.resolved_at,
        "resolved_by": report.resolved_by,
        "resolution": report.resolution,
        "resolution_note": report.resolution_note,
    }


def _job_json(s: Session, job: Job | None, report: Report | None, *, reviewable: bool, show_prompt: bool = False) -> dict | None:
    """Job metadata. `has_video` means a video exists that this operator may open; the prompt is only included when
    `show_prompt` (item detail of reviewable content, logged by the caller)."""
    if job is None:
        return None
    now = time.time()
    out = {
        "job_id": job.id, "privacy": job.privacy, "account_id": job.account_id, "profile_id": job.profile_id,
        "status": job.status, "error_code": job.error_code, "created_at": job.created_at, "content_digest": job.content_digest,
        "held": holds.job_held(s, job.id, now),
    }
    if job.privacy == standard_jobs.STANDARD:
        row = s.get(StandardJob, job.id)
        out.update(
            prompt=row.prompt if (row and show_prompt) else None,
            negative_prompt=row.negative_prompt if (row and show_prompt) else None,
            has_prompt=bool(row and (row.prompt or row.shots or row.plan)),
            has_video=bool(reviewable and row and row.video_blob_id),
            deleted=row.delete_reason if row and row.deleted_at else None,
        )
        if row is not None and row.shots is not None:
            # A storyboard's shot prompts are part of its prompt: shown, and logged, exactly when the prompt is.
            out["shots"] = standard_jobs.shots_json(row) if show_prompt else None
        if standard_jobs.is_plan(job):
            # A plan job's prompt is its brief, and the plan it delivered is prompts too: shown exactly when the prompt is.
            out["plan"] = standard_jobs.plan_json(row) if (row is not None and show_prompt) else None
    else:
        # Private content is reviewable only through a key a report handed over (kept by a hold after resolution).
        has_key = bool(report and report.output_key) or any(
            h.output_key is not None for h in holds.active_holds(s, now, job_id=job.id)
        )
        out.update(prompt=None, has_prompt=False, has_video=bool(reviewable and has_key and job.output_blob_id))
    out["holds"] = _holds_for(s, now, job_id=job.id)
    return out


def _item_json(s: Session, item: ModerationItem, *, show_prompt: bool = False) -> dict:
    now = time.time()
    report = s.get(Report, item.report_id) if item.report_id else None
    job = s.get(Job, item.job_id) if item.job_id else None
    detail = json.loads(item.detail) if item.detail else None
    access = _item_access(s, item, now)
    job_out = _job_json(s, job, report, reviewable=access is not None, show_prompt=show_prompt and access is not None)
    if job_out is not None and item.kind == "output_match":
        # A refused output is kept only in its hold's blob, never as the owner's video.
        job_out["has_video"] = access is not None and holds.output_hold(s, job.id, now) is not None
    return {
        "item_id": item.id,
        "kind": item.kind,
        "status": item.status,
        "priority": item.priority,
        "account_id": item.account_id,
        "created_at": item.created_at,
        "detail": detail,
        "report": report_json(report) if report else None,
        # Whether an operator may open this item's content now, and on what basis ("report:csam", "hold:legal_request").
        "content_reviewable": access is not None,
        "content_access": access,
        "job": job_out,
        "resolution": item.resolution,
        # Holds on the item's job, or on a blocked upload's stored file.
        "holds": _holds_for(s, now, job_id=item.job_id, upload_id=None if item.job_id else (detail or {}).get("upload_id")),
    }


# ------------------------------------------------------------------ actions


def _apply(
    state, s: Session, action: str, *, job: Job | None, account_id: str | None, note: str, by: str, now: float,
    until: float | None = None, report: Report | None = None,
) -> dict:
    detail: dict = {"action": action}
    if action == "dismiss" and report is not None:
        released = holds.release_provisional_for_report(state, s, report, by, note, now)
        if released:
            detail["released_holds"] = released
    if action == "remove_content" and job is None:
        raise _error(422, "no_target", "This item names no job whose content could be removed.")
    if report is not None and job is not None:
        # Apparent CSAM: preserve before hiding (MODERATION.md, "Preservation holds").
        hold = holds.hold_for_report(s, state.settings, report, job.id, action, by, note, now)
        if hold is not None:
            detail["hold_id"] = hold.id
    if action == "remove_content":
        row = s.get(StandardJob, job.id) if job.privacy == standard_jobs.STANDARD else None
        if row is not None:
            if row.deleted_at is None:
                standard_jobs.purge(state, s, row, "removed", now)
        else:
            detail["blobs_removed"] = standard_jobs.remove_job_blobs(state, s, job.id, now)
        detail["job_id"] = job.id
        detail["preserved"] = holds.job_held(s, job.id, now)
    elif action in ("restrict_account", "ban_account"):
        if account_id is None or s.get(Account, account_id) is None:
            raise _error(422, "no_target", "This item names no account to restrict.")
        if action == "ban_account":
            moderation.restrict(s, account_id, until=None, reason=note, source="operator", by=by, kind="ban", now=now)
        else:
            end = until if until is not None else now + DEFAULT_RESTRICTION_S
            if end <= now:
                raise _error(422, "invalid_until", "until must be in the future.")
            moderation.restrict(s, account_id, until=end, reason=note, source="operator", by=by, now=now)
            detail["until"] = end
        detail["account_id"] = account_id
    return detail


def _close(target, by: str, action: str, note: str, now: float) -> None:
    target.status = "resolved"
    target.resolved_at, target.resolved_by, target.resolution, target.resolution_note = now, by, action, note


def _resolve_report(state, s: Session, report: Report, body: ResolveBody, by: str, now: float) -> None:
    if report.status != "open":
        raise _error(409, "already_resolved", "This report is already resolved.")
    job = s.get(Job, report.job_id) if report.job_id else None
    detail = _apply(
        state, s, body.action, job=job, account_id=report.account_id, note=body.note, by=by, now=now, until=body.until,
        report=report,
    )
    _close(report, by, body.action, body.note, now)
    # The key was handed over for this review only, unless a hold preserves the private video it opens.
    if job is not None and job.privacy != standard_jobs.STANDARD and report.output_key is not None:
        try:
            keeper = holds.keep_report_key(state, s, report, job.id, now)
        except StorageKeyMissing:
            raise _error(503, "standard_unavailable", "Held keys can't be stored on this gateway.") from None
        if keeper is not None:
            detail["output_key_held_by"] = keeper.id
    report.output_key = None
    for item in s.scalars(select(ModerationItem).where(ModerationItem.report_id == report.id, ModerationItem.status == "open")).all():
        _close(item, by, body.action, body.note, now)
    moderation.log_action(s, by, f"report.{body.action}", "report", report.id, body.note, detail, now)


# ------------------------------------------------------------------ reports


@router.get("/reports")
async def list_reports(request: Request, status: Literal["open", "resolved", "all"] = "open", limit: int = 100):
    with gw(request).session() as s:
        query = select(Report).order_by(Report.priority.desc(), Report.created_at).limit(min(max(limit, 1), 500))
        if status != "all":
            query = query.where(Report.status == status)
        return [report_json(r) for r in s.scalars(query).all()]


@router.post("/reports/{report_id}/resolve")
async def resolve_report(report_id: str, body: ResolveBody, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    with state.session() as s, s.begin():
        report = s.get(Report, report_id)
        if report is None:
            raise _error(404, "not_found", "No such report.")
        _resolve_report(state, s, report, body, by, now)
        return report_json(report)


# ------------------------------------------------------------------ queue


@router.get("/moderation/queue")
async def queue(request: Request, limit: int = 100, status: Literal["open", "resolved"] = "open"):
    with gw(request).session() as s:
        items = s.scalars(
            select(ModerationItem)
            .where(ModerationItem.status == status)
            .order_by(ModerationItem.priority.desc(), ModerationItem.created_at)
            .limit(min(max(limit, 1), 500))
        ).all()
        return [_item_json(s, item) for item in items]


@router.get("/moderation/items/{item_id}")
async def get_item(item_id: str, request: Request):
    """Item detail. A Standard job's prompt is included only when the content is reviewable, and that view is logged."""
    by = operator_name(request)
    with gw(request).session() as s, s.begin():
        item = s.get(ModerationItem, item_id)
        if item is None:
            raise _error(404, "not_found", "No such moderation item.")
        out = _item_json(s, item, show_prompt=True)
        if out["job"] and out["job"].get("prompt") is not None:
            moderation.log_action(
                s, by, "item.view_prompt", "moderation_item", item_id, None,
                {"job_id": item.job_id, "access": out["content_access"]},
            )
        return out


@router.get("/moderation/items/{item_id}/video")
async def item_video(item_id: str, request: Request):
    state = gw(request)
    by = operator_name(request)
    try:
        store = vault(state)
    except StorageKeyMissing:
        raise _error(503, "standard_unavailable", "Content review is not configured on this gateway.") from None
    now = time.time()
    media_type, action = "video/mp4", "item.view_video"
    with state.session() as s:
        item = s.get(ModerationItem, item_id)
        if item is None:
            raise _error(404, "not_found", "No such moderation item.")
        detail = json.loads(item.detail) if item.detail else {}
        job = s.get(Job, item.job_id) if item.job_id else None
        report = s.get(Report, item.report_id) if item.report_id else None
        row = s.get(StandardJob, job.id) if job is not None and job.privacy == standard_jobs.STANDARD else None
        held = job is not None and holds.job_held(s, job.id, now)
        held_key = holds.held_output_key(state, s, job.id, now) if job is not None and row is None else None
        upload_hold = holds.item_upload_hold(s, item, detail, now) if job is None else None
        output_hold = holds.output_hold(s, job.id, now) if job is not None and item.kind == "output_match" else None
        basis = _item_access(s, item, now)
    if job is None and upload_hold is None:
        raise _error(404, "no_video", "This item names no job.")
    if basis is None:
        # Only the owner opens a video. Operators get metadata unless the item is reported illegal content or legally held.
        raise _error(
            403, "content_not_reviewable",
            "Operators can open content only for an open csam or sexual_minor report, or under a csam, upload-match or "
            "legal-request preservation hold. This item is metadata only.",
        )
    if job is None:
        # A blocked upload preserved under a hold (it may be an image, not a video).
        loader, kind = (lambda: holds.open_blocked_upload(state, upload_hold, detail.get("sha256"))), "held_upload"
        media_type, action = detail.get("mime") or "application/octet-stream", "item.view_upload"
    elif output_hold is not None:
        # A finished Standard video refused by output scanning, preserved under its hold (output_scan.py).
        loader, kind = (lambda: holds.open_blocked_output(state, output_hold, detail.get("sha256"))), "held_output"
    elif job.privacy == standard_jobs.STANDARD:
        if row is None or (row.deleted_at is not None and not held):
            raise _error(410, "content_deleted", "This video's content is no longer stored.")
        if row.video_blob_id is None:
            raise _error(404, "not_ready", "This job has no stored video.")
        loader, kind = (lambda: standard_jobs.load_video(state, row)), "standard" if row.deleted_at is None else "standard_held"
    else:
        if report is not None and report.output_key is not None:
            key = store.open_secret(standard_jobs.report_key_label(report.id), report.output_key)
            kind = "private_with_report_key"
        elif held_key is not None:
            key, kind = held_key, "private_with_held_key"
        else:
            raise _error(403, "private_content", "Private videos can only be reviewed with a key supplied in a report.")
        loader = lambda: standard_jobs.open_private_output(state, job, key)
        if standard_jobs.is_plan_job(job):
            media_type, action = "application/json", "item.view_plan"
    try:
        data = await asyncio.to_thread(loader)
    except KeyError:
        raise _error(410, "content_deleted", "This content is no longer stored.") from None
    except DecryptionError:
        if kind in ("held_upload", "held_output"):
            raise _error(422, "integrity_error", "The stored content does not match its recorded digest.") from None
        raise _error(422, "key_mismatch", "The reported key does not open this job's output.") from None
    with state.session() as s, s.begin():
        moderation.log_action(
            s, by, action, "moderation_item", item_id, None,
            {"job_id": job.id if job else None, "upload_id": detail.get("upload_id") if job is None else None, "access": kind,
             "basis": basis},
        )
    return Response(content=data, media_type=media_type)


@router.post("/moderation/items/{item_id}/resolve")
async def resolve_item(item_id: str, body: ResolveBody, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    with state.session() as s, s.begin():
        item = s.get(ModerationItem, item_id)
        if item is None:
            raise _error(404, "not_found", "No such moderation item.")
        if item.status != "open":
            raise _error(409, "already_resolved", "This item is already resolved.")
        if item.kind == "appeal":
            # Appeals are decided with uphold or overturn (api_appeals.py), which apply the effects and tell the customer.
            raise _error(409, "appeal_item", "Decide an appeal with POST /admin/v1/appeals/{appeal_id}/resolve.")
        report = s.get(Report, item.report_id) if item.report_id else None
        if report is not None and report.status == "open":
            _resolve_report(state, s, report, body, by, now)
        else:
            job = s.get(Job, item.job_id) if item.job_id else None
            account_id = item.account_id or (job.account_id if job else None)
            detail = _apply(state, s, body.action, job=job, account_id=account_id, note=body.note, by=by, now=now, until=body.until)
            _close(item, by, body.action, body.note, now)
            moderation.log_action(s, by, f"item.{body.action}", "moderation_item", item.id, body.note, detail, now)
        return _item_json(s, item)


# ------------------------------------------------------------------ preservation holds


@router.post("/holds", status_code=201)
async def create_hold(body: HoldCreate, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    with state.session() as s, s.begin():
        blob_id = None
        if body.job_id is not None:
            job = s.get(Job, body.job_id)
            if job is None:
                raise _error(404, "not_found", "No such job.")
            account_id = job.account_id
        else:
            upload = s.get(StandardUpload, body.upload_id)
            if upload is not None:
                account_id = upload.account_id
            else:
                # A blocked upload: stored only under its hold, so another hold shares that stored copy.
                stored = s.scalars(
                    select(PreservationHold).where(PreservationHold.upload_id == body.upload_id, PreservationHold.blob_id.is_not(None))
                ).first()
                if stored is None:
                    raise _error(404, "not_found", "No such upload, or its content is no longer stored.")
                account_id, blob_id = stored.account_id, stored.blob_id
        hold = holds.place(
            s, state.settings, reason=body.reason, created_by=by, account_id=account_id, job_id=body.job_id,
            upload_id=body.upload_id, blob_id=blob_id, days=body.days, note=body.note, now=now,
        )
        return hold_json(s, hold, now)


@router.get("/holds")
async def list_holds(
    request: Request, status: Literal["active", "released", "all"] = "active", job_id: str | None = None,
    upload_id: str | None = None, limit: int = 100,
):
    now = time.time()
    with gw(request).session() as s:
        query = select(PreservationHold).order_by(PreservationHold.created_at.desc()).limit(min(max(limit, 1), 500))
        if status == "active":
            query = query.where(holds.active(now))
        elif status == "released":
            query = query.where(PreservationHold.released_at.is_not(None))
        if job_id:
            query = query.where(PreservationHold.job_id == job_id)
        if upload_id:
            query = query.where(PreservationHold.upload_id == upload_id)
        return [hold_json(s, h, now) for h in s.scalars(query).all()]


@router.get("/holds/{hold_id}")
async def get_hold(hold_id: str, request: Request):
    with gw(request).session() as s:
        hold = s.get(PreservationHold, hold_id)
        if hold is None:
            raise _error(404, "not_found", "No such hold.")
        return hold_json(s, hold, time.time())


@router.post("/holds/{hold_id}/release", dependencies=ADMIN_ONLY)
async def release_hold(hold_id: str, body: HoldRelease, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    with state.session() as s, s.begin():
        hold = s.get(PreservationHold, hold_id, with_for_update=state.postgres)
        if hold is None:
            raise _error(404, "not_found", "No such hold.")
        if hold.released_at is not None:
            raise _error(409, "already_released", "This hold is already released.")
        holds.release(state, s, hold, by, body.note, now)
        return hold_json(s, hold, now)


# ------------------------------------------------------------------ accounts


@router.post("/accounts/{account_id}/restrict", dependencies=ADMIN_ONLY)
async def restrict_account(account_id: str, body: RestrictBody, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    if body.until is not None and body.until <= now:
        raise _error(422, "invalid_until", "until must be in the future, or null for no end.")
    with state.session() as s, s.begin():
        if s.get(Account, account_id) is None:
            raise _error(404, "not_found", "No such account.")
        moderation.restrict(s, account_id, until=body.until, reason=body.reason, source="operator", by=by, now=now)
        moderation.log_action(s, by, "account.restrict", "account", account_id, body.reason, {"until": body.until}, now)
        until = moderation.restricted_until(moderation.active_restriction(s, account_id, now))
    return {"account_id": account_id, "restricted_until": until}


@router.post("/accounts/{account_id}/unrestrict", dependencies=ADMIN_ONLY)
async def unrestrict_account(account_id: str, request: Request, body: UnrestrictBody | None = None):
    state = gw(request)
    by, now = operator_name(request), time.time()
    with state.session() as s, s.begin():
        if s.get(Account, account_id) is None:
            raise _error(404, "not_found", "No such account.")
        lifted = moderation.lift_restrictions(s, account_id, by, now)
        moderation.log_action(s, by, "account.unrestrict", "account", account_id, body.reason if body else None, {"lifted": lifted}, now)
    return {"account_id": account_id, "lifted": lifted, "restricted_until": None}


@router.get("/accounts/{account_id}/safety")
async def account_safety(account_id: str, request: Request):
    state = gw(request)
    from .db_moderation import AccountRestriction

    with state.session() as s:
        account = s.get(Account, account_id)
        if account is None:
            raise _error(404, "not_found", "No such account.")
        restrictions = s.scalars(
            select(AccountRestriction).where(AccountRestriction.account_id == account_id).order_by(AccountRestriction.created_at.desc())
        ).all()
        return {
            "account_id": account_id,
            **moderation.eligibility_json(s, state.settings, account),
            "strikes_30d": moderation.strike_counts(s, account_id, time.time())["30d"],
            "restrictions": [
                {"kind": r.kind, "until": r.until, "reason": r.reason, "source": r.source, "created_by": r.created_by,
                 "created_at": r.created_at, "lifted_at": r.lifted_at, "lifted_by": r.lifted_by}
                for r in restrictions
            ],
        }


@router.get("/audit-log", dependencies=ADMIN_ONLY)
async def audit_log(request: Request, limit: int = 100, target_id: str | None = None):
    with gw(request).session() as s:
        query = select(OperatorAction).order_by(OperatorAction.created_at.desc()).limit(min(max(limit, 1), 1000))
        if target_id:
            query = query.where(OperatorAction.target_id == target_id)
        return [
            {"id": a.id, "operator": a.operator, "action": a.action, "target_kind": a.target_kind, "target_id": a.target_id,
             "reason": a.reason, "detail": json.loads(a.detail) if a.detail else None, "created_at": a.created_at}
            for a in s.scalars(query).all()
        ]
