"""Standard jobs: the gateway plays the client.

For a standard job the gateway does exactly what the SDK does for a private one: it opens a `SenderSession`
to the chosen enclave's HPKE key, encrypts each input with `encrypt_blob(session.input_key, input_label(...))`,
seals the `SealedPayload` with `job_aad(...)` as associated data, and keeps `session.output_key`. Workers can't
tell the difference. When the job succeeds the gateway checks the receipt like the SDK would, decrypts the
video and stores it encrypted at rest for the owner.

Enclave selection uses GatewayState's privacy-aware routing (`routable_enclaves`, `enclave_serves`), falling back
to `tier_serves(tier_for_tee(tee), privacy)` directly.
"""

from __future__ import annotations

import json
import logging
import shutil
import subprocess
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e, sha256_hex
from kuno_protocol.crypto import DecryptionError, SenderSession
from kuno_protocol.receipts import Receipt, verify_receipt
from kuno_protocol.schemas import (
    GenerationParams,
    InputRef,
    JobState,
    SealedPayload,
    input_label,
    job_aad,
    output_label,
)
from kuno_protocol.tiers import tier_for_tee, tier_serves
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import holds
from .db import Blob, Enclave, Job
from .db_moderation import StandardJob, StandardUpload
from .vault import vault

if TYPE_CHECKING:
    from .state import GatewayState

log = logging.getLogger("kuno.standard")

STANDARD = "standard"
PRIVATE = "private"


class ThumbnailUnavailable(Exception):
    pass


def upload_label(upload_id: str) -> str:
    return f"standard/upload/{upload_id}"


def video_label(job_id: str) -> str:
    return f"standard/video/{job_id}"


def thumbnail_label(job_id: str) -> str:
    return f"standard/thumbnail/{job_id}"


def output_key_label(job_id: str) -> str:
    return f"standard/output-key/{job_id}"


def report_key_label(report_id: str) -> str:
    return f"report/{report_id}/output-key"


# ------------------------------------------------------------------ routing


def serves(enclave: Enclave, privacy: str) -> bool:
    from . import state as state_module

    check = getattr(state_module, "enclave_serves", None)
    return check(enclave, privacy) if check else tier_serves(tier_for_tee(enclave.tee), privacy)


def enclaves_for(state: GatewayState, s: Session, profile_id: str, privacy: str) -> list[Enclave]:
    """Fresh enclaves for a profile that may run a job in this mode, least loaded first."""
    routable = getattr(state, "routable_enclaves", None)
    if routable is not None:
        return routable(s, profile_id, privacy)
    return [e for e in state.fresh_enclaves(s, profile_id) if serves(e, privacy)]


# ------------------------------------------------------------------ sealing


@dataclass
class SealedJob:
    enc: str
    ciphertext: str
    output_key: bytes
    # (blob_id, sha256 of the sealed blob, size), in input order
    blobs: list[tuple[str, str, int]] = field(default_factory=list)

    @property
    def blob_ids(self) -> list[str]:
        return [b[0] for b in self.blobs]


def seal_job(
    state: GatewayState, *, job_id: str, enclave_id: str, hpke_public_key: str, params: GenerationParams,
    prompt: str, negative_prompt: str | None, seed: int, options: dict[str, Any], inputs: list[tuple[dict, bytes]],
) -> SealedJob:
    """Seals a job to an enclave exactly as `KunoClient.prepare` does. `inputs` is (ref fields, plaintext) in index order.

    Sealed input blobs go into the blob store; on any failure they are deleted again.
    """
    session = SenderSession(b64d(hpke_public_key))
    sealed = SealedJob(enc=b64e(session.enc), ciphertext="", output_key=session.output_key)
    try:
        refs = []
        for index, (spec, data) in enumerate(inputs):
            blob = encrypt_blob(session.input_key, input_label(job_id, index), data)
            sealed.blobs.append(state.blobs.put(blob))
            refs.append(
                InputRef(
                    index=index, role=spec["role"], mime=spec["mime"], sha256=sha256_hex(data), size=len(data),
                    time_s=spec.get("time_s"), strength=spec.get("strength"), hint=spec.get("hint"),
                    start_s=spec.get("start_s"), end_s=spec.get("end_s"),
                )
            )
        payload = SealedPayload(prompt=prompt, negative_prompt=negative_prompt, seed=seed, inputs=refs, options=options)
        ciphertext = session.seal(payload.model_dump_json().encode(), job_aad(job_id, enclave_id, params, sealed.blob_ids))
        sealed.ciphertext = b64e(ciphertext)
    except BaseException:
        discard_blobs(state, sealed.blob_ids)
        raise
    return sealed


