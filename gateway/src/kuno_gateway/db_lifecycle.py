"""Data export, account closure and appeals (migration 0012). See STANDARD_MODE.md ("Your data", "Closing an account",
"Appeals") and MODERATION.md ("Appeals").

Nothing here holds content. An export's zip lives in the blob store, sealed at rest in parts; its row lists the parts.
A closure keeps a salted hash of the address the account used, never the address.
"""

from __future__ import annotations

from sqlalchemy import BigInteger, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class AccountExport(Base):
    """A copy of one account's data, built in the background and deleted a week after it is ready."""

    __tablename__ = "account_exports"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    # queued, running, ready, failed, expired (deleted a week after it was ready), deleted (its account was closed)
    status: Mapped[str] = mapped_column(String(16), index=True)
    # The account id while the export is queued or running, else null: one export in progress per account.
    active_account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, unique=True, index=True)
    # JSON list of the blob ids holding the zip, sealed at rest, in order. Cleared once they are deleted.
    part_blob_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # JSON counts of what went in and what was left out. Never content.
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    # When the current builder claimed it; a builder only finishes the export it claimed.
    started_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    finished_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    # When a ready export is deleted: a week after it finished.
    expires_at: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    deleted_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    # The builder's claim, renewed while it works; a stopped builder's claim lapses and another picks the export up.
    locked_until: Mapped[float | None] = mapped_column(Float, nullable=True)


class Appeal(Base):
    """A customer's request to look again at a strike, a restriction, a removal or a report's resolution."""

    __tablename__ = "appeals"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    user_id: Mapped[str] = mapped_column(String(32))
    # strike, restriction, removal, report_resolution
    subject_kind: Mapped[str] = mapped_column(String(24))
    # A strike or restriction id, a job id (removal) or a report id (report_resolution).
    subject_id: Mapped[str] = mapped_column(String(64))
    statement: Mapped[str] = mapped_column(Text)
    # open, upheld, overturned, withdrawn (the account was closed)
    status: Mapped[str] = mapped_column(String(16), index=True)
    # "<account>:<kind>:<subject>" while open, else null: at most one open appeal per subject.
    open_key: Mapped[str | None] = mapped_column(String(160), nullable=True, unique=True, index=True)
    # The moderation queue item (kind "appeal") that tracks it.
    item_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    resolved_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    resolved_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # uphold or overturn
    decision: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # The reviewer's note. The customer sees it, and it is in the audit log.
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON: what an overturn changed (strike_voided, restriction_lifted, content_restored, content_gone, ...).
    outcome: Mapped[str | None] = mapped_column(Text, nullable=True)
    notified_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class AccountClosure(Base):
    """An account its owner closed. The records that stay are marked [RETENTION OF RECORDS AFTER CLOSURE]."""

    __tablename__ = "account_closures"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    closed_at: Mapped[float] = mapped_column(Float, index=True)
    # "sha256:<salt hex>:<digest hex>" of the address the account used; the users row now holds a placeholder.
    email_hash: Mapped[str] = mapped_column(String(160))
    # Unused balance at closure, in micro-dollars, handled per [BALANCE ON CLOSURE POLICY]. Recorded, not refunded.
    balance_micros: Mapped[int] = mapped_column(BigInteger)
    # JSON counts of what the closure did. Never content.
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)


def _replay_account_closure(state, s, entry, now: float, dry_run: bool) -> str:
    from .account_closure import replay_account_closure

    return replay_account_closure(state, s, entry, now, dry_run)


def _register_replayers() -> None:
    """Registered here, with the models, so `kuno-gateway reapply-deletions` knows these kinds without importing the app."""
    import importlib.util

    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones

    tombstones.register_replayer("account_closure", _replay_account_closure)
    # A closed account's job content is deleted again exactly like an owner's delete.
    tombstones.register_replayer("job_content", tombstones.replay_video)


_register_replayers()
