"""Share links (STANDARD_MODE.md, "Share links"; subnet/PRIVACY_MODES.md).

Only the owner can open a video, unless the owner creates a share link for that one video. Links are off until made,
revocable, and optionally expiring:

* **Token.** 32 random bytes, base64url (43 characters). Only its SHA-256 is stored; the token is shown once, when the
  link is made, like an API key.
* **Standard link.** Serves the video, decrypted from at-rest storage exactly as the owner's download is.
* **Private link.** Serves the sealed output blob: ciphertext. Its key travels only in the link's fragment (`#k=...`),
  which browsers never send, so the platform still can't open the video.
* **When it stops.** A link answers `410` once revoked or expired, and whenever the video is deleted, removed by
  moderation or under a preservation hold, or the account is closed. The public answer is the same in every case, so a
  link can never reveal a hold. The owner's list says more (`status`), except that a hold reads `unavailable`.
* **Viewers.** Views are counted. Nothing about a viewer is stored; public routes are rate-limited per IP, keyed on a
  keyed hash of the address.
"""

from __future__ import annotations

import hashlib
import hmac
import importlib.util
import json
import math
import re
import secrets
import time
import uuid
from typing import TYPE_CHECKING, Any

from kuno_protocol.canonical import b64e
from kuno_protocol.schemas import JobState
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from . import holds, moderation
from .db import Account, Blob, Enclave, Job
from .db_moderation import StandardJob
from .db_shares import TOMBSTONE_ACCOUNT_SHARES, TOMBSTONE_JOB_SHARES, TOMBSTONE_SHARE, VideoShare

if TYPE_CHECKING:
    from .state import GatewayState

TOKEN_BYTES = 32
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{43}$")
MAX_ACTIVE_PER_JOB = 20
MAX_ACTIVE_PER_ACCOUNT = 1000
MIN_LIFETIME_S = 60
MAX_LIFETIME_S = 3650 * 86400
LIST_MAX = 500

ACTIVE = "active"
REVOKED = "revoked"
EXPIRED = "expired"
VIDEO_DELETED = "video_deleted"
VIDEO_REMOVED = "video_removed"
ACCOUNT_CLOSED = "account_closed"
# Covers a preservation hold, and anything else that makes the video unplayable, without saying which.
UNAVAILABLE = "unavailable"

PUBLIC_GONE_MESSAGE = "This link no longer works."

_PROCESS_SECRET = secrets.token_bytes(32)


class ShareError(Exception):
    def __init__(self, status: int, code: str, message: str, **extra: Any):
        super().__init__(message)
        self.status, self.code, self.message, self.extra = status, code, message, extra


def new_token() -> str:
    return b64e(secrets.token_bytes(TOKEN_BYTES))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def url_path(token: str) -> str:
    return f"/s/{token}"


def find(s: Session, token: str) -> VideoShare | None:
    if not isinstance(token, str) or not TOKEN_RE.match(token):
        return None
    return s.scalars(select(VideoShare).where(VideoShare.token_hash == hash_token(token))).first()


def account_closed(account: Account | None) -> bool:
    """Account closure belongs to another module; a missing account, or whichever closure marker it sets, ends links.
    Closing an account should also call `revoke_account`."""
    if account is None:
        return True
    return any(getattr(account, marker, None) is not None for marker in ("closed_at", "deleted_at"))


def video_problem(s: Session, job: Job | None, now: float) -> str | None:
    """Why a job's video can't be shared or served now, or None when it can."""
    if job is None or job.status != JobState.SUCCEEDED.value or not job.receipt or not job.content_digest:
        return UNAVAILABLE
    if (job.privacy or "private") == "standard":
        row = s.get(StandardJob, job.id)
        if row is not None and row.deleted_at is not None:
            return VIDEO_REMOVED if row.delete_reason == "removed" else VIDEO_DELETED
        if row is None or row.video_blob_id is None:
            return UNAVAILABLE
    else:
        blob = s.get(Blob, job.output_blob_id) if job.output_blob_id else None
        # Deleted, or hidden (deleted or removed while a hold keeps it).
        if blob is None or blob.expires_at <= now:
            return UNAVAILABLE
    if holds.job_held(s, job.id, now):
        return UNAVAILABLE
    return None


