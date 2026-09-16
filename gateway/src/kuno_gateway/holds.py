"""Preservation holds (MODERATION.md, "Preservation holds").

A hold stops the platform destroying a job's or an upload's stored content; it never makes content visible again.
Every deletion path (owner delete, operator removal, the blob sweep) still hides what it would have
deleted, and asks `job_held` / `upload_held` before destroying anything. When a hold is released or expires,
`settle` and the blob sweep finish the deletion those paths deferred.

What a hold can keep is only what the gateway still stores when it is placed:

* Standard job: the at-rest video and thumbnail, prompt, options, inputs (at-rest uploads) and the sealed blobs.
* Private job: the sealed input and output blobs (ciphertext), plus a report-supplied output key, resealed at rest
  for the hold, which is the only way that ciphertext can be read.
* Blocked Standard upload: the file, sealed at rest by the vault; it has no `standard_uploads` row, so it can never
  be used in a job.
* Refused Standard output (output_scan.py): the finished video, sealed at rest in the `output_match` hold's blob; it
  was never stored as the owner's video.
"""

from __future__ import annotations

import time
from collections.abc import Iterable
from typing import TYPE_CHECKING

from kuno_protocol.canonical import sha256_hex
from kuno_protocol.crypto import DecryptionError
from sqlalchemy import and_, or_, select, update
from sqlalchemy.orm import Session

from . import moderation
from .db import Blob, Job
from .db_holds import PreservationHold
from .db_moderation import ModerationItem, Report, StandardJob, StandardUpload
from .vault import vault

if TYPE_CHECKING:
    from .settings import Settings
    from .state import GatewayState

DAY = 86400
SYSTEM = "system"
REASONS = ("report_csam", "report_sexual_minor", "upload_match", "output_match", "legal_request", "operator")
# Resolving a report with one of these reasons by removal or a ban places a hold on the reported job first.
REPORT_HOLD_REASONS = {"csam": "report_csam", "sexual_minor": "report_sexual_minor"}
HOLDING_ACTIONS = ("remove_content", "ban_account")


def output_key_label(hold_id: str) -> str:
    return f"hold/{hold_id}/output-key"


def blocked_upload_label(upload_id: str) -> str:
    return f"standard/blocked-upload/{upload_id}"


def active(now: float):
    return and_(PreservationHold.released_at.is_(None), PreservationHold.expires_at > now)


def _inactive(now: float):
    return or_(PreservationHold.released_at.is_not(None), PreservationHold.expires_at <= now)


# ------------------------------------------------------------------ queries


def active_holds(s: Session, now: float, *, job_id: str | None = None, upload_id: str | None = None) -> list[PreservationHold]:
    query = select(PreservationHold).where(active(now)).order_by(PreservationHold.created_at)
    if job_id is not None:
        query = query.where(PreservationHold.job_id == job_id)
    if upload_id is not None:
        query = query.where(PreservationHold.upload_id == upload_id)
    return list(s.scalars(query).all())


def job_held(s: Session, job_id: str | None, now: float) -> bool:
    if job_id is None:
        return False
    return s.scalars(select(PreservationHold.id).where(PreservationHold.job_id == job_id, active(now)).limit(1)).first() is not None


def upload_held(s: Session, upload_id: str | None, now: float) -> bool:
    if upload_id is None:
        return False
    return s.scalars(
        select(PreservationHold.id).where(PreservationHold.upload_id == upload_id, active(now)).limit(1)
    ).first() is not None


def held_job_ids(s: Session, job_ids: Iterable[str | None], now: float) -> set[str]:
    ids = sorted({j for j in job_ids if j})
    held: set[str] = set()
    for start in range(0, len(ids), 500):
        held.update(
            s.scalars(select(PreservationHold.job_id).where(PreservationHold.job_id.in_(ids[start:start + 500]), active(now))).all()
        )
    return held


def hide_job_blobs(s: Session, job_id: str, now: float) -> int:
    """A held job's sealed blobs stay, but expire now: nobody can download them, and the blob sweep deletes them
    as soon as no hold covers the job."""
    result = s.execute(update(Blob).where(Blob.job_id == job_id, Blob.expires_at > now).values(expires_at=now))
    return result.rowcount or 0


