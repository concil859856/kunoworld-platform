"""Data export (STANDARD_MODE.md, "Your data"): a zip of everything an account holds, built in the background.

`POST /v1/me/exports` queues one (one in progress per account). The gateway's background loop (`run_pending`) builds it
into the blob store and, a week after it is ready, deletes it (`expire`). Exports are copies: deleting one deletes
nothing else, and the customer is told when it goes.

The zip is sealed at rest like Standard content. It is written in parts of `PART_BYTES`, each sealed with the platform's
at-rest key under a label naming the export and the part, so a large account never sits in memory whole and no
plaintext touches a disk. Downloading opens the parts in order.

A builder holds a claim (`LOCK_S`) that it renews as it works, and lists each part on the export's row as soon as the
part is stored (`record_parts`). If the builder stops (a crash, a restart) its claim lapses, and the next pass of the
background loop (`reap_stalled`, from `run_pending`) cleans up: it deletes the listed parts, deletes the data keys of
every part sealed for the export (so a part stored in the instant before it could be listed can never be opened
either), and queues the export again, or fails it if it was requested more than `GIVE_UP_AFTER_S` ago. A builder that
wakes up afterwards finds its claim gone the next time it stores a part or settles, deletes what it stored and stops.
Reaping is idempotent: it acts only on a running export whose claim has lapsed.

What goes in (README.txt in the zip says the same to the customer):

* account.json: email, account, balance, ledger, payments, linked wallets, API key names and prefixes (never keys),
  roles, strikes, restrictions, appeals, and reports filed with the account's email as the contact;
* jobs.json: every job's metadata, privacy mode, parameters and receipt, and what happened to its content;
* Standard jobs whose content is stored: request.json (prompt and settings), the video, its thumbnail and the input
  files, decrypted as the owner's download is;
* Private jobs whose output is stored: the sealed output as stored (ciphertext; the key is the customer's);
* the wrapped Private keys from key sync (`key_vault.export_account`), when that module is installed.

What never goes in: content the owner deleted or moderation removed, even while a preservation hold keeps it; secrets
(API keys, the webhook secret); anything about holds; operators' identities or notes.
"""

from __future__ import annotations

import hashlib
import io
import json
import logging
import mimetypes
import time
import uuid
import zipfile
from collections.abc import Callable, Iterator
from datetime import datetime, timezone
from typing import IO, TYPE_CHECKING, Any

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from . import appeals, identity, ledger, lifecycle_hooks, payments, roles, standard_jobs, wallets
from .db import Account, ApiKey, Blob, Job, LedgerEntry, Payment, User, WalletLink
from .db_lifecycle import AccountExport, Appeal
from .db_moderation import AccountRestriction, Report, StandardJob, StandardUpload, Strike
from .db_roles import OperatorRole
from .vault import StorageKeyMissing, Vault, vault

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.export")

# A ready export is deleted this long after it finished: exports are copies.
EXPORT_TTL_S = 7 * 86400
# The zip is sealed and stored in parts of this size.
PART_BYTES = 32 * 1024 * 1024
# A builder's claim. It renews the claim while it works, so only a stopped builder's claim lapses.
LOCK_S = 30 * 60
RENEW_EVERY_S = 60
# A stopped builder's export is queued again, unless it was requested this long ago: then it fails (the customer can ask
# again), so an export that crashes its builder every time doesn't retry forever.
GIVE_UP_AFTER_S = 24 * 3600
FORMAT_VERSION = 1

QUEUED, RUNNING, READY, FAILED, EXPIRED, DELETED = "queued", "running", "ready", "failed", "expired", "deleted"
IN_PROGRESS = (QUEUED, RUNNING)
# What jobs.json says about a job's content when it isn't in the export.
LEFT_OUT = ("deleted", "removed", "expired")


class ExportInProgress(Exception):
    """Another export of the account is queued or being built. `payload` is that export's JSON."""

    def __init__(self, payload: dict):
        super().__init__("an export of this account is already in progress")
        self.payload = payload


class _Abandoned(Exception):
    """This builder's claim is gone: the export was deleted (its account was closed), or queued again after the claim
    lapsed (`reap_stalled`) and perhaps claimed by another builder."""


