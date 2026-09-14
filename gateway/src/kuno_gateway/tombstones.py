"""Deletion tombstones: deletions that survive a database or bucket restore.

Every path that destroys stored content records a tombstone in the same transaction (`record`). The janitor copies
committed tombstones out of the database (`export_pending`: JSONL objects under `tombstones/` in the blob bucket, or
`data_dir/tombstones` locally), so they outlive a database restore. After restoring the database, the bucket or both,
`kuno-gateway reapply-deletions --since <time the backup was taken>` replays them (`reapply`): objects and rows that came
back are deleted again. Replay is idempotent, has a dry run, and never destroys content an active preservation hold
covers in the restored database (it reports it as `held` for an operator to look at).

Kinds recorded here, and what replay does with them:

    blob              ref: blob id      delete the object and its `blobs` row
    job_blobs         ref: job id       delete every `blobs` row of the job, and their objects
    standard_content  ref: job id       hide the standard job and delete its video, thumbnail, prompt, inputs and blobs
    standard_upload   ref: upload id    delete the upload row, its object and its data key
    data_key          ref: vault label  delete the label's data keys (the object can't be decrypted any more)
    video             ref: job id       the owner's DELETE: content of either mode, as above

Other modules record their own kinds (for example key vault entries, share links, account closure) with the same
`record(s, kind, ref, account_id=None, now=None)` and teach replay about them with `register_replayer(kind, fn)`.
Replay counts tombstones of a kind nobody registered as `unhandled`.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import time
import uuid
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from sqlalchemy import delete, or_, select, update
from sqlalchemy.orm import Session

from .db_storage import DeletionTombstone, StorageDataKey

log = logging.getLogger("kuno.gateway.tombstones")

BLOB = "blob"
JOB_BLOBS = "job_blobs"
STANDARD_CONTENT = "standard_content"
STANDARD_UPLOAD = "standard_upload"
DATA_KEY = "data_key"
VIDEO = "video"

DELETED, WOULD_DELETE, ABSENT, HELD = "deleted", "would_delete", "absent", "held"


# ------------------------------------------------------------------ recording


def record(s: Session, kind: str, ref: str, account_id: str | None = None, now: float | None = None) -> DeletionTombstone:
    """Records that `ref` of `kind` was destroyed, in the caller's transaction (so it commits with the deletion).

    The same (kind, ref) twice in one transaction is recorded once; a later deletion of the same thing gets a new
    tombstone, so `reapply-deletions --since` always sees the most recent one."""
    if not kind or not ref:
        raise ValueError("a tombstone needs a kind and a ref")
    kind, ref = str(kind)[:32], str(ref)[:200]
    for pending in s.new:
        if isinstance(pending, DeletionTombstone) and pending.kind == kind and pending.ref == ref:
            return pending
    row = DeletionTombstone(
        id=uuid.uuid4().hex, kind=kind, ref=ref, account_id=str(account_id)[:32] if account_id else None,
        created_at=time.time() if now is None else now,
    )
    s.add(row)
    return row


def entry_json(row: DeletionTombstone) -> dict:
    return {"id": row.id, "kind": row.kind, "ref": row.ref, "account_id": row.account_id, "created_at": row.created_at}


# ------------------------------------------------------------------ export


class LocalExport:
    def __init__(self, root: Path):
        self.root = Path(root)

    def put(self, name: str, data: bytes) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        tmp = self.root / f".{name}.tmp"
        tmp.write_bytes(data)
        os.replace(tmp, self.root / name)

    def names(self) -> list[str]:
        if not self.root.exists():
            return []
        return sorted(p.name for p in self.root.iterdir() if p.name.endswith(".jsonl") and not p.name.startswith("."))

    def get(self, name: str) -> bytes:
        return (self.root / name).read_bytes()


class S3Export:
    def __init__(self, client: Any, bucket: str, prefix: str):
        self.client, self.bucket, self.prefix = client, bucket, prefix

    def put(self, name: str, data: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=f"{self.prefix}{name}", Body=data, ContentType="application/x-ndjson")

    def names(self) -> list[str]:
        names = []
        for page in self.client.get_paginator("list_objects_v2").paginate(Bucket=self.bucket, Prefix=self.prefix):
            names.extend(item["Key"][len(self.prefix):] for item in page.get("Contents", []))
        return sorted(n for n in names if n.endswith(".jsonl") and "/" not in n)

    def get(self, name: str) -> bytes:
        body = self.client.get_object(Bucket=self.bucket, Key=f"{self.prefix}{name}")["Body"]
        try:
            return body.read()
        finally:
            body.close()


def exporter(state: Any) -> LocalExport | S3Export | None:
    """Where tombstones are copied: KUNO_TOMBSTONE_EXPORT = auto (the blob backend's kind), local, s3 or off."""
    settings = state.settings
    mode = (getattr(settings, "tombstone_export", None) or "auto").strip().lower()
    if mode == "off":
        return None
    from .blobstore_s3 import S3BlobStore, S3Config, make_client

    store = getattr(state, "blobs", None)
    s3_store = store if isinstance(store, S3BlobStore) else None
    if mode == "local" or (mode == "auto" and s3_store is None):
        return LocalExport(getattr(settings, "tombstone_export_dir", None) or Path(settings.data_dir) / "tombstones")
    if mode not in ("auto", "s3"):
        raise ValueError(f"KUNO_TOMBSTONE_EXPORT must be auto, local, s3 or off, not {mode!r}")
    prefix = getattr(settings, "tombstone_export_prefix", None) or "tombstones/"
    bucket = getattr(settings, "tombstone_export_bucket", None)
    if s3_store is not None:
        return S3Export(s3_store.client, bucket or s3_store.bucket, prefix)
    config = S3Config.from_env()
    return S3Export(make_client(config), bucket or config.bucket, prefix)


def _micros(t: float) -> str:
    return f"{int(round(t * 1_000_000)):020d}"


def export_pending(state: Any, *, limit: int = 1000, now: float | None = None) -> int:
    """Copies committed, not yet exported tombstones out of the database, one JSONL object per batch."""
    target = exporter(state)
    if target is None:
        return 0
    total = 0
    while True:
        with state.session() as s:
            rows = s.scalars(
                select(DeletionTombstone).where(DeletionTombstone.exported_at.is_(None))
                .order_by(DeletionTombstone.created_at, DeletionTombstone.id).limit(limit)
            ).all()
            entries = [entry_json(r) for r in rows]
        if not entries:
            return total
        # Named by the first and last creation time, so replay can skip files entirely before --since.
        name = f"{_micros(entries[0]['created_at'])}-{_micros(entries[-1]['created_at'])}-{entries[0]['id']}.jsonl"
        target.put(name, "".join(json.dumps(e, sort_keys=True, separators=(",", ":")) + "\n" for e in entries).encode())
        with state.session() as s, s.begin():
            s.execute(
                update(DeletionTombstone).where(DeletionTombstone.id.in_([e["id"] for e in entries]))
                .values(exported_at=time.time() if now is None else now)
            )
        total += len(entries)
        if len(entries) < limit:
            return total


def exported_entries(state: Any, since: float, until: float | None = None) -> list[dict]:
    target = exporter(state)
    if target is None:
        return []
    out = []
    for name in target.names():
        try:
            first, last = (int(part) / 1_000_000 for part in name.split("-")[:2])
        except ValueError:
            continue
        if last < since or (until is not None and first > until):
            continue
        for line in target.get(name).decode().splitlines():
            try:
                entry = json.loads(line)
                created = float(entry["created_at"])
                if not (entry["id"] and entry["kind"] and entry["ref"]):
                    continue
            except (ValueError, KeyError, TypeError):
                continue
            if created >= since and (until is None or created <= until):
                out.append(entry)
    return out


# ------------------------------------------------------------------ replay


@dataclass(frozen=True)
class Entry:
    id: str
    kind: str
    ref: str
    account_id: str | None
    created_at: float


Replayer = Callable[[Any, Session, Entry, float, bool], str]
_REPLAYERS: dict[str, Replayer] = {}


def register_replayer(kind: str, fn: Replayer) -> None:
    """`fn(state, s, entry, now, dry_run) -> "deleted" | "would_delete" | "absent" | "held"` must be idempotent and must
    not change anything when `dry_run` is true."""
    _REPLAYERS[kind] = fn


@dataclass
class ReplayReport:
    since: float
    until: float | None
    dry_run: bool
    considered: int = 0
    outcomes: Counter = field(default_factory=Counter)
    unhandled: Counter = field(default_factory=Counter)
    restored_tombstones: int = 0
    errors: list[str] = field(default_factory=list)

    def count(self, outcome: str, kind: str | None = None) -> int:
        return sum(n for (k, o), n in self.outcomes.items() if o == outcome and (kind is None or k == kind))

    def lines(self) -> list[str]:
        def iso(t: float) -> str:
            return datetime.datetime.fromtimestamp(t, datetime.timezone.utc).isoformat()

        head = f"tombstones since {iso(self.since)}" + (f" until {iso(self.until)}" if self.until else "")
        out = [f"{head}{' (dry run)' if self.dry_run else ''}: {self.considered} to replay"]
        for (kind, outcome), n in sorted(self.outcomes.items()):
            out.append(f"  {kind}: {outcome} {n}")
        for kind, n in sorted(self.unhandled.items()):
            out.append(f"  {kind}: unhandled {n} (no replayer registered for this kind)")
        if self.restored_tombstones:
            out.append(f"  {self.restored_tombstones} tombstones missing from the database were restored from the export")
        if self.count(HELD):
            out.append("  held: an active preservation hold in this database covers them; review before deleting by hand")
        out.extend(f"  error: {e}" for e in self.errors)
        return out


def parse_time(text: str) -> float:
    """ISO 8601 ("2026-09-14T10:00:00Z"; no zone means UTC) or Unix seconds."""
    text = text.strip()
    try:
        return float(text)
    except ValueError:
        pass
    when = datetime.datetime.fromisoformat(text.replace("Z", "+00:00"))
    if when.tzinfo is None:
        when = when.replace(tzinfo=datetime.timezone.utc)
    return when.timestamp()


def reapply(
    state: Any, since: float, until: float | None = None, *, dry_run: bool = False, source: str = "both", now: float | None = None,
) -> ReplayReport:
    """Replays tombstones created in [since, until] from the database and/or the export, oldest first."""
    if source not in ("db", "export", "both"):
        raise ValueError("source must be db, export or both")
    now = time.time() if now is None else now
    report = ReplayReport(since, until, dry_run)
    entries: dict[str, tuple[Entry, bool]] = {}
    if source in ("db", "both"):
        with state.session() as s:
            query = select(DeletionTombstone).where(DeletionTombstone.created_at >= since)
            if until is not None:
                query = query.where(DeletionTombstone.created_at <= until)
            for row in s.scalars(query).all():
                entries[row.id] = (Entry(row.id, row.kind, row.ref, row.account_id, row.created_at), True)
    if source in ("export", "both"):
        for e in exported_entries(state, since, until):
            if e["id"] not in entries:
                entries[e["id"]] = (Entry(e["id"], e["kind"], e["ref"], e.get("account_id"), float(e["created_at"])), False)
    ordered = sorted(entries.values(), key=lambda item: (item[0].created_at, item[0].id))
    # Replaying a (kind, ref) once is enough: every replayer is idempotent.
    done: set[tuple[str, str]] = set()
    for entry, in_db in ordered:
        if (entry.kind, entry.ref) in done:
            if not dry_run and not in_db:
                _restore_tombstone(state, entry, now, report)
            continue
        done.add((entry.kind, entry.ref))
        report.considered += 1
        replayer = _REPLAYERS.get(entry.kind)
        if replayer is None:
            report.unhandled[entry.kind] += 1
            continue
        try:
            if dry_run:
                with state.session() as s:  # never committed
                    outcome = replayer(state, s, entry, now, True)
                    s.rollback()
            else:
                with state.session() as s, s.begin():
                    if not in_db and s.get(DeletionTombstone, entry.id) is None:
                        s.add(DeletionTombstone(id=entry.id, kind=entry.kind, ref=entry.ref, account_id=entry.account_id,
                                                created_at=entry.created_at, exported_at=now))
                        report.restored_tombstones += 1
                    outcome = replayer(state, s, entry, now, False)
        except Exception as exc:  # keep going; report it, and the next run tries again
            log.exception("replaying tombstone %s (%s %s) failed", entry.id, entry.kind, entry.ref)
            report.errors.append(f"{entry.kind} {entry.ref}: {type(exc).__name__}")
            continue
        report.outcomes[(entry.kind, outcome)] += 1
    return report


def _restore_tombstone(state: Any, entry: Entry, now: float, report: ReplayReport) -> None:
    with state.session() as s, s.begin():
        if s.get(DeletionTombstone, entry.id) is None:
            s.add(DeletionTombstone(id=entry.id, kind=entry.kind, ref=entry.ref, account_id=entry.account_id,
                                    created_at=entry.created_at, exported_at=now))
            report.restored_tombstones += 1


# ------------------------------------------------------------------ built-in replayers


def _object_exists(state: Any, blob_id: str) -> bool:
    exists = getattr(state.blobs, "exists", None)
    if exists is not None:
        return bool(exists(blob_id))
    try:
        state.blobs.get(blob_id)
    except KeyError:
        return False
    return True


def _blob_held(s: Session, blob_id: str, now: float) -> bool:
    from . import holds
    from .db import Blob
    from .db_holds import PreservationHold
    from .db_moderation import StandardJob, StandardUpload

    blob = s.get(Blob, blob_id)
    if blob is not None and holds.job_held(s, blob.job_id, now):
        return True
    if s.scalars(select(PreservationHold.id).where(PreservationHold.blob_id == blob_id, holds.active(now)).limit(1)).first():
        return True
    for job_id in s.scalars(
        select(StandardJob.job_id).where(or_(StandardJob.video_blob_id == blob_id, StandardJob.thumbnail_blob_id == blob_id))
    ).all():
        if holds.job_held(s, job_id, now):
            return True
    for upload in s.scalars(select(StandardUpload).where(StandardUpload.blob_id == blob_id)).all():
        if holds.upload_held(s, upload.id, now) or holds.job_held(s, upload.job_id, now):
            return True
    return False


def _delete_data_keys(state: Any, s: Session, labels: list[str]) -> int:
    result = s.execute(delete(StorageDataKey).where(StorageDataKey.label.in_(labels)).execution_options(synchronize_session=False))
    keyring = getattr(state, "_kuno_keyring", None)
    if keyring is not None:
        keyring._evict(labels=set(labels))
    return result.rowcount or 0


def replay_blob(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    from .db import Blob

    if _blob_held(s, entry.ref, now):
        return HELD
    row = s.get(Blob, entry.ref)
    if row is None and not _object_exists(state, entry.ref):
        return ABSENT
    if dry_run:
        return WOULD_DELETE
    state.blobs.delete(entry.ref)
    if row is not None:
        s.delete(row)
    return DELETED


def replay_job_blobs(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    from . import holds
    from .db import Blob

    if holds.job_held(s, entry.ref, now):
        return HELD
    rows = s.scalars(select(Blob).where(Blob.job_id == entry.ref)).all()
    if not rows:
        return ABSENT
    if dry_run:
        return WOULD_DELETE
    for row in rows:
        state.blobs.delete(row.id)
        s.delete(row)
    return DELETED


def _purge_standard(state: Any, s: Session, row: Any, now: float) -> None:
    from . import standard_jobs

    if row.deleted_at is None:
        row.deleted_at, row.delete_reason = now, "deleted"
    standard_jobs.delete_content(state, s, row, now)


def replay_standard_content(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    from . import holds
    from .db import Blob
    from .db_moderation import StandardJob

    row = s.get(StandardJob, entry.ref)
    if row is None:
        return ABSENT
    if holds.job_held(s, entry.ref, now):
        return HELD
    has_blobs = s.scalars(select(Blob.id).where(Blob.job_id == entry.ref).limit(1)).first() is not None
    if not holds._has_content(s, row) and not has_blobs and row.deleted_at is not None:
        return ABSENT
    if dry_run:
        return WOULD_DELETE
    _purge_standard(state, s, row, now)
    return DELETED


def replay_standard_upload(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    from . import holds
    from .db_moderation import StandardUpload
    from .standard_jobs import upload_label

    upload = s.get(StandardUpload, entry.ref)
    if upload is None:
        return ABSENT
    if holds.upload_held(s, upload.id, now) or holds.job_held(s, upload.job_id, now):
        return HELD
    if dry_run:
        return WOULD_DELETE
    if upload.blob_id:
        state.blobs.delete(upload.blob_id)
    _delete_data_keys(state, s, [upload_label(upload.id)])
    s.delete(upload)
    return DELETED


def _label_held(s: Session, label: str, now: float) -> bool:
    from . import holds
    from .db_holds import PreservationHold
    from .db_moderation import StandardUpload

    parts = label.split("/")
    if len(parts) >= 3 and parts[0] == "standard" and parts[1] in ("upload", "blocked-upload"):
        upload = s.get(StandardUpload, parts[2])
        return holds.upload_held(s, parts[2], now) or (upload is not None and holds.job_held(s, upload.job_id, now))
    if len(parts) >= 3 and parts[0] == "standard" and parts[1] in ("video", "thumbnail", "output-key"):
        return holds.job_held(s, parts[2], now)
    if len(parts) >= 3 and parts[0] == "hold":
        hold = s.get(PreservationHold, parts[1])
        return hold is not None and hold.released_at is None and hold.expires_at > now
    return False


def replay_data_key(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    if _label_held(s, entry.ref, now):
        return HELD
    present = s.scalars(select(StorageDataKey.id).where(StorageDataKey.label == entry.ref).limit(1)).first() is not None
    if not present:
        return ABSENT
    if dry_run:
        return WOULD_DELETE
    _delete_data_keys(state, s, [entry.ref])
    return DELETED


def replay_video(state: Any, s: Session, entry: Entry, now: float, dry_run: bool) -> str:
    """Deletes the content again; a restored job's status and the ledger are left as the restore left them."""
    from . import holds, standard_jobs
    from .db import Blob, Job
    from .db_moderation import StandardJob

    job = s.get(Job, entry.ref)
    if job is None:
        return ABSENT
    if holds.job_held(s, job.id, now):
        return HELD
    row = s.get(StandardJob, job.id) if job.privacy == standard_jobs.STANDARD else None
    has_blobs = s.scalars(select(Blob.id).where(Blob.job_id == job.id).limit(1)).first() is not None
    has_content = has_blobs or (row is not None and (holds._has_content(s, row) or row.deleted_at is None))
    if not has_content:
        return ABSENT
    if dry_run:
        return WOULD_DELETE
    if row is not None:
        _purge_standard(state, s, row, now)
    else:
        standard_jobs.remove_job_blobs(state, s, job.id, now)
    return DELETED


for _kind, _fn in (
    (BLOB, replay_blob), (JOB_BLOBS, replay_job_blobs), (STANDARD_CONTENT, replay_standard_content),
    (STANDARD_UPLOAD, replay_standard_upload), (DATA_KEY, replay_data_key), (VIDEO, replay_video),
):
    register_replayer(_kind, _fn)