# ------------------------------------------------------------------ placing and releasing


def place(
    s: Session, settings: Settings, *, reason: str, created_by: str, account_id: str | None, job_id: str | None = None,
    upload_id: str | None = None, blob_id: str | None = None, report_id: str | None = None, days: float | None = None,
    note: str | None = None, now: float | None = None, detail: dict | None = None,
) -> PreservationHold:
    """Places a hold and writes `hold.create` to the audit log. A report's automatic hold is placed once."""
    if reason not in REASONS:
        raise ValueError(f"unknown hold reason {reason!r}")
    if (job_id is None) == (upload_id is None):
        raise ValueError("a hold names exactly one job or one upload")
    now = time.time() if now is None else now
    if report_id is not None and job_id is not None:
        existing = s.scalars(
            select(PreservationHold).where(PreservationHold.report_id == report_id, PreservationHold.job_id == job_id, active(now))
        ).first()
        if existing is not None:
            return existing
    hold = PreservationHold(
        id=moderation.new_id(), job_id=job_id, upload_id=upload_id, blob_id=blob_id, account_id=account_id, reason=reason,
        report_id=report_id, created_by=created_by, created_at=now,
        expires_at=now + (settings.preservation_days if days is None else days) * DAY, note=note,
    )
    s.add(hold)
    s.flush()
    moderation.log_action(
        s, created_by, "hold.create", "hold", hold.id, note,
        {"reason": reason, "job_id": job_id, "upload_id": upload_id, "report_id": report_id, "expires_at": hold.expires_at,
         **(detail or {})},
        now,
    )
    return hold


PROVISIONAL_DAYS = 30.0
PROVISIONAL_NOTE = "provisional: report received, pending review"


def provisional_hold_for_report(
    s: Session, settings: Settings, report_id: str, reason: str, job: Job | None, now: float,
) -> PreservationHold | None:
    """Placed when a `csam` or `sexual_minor` report names a known job, so the content can't be deleted or expire
    before an operator reviews it. Dismissal releases it; removal or a ban extends it to the full preservation period."""
    hold_reason = REPORT_HOLD_REASONS.get(reason)
    if hold_reason is None or job is None:
        return None
    return place(
        s, settings, reason=hold_reason, created_by=SYSTEM, account_id=job.account_id, job_id=job.id, report_id=report_id,
        days=getattr(settings, "provisional_hold_days", PROVISIONAL_DAYS), note=PROVISIONAL_NOTE, now=now,
        detail={"automatic": True, "provisional": True},
    )


def release_provisional_for_report(state: GatewayState, s: Session, report: Report, by: str, note: str, now: float) -> list[str]:
    """A dismissed report releases the provisional hold it caused; holds operators placed are left alone."""
    released = []
    for hold in s.scalars(
        select(PreservationHold).where(PreservationHold.report_id == report.id, PreservationHold.created_by == SYSTEM, active(now))
    ).all():
        release(state, s, hold, by, note, now)
        released.append(hold.id)
    return released


def hold_for_report(
    s: Session, settings: Settings, report: Report, job_id: str | None, action: str, by: str, note: str, now: float,
) -> PreservationHold | None:
    """The automatic hold: resolving a `csam` or `sexual_minor` report by removal or a ban preserves the job first.

    A provisional hold placed when the report arrived is extended to the full preservation period rather than kept short.
    """
    reason = REPORT_HOLD_REASONS.get(report.reason)
    if reason is None or job_id is None or action not in HOLDING_ACTIONS:
        return None
    hold = place(
        s, settings, reason=reason, created_by=by, account_id=report.account_id, job_id=job_id, report_id=report.id,
        note=note, now=now, detail={"automatic": True, "action": action},
    )
    full = now + settings.preservation_days * DAY
    if hold.expires_at < full:
        hold.expires_at = full
        moderation.log_action(s, by, "hold.extend", "hold", hold.id, note, {"expires_at": full, "action": action}, now)
    return hold