def status(s: Session, share: VideoShare, now: float, job: Job | None = None) -> str:
    if share.revoked_at is not None:
        return share.ended_reason or REVOKED
    if share.expires_at is not None and share.expires_at <= now:
        return EXPIRED
    if account_closed(s.get(Account, share.account_id)):
        return ACCOUNT_CLOSED
    job = job if job is not None else s.get(Job, share.job_id)
    if job is None or job.account_id != share.account_id:
        return UNAVAILABLE
    return video_problem(s, job, now) or ACTIVE


def _active(now: float):
    return (VideoShare.revoked_at.is_(None), or_(VideoShare.expires_at.is_(None), VideoShare.expires_at > now))


def create(s: Session, account_id: str, job_id: str, expires_at: float | None, now: float | None = None) -> tuple[VideoShare, str]:
    """Makes a link to one of the account's finished videos. Returns the row and the token, which is never stored."""
    now = time.time() if now is None else now
    job = s.get(Job, job_id)
    if job is None or job.account_id != account_id:
        raise ShareError(404, "not_found", "No such video job.")
    if account_closed(s.get(Account, account_id)):
        raise ShareError(403, "account_closed", "This account is closed.")
    restriction = moderation.active_restriction(s, account_id, now)
    if restriction is not None:
        raise ShareError(
            403, "account_restricted", "This account can't share videos right now.",
            restricted_until=moderation.restricted_until(restriction),
        )
    if job.status != JobState.SUCCEEDED.value:
        raise ShareError(409, "not_ready", "Share a video once it has finished.")
    problem = video_problem(s, job, now)
    if problem == VIDEO_DELETED:
        raise ShareError(410, "deleted", "This video was deleted.")
    if problem == VIDEO_REMOVED:
        raise ShareError(410, "removed", "This video was removed.")
    if problem is not None:
        raise ShareError(409, "share_unavailable", "This video can't be shared right now.")
    if expires_at is not None and (
        not math.isfinite(expires_at) or expires_at < now + MIN_LIFETIME_S or expires_at > now + MAX_LIFETIME_S
    ):
        raise ShareError(422, "invalid_expiry", "expires_at must be between a minute and ten years from now (Unix seconds), or null.")
    per_job = s.scalar(select(func.count()).select_from(VideoShare).where(VideoShare.job_id == job_id, *_active(now))) or 0
    if per_job >= MAX_ACTIVE_PER_JOB:
        raise ShareError(409, "too_many_shares", f"A video can have {MAX_ACTIVE_PER_JOB} working links. Revoke one first.")
    per_account = s.scalar(select(func.count()).select_from(VideoShare).where(VideoShare.account_id == account_id, *_active(now))) or 0
    if per_account >= MAX_ACTIVE_PER_ACCOUNT:
        raise ShareError(409, "too_many_shares", f"An account can have {MAX_ACTIVE_PER_ACCOUNT} working links. Revoke some first.")
    token = new_token()
    share = VideoShare(
        id=uuid.uuid4().hex, account_id=account_id, job_id=job_id, token_hash=hash_token(token), privacy=job.privacy or "private",
        created_at=now, expires_at=expires_at, revoked_at=None, ended_reason=None, view_count=0,
    )
    s.add(share)
    s.flush()
    return share, token


def _tombstone(s: Session, kind: str, ref: str, account_id: str | None, now: float) -> None:
    """Records an ended link for backups (tombstones.py; db_shares.py replays it), when that module is installed."""
    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones  # type: ignore[attr-defined]

    tombstones.record(s, kind, ref, account_id=account_id, now=now)


