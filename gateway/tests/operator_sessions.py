"""Test helper: a signed-in operator. Grants the role directly (no audit-log entry) and opens a web session."""

from __future__ import annotations

import time
import uuid

from sqlalchemy import select

from kuno_gateway import identity
from kuno_gateway.db import User
from kuno_gateway.db_roles import OperatorRole


def operator_headers(state, email: str, role: str = "admin") -> dict:
    now = time.time()
    with state.session() as s, s.begin():
        user = s.scalars(select(User).where(User.email == email)).first()
        if user is None:
            user = User(id=uuid.uuid4().hex, email=email, created_at=now)
            s.add(user)
            s.flush()
        held = s.scalars(
            select(OperatorRole).where(OperatorRole.user_id == user.id, OperatorRole.role == role, OperatorRole.revoked_at.is_(None))
        ).first()
        if held is None:
            s.add(OperatorRole(id=uuid.uuid4().hex, user_id=user.id, role=role, granted_by="test", granted_at=now))
        token, _ = identity.open_session(s, user.id, identity.WEB, 3600)
    return {"authorization": f"Bearer {token}"}
