from __future__ import annotations

import hmac
import logging
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from kuno_protocol.canonical import b64d
from kuno_protocol.crypto import request_signature_message, verify_signature

from . import identity, roles
from .db import Account, Enclave, User, UserSession
from .state import GatewayState

MAX_CLOCK_SKEW_S = 120
BREAK_GLASS = "break-glass"

log = logging.getLogger("kuno.auth")


def gw(request: Request) -> GatewayState:
    return request.app.state.gw


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, {"code": "unauthorized", "message": "Send your API key as 'Authorization: Bearer <key>'."})
    return header[7:].strip()


async def require_account(request: Request) -> Account:
    """The job API: an API key (developers) or the web session (customers; the website's server forwards it).

    Studio tokens are gone and never accepted.
    """
    token = _bearer(request)
    account = None
    with gw(request).session() as s, s.begin():
        key = identity.find_api_key(s, token)
        if key is not None:
            now = time.time()
            # Recorded at most once a minute, so authenticating isn't a write on every request.
            if key.last_used_at is None or now - key.last_used_at > 60:
                key.last_used_at = now
            account = s.get(Account, key.account_id)
        elif (session := identity.find_session(s, token, identity.WEB)) is not None:
            account = identity.account_for_user(s, session.user_id)
    if account is None:
        raise HTTPException(401, {"code": "unauthorized", "message": "Unknown or revoked API key, or the session has ended."})
    return account


async def require_validator(request: Request) -> Account:
    account = await require_account(request)
    if not account.is_validator:
        raise HTTPException(403, {"code": "forbidden", "message": "This endpoint is for registered validators."})
    return account


@dataclass(frozen=True)
class SignedIn:
    user: User
    session: UserSession


async def require_user(request: Request) -> SignedIn:
    """Account management (keys, payments, wallets, eligibility) needs the web session; API keys can't manage keys."""
    token = _bearer(request)
    with gw(request).session() as s:
        session = identity.find_session(s, token, identity.WEB)
        user = s.get(User, session.user_id) if session is not None else None
    if session is None or user is None:
        raise HTTPException(401, {"code": "unauthorized", "message": "Sign in again."})
    return SignedIn(user=user, session=session)


@dataclass(frozen=True)
class Operator:
    """Who is acting on an operator route. `name` is what the audit log records: the signed-in email, or
    "break-glass" for the shared admin token."""

    name: str
    user_id: str | None
    roles: tuple[str, ...]

    def can(self, role: str) -> bool:
        return roles.satisfies(self.roles, role)


def require_operator(role: str):
    """A dependency accepting only a web session of a user holding `role` (an admin satisfies `moderator`).

    The shared admin token is break-glass: honoured only with KUNO_ALLOW_ADMIN_TOKEN=1, never in production, and
    logged as operator "break-glass". The operator is left on `request.state.operator` for the handler.
    """
    if role not in roles.ROLES:
        raise ValueError(f"unknown role {role!r}")

    async def dependency(request: Request) -> Operator:
        token = _bearer(request)
        state = gw(request)
        settings = state.settings
        if settings.admin_token and hmac.compare_digest(token.encode(), settings.admin_token.encode()):
            if not settings.break_glass_enabled:
                log.warning("refused the shared admin token on %s: break-glass is off", request.url.path)
                raise HTTPException(403, {"code": "forbidden", "message": "Sign in with an operator account."})
            log.warning("break-glass admin token used on %s %s", request.method, request.url.path)
            operator = Operator(name=BREAK_GLASS, user_id=None, roles=roles.ROLES)
        else:
            with state.session() as s:
                session = identity.find_session(s, token, identity.WEB)
                user = s.get(User, session.user_id) if session is not None else None
                held = tuple(roles.active_roles(s, user.id)) if user is not None else ()
            if user is None or not held:
                raise HTTPException(403, {"code": "forbidden", "message": "Sign in with an operator account."})
            operator = Operator(name=user.email, user_id=user.id, roles=held)
        if not operator.can(role):
            raise HTTPException(403, {"code": "forbidden", "message": f"This needs the {role} role."})
        request.state.operator = operator
        return operator

    return dependency


def operator_name(request: Request) -> str:
    operator = getattr(request.state, "operator", None)
    if operator is None:  # only reachable if a route forgot its dependency
        raise HTTPException(403, {"code": "forbidden", "message": "Sign in with an operator account."})
    return operator.name


async def verify_enclave_signature(request: Request, signing_public_key: bytes) -> bytes:
    """Checks the X-Kuno-Signature header; returns the raw body."""
    body = await request.body()
    timestamp = request.headers.get("x-kuno-timestamp", "")
    signature = request.headers.get("x-kuno-signature", "")
    try:
        skew = abs(time.time() - int(timestamp))
        sig = b64d(signature)
    except ValueError:
        raise HTTPException(401, {"code": "bad_signature", "message": "Missing or malformed enclave signature."}) from None
    if skew > MAX_CLOCK_SKEW_S:
        raise HTTPException(401, {"code": "clock_skew", "message": "Request timestamp is too far from server time."})
    path = request.url.path + (f"?{request.url.query}" if request.url.query else "")
    if not verify_signature(signing_public_key, sig, request_signature_message(request.method, path, timestamp, body)):
        raise HTTPException(401, {"code": "bad_signature", "message": "Enclave signature does not verify."})
    return body


async def require_enclave(request: Request) -> tuple[Enclave, bytes]:
    enclave_id = request.headers.get("x-kuno-enclave", "")
    with gw(request).session() as s:
        enclave = s.get(Enclave, enclave_id)
    if enclave is None:
        raise HTTPException(401, {"code": "unknown_enclave", "message": "Register the enclave with fresh attestation first."})
    if enclave.status == "revoked":
        raise HTTPException(403, {"code": "revoked", "message": "This enclave has been revoked."})
    body = await verify_enclave_signature(request, b64d(enclave.signing_public_key))
    return enclave, body
