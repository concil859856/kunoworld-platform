"""Calls into gateway modules that other work adds, each optional here.

* `key_vault.export_account(s, account_id)`: the account's wrapped Private keys (a JSON-ready dict), for the data export.
* `key_vault.purge_account(s, account_id)`: deletes them when the account is closed.
* `shares.revoke_account(s, account_id)`: ends the account's share links when it is closed.
* `tombstones.record(s, kind, ref, account_id=..., now=...)`: a deletion tombstone, so a restore from backup can replay
  the deletion (the same call key_vault.py makes).
* `elements.export_account(s, account_id)`: the account's sealed Elements, for the data export.
* `elements.purge_account(state, s, account_id, now)`: deletes them when the account is closed.

When a module isn't installed, the caller carries on and records that. An error raised inside an installed module
propagates: a closure must never report keys purged that weren't.
"""

from __future__ import annotations

import importlib
from typing import Any

from sqlalchemy.orm import Session

PACKAGE = "kuno_gateway"


def _function(module: str, name: str):
    """`kuno_gateway.<module>.<name>` if that module is installed and defines it, else None."""
    qualified = f"{PACKAGE}.{module}"
    try:
        loaded = importlib.import_module(qualified)
    except ModuleNotFoundError as exc:
        # Only the module itself being absent means "not installed"; a broken import inside it is a real error.
        if exc.name == qualified:
            return None
        raise
    function = getattr(loaded, name, None)
    return function if callable(function) else None


def key_vault_export(s: Session, account_id: str) -> tuple[bool, Any]:
    """(True, the wrapped keys) with key sync installed; (False, None) without it."""
    export = _function("key_vault", "export_account")
    if export is None:
        return False, None
    return True, export(s, account_id)


def key_vault_purge(s: Session, account_id: str) -> tuple[bool, Any]:
    """(True, what was deleted) once purged; (False, None) when key sync isn't installed."""
    purge = _function("key_vault", "purge_account")
    if purge is None:
        return False, None
    return True, purge(s, account_id)


def shares_revoke(s: Session, account_id: str) -> tuple[bool, Any]:
    """(True, how many live links ended) once revoked; (False, None) when share links aren't installed."""
    revoke = _function("shares", "revoke_account")
    if revoke is None:
        return False, None
    return True, revoke(s, account_id)


def tombstone(s: Session, kind: str, ref: str, account_id: str | None, now: float) -> bool:
    """Records a deletion tombstone. False when the tombstones module isn't installed."""
    record = _function("tombstones", "record")
    if record is None:
        return False
    record(s, kind, ref, account_id=account_id, now=now)
    return True


def elements_export(s: Session, account_id: str) -> tuple[bool, Any]:
    """(True, (elements.json document, [(path in the zip, object id)])) with Elements installed; (False, None) without."""
    export = _function("elements", "export_account")
    if export is None:
        return False, None
    return True, export(s, account_id)


def elements_purge(state: Any, s: Session, account_id: str, now: float) -> tuple[bool, Any]:
    """(True, how many Elements were deleted); (False, None) when Elements aren't installed."""
    purge = _function("elements", "purge_account")
    if purge is None:
        return False, None
    return True, purge(state, s, account_id, now)