def part_label(export_id: str, index: int) -> str:
    return f"export/{export_id}/part/{index}"


def _utc(ts: float) -> str:
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _loads(text: str | None) -> Any:
    return json.loads(text) if text else None


# ------------------------------------------------------------------ requests


def request_export(s: Session, account_id: str, now: float) -> AccountExport:
    """Queues an export. Raises ExportInProgress while another is queued or being built."""
    current = s.scalars(
        select(AccountExport).where(AccountExport.account_id == account_id, AccountExport.status.in_(IN_PROGRESS))
    ).first()
    if current is not None:
        raise ExportInProgress(export_json(current))
    row = AccountExport(id=uuid.uuid4().hex, account_id=account_id, status=QUEUED, active_account_id=account_id, created_at=now)
    s.add(row)
    s.flush()
    return row


def export_json(row: AccountExport) -> dict:
    return {
        "export_id": row.id,
        "status": row.status,
        "created_at": row.created_at,
        "started_at": row.started_at,
        "finished_at": row.finished_at,
        # A ready export is deleted then, a week after it finished.
        "expires_at": row.expires_at,
        "deleted_at": row.deleted_at,
        "size_bytes": row.size_bytes,
        "sha256": row.sha256,
        "error_code": row.error_code,
        "contents": _loads(row.summary),
    }


# ------------------------------------------------------------------ writing the zip


class SealedParts(io.RawIOBase):
    """A write-only stream for zipfile: every `part_bytes` written is sealed at rest and stored as its own blob."""

    def __init__(
        self, state: GatewayState, store: Vault, export_id: str, part_bytes: int = PART_BYTES,
        on_part: Callable[[list[str]], None] | None = None,
    ):
        super().__init__()
        self.state, self.store, self.export_id, self.part_bytes = state, store, export_id, part_bytes
        # Called with every part id stored so far, right after each part is stored.
        self.on_part = on_part
        self.blob_ids: list[str] = []
        self.written = 0
        self.hasher = hashlib.sha256()
        self._buffer = bytearray()
        # Set once the parts are deleted. Later writes are dropped: a zipfile left open writes its end record when it is
        # garbage-collected, and that must not store a part nothing will delete.
        self.discarded = False

    def writable(self) -> bool:
        return True

    def write(self, data) -> int:
        view = memoryview(data).cast("B")
        if self.discarded:
            return len(view)
        self._buffer += view
        self.written += len(view)
        self.hasher.update(view)
        while len(self._buffer) >= self.part_bytes:
            self._store(bytes(self._buffer[: self.part_bytes]))
            del self._buffer[: self.part_bytes]
        return len(view)

    def finish(self) -> None:
        if self._buffer or not self.blob_ids:
            self._store(bytes(self._buffer))
            self._buffer.clear()

    def _store(self, chunk: bytes) -> None:
        sealed = self.store.seal(part_label(self.export_id, len(self.blob_ids)), chunk)
        blob_id, _, _ = self.state.blobs.put(sealed)
        self.blob_ids.append(blob_id)
        if self.on_part is not None:
            try:
                self.on_part(list(self.blob_ids))
            except BaseException:
                self.discarded = True  # nothing more is stored; the builder deletes what was
                raise

    def discard(self) -> None:
        """Deletes every part stored so far and drops anything written afterwards."""
        self.discarded = True
        self._buffer.clear()
        standard_jobs.discard_blobs(self.state, self.blob_ids)


class _Archive:
    """A zip written straight to a stream; zipfile handles one that can't seek."""

    def __init__(self, fp: IO[bytes], now: float):
        self.zip = zipfile.ZipFile(fp, "w", allowZip64=True)
        self.date_time = time.gmtime(now)[:6]

    def add(self, name: str, data: bytes, *, compress: bool) -> None:
        info = zipfile.ZipInfo(name, date_time=self.date_time)
        # Videos and ciphertext don't shrink; only text is worth compressing.
        info.compress_type = zipfile.ZIP_DEFLATED if compress else zipfile.ZIP_STORED
        info.external_attr = 0o600 << 16
        self.zip.writestr(info, data)

    def add_json(self, name: str, value: Any) -> None:
        self.add(name, json.dumps(value, indent=2, default=str).encode(), compress=True)

    def close(self) -> None:
        self.zip.close()


