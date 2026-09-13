"""Users, API keys and sessions: who is calling, and with what authority.

Every secret here — API keys, sign-in link tokens, session tokens — is random, shown to its
owner once, and stored only as a SHA-256 hash. They are long enough that a fast hash is the
right choice; there is nothing to slow-hash, because nobody chooses them.
"""

from __future__ import annotations

import hashlib
import re
import secrets
import time
import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from . import ledger
from .db import Account, ApiKey, LoginToken, User, UserSession

API_KEY_PREFIX = "kw_live_"
WEB_SESSION_PREFIX = "kws_"
STUDIO_TOKEN_PREFIX = "kwt_"

WEB = "web"
STUDIO = "studio"

# The window sign-in rate limits use; the janitor prunes limiter state older than this.
AUTH_LIMIT_WINDOW_S = 15 * 60

_EMAIL = re.compile(r"^[^@\s]{1,64}@[^@\s.]+(\.[^@\s.]+)+$")


class InvalidLoginToken(Exception):
    pass


def hash_secret(secret: str) -> str:
    return hashlib.sha256(secret.encode()).hexdigest()


def _new_id() -> str:
    return uuid.uuid4().hex


def normalize_email(raw: str) -> str | None:
    email = raw.strip().lower()
    return email if len(email) <= 320 and _EMAIL.match(email) else None


# ------------------------------------------------------------------ sign-in links


def issue_login_token(s: Session, email: str, ttl_s: int) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    s.add(LoginToken(token_hash=hash_secret(token), email=email, created_at=now, expires_at=now + ttl_s))
    return token


def redeem_login_token(s: Session, token: str, signup_credit_micros: int = 0) -> User:
    """Spends a sign-in link and returns its user, creating the user and account on first sign-in."""
    now = time.time()
    row = s.get(LoginToken, hash_secret(token), with_for_update=True)
    if row is None or row.used_at is not None or row.expires_at <= now:
        raise InvalidLoginToken()
    row.used_at = now
    user = s.scalars(select(User).where(User.email == row.email)).first()
    if user is None:
        user = User(id=_new_id(), email=row.email, created_at=now)
        s.add(user)
        s.flush()
    user.last_login_at = now
    ensure_account(s, user, signup_credit_micros)
    return user


def ensure_account(s: Session, user: User, signup_credit_micros: int = 0) -> Account:
    account = account_for_user(s, user.id)
    if account is not None:
        return account
    account = Account(
        id=_new_id(), name=user.email, owner_user_id=user.id, balance_micros=0, is_validator=False, created_at=time.time()
    )
    s.add(account)
    s.flush()
    if signup_credit_micros:
        ledger.post(
            s, account.id, signup_credit_micros, kind=ledger.ADJUSTMENT, source="signup",
            idempotency_key=f"signup:{account.id}", description="Welcome credit",
        )
    return account


def account_for_user(s: Session, user_id: str) -> Account | None:
    return s.scalars(select(Account).where(Account.owner_user_id == user_id)).first()


# ------------------------------------------------------------------ sessions


def open_session(s: Session, user_id: str, kind: str, ttl_s: float, parent_id: str | None = None) -> tuple[str, UserSession]:
    token = (WEB_SESSION_PREFIX if kind == WEB else STUDIO_TOKEN_PREFIX) + secrets.token_urlsafe(32)
    now = time.time()
    row = UserSession(
        id=_new_id(), token_hash=hash_secret(token), user_id=user_id, kind=kind, parent_id=parent_id,
        created_at=now, expires_at=now + ttl_s,
    )
    s.add(row)
    s.flush()
    return token, row


def find_session(s: Session, token: str, kind: str) -> UserSession | None:
    """A live session of exactly this kind. A studio token dies with the web session that issued it."""
    now = time.time()
    row = s.scalars(select(UserSession).where(UserSession.token_hash == hash_secret(token))).first()
    if row is None or row.kind != kind or row.revoked_at is not None or row.expires_at <= now:
        return None
    if row.parent_id is not None:
        parent = s.get(UserSession, row.parent_id)
        if parent is None or parent.revoked_at is not None or parent.expires_at <= now:
            return None
    return row


def revoke_session(s: Session, row: UserSession) -> None:
    now = time.time()
    row.revoked_at = now
    s.execute(
        update(UserSession).where(UserSession.parent_id == row.id, UserSession.revoked_at.is_(None)).values(revoked_at=now)
    )


# ------------------------------------------------------------------ API keys


def create_api_key(s: Session, account_id: str, name: str) -> tuple[str, ApiKey]:
    key = API_KEY_PREFIX + secrets.token_urlsafe(32)
    return key, register_api_key(s, account_id, name, key)


def register_api_key(s: Session, account_id: str, name: str, key: str) -> ApiKey:
    """Stores a key that already exists (the seeded development keys) or was just generated."""
    row = ApiKey(
        id=_new_id(), account_id=account_id, name=name, prefix=key[:12], key_hash=hash_secret(key), created_at=time.time()
    )
    s.add(row)
    s.flush()
    return row


def find_api_key(s: Session, key: str) -> ApiKey | None:
    return s.scalars(select(ApiKey).where(ApiKey.key_hash == hash_secret(key), ApiKey.revoked_at.is_(None))).first()


# ------------------------------------------------------------------ JSON


def user_json(user: User) -> dict:
    return {"user_id": user.id, "email": user.email, "created_at": user.created_at}


def account_json(account: Account | None) -> dict | None:
    if account is None:
        return None
    return {"account_id": account.id, "balance_usd": ledger.to_usd(account.balance_micros)}


def api_key_json(row: ApiKey) -> dict:
    return {
        "key_id": row.id,
        "name": row.name,
        "prefix": row.prefix,
        "created_at": row.created_at,
        "last_used_at": row.last_used_at,
        "revoked_at": row.revoked_at,
    }
