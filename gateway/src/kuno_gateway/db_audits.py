"""Verified-mode step audits the gateway relays between validators and enclaves (migration 0007)."""

from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Audit(Base):
    """One request to open a step of a validator's own job.

    The row holds routing and status only. The sealed opening (encrypted to the validator's key,
    signed by the enclave) is a blob with owner_kind "audit", which no customer route serves.
    """

    __tablename__ = "audits"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(36), index=True)
    enclave_id: Mapped[str] = mapped_column(String(32), index=True)
    # The validator account; always the account that created the job.
    requested_by: Mapped[str] = mapped_column(String(32), index=True)
    step: Mapped[int] = mapped_column(Integer)
    include_leaves: Mapped[bool] = mapped_column(Boolean, default=False)
    recipient_public_key: Mapped[str] = mapped_column(String(64))
    # pending (queued), sent (handed to the enclave), answered, failed (enclave refused), expired
    status: Mapped[str] = mapped_column(String(16), index=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    opening_blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    sent_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    answered_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