_EXTENSIONS = {
    "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp", "video/mp4": ".mp4", "video/quicktime": ".mov",
    "video/webm": ".webm", "audio/wav": ".wav", "audio/x-wav": ".wav", "audio/mpeg": ".mp3", "audio/ogg": ".ogg",
    "audio/flac": ".flac",
}


def _extension(mime: str | None) -> str:
    base = (mime or "").split(";")[0].strip().lower()
    return _EXTENSIONS.get(base) or mimetypes.guess_extension(base) or ".bin"


def account_document(s: Session, account: Account, user: User | None, now: float) -> dict:
    """account.json. Secrets, operators' identities and their notes stay out."""

    def of_account(model):
        return select(model).where(model.account_id == account.id)

    email = user.email if user is not None else None
    grants = (
        s.scalars(select(OperatorRole).where(OperatorRole.user_id == user.id).order_by(OperatorRole.granted_at)).all()
        if user is not None
        else []
    )
    filed = s.scalars(select(Report).where(Report.contact_email == email).order_by(Report.created_at)).all() if email else []
    return {
        "format": "kunoworld-account-export",
        "version": FORMAT_VERSION,
        "generated_at": now,
        "user": None if user is None else {
            "user_id": user.id, "email": email, "created_at": user.created_at, "last_login_at": user.last_login_at,
        },
        "account": {
            "account_id": account.id,
            "created_at": account.created_at,
            "balance_usd": ledger.to_usd(account.balance_micros),
            "has_webhook_secret": bool(account.webhook_secret),
        },
        "ledger": [ledger.entry_json(e) for e in s.scalars(of_account(LedgerEntry).order_by(LedgerEntry.created_at)).all()],
        "payments": [payments.payment_json(p) for p in s.scalars(of_account(Payment).order_by(Payment.created_at)).all()],
        "wallets": [wallets.wallet_json(w) for w in s.scalars(of_account(WalletLink).order_by(WalletLink.created_at)).all()],
        # Names and prefixes only: KunoWorld stores a hash of each key, never the key.
        "api_keys": [identity.api_key_json(k) for k in s.scalars(of_account(ApiKey).order_by(ApiKey.created_at)).all()],
        "roles": {
            "active": roles.active_roles(s, user.id) if user is not None else [],
            "history": [{"role": g.role, "granted_at": g.granted_at, "revoked_at": g.revoked_at} for g in grants],
        },
        "strikes": [
            {"strike_id": x.id, "reason": x.reason, "job_id": x.job_id, "created_at": x.created_at, "voided_at": x.voided_at}
            for x in s.scalars(of_account(Strike).order_by(Strike.created_at)).all()
        ],
        "restrictions": [
            {
                "restriction_id": r.id, "kind": r.kind, "until": r.until, "source": r.source,
                # An operator's reason is their audit note; automatic restrictions say which rule applied.
                "reason": r.reason if r.source == "strikes" else None,
                "created_at": r.created_at, "lifted_at": r.lifted_at,
            }
            for r in s.scalars(of_account(AccountRestriction).order_by(AccountRestriction.created_at)).all()
        ],
        "appeals": [appeals.owner_json(a) for a in s.scalars(of_account(Appeal).order_by(Appeal.created_at)).all()],
        "reports_filed": [
            {
                "report_id": r.id, "reason": r.reason, "status": r.status, "job_id": r.job_id, "content_digest": r.content_digest,
                "url": r.url, "details": r.details, "created_at": r.created_at, "resolved_at": r.resolved_at,
            }
            for r in filed
        ],
    }


def job_entry(job: Job) -> dict:
    return {
        "job_id": job.id,
        "privacy": job.privacy or standard_jobs.PRIVATE,
        "profile_id": job.profile_id,
        "status": job.status,
        "error_code": job.error_code,
        "error": job.error,
        "params": _loads(job.params),
        "price_usd": job.price_usd,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "enclave_id": job.enclave_id,
        "content_digest": job.content_digest,
        "receipt": _loads(job.receipt),
        "webhook_url": job.webhook_url,
    }


