"""Sign-in, sessions and API keys.

The website's server holds the long-lived web session, in an HttpOnly cookie on its own origin,
and calls these endpoints with it. The browser never sees that session: for making videos the
studio gets a short-lived studio token, which works on the job API but can't manage keys or sign
out. API keys are for programs; each is shown once, stored only as a hash, and can be revoked.
"""

from __future__ import annotations

import asyncio
import logging
import time
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import identity, ledger
from .auth import SignedIn, gw, require_user
from .db import Account, ApiKey, LedgerEntry, UserSession
from .mailer import sign_in_message

log = logging.getLogger("kuno.auth")

router = APIRouter(prefix="/v1", tags=["accounts"])

MAX_ACTIVE_KEYS = 20
LINKS_PER_EMAIL = 5
LINKS_PER_IP = 20


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _client_ip(request: Request) -> str:
    return request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "unknown")


def _safe_next(path: str | None) -> str | None:
    """Only a path on this site: an absolute or protocol-relative URL would be an open redirect."""
    if not path:
        return None
    if not path.startswith("/") or path.startswith("//") or "\\" in path:
        raise _error(422, "invalid_next", "next must be a path on this site, such as /studio.")
    return path


def _account(s: Session, who: SignedIn) -> Account:
    account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise _error(409, "no_account", "This user has no account yet. Sign in again.")
    return account


# ------------------------------------------------------------------ signing in


class MagicLinkRequest(BaseModel):
    email: str = Field(max_length=320)
    next: str | None = Field(default=None, max_length=200)


@router.post("/auth/magic-link", status_code=202)
async def request_magic_link(body: MagicLinkRequest, request: Request):
    state = gw(request)
    email = identity.normalize_email(body.email)
    if email is None:
        raise _error(422, "invalid_email", "Enter a valid email address.")
    next_path = _safe_next(body.next)
    window = identity.AUTH_LIMIT_WINDOW_S
    if not state.limiter.allow(f"link-ip:{_client_ip(request)}", LINKS_PER_IP, window) or not state.limiter.allow(
        f"link-email:{email}", LINKS_PER_EMAIL, window
    ):
        raise _error(429, "rate_limited", "Too many sign-in links requested. Wait a few minutes and try again.")
    with state.session() as s, s.begin():
        token = identity.issue_login_token(s, email, state.settings.login_token_ttl_s)
    link = f"{state.settings.site_url.rstrip('/')}/auth/verify?token={token}"
    if next_path:
        link += f"&next={quote(next_path, safe='/')}"
    try:
        await asyncio.to_thread(state.mailer.send, sign_in_message(email, link, state.settings.login_token_ttl_s // 60))
    except Exception:
        log.exception("sending a sign-in email failed")
        raise _error(503, "email_unavailable", "We couldn't send the email just now. Try again shortly.") from None
    # The same answer whether or not an account exists, so this can't be used to probe addresses.
    return {"sent": True}


class VerifyRequest(BaseModel):
    token: str = Field(min_length=16, max_length=200)


@router.post("/auth/verify")
async def verify_magic_link(body: VerifyRequest, request: Request):
    state = gw(request)
    credit = ledger.to_micros(state.settings.signup_credit_usd)
    with state.session() as s, s.begin():
        try:
            user = identity.redeem_login_token(s, body.token, credit)
        except identity.InvalidLoginToken:
            raise _error(401, "invalid_link", "This sign-in link has expired or was already used. Request a new one.") from None
        session_token, session = identity.open_session(s, user.id, identity.WEB, state.settings.web_session_ttl_s)
        payload = {
            "session_token": session_token,
            "expires_at": session.expires_at,
            "user": identity.user_json(user),
            "account": identity.account_json(identity.account_for_user(s, user.id)),
        }
    return payload


@router.post("/auth/logout", status_code=204)
async def logout(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        identity.revoke_session(s, s.get(UserSession, who.session.id))
    return Response(status_code=204)


# ------------------------------------------------------------------ the signed-in user


@router.get("/me")
async def me(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s:
        account = identity.account_for_user(s, who.user.id)
    return {"user": identity.user_json(who.user), "account": identity.account_json(account)}


@router.get("/me/keys")
async def list_keys(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s:
        account = _account(s, who)
        keys = s.scalars(select(ApiKey).where(ApiKey.account_id == account.id).order_by(ApiKey.created_at.desc())).all()
    return [identity.api_key_json(k) for k in keys]


class KeyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


@router.post("/me/keys", status_code=201)
async def create_key(body: KeyCreate, request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        account = _account(s, who)
        active = s.scalar(
            select(func.count()).select_from(ApiKey).where(ApiKey.account_id == account.id, ApiKey.revoked_at.is_(None))
        )
        if active >= MAX_ACTIVE_KEYS:
            raise _error(409, "too_many_keys", f"An account can have {MAX_ACTIVE_KEYS} active keys. Revoke one first.")
        key, row = identity.create_api_key(s, account.id, body.name.strip())
        # The only time the key itself is ever returned.
        payload = {**identity.api_key_json(row), "key": key}
    return payload


@router.delete("/me/keys/{key_id}")
async def revoke_key(key_id: str, request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        account = _account(s, who)
        row = s.get(ApiKey, key_id)
        if row is None or row.account_id != account.id:
            raise _error(404, "not_found", "No such key.")
        if row.revoked_at is None:
            row.revoked_at = time.time()
        payload = identity.api_key_json(row)
    return payload


@router.post("/me/studio-token", status_code=201)
async def studio_token(request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    with state.session() as s, s.begin():
        _account(s, who)
        ttl = min(state.settings.studio_token_ttl_s, who.session.expires_at - time.time())
        token, row = identity.open_session(s, who.user.id, identity.STUDIO, ttl, parent_id=who.session.id)
    return {"token": token, "expires_at": row.expires_at}


@router.get("/me/ledger")
async def my_ledger(request: Request, who: SignedIn = Depends(require_user), limit: int = 50):
    with gw(request).session() as s:
        account = _account(s, who)
        entries = s.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.account_id == account.id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(min(max(limit, 1), 200))
        ).all()
    return [ledger.entry_json(e) for e in entries]
