"""Standard-mode content, account safety and moderation (migration 0008). See STANDARD_MODE.md and MODERATION.md.

Nothing here holds plaintext media. Uploads and videos live in the blob store encrypted with the platform's
at-rest key; `output_key` columns hold keys sealed with that same key.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class StandardJob(Base):
    """What the gateway sealed for a standard job, and the video it got back. The billing record is `jobs`."""

    __tablename__ = "standard_jobs"

    job_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    # Cleared (null) when the content is deleted, expires or is removed by an operator.
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    negative_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    seed: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    options: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON list: index, role, upload_id, sha256, size, mime and the per-input hints.
    inputs: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The job's output key, sealed at rest. Dropped once the video is stored.
    output_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    video_blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    video_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    video_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    thumbnail_blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    deleted_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    # deleted (by the owner), expired (retention), removed (by an operator)
    delete_reason: Mapped[str | None] = mapped_column(String(16), nullable=True)


class StandardUpload(Base):
    """A plaintext input a customer uploaded for a standard job, stored encrypted at rest."""

    __tablename__ = "standard_uploads"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    role: Mapped[str] = mapped_column(String(24))
    mime: Mapped[str] = mapped_column(String(64))
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    size: Mapped[int] = mapped_column(BigInteger)
    blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class Strike(Base):
    """One safety failure on an account. Carries a failure code, never content."""

    __tablename__ = "strikes"
    __table_args__ = (Index("uq_strikes_job_reason", "job_id", "reason", unique=True),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # safety_blocked or upload_blocked
    reason: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[float] = mapped_column(Float, index=True)


class AccountRestriction(Base):
    """A period an account can't start jobs in either mode. `until` null: until an operator lifts it."""

    __tablename__ = "account_restrictions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    # restrict or ban
    kind: Mapped[str] = mapped_column(String(16))
    until: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # strikes (automatic) or operator
    source: Mapped[str] = mapped_column(String(16))
    created_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    lifted_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    lifted_by: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Report(Base):
    """A report from anyone, with or without an account."""

    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # open or resolved
    status: Mapped[str] = mapped_column(String(16), index=True)
    reason: Mapped[str] = mapped_column(String(32))
    priority: Mapped[int] = mapped_column(Integer, index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    content_digest: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    # A private video's output key the reporter handed over, sealed at rest; deleted when the report is resolved.
    output_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    # Keyed hash of the reporter's IP, for abuse handling without keeping the address.
    reporter_ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # The owner of the reported job, when the report names one.
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    resolved_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(32), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class ModerationItem(Base):
    """Something for an operator to look at: a report, a sampled standard video, a blocked upload, an account review."""

    __tablename__ = "moderation_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # report, sample, upload_match, account_review
    kind: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    priority: Mapped[int] = mapped_column(Integer, index=True)
    report_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # JSON metadata (hashes, list names, sizes). Never content.
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    resolved_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(32), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class OperatorAction(Base):
    """The audit log: every operator action, who took it, when and why."""

    __tablename__ = "operator_audit_log"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    operator: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(32), index=True)
    target_kind: Mapped[str] = mapped_column(String(16))
    target_id: Mapped[str] = mapped_column(String(64), index=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
