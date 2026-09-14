"""Operator roles (MODERATION.md, "Operators and sign-in").

Operators are users who sign in with the usual email link and hold a role:

* `moderator`: reports, the queue, items (content only as `api_moderation.content_access` allows), resolving,
  placing holds.
* `admin`: everything a moderator can, plus account restrictions, releasing holds, account credits, the model
  switch, the audit log and granting or revoking roles.

The first admin is granted from the command line (`kuno-gateway grant-role --email ... --role admin`). Every grant
and revocation is written to the audit log.
"""

from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import identity, moderation
from .db import User
from .db_roles import OperatorRole

MODERATOR = "moderator"
ADMIN = "admin"
ROLES = (MODERATOR, ADMIN)
# The audit log's operator column (and the resolved_by / created_by columns) hold 64 characters.
MAX_OPERATOR_EMAIL = 64
CLI = "cli"


class RoleError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def active_roles(s: Session, user_id: str) -> list[str]:
    rows = s.scalars(select(OperatorRole.role).where(OperatorRole.user_id == user_id, OperatorRole.revoked_at.is_(None))).all()
    return sorted(set(rows))


def satisfies(roles, needed: str) -> bool:
    """An admin can do everything a moderator can."""
    return needed in roles or ADMIN in roles


def _email(raw: str) -> str:
    email = identity.normalize_email(raw or "")
    if email is None:
        raise RoleError("invalid_email", "Enter a valid email address.")
    if len(email) > MAX_OPERATOR_EMAIL:
        raise RoleError("email_too_long", f"Operator email addresses are limited to {MAX_OPERATOR_EMAIL} characters.")
    return email


def _role(role: str) -> str:
    if role not in ROLES:
        raise RoleError("invalid_role", f"role must be one of: {', '.join(ROLES)}.")
    return role


def grant(s: Session, email: str, role: str, by: str, now: float | None = None) -> tuple[User, OperatorRole, bool]:
    """Grants `role`, creating the user if they have never signed in. Returns (user, role row, newly granted)."""
    email, role = _email(email), _role(role)
    now = time.time() if now is None else now
    user = s.scalars(select(User).where(User.email == email)).first()
    if user is None:
        user = User(id=identity._new_id(), email=email, created_at=now)
        s.add(user)
        s.flush()
    existing = s.scalars(
        select(OperatorRole).where(OperatorRole.user_id == user.id, OperatorRole.role == role, OperatorRole.revoked_at.is_(None))
    ).first()
    if existing is not None:
        return user, existing, False
    row = OperatorRole(id=moderation.new_id(), user_id=user.id, role=role, granted_by=by, granted_at=now)
    s.add(row)
    s.flush()
    moderation.log_action(s, by, "role.grant", "user", user.id, None, {"email": email, "role": role}, now)
    return user, row, True


def revoke(s: Session, email: str, role: str, by: str, now: float | None = None) -> OperatorRole | None:
    """Revokes an active grant. Returns None when the user doesn't hold the role."""
    email, role = _email(email), _role(role)
    now = time.time() if now is None else now
    user = s.scalars(select(User).where(User.email == email)).first()
    if user is None:
        return None
    rows = s.scalars(
        select(OperatorRole).where(OperatorRole.user_id == user.id, OperatorRole.role == role, OperatorRole.revoked_at.is_(None))
    ).all()
    if not rows:
        return None
    for row in rows:
        row.revoked_at = now
    moderation.log_action(s, by, "role.revoke", "user", user.id, None, {"email": email, "role": role}, now)
    return rows[0]


def operators(s: Session) -> list[dict]:
    rows = s.execute(
        select(OperatorRole, User).join(User, User.id == OperatorRole.user_id)
        .where(OperatorRole.revoked_at.is_(None)).order_by(User.email, OperatorRole.role)
    ).all()
    return [role_json(row, user) for row, user in rows]


def role_json(row: OperatorRole, user: User) -> dict:
    return {
        "user_id": user.id, "email": user.email, "role": row.role, "granted_by": row.granted_by,
        "granted_at": row.granted_at, "revoked_at": row.revoked_at,
    }
