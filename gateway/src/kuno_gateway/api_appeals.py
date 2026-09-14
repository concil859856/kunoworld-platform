"""Operators decide appeals (MODERATION.md, "Appeals"). Moderator role. Every decision is written to the audit log and
emailed to the customer; an appeal's queue item is closed with it.
"""

from __future__ import annotations

import asyncio
import time
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select

from . import appeals, roles
from .auth import gw, operator_name, require_operator
from .db_lifecycle import Appeal

router = APIRouter(prefix="/admin/v1", tags=["appeals"], dependencies=[Depends(require_operator(roles.MODERATOR))])


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


class AppealDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    decision: Literal["uphold", "overturn"]
    # The customer reads it in the decision email and on the account page; it is also the audit log's reason.
    note: str = Field(min_length=1, max_length=2000)


@router.get("/appeals")
async def list_appeals(request: Request, status: Literal["open", "resolved", "all"] = "open", limit: int = 100):
    """Open appeals oldest first; decided ones newest first."""
    now = time.time()
    with gw(request).session() as s:
        query = select(Appeal).limit(min(max(limit, 1), 500))
        if status == "open":
            query = query.where(Appeal.status == appeals.OPEN).order_by(Appeal.created_at)
        elif status == "resolved":
            query = query.where(Appeal.status != appeals.OPEN).order_by(Appeal.resolved_at.desc())
        else:
            query = query.order_by(Appeal.created_at.desc())
        return [appeals.operator_json(s, appeal, now) for appeal in s.scalars(query).all()]


@router.get("/appeals/{appeal_id}")
async def get_appeal(appeal_id: str, request: Request):
    with gw(request).session() as s:
        appeal = s.get(Appeal, appeal_id)
        if appeal is None:
            raise _error(404, "not_found", "No such appeal.")
        return appeals.operator_json(s, appeal, time.time())


@router.post("/appeals/{appeal_id}/resolve")
async def resolve_appeal(appeal_id: str, body: AppealDecision, request: Request):
    state = gw(request)
    by, now = operator_name(request), time.time()
    note = body.note.strip()
    if not note:
        raise _error(422, "note_required", "Write a note: the customer reads it, and it goes in the audit log.")
    message = None
    try:
        with state.session() as s, s.begin():
            appeal = s.get(Appeal, appeal_id, with_for_update=state.postgres)
            if appeal is None:
                raise _error(404, "not_found", "No such appeal.")
            appeals.resolve(state, s, appeal, body.decision, note, by, now)
            to = appeals.recipient(s, appeal)
            if to is not None:
                message = appeals.outcome_message(to, appeal, state.settings.site_url)
            payload = appeals.operator_json(s, appeal, now)
    except appeals.AppealError as exc:
        raise _error(exc.status, exc.code, exc.message) from None
    if message is not None:
        payload["notified_at"] = await asyncio.to_thread(appeals.notify, state, appeal_id, message)
    return payload