def discard_blobs(state: GatewayState, blob_ids) -> None:
    for blob_id in blob_ids:
        try:
            state.blobs.delete(blob_id)
        except Exception:  # best effort: an orphan is ciphertext nobody can open
            log.warning("could not delete blob %s", blob_id)


def read_upload(state: GatewayState, upload: StandardUpload) -> bytes:
    data = vault(state).open(upload_label(upload.id), state.blobs.get(upload.blob_id))
    if sha256_hex(data) != upload.sha256:
        raise DecryptionError("stored upload does not match its digest")
    return data


# ------------------------------------------------------------------ results


def ingest_output(state: GatewayState, s: Session, job: Job, now: float) -> str | None:
    """Called as a standard job succeeds. Verifies the receipt against the decrypted video and stores it.

    Returns a problem description when the output can't be trusted; the caller fails the job instead.
    """
    row = s.get(StandardJob, job.id)
    if row is None:
        return "no standard job record"
    if row.deleted_at is not None:
        return None  # deleted while it ran: nothing to keep
    if row.output_key is None:
        return None if row.video_blob_id else "the job's output key is gone"
    blob = s.get(Blob, job.output_blob_id) if job.output_blob_id else None
    enclave = s.get(Enclave, job.enclave_id)
    if blob is None or not job.receipt or enclave is None:
        return "output or receipt missing"
    receipt = Receipt.model_validate_json(job.receipt)
    if receipt.body.job_id != job.id or not verify_receipt(receipt, b64d(enclave.signing_public_key)):
        return "receipt does not verify for this job"
    try:
        sealed = state.blobs.get(blob.id)
    except KeyError:
        return "output blob missing"
    if sha256_hex(sealed) != receipt.body.output_digest:
        return "output digest does not match the receipt"
    store = vault(state)
    try:
        video = decrypt_blob(store.open_secret(output_key_label(job.id), row.output_key), output_label(job.id), sealed)
    except DecryptionError:
        return "output did not decrypt with the job's output key"
    digest = sha256_hex(video)
    if digest != receipt.body.content_digest:
        return "decrypted video does not match the receipt's content digest"
    blob_id, _, _ = state.blobs.put(store.seal(video_label(job.id), video))
    row.video_blob_id, row.video_sha256, row.video_bytes = blob_id, digest, len(video)
    row.output_key = None
    return None


def load_video(state: GatewayState, row: StandardJob) -> bytes:
    if row.video_blob_id is None:
        raise KeyError(row.job_id)
    return vault(state).open(video_label(row.job_id), state.blobs.get(row.video_blob_id))


def ffmpeg_exe(state: GatewayState) -> str:
    if state.settings.ffmpeg_path:
        return state.settings.ffmpeg_path
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise ThumbnailUnavailable("ffmpeg is not available") from exc


