"""Operator commands for storage keys, timestamps, the issuance log and deletion replay.

    kuno-gateway rotate-storage-key [--provider-rotate] [--batch-size N] [--max-batches N] [--dry-run] [--no-retire]
    kuno-gateway check-tsa [--url URL] [--timeout S] [--trust-list C2PA-TSA-TRUST-LIST.pem]
    kuno-gateway reapply-deletions --since 2026-09-01T00:00:00Z [--until ...] [--dry-run] [--source db|export|both]
    kuno-gateway import-c2pa-log [--path issuance.jsonl]

Each prints a report (never key material) and exits 0 on success, 1 when something needs attention, 2 on bad
configuration.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from .settings import Settings

COMMANDS = ("rotate-storage-key", "check-tsa", "reapply-deletions", "import-c2pa-log")


def register(commands: Any) -> None:
    rotate = commands.add_parser("rotate-storage-key", help="re-wrap storage data keys under the configured KEK")
    rotate.add_argument("--provider-rotate", action="store_true", help="first create new key material (local file, Vault Transit)")
    rotate.add_argument("--batch-size", type=int, default=500)
    rotate.add_argument("--max-batches", type=int, default=None, help="stop after this many batches (run again to resume)")
    rotate.add_argument("--dry-run", action="store_true")
    rotate.add_argument("--no-retire", action="store_true", help="don't mark unreferenced KEK versions retired")

    check = commands.add_parser("check-tsa", help="send one RFC 3161 request to the timestamp authority")
    check.add_argument("--url", default=None, help="default: KUNO_C2PA_TSA_URL")
    check.add_argument("--timeout", type=float, default=10.0)
    check.add_argument("--trust-list", default=None, help="PEM trust anchors, e.g. the C2PA TSA Trust List")

    replay = commands.add_parser("reapply-deletions", help="replay deletion tombstones after a database or bucket restore")
    replay.add_argument("--since", required=True, help="ISO 8601 or Unix time: when the restored backup was taken, or earlier")
    replay.add_argument("--until", default=None)
    replay.add_argument("--dry-run", action="store_true")
    replay.add_argument("--source", choices=["db", "export", "both"], default="both")

    imp = commands.add_parser("import-c2pa-log", help="import the JSONL C2PA issuance log into the database")
    imp.add_argument("--path", default=None, help="default: KUNO_C2PA_ISSUANCE_LOG or <data dir>/c2pa/issuance.jsonl")


def _state(settings: Settings):
    from .state import GatewayState

    return GatewayState(settings)


def rotate_storage_key(args: Any, settings: Settings | None = None, out=print) -> int:
    from .storage_keys import StorageKeyError, rotate

    state = _state(settings or Settings.from_env())
    try:
        report = rotate(
            state, provider_rotate=args.provider_rotate, batch_size=args.batch_size, max_batches=args.max_batches,
            dry_run=args.dry_run, retire=not args.no_retire,
        )
    except StorageKeyError as exc:
        print(f"rotate-storage-key: {exc}", file=sys.stderr)
        return 2
    finally:
        state.engine.dispose()
    for line in report.lines():
        out(line)
    return 1 if report.failed else 0


def check_tsa(args: Any, settings: Settings | None = None, out=print) -> int:
    from . import tsa

    settings = settings or Settings.from_env()
    url = args.url or settings.c2pa_tsa_url
    if not url:
        print("check-tsa: no timestamp authority: pass --url or set KUNO_C2PA_TSA_URL", file=sys.stderr)
        return 2
    anchors = Path(args.trust_list).read_bytes() if args.trust_list else None
    result = tsa.probe(url, timeout=args.timeout, trust_anchors_pem=anchors)
    for line in result.lines():
        out(line)
    return 0 if result.ok else 1


def reapply_deletions(args: Any, settings: Settings | None = None, out=print) -> int:
    from . import tombstones

    try:
        since = tombstones.parse_time(args.since)
        until = tombstones.parse_time(args.until) if args.until else None
    except ValueError:
        print("reapply-deletions: --since and --until take ISO 8601 or Unix seconds", file=sys.stderr)
        return 2
    state = _state(settings or Settings.from_env())
    try:
        report = tombstones.reapply(state, since, until, dry_run=args.dry_run, source=args.source)
    finally:
        state.engine.dispose()
    for line in report.lines():
        out(line)
    return 1 if report.errors else 0


def import_c2pa_log(args: Any, settings: Settings | None = None, out=print) -> int:
    from . import c2pa_issuance

    settings = settings or Settings.from_env()
    path = Path(args.path) if args.path else settings.c2pa_issuance_log
    state = _state(settings)
    try:
        result = c2pa_issuance.import_jsonl(state, path)
    finally:
        state.engine.dispose()
    out(f"{result['path']}: imported {result['imported']}, already present {result['already_present']}, malformed {result['malformed']}")
    return 1 if result["malformed"] else 0


HANDLERS = {
    "rotate-storage-key": rotate_storage_key, "check-tsa": check_tsa, "reapply-deletions": reapply_deletions,
    "import-c2pa-log": import_c2pa_log,
}


def dispatch(args: Any) -> int | None:
    handler = HANDLERS.get(getattr(args, "command", None))
    return None if handler is None else handler(args)