def _standard_content(
    state: GatewayState, archive: _Archive, job: Job, uploads: list[StandardUpload], counts: dict,
) -> tuple[str, list[str]]:
    # Read again here, not from the snapshot: content deleted while the export runs stays out.
    with state.session() as s:
        row = s.get(StandardJob, job.id)
    if row is None:
        return "none", []
    if row.deleted_at is not None:
        # Deleted by its owner or removed after a review, including content a preservation hold still keeps.
        return row.delete_reason or "deleted", []
    base = f"standard/{job.id}"
    inputs = standard_jobs.inputs_json(row)
    files = [f"{base}/request.json"]
    archive.add_json(files[0], {
        "job_id": job.id, "prompt": row.prompt, "negative_prompt": row.negative_prompt, "seed": row.seed,
        "options": _loads(row.options) or {}, "inputs": inputs,
    })
    counts["standard_requests"] += 1
    if row.video_blob_id:
        try:
            video = standard_jobs.load_video(state, row)
        except KeyError:
            video = None
        if video is not None:
            archive.add(f"{base}/video.mp4", video, compress=False)
            files.append(f"{base}/video.mp4")
            counts["standard_videos"] += 1
            try:
                jpeg = standard_jobs.thumbnail(state, job.id)
            except (KeyError, standard_jobs.ThumbnailUnavailable):
                counts["thumbnails_unavailable"] += 1
            else:
                archive.add(f"{base}/thumbnail.jpg", jpeg, compress=False)
                files.append(f"{base}/thumbnail.jpg")
                counts["thumbnails"] += 1
    index_of = {ref.get("upload_id"): ref.get("index", 0) for ref in inputs}
    for upload in sorted(uploads, key=lambda u: index_of.get(u.id, 0)):
        if not upload.blob_id:
            continue
        try:
            data = standard_jobs.read_upload(state, upload)
        except KeyError:
            continue
        name = f"{base}/inputs/{index_of.get(upload.id, 0)}-{upload.role}{_extension(upload.mime)}"
        archive.add(name, data, compress=False)
        files.append(name)
        counts["standard_inputs"] += 1
    return "stored", files


def _private_content(state: GatewayState, archive: _Archive, job: Job, counts: dict) -> tuple[str, list[str]]:
    if not job.output_blob_id:
        return "none", []
    with state.session() as s:
        blob = s.get(Blob, job.output_blob_id)
    # A hidden blob has expired: its owner deleted it, or moderation removed it, and only a hold still keeps it.
    if blob is None or blob.expires_at <= time.time():
        return "deleted", []
    try:
        sealed = state.blobs.get(blob.id)
    except KeyError:
        return "deleted", []
    name = f"private/{job.id}/output.kunob"
    archive.add(name, sealed, compress=False)
    counts["private_outputs"] += 1
    return "stored", [name]


def readme(account_id: str, now: float, key_sync: bool) -> str:
    keys = (
        "private/keys.json\n"
        "  Your wrapped Private keys from key sync, exactly as KunoWorld stores them. They are wrapped with a secret only\n"
        "  you hold, so KunoWorld can't unwrap them.\n"
        if key_sync
        else "private/keys.json is not included: key sync isn't available on this gateway, so your Private keys are only\n"
        "  on your own devices.\n"
    )
    return (
        "KunoWorld data export\n"
        "=====================\n\n"
        f"Account:  {account_id}\n"
        f"Prepared: {_utc(now)}\n\n"
        "This is a copy. KunoWorld deletes it automatically 7 days after it finished preparing. Deleting it deletes\n"
        "nothing else: your account and videos stay as they are. You can request a new export on your account page.\n\n"
        "WHAT EACH FILE IS\n\n"
        "README.txt\n"
        "  This file.\n\n"
        "account.json\n"
        "  Your email address and account; your balance and every ledger entry (charges, refunds, top-ups, credits);\n"
        "  payments; linked Bittensor wallets; API keys by name and prefix (never the keys themselves: KunoWorld stores\n"
        "  only a hash of each); operator roles; strikes, restrictions and appeals; and reports filed with this email\n"
        "  address as the contact.\n\n"
        "jobs.json\n"
        "  Every video job: privacy mode, model and parameters, status, price, times, content digest, the signed\n"
        "  receipt, what happened to its content (stored, deleted, removed, or none if it never produced any) and the\n"
        "  files below that belong to it.\n\n"
        "standard/<job id>/request.json\n"
        "  A Standard job's prompt, negative prompt, seed, options and input details.\n\n"
        "standard/<job id>/video.mp4 and standard/<job id>/thumbnail.jpg\n"
        "  The Standard video and its preview, decrypted exactly as your own download is.\n\n"
        "standard/<job id>/inputs/\n"
        "  The files you uploaded for that job.\n\n"
        "private/<job id>/output.kunob\n"
        "  A Private video exactly as KunoWorld stores it: ciphertext. The keys are yours: KunoWorld never had them. It\n"
        "  opens only with the key kept on your devices (the studio, its key backup, or wherever your program saved it).\n\n"
        f"{keys}\n"
        "NOT INCLUDED\n\n"
        "- Content you deleted, and content KunoWorld removed after a review.\n"
        "- Private prompts and inputs: they were sealed to the worker that rendered each job, and KunoWorld could never\n"
        "  read them.\n"
        "- Secrets: API keys and the webhook signing secret.\n"
    )