def keep_report_key(state: GatewayState, s: Session, report: Report, job_id: str | None, now: float) -> PreservationHold | None:
    """Moves a resolving report's output key onto an active hold of its job, resealed under the hold's label.

    Prefers the report's own hold, then the newest hold without a key. Returns None (the caller deletes the key, as
    for any resolved report) when the job has no active hold, or every one already carries a key.
    """
    if report.output_key is None or job_id is None:
        return None
    candidates = [h for h in active_holds(s, now, job_id=job_id) if h.output_key is None]
    if not candidates:
        return None
    hold = next((h for h in candidates if h.report_id == report.id), candidates[-1])
    from .standard_jobs import report_key_label

    store = vault(state)
    hold.output_key = store.seal_secret(output_key_label(hold.id), store.open_secret(report_key_label(report.id), report.output_key))
    return hold


def held_output_key(state: GatewayState, s: Session, job_id: str, now: float) -> bytes | None:
    for hold in reversed(active_holds(s, now, job_id=job_id)):
        if hold.output_key is not None:
            return vault(state).open_secret(output_key_label(hold.id), hold.output_key)
    return None


def release(
    state: GatewayState, s: Session, hold: PreservationHold, by: str, note: str | None, now: float, action: str = "hold.release",
) -> None:
    """Ends a hold. Its content is deleted by the next janitor pass unless another hold covers it; a held output key
    moves to another active hold of the same job, or is deleted now."""
    hold.released_at, hold.released_by, hold.release_note = now, by, note
    detail: dict = {"reason": hold.reason, "job_id": hold.job_id, "upload_id": hold.upload_id}
    if hold.output_key is not None:
        successor = next(
            (h for h in reversed(active_holds(s, now, job_id=hold.job_id)) if h.id != hold.id and h.output_key is None), None
        ) if hold.job_id else None
        if successor is not None:
            store = vault(state)
            successor.output_key = store.seal_secret(
                output_key_label(successor.id), store.open_secret(output_key_label(hold.id), hold.output_key)
            )
            detail["output_key_moved_to"] = successor.id
        else:
            detail["output_key_deleted"] = True
        hold.output_key = None
        # The released copy's data key goes too, so a database backup's copy of the sealed key can't be opened.
        from .standard_jobs import forget_data_keys

        forget_data_keys(state, s, [output_key_label(hold.id)], hold.account_id)
    moderation.log_action(s, by, action, "hold", hold.id, note, detail, now)


def expire_holds(state: GatewayState, s: Session, now: float) -> int:
    rows = s.scalars(select(PreservationHold).where(PreservationHold.released_at.is_(None), PreservationHold.expires_at <= now)).all()
    for hold in rows:
        release(state, s, hold, SYSTEM, "hold period ended", now, action="hold.expire")
    return len(rows)


# ------------------------------------------------------------------ deferred deletion


def _has_content(s: Session, row: StandardJob) -> bool:
    if any(v is not None for v in (row.video_blob_id, row.thumbnail_blob_id, row.prompt, row.negative_prompt, row.shots,
                                   row.options, row.inputs, row.output_key)):
        return True
    return s.scalars(select(StandardUpload.id).where(StandardUpload.job_id == row.job_id).limit(1)).first() is not None


