"""Share links (migration 0011). See shares.py and STANDARD_MODE.md, "Share links".

A link opens one video for anyone who has it, until its owner revokes it, it expires, or the video stops being
available. Only a hash of the token is stored. A private link's key lives in the link's fragment, which browsers never
send, so it never reaches the platform. Views are counted; nothing about viewers is kept.
"""

from __future__ import annotations

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class VideoShare(Base):
    __tablename__ = "video_shares"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    job_id: Mapped[str] = mapped_column(String(36), index=True)
    # SHA-256 (hex) of the base64url token.
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # The job's mode when the link was made: private links serve ciphertext, standard links the video.
    privacy: Mapped[str] = mapped_column(String(16))
    created_at: Mapped[float] = mapped_column(Float)
    # None: no expiry.
    expires_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    revoked_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Why it ended when it was ended for the owner: revoked, video_deleted or account_closed.
    ended_reason: Mapped[str | None] = mapped_column(String(32), nullable=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)


# ------------------------------------------------------------------ restores
#
# Ending a link records a tombstone (shares.py), so `kuno-gateway reapply-deletions` (tombstones.py) can end it again
# after a database restore: a revoked link must never start working again. Links made after the tombstone are left
# alone. Registered here, where the models load, because every gateway process imports the models.

TOMBSTONE_SHARE = "share_link"
TOMBSTONE_JOB_SHARES = "share_links_job"
TOMBSTONE_ACCOUNT_SHARES = "share_links_account"


def _end_again(s, column, entry, reason: str, dry_run: bool) -> str:
    from sqlalchemy import select

    from . import tombstones

    rows = s.scalars(
        select(VideoShare).where(column == entry.ref, VideoShare.revoked_at.is_(None), VideoShare.created_at <= entry.created_at)
    ).all()
    if not rows:
        return tombstones.ABSENT
    if dry_run:
        return tombstones.WOULD_DELETE
    for row in rows:
        row.revoked_at, row.ended_reason = entry.created_at, reason
    return tombstones.DELETED


def replay_share(state, s, entry, now: float, dry_run: bool) -> str:
    return _end_again(s, VideoShare.id, entry, "revoked", dry_run)


def replay_job_shares(state, s, entry, now: float, dry_run: bool) -> str:
    return _end_again(s, VideoShare.job_id, entry, "video_deleted", dry_run)


def replay_account_shares(state, s, entry, now: float, dry_run: bool) -> str:
    return _end_again(s, VideoShare.account_id, entry, "account_closed", dry_run)


def _register_replayers() -> None:
    import importlib.util

    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones

    for kind, replayer in (
        (TOMBSTONE_SHARE, replay_share), (TOMBSTONE_JOB_SHARES, replay_job_shares), (TOMBSTONE_ACCOUNT_SHARES, replay_account_shares),
    ):
        tombstones.register_replayer(kind, replayer)


_register_replayers()
