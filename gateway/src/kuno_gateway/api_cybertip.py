"""CyberTipline reports: the operator API (MODERATION.md, "CyberTipline reports"; cybertip.py).

Moderators read the configuration and reports, prepare a draft from an item under a child-safety hold and run dry
runs. Only an admin confirms a submission or cancels a report. The gateway never submits on its own. Every step is in
the audit log under the operator's email.
"""

from __future__ import annotations

import asyncio
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from . import cybertip, roles
from .auth import gw, operator_name, require_operator
from .db_cybertip import CybertipReport

router = APIRouter(prefix="/admin/v1/cybertip", tags=["cybertip"], dependencies=[Depends(require_operator(roles.MODERATOR))])
ADMIN_ONLY = [Depends(require_operator(roles.ADMIN))]


def _http(exc: cybertip.CybertipError) -> HTTPException:
    return HTTPException(exc.status, {"code": exc.code, "message": exc.message, **exc.extra})


class PrepareBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=1, max_length=32)
    # Default: "Child Pornography (possession, manufacture, and distribution)", NCMEC's term.
    incident_type: str | None = Field(default=None, max_length=96)
    industry_classification: Literal["A1", "A2", "B1", "B2"] | None = None
    additional_info: str | None = Field(default=None, max_length=4000)


class SubmitBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # The admin's explicit confirmation that they reviewed the draft.
    confirm: Literal[True]
    note: str = Field(min_length=1, max_length=2000)


class CancelBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    note: str = Field(min_length=1, max_length=2000)


@router.get("/config")
async def config(request: Request):
    try:
        return cybertip.config_json(gw(request).settings)
    except cybertip.CybertipError as exc:
        raise _http(exc) from None


@router.get("/items/{item_id}")
async def item(item_id: str, request: Request):
    """Whether a report can be prepared for this item, and the reports it already has."""
    state = gw(request)
    with state.session() as s:
        try:
            return cybertip.item_json(s, item_id, state.settings, time.time())
        except cybertip.CybertipError as exc:
            raise _http(exc) from None


@router.post("/reports", status_code=201)
async def prepare(body: PrepareBody, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    try:
        with state.session() as s, s.begin():
            report = cybertip.prepare(
                state, s, item_id=body.item_id, by=by, now=now, incident_type=body.incident_type,
                industry_classification=body.industry_classification, additional_info=body.additional_info,
            )
            return cybertip.report_json(s, report, state.settings)
    except cybertip.CybertipError as exc:
        raise _http(exc) from None


@router.get("/reports")
async def list_reports(
    request: Request, status: Literal["all", "draft", "dry_run", "submitting", "submitted", "failed", "canceled"] = "all",
    item_id: str | None = None, limit: int = 100,
):
    state = gw(request)
    with state.session() as s:
        query = select(CybertipReport).order_by(CybertipReport.created_at.desc()).limit(min(max(limit, 1), 500))
        if status != "all":
            query = query.where(CybertipReport.status == status)
        if item_id:
            query = query.where(CybertipReport.item_id == item_id)
        return [cybertip.report_json(s, r, state.settings, include_xml=False) for r in s.scalars(query).all()]


@router.get("/reports/{report_id}")
async def get_report(report_id: str, request: Request):
    state = gw(request)
    with state.session() as s:
        report = s.get(CybertipReport, report_id)
        if report is None:
            raise HTTPException(404, {"code": "not_found", "message": "No such CyberTipline report."})
        return cybertip.report_json(s, report, state.settings)


@router.post("/reports/{report_id}/dry-run")
async def dry_run(report_id: str, request: Request):
    """Builds and validates the XML and stores it. Sends nothing."""
    state = gw(request)
    try:
        return await asyncio.to_thread(cybertip.dry_run, state, report_id, operator_name(request))
    except cybertip.CybertipError as exc:
        raise _http(exc) from None


@router.post("/reports/{report_id}/submit", dependencies=ADMIN_ONLY)
async def submit(report_id: str, body: SubmitBody, request: Request):
    """The admin's confirmation. With KUNO_CYBERTIP_ENV=disabled (the default) this is a dry run recorded as confirmed."""
    state = gw(request)
    try:
        return await asyncio.to_thread(cybertip.confirm_and_submit, state, report_id, operator_name(request), body.note)
    except cybertip.CybertipError as exc:
        raise _http(exc) from None


@router.post("/reports/{report_id}/cancel", dependencies=ADMIN_ONLY)
async def cancel(report_id: str, body: CancelBody, request: Request):
    state = gw(request)
    try:
        return await asyncio.to_thread(cybertip.cancel, state, report_id, operator_name(request), body.note)
    except cybertip.CybertipError as exc:
        raise _http(exc) from None