def revoke(s: Session, account_id: str, share_id: str, now: float | None = None) -> VideoShare:
    now = time.time() if now is None else now
    share = s.get(VideoShare, share_id, with_for_update=True)
    if share is None or share.account_id != account_id:
        raise ShareError(404, "not_found", "No such share link.")
    if share.revoked_at is None:
        share.revoked_at, share.ended_reason = now, REVOKED
        _tombstone(s, TOMBSTONE_SHARE, share.id, account_id, now)
    return share


def _end(s: Session, condition, reason: str, now: float) -> int:
    result = s.execute(
        update(VideoShare).where(condition, VideoShare.revoked_at.is_(None)).values(revoked_at=now, ended_reason=reason)
    )
    return result.rowcount or 0


def end_for_job(s: Session, job_id: str, reason: str = VIDEO_DELETED, now: float | None = None) -> int:
    """Ends every link to a job (the owner deleted the video). Returns how many were live."""
    now = time.time() if now is None else now
    ended = _end(s, VideoShare.job_id == job_id, reason, now)
    if ended:
        _tombstone(s, TOMBSTONE_JOB_SHARES, job_id, None, now)
    return ended


def revoke_account(s: Session, account_id: str, now: float | None = None) -> int:
    """For account closure: ends every link the account made. Returns how many were live."""
    now = time.time() if now is None else now
    ended = _end(s, VideoShare.account_id == account_id, ACCOUNT_CLOSED, now)
    if ended:
        _tombstone(s, TOMBSTONE_ACCOUNT_SHARES, account_id, account_id, now)
    return ended


def record_view(s: Session, share_id: str) -> None:
    s.execute(update(VideoShare).where(VideoShare.id == share_id).values(view_count=VideoShare.view_count + 1))


# ------------------------------------------------------------------ JSON


def owner_json(s: Session, share: VideoShare, now: float, job: Job | None = None) -> dict:
    job = job if job is not None else s.get(Job, share.job_id)
    return {
        "share_id": share.id,
        "job_id": share.job_id,
        "privacy": share.privacy,
        "profile_id": job.profile_id if job is not None else None,
        "created_at": share.created_at,
        "expires_at": share.expires_at,
        "revoked_at": share.revoked_at,
        "status": status(s, share, now, job),
        "view_count": share.view_count,
    }


def list_for_account(s: Session, account_id: str, now: float, job_id: str | None = None, limit: int = 100) -> list[dict]:
    query = select(VideoShare).where(VideoShare.account_id == account_id)
    if job_id:
        query = query.where(VideoShare.job_id == job_id)
    rows = s.scalars(query.order_by(VideoShare.created_at.desc()).limit(min(max(limit, 1), LIST_MAX))).all()
    jobs = {j.id: j for j in s.scalars(select(Job).where(Job.id.in_({r.job_id for r in rows}))).all()} if rows else {}
    return [owner_json(s, row, now, jobs.get(row.job_id)) for row in rows]


def public_json(share: VideoShare, job: Job, enclave: Enclave | None) -> dict:
    """What anyone holding the link learns: the mode, the model, when the video was made and shared, and the receipt
    with its signing key, so the page can check the video it plays. Nothing about the account."""
    return {
        "privacy": share.privacy,
        "profile_id": job.profile_id,
        "created_at": job.created_at,
        "shared_at": share.created_at,
        "expires_at": share.expires_at,
        "content_digest": job.content_digest,
        "receipt": json.loads(job.receipt) if job.receipt else None,
        "signing_public_key": enclave.signing_public_key if enclave is not None else None,
    }


def rate_key(state: GatewayState, ip: str) -> str:
    """A limiter key for a viewer's IP that doesn't store the address: keyed with the at-rest key where there is one."""
    from .vault import StorageKeyMissing, vault

    try:
        digest = vault(state).keyed_hash(f"share-view/{ip}")
    except StorageKeyMissing:
        digest = hmac.new(_PROCESS_SECRET, ip.encode(), hashlib.sha256).hexdigest()
    return f"share-views:{digest[:32]}"
