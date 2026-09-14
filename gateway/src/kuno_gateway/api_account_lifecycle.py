"""Your data, closing your account and appeals: the signed-in customer's routes (STANDARD_MODE.md, "Your data",
"Closing an account", "Appeals"). Web session only, like the rest of /v1/me; an API key gets 401.
"""

from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Literal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from . import account_closure, account_export, appeals, identity, ledger
from .api_auth import LINKS_PER_EMAIL, _safe_next
from .auth import SignedIn, gw, require_user
from .db import Account
from .db_lifecycle import AccountExport, Appeal
from .vault import StorageKeyMissing, vault

log = logging.getLogger("kuno.account")

router = APIRouter(prefix="/v1", tags=["account lifecycle"])

REAUTH_NEXT = "/account?closing=1#close-account"


def _error(status: int, code: str, message: str, **extra) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message, **extra})


def _account(s: Session, who: SignedIn) -> Account:
    account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise _error(409, "no_account", "This user has no account yet. Sign in again.")
    return account


# ------------------------------------------------------------------ data export


@router.post("/me/exports", status_code=202)
async def request_export(request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    try:
        vault(state)
    except StorageKeyMissing:
        raise _error(503, "export_unavailable", "Data exports aren't available on this gateway right now.") from None
    try:
        with state.session() as s, s.begin():
            account = _account(s, who)
            payload = account_export.export_json(account_export.request_export(s, account.id, time.time()))
    except account_export.ExportInProgress as exc:
        raise _error(409, "export_in_progress", "A copy of this account is already being prepared.", export=exc.payload) from None
    except IntegrityError:
        raise _error(409, "export_in_progress", "A copy of this account is already being prepared.") from None
    return payload


@router.get("/me/exports")
async def list_exports(request: Request, who: SignedIn = Depends(require_user), limit: int = 20):
    with gw(request).session() as s:
        account = _account(s, who)
        rows = s.scalars(
            select(AccountExport)
            .where(AccountExport.account_id == account.id)
            .order_by(AccountExport.created_at.desc())
            .limit(min(max(limit, 1), 100))
        ).all()
        return [account_export.export_json(row) for row in rows]


@router.get("/me/exports/{export_id}/download")
async def download_export(export_id: str, request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    with state.session() as s:
        account = _account(s, who)
        row = s.get(AccountExport, export_id)
    if row is None or row.account_id != account.id:
        raise _error(404, "not_found", "No such export.")
    if row.status in account_export.IN_PROGRESS:
        raise _error(409, "not_ready", "This export is still being prepared.")
    expired = row.status in (account_export.EXPIRED, account_export.DELETED) or (
        row.status == account_export.READY and (row.expires_at or 0) <= time.time()
    )
    if expired:
        raise _error(410, "expired", "This export was deleted 7 days after it was ready. Request a new one.")
    if row.status != account_export.READY:
        raise _error(409, "export_failed", "This export couldn't be prepared. Request a new one.")
    try:
        chunks = await asyncio.to_thread(account_export.download_chunks, state, row)
    except StorageKeyMissing:
        raise _error(503, "export_unavailable", "Data exports aren't available on this gateway right now.") from None
    except KeyError:
        raise _error(410, "expired", "This export is no longer stored. Request a new one.") from None
    stamp = datetime.fromtimestamp(row.finished_at or row.created_at, tz=timezone.utc).strftime("%Y%m%d")
    return StreamingResponse(
        chunks,
        media_type="application/zip",
        headers={
            "content-disposition": f'attachment; filename="kunoworld-export-{stamp}.zip"',
            "content-length": str(row.size_bytes),
            "cache-control": "no-store",
        },
    )


# ------------------------------------------------------------------ closing the account


class ReauthBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    next: str | None = Field(default=None, max_length=200)


class CloseBody(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirm_email: str = Field(min_length=1, max_length=320)


@router.get("/me/close")
async def closure_preview(request: Request, who: SignedIn = Depends(require_user)):
    """What closing would do, and whether this session may do it now or must confirm it's the owner first."""
    now = time.time()
    with gw(request).session() as s:
        account = _account(s, who)
    fresh = account_closure.reauth_fresh(who.session, now)
    return {
        "email": who.user.email,
        "account_id": account.id,
        "reauth_required": not fresh,
        "reauth_expires_at": account_closure.reauth_expires_at(who.session) if fresh else None,
        "reauth_window_s": account_closure.REAUTH_WINDOW_S,
        "balance_usd": ledger.to_usd(account.balance_micros),
        "balance_policy": account_closure.BALANCE_POLICY,
        "deletes": list(account_closure.DELETES),
        "records_kept": list(account_closure.RECORDS_KEPT),
        "retention_policy": account_closure.RETENTION_POLICY,
    }


@router.post("/me/reauth", status_code=202)
async def request_reauth(request: Request, body: ReauthBody | None = None, who: SignedIn = Depends(require_user)):
    """Emails the signed-in user a fresh sign-in link. The session it opens can close the account for 10 minutes."""
    state = gw(request)
    next_path = _safe_next((body.next if body else None) or REAUTH_NEXT)
    email = who.user.email
    # The same allowance as sign-in links to this address.
    if not state.limiter.allow(f"link-email:{email}", LINKS_PER_EMAIL, identity.AUTH_LIMIT_WINDOW_S):
        raise _error(429, "rate_limited", "Too many sign-in links requested. Wait a few minutes and try again.")
    with state.session() as s, s.begin():
        token = identity.issue_login_token(s, email, state.settings.login_token_ttl_s)
    link = f"{state.settings.site_url.rstrip('/')}/auth/verify?token={token}&next={quote(next_path, safe='/')}"
    message = account_closure.reauth_message(email, link, state.settings.login_token_ttl_s // 60)
    try:
        await asyncio.to_thread(state.mailer.send, message)
    except Exception:
        log.exception("sending a re-authentication email failed")
        raise _error(503, "email_unavailable", "We couldn't send the email just now. Try again shortly.") from None
    return {"sent": True}


@router.post("/me/close")
async def close_account(body: CloseBody, request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    now = time.time()
    if not account_closure.reauth_fresh(who.session, now):
        raise _error(
            403, "reauth_required",
            "To close the account, confirm it's you first: open the sign-in link we email you, then close it within 10 minutes.",
            reauth_window_s=account_closure.REAUTH_WINDOW_S,
        )
    if identity.normalize_email(body.confirm_email) != who.user.email:
        raise _error(422, "email_mismatch", "Type this account's email address exactly to confirm.")
    try:
        with state.session() as s, s.begin():
            result = account_closure.close(state, s, who.user.id, now)
            payload = account_closure.closure_json(result)
            message = account_closure.closed_message(result.email, result.closure)
    except account_closure.AlreadyClosed:
        raise _error(409, "already_closed", "This account is already closed.") from None
    except LookupError:
        raise _error(409, "no_account", "This user has no account.") from None
    try:
        await asyncio.to_thread(state.mailer.send, message)
    except Exception:  # the account is closed either way
        log.exception("sending the account-closed email failed")
    return payload


# ------------------------------------------------------------------ appeals


class AppealCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    subject_kind: Literal["strike", "restriction", "removal", "report_resolution"]
    subject_id: str = Field(min_length=1, max_length=64)
    statement: str = Field(min_length=1, max_length=appeals.MAX_STATEMENT)


@router.get("/me/standing")
async def my_standing(request: Request, who: SignedIn = Depends(require_user)):
    """Strikes, restrictions, removals and report resolutions on the account, and which can be appealed."""
    with gw(request).session() as s:
        return appeals.standing(s, _account(s, who).id, time.time())


@router.get("/me/appeals")
async def my_appeals(request: Request, who: SignedIn = Depends(require_user), limit: int = 50):
    with gw(request).session() as s:
        account = _account(s, who)
        rows = s.scalars(
            select(Appeal).where(Appeal.account_id == account.id).order_by(Appeal.created_at.desc()).limit(min(max(limit, 1), 200))
        ).all()
        return [appeals.owner_json(a) for a in rows]


@router.post("/me/appeals", status_code=201)
async def create_appeal(body: AppealCreate, request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    try:
        with state.session() as s, s.begin():
            account = _account(s, who)
            appeal = appeals.create(s, account.id, who.user.id, body.subject_kind, body.subject_id, body.statement, time.time())
            payload = appeals.owner_json(appeal)
    except appeals.AppealError as exc:
        raise _error(exc.status, exc.code, exc.message) from None
    except IntegrityError:
        raise _error(409, "appeal_open", "There's already an open appeal about this.") from None
    return payload
