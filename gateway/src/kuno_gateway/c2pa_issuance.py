"""The C2PA issuance log, in the database, and the limits on how fast certificates are issued.

Every certificate `POST /miner/v1/certificate` hands out is recorded in `c2pa_issuances` in the same transaction that
checks the limits, so a certificate that is not on the record is never returned. The log doubles as the rate limiter's
counter, so the limits hold across every gateway process sharing the database:

* per enclave: `KUNO_C2PA_ISSUANCE_PER_ENCLAVE` certificates per `KUNO_C2PA_ISSUANCE_WINDOW_S` (default 12 per hour);
* global: `KUNO_C2PA_ISSUANCE_GLOBAL` per window (default 1000 per hour). 0 turns a limit off.

A worker needs about one certificate per validity period (24 h by default) plus one per restart, so the per-enclave
limit only bites on a misbehaving or compromised enclave. The global limit caps what an attestation bypass could mint.

The old append-only JSONL file (`KUNO_C2PA_ISSUANCE_LOG`) is imported once at start-up, idempotently, keyed on the
certificate's SHA-256; the gateway no longer writes to it.
"""

from __future__ import annotations

import json
import logging
import math
import time
from pathlib import Path
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db_storage import C2paIssuance

log = logging.getLogger("kuno.gateway.c2pa_issuance")

DEFAULT_PER_ENCLAVE = 12
DEFAULT_GLOBAL = 1000
DEFAULT_WINDOW_S = 3600
GATEWAY, JSONL = "gateway", "jsonl"
FIELDS = ("serial", "cert_sha256", "enclave_id", "evidence_digest", "image_digest", "profiles", "not_before", "not_after",
          "issued_at", "issuer_sha256")


class RateLimited(Exception):
    def __init__(self, scope: str, limit: int, window_s: int, retry_after_s: int):
        self.scope, self.limit, self.window_s, self.retry_after_s = scope, limit, window_s, retry_after_s
        who = "this enclave" if scope == "enclave" else "this gateway"
        super().__init__(f"{who} has been issued {limit} C2PA certificates in the last {window_s}s")


def limits(settings: Any) -> tuple[int, int, int]:
    per_enclave = int(getattr(settings, "c2pa_issuance_per_enclave", DEFAULT_PER_ENCLAVE))
    global_limit = int(getattr(settings, "c2pa_issuance_global", DEFAULT_GLOBAL))
    window = int(getattr(settings, "c2pa_issuance_window_s", DEFAULT_WINDOW_S))
    if per_enclave < 0 or global_limit < 0 or window <= 0:
        raise ValueError("C2PA issuance limits must be non-negative and the window positive")
    return per_enclave, global_limit, window


def _retry_after(s: Session, query, count: int, limit: int, window: int, now: float) -> int:
    """Seconds until the window holds fewer than `limit` issuances again."""
    threshold = s.scalar(query.order_by(C2paIssuance.issued_at).offset(count - limit).limit(1))
    return max(1, math.ceil((threshold or now) + window - now))


def check_rate(s: Session, settings: Any, enclave_id: str, now: float | None = None) -> None:
    """Raises RateLimited when issuing one more certificate would exceed a limit. Call it in the issuing transaction."""
    now = time.time() if now is None else now
    per_enclave, global_limit, window = limits(settings)
    since = now - window
    for scope, limit, condition in (
        ("enclave", per_enclave, (C2paIssuance.enclave_id == enclave_id, C2paIssuance.issued_at > since)),
        ("global", global_limit, (C2paIssuance.issued_at > since,)),
    ):
        if limit == 0:
            continue
        count = s.scalar(select(func.count()).select_from(C2paIssuance).where(*condition)) or 0
        if count >= limit:
            retry = _retry_after(s, select(C2paIssuance.issued_at).where(*condition), count, limit, window, now)
            raise RateLimited(scope, limit, window, retry)


def record(s: Session, fields: dict, source: str = GATEWAY) -> C2paIssuance:
    row = C2paIssuance(
        cert_sha256=fields["cert_sha256"], serial=fields["serial"], enclave_id=fields["enclave_id"],
        evidence_digest=fields["evidence_digest"], image_digest=fields["image_digest"],
        profiles=json.dumps(list(fields.get("profiles") or []), separators=(",", ":")),
        not_before=float(fields["not_before"]), not_after=float(fields["not_after"]), issued_at=float(fields["issued_at"]),
        issuer_sha256=fields["issuer_sha256"], source=source,
    )
    s.add(row)
    return row