def write_export(
    state: GatewayState, account_id: str, fp: IO[bytes], now: float, heartbeat: Callable[[], None] = lambda: None,
) -> dict:
    """Writes the export zip for `account_id` to `fp`; returns counts of what went in and what was left out."""
    with state.session() as s:
        account = s.get(Account, account_id)
        if account is None:
            raise LookupError(account_id)
        user = s.get(User, account.owner_user_id) if account.owner_user_id else None
        document = account_document(s, account, user, now)
        jobs = list(s.scalars(select(Job).where(Job.account_id == account_id).order_by(Job.created_at)).all())
        uploads: dict[str, list[StandardUpload]] = {}
        for upload in s.scalars(
            select(StandardUpload).where(StandardUpload.account_id == account_id, StandardUpload.job_id.is_not(None))
        ).all():
            uploads.setdefault(upload.job_id, []).append(upload)
        removed = appeals.removed_job_ids(s, account_id)
        key_sync, wrapped_keys = lifecycle_hooks.key_vault_export(s, account_id)

    counts = {
        "jobs": len(jobs), "standard_requests": 0, "standard_videos": 0, "thumbnails": 0, "thumbnails_unavailable": 0,
        "standard_inputs": 0, "private_outputs": 0, "left_out_deleted": 0, "left_out_removed": 0, "key_sync": key_sync,
        "wrapped_keys": None,
    }
    archive = _Archive(fp, now)
    archive.add("README.txt", readme(account_id, now, key_sync).encode(), compress=True)
    archive.add_json("account.json", document)
    entries = []
    for job in jobs:
        entry = job_entry(job)
        if job.privacy == standard_jobs.STANDARD:
            content, files = _standard_content(state, archive, job, uploads.get(job.id, []), counts)
        else:
            content, files = _private_content(state, archive, job, counts)
        if content in LEFT_OUT:
            content = "removed" if content == "removed" or job.id in removed else "deleted"
            counts[f"left_out_{content}"] += 1
        entry["content"], entry["files"] = content, files
        entries.append(entry)
        heartbeat()
    if key_sync:
        archive.add_json("private/keys.json", {
            "format": "kunoworld-wrapped-keys", "version": FORMAT_VERSION, "account_id": account_id, "keys": wrapped_keys,
        })
        job_keys = wrapped_keys.get("job_keys") if isinstance(wrapped_keys, dict) else wrapped_keys
        counts["wrapped_keys"] = len(job_keys) if isinstance(job_keys, (list, tuple)) else None
    archive.add_json("jobs.json", {"format": "kunoworld-jobs-export", "version": FORMAT_VERSION, "jobs": entries})
    archive.close()
    return counts


# ------------------------------------------------------------------ the background builder


def claim(state: GatewayState, now: float | None = None) -> tuple[str, float] | None:
    """Claims the oldest queued export. Returns (export id, claim time). An export whose builder stopped is queued again
    by `reap_stalled` once its parts are deleted, so it is never claimed with a stopped builder's parts still around."""
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        query = select(AccountExport).where(AccountExport.status == QUEUED).order_by(AccountExport.created_at).limit(1)
        if state.postgres:
            query = query.with_for_update(skip_locked=True)
        row = s.scalars(query).first()
        if row is None:
            return None
        row.status, row.started_at, row.locked_until, row.part_blob_ids = RUNNING, now, now + LOCK_S, None
        return row.id, now


