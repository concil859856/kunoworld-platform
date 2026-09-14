"""Scanning a finished Standard video before the gateway keeps it (MODERATION.md, "Output scanning").

`standard_jobs.ingest_output` decrypts a succeeded Standard job's video and checks it against its receipt; then, before
anything is stored for the owner, the video runs through the same matchers as uploads (upload_scan.py: exact SHA-256,
PDQ per sampled frame, programme placeholders). On a match:

* the job fails as `safety_blocked` (refunded, like every failed job), which records one strike (state.finish_job);
* nothing readable is stored for the owner: the video is sealed at rest under an `output_match` hold on the job, in a
  blob only the moderation item's video route (under that hold) and a CyberTipline submission read;
* an `output_match` moderation item records the hash, list name, category and distance.

Private jobs are never scanned here: the gateway can't decrypt them. Nothing here logs video data.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from . import holds, moderation
from .upload_scan import ScanUnavailable, Unscannable, scanner_for
from .vault import vault

if TYPE_CHECKING:
    from .db import Job
    from .db_moderation import StandardJob
    from .state import GatewayState

log = logging.getLogger("kuno.output_scan")

MIME = "video/mp4"
BLOCKED_MESSAGE = "This video can't be delivered."
UNAVAILABLE_MESSAGE = "The video couldn't be checked, so it wasn't kept. Your credit was refunded; submit again."


class OutputRefused(str):
    """What `ingest_output` returns when a video can't be kept. `finish_job` fails the job with `error_code` and shows
    `message`; as a plain string it still reads as the problem description."""

    error_code: str
    message: str

    def __new__(cls, problem: str, error_code: str, message: str | None = None):
        refused = super().__new__(cls, problem)
        refused.error_code = error_code
        refused.message = message or f"The worker's output failed verification: {problem}."
        return refused


def scan_output(
    state: GatewayState, s: Session, job: Job, row: StandardJob, video: bytes, digest: str, now: float,
) -> OutputRefused | None:
    """None when the video may be kept. Called inside the transaction that finishes the job."""
    scanner = scanner_for(state)
    if not scanner.matchers:
        return None
    try:
        match = scanner.scan(video, digest, MIME)
    except Unscannable:
        return OutputRefused("the video could not be decoded for scanning", "bad_output")
    except ScanUnavailable:
        log.error("output scanning is unavailable; not keeping the video of job %s", job.id)
        return OutputRefused("scanning was unavailable", "scan_unavailable", UNAVAILABLE_MESSAGE)
    if match is None:
        return None
    blob_id, _, _ = state.blobs.put(vault(state).seal(holds.blocked_output_label(job.id), video, s))
    hold = holds.place(
        s, state.settings, reason="output_match", created_by=holds.SYSTEM, account_id=job.account_id, job_id=job.id,
        blob_id=blob_id, now=now, note=f"blocked output ({match.matcher} match)", detail={"automatic": True},
    )
    moderation.add_item(
        s, "output_match", moderation.UPLOAD_MATCH_PRIORITY, job_id=job.id, account_id=job.account_id, now=now,
        detail={"sha256": digest, "size": len(video), "mime": MIME, "matcher": match.matcher, "match_kind": match.kind,
                "list": match.list_name, "category": match.category, "hold_id": hold.id, **match.detail()},
    )
    # The preserved copy is the held blob; the job keeps no key that would open its sealed output again.
    row.output_key = None
    # Hashes and list names only; never the video.
    log.warning("blocked a standard output: job=%s account=%s sha256=%s list=%s", job.id, job.account_id, digest, match.list_name)
    return OutputRefused(f"the video matched the hash list {match.list_name}", "safety_blocked", BLOCKED_MESSAGE)