def row_json(row: C2paIssuance) -> dict:
    return {
        "serial": row.serial, "cert_sha256": row.cert_sha256, "enclave_id": row.enclave_id,
        "evidence_digest": row.evidence_digest, "image_digest": row.image_digest, "profiles": json.loads(row.profiles),
        "not_before": row.not_before, "not_after": row.not_after, "issued_at": row.issued_at,
        "issuer_sha256": row.issuer_sha256, "source": row.source,
    }


def records(s: Session, enclave_id: str | None = None) -> list[dict]:
    """Every issuance, oldest first."""
    query = select(C2paIssuance).order_by(C2paIssuance.issued_at, C2paIssuance.cert_sha256)
    if enclave_id is not None:
        query = query.where(C2paIssuance.enclave_id == enclave_id)
    return [row_json(r) for r in s.scalars(query).all()]


def list_issuances(
    s: Session, *, enclave_id: str | None = None, since: float | None = None, until: float | None = None,
    before: float | None = None, limit: int = 100,
) -> list[dict]:
    """Newest first. Page with `before` = the last item's `issued_at`."""
    query = select(C2paIssuance).order_by(C2paIssuance.issued_at.desc(), C2paIssuance.cert_sha256.desc()).limit(limit)
    if enclave_id is not None:
        query = query.where(C2paIssuance.enclave_id == enclave_id)
    if since is not None:
        query = query.where(C2paIssuance.issued_at >= since)
    if until is not None:
        query = query.where(C2paIssuance.issued_at <= until)
    if before is not None:
        query = query.where(C2paIssuance.issued_at < before)
    return [row_json(r) for r in s.scalars(query).all()]


def usage(s: Session, settings: Any, now: float, enclave_id: str | None = None) -> dict:
    per_enclave, global_limit, window = limits(settings)
    since = now - window
    out = {
        "window_s": window, "per_enclave_limit": per_enclave, "global_limit": global_limit,
        "global_in_window": s.scalar(select(func.count()).select_from(C2paIssuance).where(C2paIssuance.issued_at > since)) or 0,
    }
    if enclave_id is not None:
        out["enclave_in_window"] = s.scalar(
            select(func.count()).select_from(C2paIssuance).where(C2paIssuance.enclave_id == enclave_id, C2paIssuance.issued_at > since)
        ) or 0
    return out


def _jsonl_entries(path: Path) -> tuple[list[dict], int]:
    entries, malformed = [], 0
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
                if not isinstance(entry, dict) or any(key not in entry for key in FIELDS):
                    raise ValueError("missing fields")
            except ValueError:
                malformed += 1  # a torn final line from a crash, for example
                continue
            entries.append(entry)
    return entries, malformed


def import_jsonl(ctx: Any, path: Path, batch_size: int = 500) -> dict:
    """Copies the JSONL issuance log into the database. Running it again imports nothing twice."""
    path = Path(path)
    if not path.exists():
        return {"path": str(path), "imported": 0, "already_present": 0, "malformed": 0}
    entries, malformed = _jsonl_entries(path)
    imported = present = 0
    for start in range(0, len(entries), batch_size):
        batch = {e["cert_sha256"]: e for e in entries[start : start + batch_size]}
        for _ in range(3):
            try:
                with ctx.session() as s, s.begin():
                    existing = set(s.scalars(select(C2paIssuance.cert_sha256).where(C2paIssuance.cert_sha256.in_(list(batch)))).all())
                    for digest, entry in batch.items():
                        if digest not in existing:
                            record(s, entry, source=JSONL)
                imported += len(batch) - len(existing)
                present += len(existing)
                break
            except IntegrityError:
                continue  # another process imported part of this batch at the same moment; look again
    if malformed:
        log.warning("skipped %d malformed lines in the C2PA issuance log %s", malformed, path)
    if imported:
        log.info("imported %d C2PA issuances from %s", imported, path)
    return {"path": str(path), "imported": imported, "already_present": present, "malformed": malformed}