def renew(state: GatewayState, export_id: str, claimed_at: float, now: float | None = None) -> bool:
    """Extends a builder's claim. False: the export was deleted or claimed by another builder."""
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        result = s.execute(
            update(AccountExport)
            .where(AccountExport.id == export_id, AccountExport.status == RUNNING, AccountExport.started_at == claimed_at)
            .values(locked_until=now + LOCK_S)
        )
    return bool(result.rowcount)


def record_parts(state: GatewayState, export_id: str, claimed_at: float, blob_ids: list[str], now: float | None = None) -> bool:
    """Lists the parts a builder has stored so far on its export and renews its claim. False: the claim is gone (the
    export was deleted, or queued again after the claim lapsed), and the builder must stop."""
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        result = s.execute(
            update(AccountExport)
            .where(AccountExport.id == export_id, AccountExport.status == RUNNING, AccountExport.started_at == claimed_at)
            .values(part_blob_ids=json.dumps(blob_ids), locked_until=now + LOCK_S)
        )
    return bool(result.rowcount)


def _settle(
    state: GatewayState, export_id: str, claimed_at: float, status: str, *, error_code: str | None = None,
    writer: SealedParts | None = None, summary: dict | None = None,
) -> bool:
    now = time.time()
    with state.session() as s, s.begin():
        row = s.get(AccountExport, export_id, with_for_update=state.postgres)
        if row is None or row.status != RUNNING or row.started_at != claimed_at:
            return False
        row.status, row.finished_at, row.locked_until, row.active_account_id = status, now, None, None
        if status == READY and writer is not None:
            row.part_blob_ids = json.dumps(writer.blob_ids)
            row.size_bytes, row.sha256 = writer.written, writer.hasher.hexdigest()
            row.summary = json.dumps(summary, separators=(",", ":"))
            row.expires_at = now + EXPORT_TTL_S
        else:
            # The builder deleted the parts it had stored before settling.
            row.error_code, row.part_blob_ids = error_code, None
    return True


def build(state: GatewayState, export_id: str, claimed_at: float) -> str:
    """Builds one claimed export into the blob store. Returns its final status."""
    try:
        store = vault(state)
    except StorageKeyMissing:
        _settle(state, export_id, claimed_at, FAILED, error_code="export_unavailable")
        return FAILED
    with state.session() as s:
        row = s.get(AccountExport, export_id)
        account_id = row.account_id if row is not None else None
    if account_id is None:
        return DELETED
    renewed = [time.monotonic()]

    def heartbeat() -> None:
        if time.monotonic() - renewed[0] < RENEW_EVERY_S:
            return
        if not renew(state, export_id, claimed_at):
            raise _Abandoned()
        renewed[0] = time.monotonic()

    def listed(blob_ids: list[str]) -> None:
        # Each part is on the row before more is written, so a builder that stops leaves nothing unlisted for reap_stalled.
        if not record_parts(state, export_id, claimed_at, blob_ids):
            raise _Abandoned()
        renewed[0] = time.monotonic()

    writer = SealedParts(state, store, export_id, PART_BYTES, on_part=listed)

    try:
        summary = write_export(state, account_id, writer, claimed_at, heartbeat)
        writer.finish()
    except _Abandoned:
        writer.discard()
        return DELETED
    except Exception:
        log.exception("building data export %s failed", export_id)
        writer.discard()
        _settle(state, export_id, claimed_at, FAILED, error_code="export_failed")
        return FAILED
    if not _settle(state, export_id, claimed_at, READY, writer=writer, summary=summary):
        writer.discard()
        return DELETED
    return READY


def delete_copy(state: GatewayState, s: Session, row: AccountExport, status: str, now: float) -> None:
    """Deletes an export's stored zip (expiry, or its account closing) and marks the row."""
    ids = json.loads(row.part_blob_ids) if row.part_blob_ids else []
    standard_jobs.discard_blobs(state, ids)
    if ids:
        lifecycle_hooks.tombstone(s, "account_export", row.id, row.account_id, now)
    row.status, row.deleted_at, row.part_blob_ids, row.active_account_id, row.locked_until = status, now, None, None, None