def settle(state: GatewayState, s: Session, now: float) -> int:
    """Finishes the deletions holds deferred, for content no active hold covers any more."""
    from . import tombstones
    from .standard_jobs import delete_content, discard_blobs, forget_data_keys, upload_label

    settled = 0
    ever_held_jobs = select(PreservationHold.job_id).where(PreservationHold.job_id.is_not(None))
    for row in s.scalars(select(StandardJob).where(StandardJob.deleted_at.is_not(None), StandardJob.job_id.in_(ever_held_jobs))).all():
        if _has_content(s, row) and not job_held(s, row.job_id, now):
            delete_content(state, s, row, now)
            settled += 1

    # Uploads with a hold of their own, used by a job whose content is already gone.
    ever_held_uploads = select(PreservationHold.upload_id).where(PreservationHold.upload_id.is_not(None))
    for upload in s.scalars(
        select(StandardUpload)
        .join(StandardJob, StandardJob.job_id == StandardUpload.job_id)
        .where(StandardJob.deleted_at.is_not(None), StandardUpload.id.in_(ever_held_uploads))
    ).all():
        if not upload_held(s, upload.id, now) and not job_held(s, upload.job_id, now):
            if upload.blob_id:
                discard_blobs(state, [upload.blob_id], s, upload.account_id)
            tombstones.record(s, tombstones.STANDARD_UPLOAD, upload.id, upload.account_id, now)
            forget_data_keys(state, s, [upload_label(upload.id)], upload.account_id)
            s.delete(upload)
            settled += 1

    # Blocked uploads and refused outputs were stored only because of their hold. Holds sharing a stored copy share
    # its blob id; a refused output's blob belongs to its job, so any active hold on the job keeps it.
    for hold in s.scalars(select(PreservationHold).where(PreservationHold.blob_id.is_not(None), _inactive(now))).all():
        if hold.blob_id is None or upload_held(s, hold.upload_id, now) or job_held(s, hold.job_id, now):
            continue
        discard_blobs(state, [hold.blob_id], s, hold.account_id)
        if hold.upload_id:
            forget_data_keys(state, s, [blocked_upload_label(hold.upload_id)], hold.account_id)
        for other in s.scalars(select(PreservationHold).where(PreservationHold.blob_id == hold.blob_id)).all():
            other.blob_id = None
        settled += 1
    return settled


def sweep_blobs(state: GatewayState, s: Session, now: float) -> None:
    """The janitor's blob pass: end expired holds, finish deferred deletions, then delete expired blobs no hold covers."""
    expire_holds(state, s, now)
    settle(state, s, now)
    expired = s.scalars(select(Blob).where(Blob.expires_at < now)).all()
    held = held_job_ids(s, (b.job_id for b in expired), now)
    from . import tombstones

    for blob in expired:
        if blob.job_id in held:
            continue
        state.blobs.delete(blob.id)
        tombstones.record(s, tombstones.BLOB, blob.id, blob.owner_id if blob.owner_kind == "account" else None, now)
        s.delete(blob)


# ------------------------------------------------------------------ blocked uploads


def item_upload_hold(s: Session, item: ModerationItem, detail: dict | None, now: float) -> PreservationHold | None:
    """The active hold keeping an `upload_match` item's file, if any."""
    upload_id = (detail or {}).get("upload_id")
    if item.kind != "upload_match" or not upload_id:
        return None
    return s.scalars(
        select(PreservationHold)
        .where(PreservationHold.upload_id == upload_id, PreservationHold.blob_id.is_not(None), active(now))
        .order_by(PreservationHold.created_at.desc())
    ).first()


def open_blocked_upload(state: GatewayState, hold: PreservationHold, sha256: str | None) -> bytes:
    if hold.blob_id is None:
        raise KeyError(hold.upload_id)
    data = vault(state).open(blocked_upload_label(hold.upload_id), state.blobs.get(hold.blob_id))
    if sha256 and sha256_hex(data) != sha256:
        raise DecryptionError("the stored upload does not match its digest")
    return data


# ------------------------------------------------------------------ refused outputs


def blocked_output_label(job_id: str) -> str:
    return f"standard/blocked-output/{job_id}"


def output_hold(s: Session, job_id: str | None, now: float) -> PreservationHold | None:
    """The `output_match` hold whose blob keeps a refused Standard video, while any active hold still covers the job."""
    if job_id is None or not job_held(s, job_id, now):
        return None
    return s.scalars(
        select(PreservationHold)
        .where(PreservationHold.job_id == job_id, PreservationHold.reason == "output_match", PreservationHold.blob_id.is_not(None))
        .order_by(PreservationHold.created_at.desc())
    ).first()


def open_blocked_output(state: GatewayState, hold: PreservationHold, sha256: str | None) -> bytes:
    if hold.blob_id is None or hold.job_id is None:
        raise KeyError(hold.job_id)
    data = vault(state).open(blocked_output_label(hold.job_id), state.blobs.get(hold.blob_id))
    if sha256 and sha256_hex(data) != sha256:
        raise DecryptionError("the stored video does not match its digest")
    return data
