"""Operator roles (migration 0010). Operators are ordinary users who sign in by email and hold a role."""

from __future__ import annotations

from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class OperatorRole(Base):
    """One grant of `moderator` or `admin` to a user. Revoking sets `revoked_at`; the row stays as history."""

    __tablename__ = "operator_roles"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(32), index=True)
    # moderator or admin
    role: Mapped[str] = mapped_column(String(16))
    # The granting operator's email, or "cli" for the bootstrap command.
    granted_by: Mapped[str] = mapped_column(String(320))
    granted_at: Mapped[float] = mapped_column(Float)
    revoked_at: Mapped[float | None] = mapped_column(Float, nullable=True)