def expire(state: GatewayState, now: float | None = None) -> int:
    """Deletes ready exports a week after they finished."""
    now = time.time() if now is None else now
    with state.session() as s, s.begin():
        rows = s.scalars(select(AccountExport).where(AccountExport.status == READY, AccountExport.expires_at <= now)).all()
        for row in rows:
            delete_copy(state, s, row, EXPIRED, now)
    return len(rows)


def _forget_part_keys(state: GatewayState, s: Session, export_id: str) -> list[str]:
    """Deletes the data keys of every part sealed for this export, listed on its row or not, in the caller's transaction."""
    from .db_storage import StorageDataKey
    from .storage_keys import keyring_for

    labels = sorted(set(s.scalars(select(StorageDataKey.label).where(StorageDataKey.label.like(f"export/{export_id}/part/%"))).all()))
    return keyring_for(state).forget(s, labels) if labels else []


def reap_stalled(state: GatewayState, now: float | None = None) -> int:
    """Cleans up after builders that stopped: for each running export whose claim lapsed, deletes the parts its builder
    stored and their data keys, then queues it again (or fails it, `GIVE_UP_AFTER_S` after it was requested). Returns
    how many it cleaned up. Idempotent, and safe against the builder waking up: see the module docstring."""
    now = time.time() if now is None else now
    with state.session() as s:
        candidates = s.scalars(
            select(AccountExport.id).where(AccountExport.status == RUNNING, AccountExport.locked_until < now)
        ).all()
    reaped = 0
    for export_id in candidates:
        with state.session() as s, s.begin():
            # Takes the row (a row lock on Postgres, the write lock on SQLite) only while its claim is still lapsed, so a
            # builder that renewed, listed a part or settled meanwhile keeps its export.
            taken = s.execute(
                update(AccountExport)
                .where(AccountExport.id == export_id, AccountExport.status == RUNNING, AccountExport.locked_until < now)
                .values(locked_until=AccountExport.locked_until)
                .execution_options(synchronize_session=False)
            ).rowcount
            if not taken:
                continue
            row = s.get(AccountExport, export_id, populate_existing=True)
            orphaned = json.loads(row.part_blob_ids) if row.part_blob_ids else []
            forgotten = _forget_part_keys(state, s, export_id)
            row.part_blob_ids, row.locked_until = None, None
            if now - row.created_at >= GIVE_UP_AFTER_S:
                row.status, row.finished_at, row.error_code, row.active_account_id = FAILED, now, "export_failed", None
            else:
                # Keeps active_account_id: the export is still the account's one in progress.
                row.status, row.started_at = QUEUED, None
            status = row.status
        # Only after the commit: had it rolled back, a builder could still be using them.
        standard_jobs.discard_blobs(state, orphaned)
        log.warning(
            "data export %s: its builder stopped; deleted %d stored parts and %d part keys, and marked it %s",
            export_id, len(orphaned), len(forgotten), status,
        )
        reaped += 1
    return reaped


def run_pending(state: GatewayState, limit: int = 1) -> int:
    """One pass of the background loop: delete expired copies, clean up after builders that stopped, then build up to
    `limit` exports."""
    expire(state)
    reap_stalled(state)
    built = 0
    while built < limit:
        claimed = claim(state)
        if claimed is None:
            break
        build(state, *claimed)
        built += 1
    return built


def download_chunks(state: GatewayState, row: AccountExport) -> Iterator[bytes]:
    """The zip, opened part by part. Raises KeyError before streaming if the copy is gone."""
    store = vault(state)
    ids = json.loads(row.part_blob_ids) if row.part_blob_ids else []
    if not ids:
        raise KeyError(row.id)
    first = store.open(part_label(row.id, 0), state.blobs.get(ids[0]))

    def chunks() -> Iterator[bytes]:
        yield first
        for index, blob_id in enumerate(ids[1:], start=1):
            yield store.open(part_label(row.id, index), state.blobs.get(blob_id))

    return chunks()