def make_thumbnail(ffmpeg: str, video: bytes) -> bytes:
    """A representative frame as JPEG. The video goes through a pipe, so no plaintext touches the disk."""
    try:
        proc = subprocess.run(
            [ffmpeg, "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-vf", "thumbnail=30,scale='min(640,iw)':-2",
             "-frames:v", "1", "-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "4", "pipe:1"],
            input=video, capture_output=True, timeout=120, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise ThumbnailUnavailable("ffmpeg failed") from exc
    if proc.returncode != 0 or not proc.stdout.startswith(b"\xff\xd8"):
        raise ThumbnailUnavailable("could not extract a frame")
    return proc.stdout


def thumbnail(state: GatewayState, job_id: str) -> bytes:
    """The stored thumbnail, made on first request. Blocking: call it off the event loop."""
    store = vault(state)
    with state.session() as s:
        row = s.get(StandardJob, job_id)
    if row is None or row.video_blob_id is None:
        raise KeyError(job_id)
    if row.thumbnail_blob_id:
        return store.open(thumbnail_label(job_id), state.blobs.get(row.thumbnail_blob_id))
    jpeg = make_thumbnail(ffmpeg_exe(state), load_video(state, row))
    blob_id, _, _ = state.blobs.put(store.seal(thumbnail_label(job_id), jpeg))
    with state.session() as s, s.begin():
        current = s.get(StandardJob, job_id, with_for_update=state.postgres)
        if current is None or current.deleted_at is not None or current.thumbnail_blob_id:
            discard_blobs(state, [blob_id])  # deleted meanwhile, or another request stored one first
        else:
            current.thumbnail_blob_id = blob_id
    return jpeg


# ------------------------------------------------------------------ deletion
#
# Stored content never expires: only the owner's deletion or an operator's removal destroys it (and a preservation
# hold can delay that). Unused uploads are the one thing that expires.


def purge(state: GatewayState, s: Session, row: StandardJob, reason: str, now: float) -> None:
    """Hides a standard job's content from its owner and validators (`deleted_at`, `delete_reason`) and deletes the
    video, thumbnail, prompt, inputs and sealed blobs, unless a preservation hold keeps them. The billing record stays."""
    row.deleted_at, row.delete_reason = now, reason
    delete_content(state, s, row, now)


def delete_content(state: GatewayState, s: Session, row: StandardJob, now: float) -> bool:
    """Deletes a hidden standard job's stored content. While the job is held nothing is deleted (its sealed blobs
    only expire, so nobody can fetch them) and this returns False; `holds.settle` calls it again after the hold."""
    if holds.job_held(s, row.job_id, now):
        holds.hide_job_blobs(s, row.job_id, now)
        return False
    discard_blobs(state, [b for b in (row.video_blob_id, row.thumbnail_blob_id) if b])
    row.video_blob_id = row.thumbnail_blob_id = None
    row.prompt = row.negative_prompt = row.options = row.inputs = row.output_key = None
    for upload in s.scalars(select(StandardUpload).where(StandardUpload.job_id == row.job_id)).all():
        if holds.upload_held(s, upload.id, now):
            continue
        if upload.blob_id:
            discard_blobs(state, [upload.blob_id])
        s.delete(upload)
    remove_job_blobs(state, s, row.job_id, now)
    return True


def remove_job_blobs(state: GatewayState, s: Session, job_id: str, now: float | None = None) -> int:
    """Deletes every sealed blob of a job (inputs and output). For private jobs this is all the platform holds.

    Under a preservation hold nothing is deleted: the blobs expire now, which hides them, and the janitor's blob
    sweep deletes them once no hold covers the job. Returns the number deleted.
    """
    now = time.time() if now is None else now
    if holds.job_held(s, job_id, now):
        holds.hide_job_blobs(s, job_id, now)
        return 0
    blobs = s.scalars(select(Blob).where(Blob.job_id == job_id)).all()
    discard_blobs(state, [b.id for b in blobs])
    for blob in blobs:
        s.delete(blob)
    return len(blobs)


def open_private_output(state: GatewayState, job: Job, output_key: bytes) -> bytes:
    """Decrypts a private job's output with a key a report supplied, and checks it is the receipted video."""
    if not job.output_blob_id:
        raise KeyError(job.id)
    video = decrypt_blob(output_key, output_label(job.id), state.blobs.get(job.output_blob_id))
    if job.content_digest and sha256_hex(video) != job.content_digest:
        raise DecryptionError("the decrypted video does not match the job's receipt")
    return video


def expire_unused_uploads(state: GatewayState, s: Session, now: float | None = None) -> int:
    """Deletes standard uploads that never became part of a job, once past their expiry (24 h by default), unless a
    hold keeps them. Uploads a job used, and everything else a job stores, stay until the owner deletes the job."""
    now = time.time() if now is None else now
    deleted = 0
    for upload in s.scalars(
        select(StandardUpload).where(StandardUpload.expires_at < now, StandardUpload.job_id.is_(None))
    ).all():
        if holds.upload_held(s, upload.id, now):
            continue
        if upload.blob_id:
            discard_blobs(state, [upload.blob_id])
        s.delete(upload)
        deleted += 1
    return deleted


def delete_for_owner(state: GatewayState, s: Session, job: Job, now: float) -> None:
    """The owner's DELETE, either mode. Cancels (and refunds) a job still in progress, then deletes what it stores:
    Standard: the video, thumbnail, prompt, inputs and sealed blobs; Private: the sealed input and output blobs.
    Billing records and receipts stay. Under a preservation hold the content is hidden but kept."""
    if not JobState(job.status).terminal:
        state.finish_job(s, job, JobState.CANCELED, "canceled", "Deleted by the customer.")
    row = s.get(StandardJob, job.id) if job.privacy == STANDARD else None
    if row is not None:
        if row.deleted_at is None:
            purge(state, s, row, "deleted", now)
    else:
        remove_job_blobs(state, s, job.id, now)


def inputs_json(row: StandardJob) -> list[dict]:
    return json.loads(row.inputs) if row.inputs else []
