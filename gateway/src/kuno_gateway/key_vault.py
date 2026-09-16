"""Key sync: private video keys wrapped in the customer's browser, kept so their other devices can unwrap them.

The platform must never be able to open a private video, so it stores only values wrapped under keys it never receives
(subnet/PRIVACY_MODES.md, "Key sync"):

* **Master key.** One per account: 32 random bytes made by the browser (WebCrypto `getRandomValues`). It never leaves
  the customer's devices unwrapped.
* **Unlockers.** The master key wrapped with AES-256-GCM under a key derived from something only the customer holds:

  - `recovery_code`: a code shown once (32 Crockford base32 characters, 160 random bits), stretched with PBKDF2-HMAC-
    SHA256. At least 600,000 iterations, OWASP's current figure for PBKDF2-HMAC-SHA256
    (https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). The salt is 16-64 random bytes.
  - `passkey`: the 32-byte output of the WebAuthn PRF extension (W3C WebAuthn Level 3, `prf`) for a random 32-byte
    salt, passed through HKDF-SHA256 before use.

  Associated data: `KVM1|kuno/keyvault/master-key|<account_id>|<unlocker_id>|<kind>`.
* **Job keys.** Per private job, a record holding the job's output key, the enclave's signing public key, the content
  digest and display metadata, wrapped with AES-256-GCM under the master key. Associated data:
  `KVJ1|kuno/keyvault/job-key|<account_id>|<job_id>`, so a record can't be moved to another account or job.

A wrapped value is base64url, no padding, of: magic (4 ASCII bytes) | IV (12 bytes) | ciphertext | GCM tag (16 bytes).
The gateway checks the magic, the encoding and the sizes, and refuses any field it doesn't know, so an unwrapped key
can't be stored by mistake. It can't check more, because it can't unwrap anything; that is the point.

Nothing here is written to the operator audit log: the vault holds no content anyone can open. Deleting vault data
records a tombstone for backups (`kuno_gateway.tombstones`) when that module is installed.
"""

from __future__ import annotations

import base64
import binascii
import importlib.util
import json
import re
import time
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import Job
from .db_vault import (  # noqa: F401  (the tombstone kinds are part of this module's interface)
    TOMBSTONE_JOB_KEY,
    TOMBSTONE_UNLOCKER,
    TOMBSTONE_VAULT,
    KeyVault,
    KeyVaultJobKey,
    KeyVaultUnlocker,
)

MASTER_MAGIC = b"KVM1"
JOB_MAGIC = b"KVJ1"
IV_BYTES = 12
TAG_BYTES = 16
MASTER_KEY_BYTES = 32
# "KVM1" | IV | the 32-byte key encrypted | tag
WRAPPED_MASTER_BYTES = len(MASTER_MAGIC) + IV_BYTES + MASTER_KEY_BYTES + TAG_BYTES
# A job record holds at least an output key, a signing key and a digest; anything shorter isn't one.
MIN_JOB_RECORD_BYTES = 64
MIN_WRAPPED_JOB_BYTES = len(JOB_MAGIC) + IV_BYTES + MIN_JOB_RECORD_BYTES + TAG_BYTES
MAX_WRAPPED_JOB_CHARS = 4096
MAX_JOB_KEYS = 10_000
MAX_UNLOCKERS = 10
MAX_LABEL_CHARS = 64
PAGE_DEFAULT = 200
PAGE_MAX = 500

RECOVERY_CODE = "recovery_code"
PASSKEY = "passkey"
KINDS = (RECOVERY_CODE, PASSKEY)
PBKDF2_ALG = "PBKDF2-SHA256"
PBKDF2_MIN_ITERATIONS = 600_000
PBKDF2_MAX_ITERATIONS = 10_000_000
RECOVERY_SALT_BYTES = (16, 64)
PRF_SALT_BYTES = 32
# WebAuthn credential ids are at most 1023 bytes.
CREDENTIAL_ID_BYTES = (16, 1023)
MAX_TRANSPORTS = 8

# A rotation replaces every wrapped value in one request, so its body may be far larger than other JSON (app.py). It
# re-wraps every Element's key too (elements.py): at most 200 of them, about 150 characters each.
ROTATE_PATH = "/v1/me/keyvault/rotate"
ROTATE_MAX_BODY_BYTES = MAX_JOB_KEYS * (MAX_WRAPPED_JOB_CHARS + 64) + MAX_UNLOCKERS * 4096 + 256 * 1024

_ID = re.compile(r"^[0-9a-f]{32}$")
_B64URL = re.compile(r"^[A-Za-z0-9_-]+$")
_RP_ID = re.compile(r"^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?$")
_TRANSPORT = re.compile(r"^[a-z][a-z-]{0,15}$")


class VaultError(Exception):
    """A request the vault refuses. `extra` joins `code` and `message` in the error body."""

    def __init__(self, status: int, code: str, message: str, **extra: Any):
        super().__init__(message)
        self.status, self.code, self.message, self.extra = status, code, message, extra


@dataclass(frozen=True)
class Unlocker:
    unlocker_id: str
    kind: str
    label: str | None
    params: dict[str, Any]
    wrapped_master_key: str


# ------------------------------------------------------------------ validation


def _check_id(value: str, what: str) -> str:
    if not isinstance(value, str) or not _ID.match(value):
        raise VaultError(422, "invalid_id", f"{what} must be 32 lowercase hex characters.")
    return value


def _b64url(value: Any, what: str, max_chars: int) -> bytes:
    """Strict base64url without padding: anything else, including a non-canonical encoding, is refused."""
    if not isinstance(value, str) or not value:
        raise VaultError(422, "invalid_encoding", f"{what} must be base64url without padding.")
    if len(value) > max_chars:
        raise VaultError(422, "too_large", f"{what} is longer than {max_chars} characters.")
    if not _B64URL.match(value) or len(value) % 4 == 1:
        raise VaultError(422, "invalid_encoding", f"{what} must be base64url without padding.")
    try:
        data = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (binascii.Error, ValueError):
        raise VaultError(422, "invalid_encoding", f"{what} must be base64url without padding.") from None
    if base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii") != value:
        raise VaultError(422, "invalid_encoding", f"{what} must be base64url without padding.")
    return data


def check_wrapped_master_key(value: Any) -> str:
    data = _b64url(value, "wrapped_master_key", 128)
    if len(data) != WRAPPED_MASTER_BYTES or not data.startswith(MASTER_MAGIC):
        raise VaultError(
            422, "not_wrapped",
            "wrapped_master_key must be a KVM1 value: the 32-byte master key wrapped with AES-256-GCM in your browser. "
            "Unwrapped keys are never accepted.",
        )
    return value


def check_wrapped_job_key(value: Any) -> str:
    data = _b64url(value, "wrapped", MAX_WRAPPED_JOB_CHARS)
    if not data.startswith(JOB_MAGIC) or len(data) < MIN_WRAPPED_JOB_BYTES:
        raise VaultError(
            422, "not_wrapped",
            "wrapped must be a KVJ1 value: the job's key record wrapped with AES-256-GCM under your master key. "
            "Unwrapped keys are never accepted.",
        )
    return value


def _check_label(label: Any) -> str | None:
    if label is None:
        return None
    if not isinstance(label, str):
        raise VaultError(422, "invalid_label", "label must be text.")
    label = label.strip()
    if len(label) > MAX_LABEL_CHARS or any(ord(ch) < 32 or ord(ch) == 127 for ch in label):
        raise VaultError(422, "invalid_label", f"label must be at most {MAX_LABEL_CHARS} printable characters.")
    return label or None


def _bytes_param(params: dict, name: str, sizes: tuple[int, int]) -> str:
    value = params.get(name)
    data = _b64url(value, name, 2048)
    if not sizes[0] <= len(data) <= sizes[1]:
        raise VaultError(422, "invalid_params", f"{name} must be {sizes[0]}-{sizes[1]} bytes.")
    return value


def check_params(kind: str, params: Any) -> dict[str, Any]:
    """The public values an unlocker needs to derive its key again. Unknown fields are refused."""
    if not isinstance(params, dict):
        raise VaultError(422, "invalid_params", "params must be an object.")
    if kind == RECOVERY_CODE:
        if set(params) != {"alg", "iterations", "salt"}:
            raise VaultError(422, "invalid_params", "A recovery code's params are exactly alg, iterations and salt.")
        if params["alg"] != PBKDF2_ALG:
            raise VaultError(422, "invalid_params", f"A recovery code is stretched with {PBKDF2_ALG}.")
        iterations = params["iterations"]
        if isinstance(iterations, bool) or not isinstance(iterations, int) or not (
            PBKDF2_MIN_ITERATIONS <= iterations <= PBKDF2_MAX_ITERATIONS
        ):
            raise VaultError(
                422, "weak_kdf",
                f"PBKDF2 iterations must be between {PBKDF2_MIN_ITERATIONS:,} and {PBKDF2_MAX_ITERATIONS:,}.",
            )
        return {"alg": PBKDF2_ALG, "iterations": iterations, "salt": _bytes_param(params, "salt", RECOVERY_SALT_BYTES)}
    if kind == PASSKEY:
        if not {"credential_id", "prf_salt", "rp_id"} <= set(params) <= {"credential_id", "prf_salt", "rp_id", "transports"}:
            raise VaultError(
                422, "invalid_params", "A passkey's params are credential_id, prf_salt and rp_id, and optionally transports."
            )
        rp_id = params["rp_id"]
        if not isinstance(rp_id, str) or not _RP_ID.match(rp_id):
            raise VaultError(422, "invalid_params", "rp_id must be the site's host name, lowercase.")
        transports = params.get("transports", [])
        if not isinstance(transports, list) or len(transports) > MAX_TRANSPORTS or not all(
            isinstance(t, str) and _TRANSPORT.match(t) for t in transports
        ):
            raise VaultError(422, "invalid_params", "transports must be a short list of WebAuthn transport names.")
        return {
            "credential_id": _bytes_param(params, "credential_id", CREDENTIAL_ID_BYTES),
            "prf_salt": _bytes_param(params, "prf_salt", (PRF_SALT_BYTES, PRF_SALT_BYTES)),
            "rp_id": rp_id,
            "transports": transports,
        }
    raise VaultError(422, "invalid_kind", f"An unlocker is one of: {', '.join(KINDS)}.")


def check_unlocker(unlocker_id: Any, kind: Any, label: Any, params: Any, wrapped_master_key: Any) -> Unlocker:
    return Unlocker(
        unlocker_id=_check_id(unlocker_id, "unlocker_id"),
        kind=kind,
        label=_check_label(label),
        params=check_params(kind, params),
        wrapped_master_key=check_wrapped_master_key(wrapped_master_key),
    )


# ------------------------------------------------------------------ helpers


def _now(now: float | None) -> float:
    return time.time() if now is None else now


def _tombstone(s: Session, kind: str, ref: str, account_id: str, now: float) -> None:
    """Records a deletion for backups when `kuno_gateway.tombstones` exists; until it does, there is nothing to tell."""
    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones  # type: ignore[attr-defined]

    tombstones.record(s, kind, ref, account_id=account_id, now=now)


def require_vault(s: Session, account_id: str) -> KeyVault:
    vault = s.get(KeyVault, account_id, with_for_update=True)
    if vault is None:
        raise VaultError(404, "no_vault", "Key sync isn't set up for this account.")
    return vault


def _touch(vault: KeyVault, now: float) -> None:
    vault.version += 1
    vault.updated_at = now


def _check_generation(vault: KeyVault, master_key_id: str) -> None:
    if master_key_id != vault.master_key_id:
        raise VaultError(
            409, "vault_changed", "Your keys were rotated on another device. Unlock again, then retry.",
            version=vault.version, master_key_id=vault.master_key_id,
        )


def _count(s: Session, model, account_id: str) -> int:
    return s.scalar(select(func.count()).select_from(model).where(model.account_id == account_id)) or 0


def _add_unlockers(s: Session, account_id: str, unlockers: list[Unlocker], now: float) -> None:
    ids = [u.unlocker_id for u in unlockers]
    if len(set(ids)) != len(ids):
        raise VaultError(422, "duplicate_unlocker", "Each unlocker needs its own unlocker_id.")
    for unlocker in unlockers:
        if s.get(KeyVaultUnlocker, unlocker.unlocker_id) is not None:
            raise VaultError(409, "unlocker_exists", "That unlocker_id is already in use. Make a new one.")
        s.add(
            KeyVaultUnlocker(
                id=unlocker.unlocker_id, account_id=account_id, kind=unlocker.kind, label=unlocker.label,
                params=json.dumps(unlocker.params, sort_keys=True, separators=(",", ":")),
                wrapped_master_key=unlocker.wrapped_master_key, created_at=now,
            )
        )


# ------------------------------------------------------------------ JSON


def unlocker_json(row: KeyVaultUnlocker) -> dict:
    return {
        "unlocker_id": row.id,
        "kind": row.kind,
        "label": row.label,
        "params": json.loads(row.params),
        "wrapped_master_key": row.wrapped_master_key,
        "created_at": row.created_at,
    }


def job_key_json(row: KeyVaultJobKey) -> dict:
    return {"job_id": row.job_id, "wrapped": row.wrapped, "created_at": row.created_at, "updated_at": row.updated_at}


def summary_json(s: Session, vault: KeyVault) -> dict:
    return {
        "account_id": vault.account_id,
        "master_key_id": vault.master_key_id,
        "version": vault.version,
        "created_at": vault.created_at,
        "updated_at": vault.updated_at,
        "job_key_count": _count(s, KeyVaultJobKey, vault.account_id),
        "limits": {
            "max_job_keys": MAX_JOB_KEYS,
            "max_wrapped_job_key_chars": MAX_WRAPPED_JOB_CHARS,
            "max_unlockers": MAX_UNLOCKERS,
            "pbkdf2_min_iterations": PBKDF2_MIN_ITERATIONS,
        },
    }


def vault_json(s: Session, vault: KeyVault, cursor: str | None = None, limit: int = PAGE_DEFAULT) -> dict:
    """The vault, every unlocker, and one page of wrapped job keys ordered by job id (`next_cursor` continues)."""
    limit = min(max(int(limit), 0), PAGE_MAX)
    unlockers = s.scalars(
        select(KeyVaultUnlocker).where(KeyVaultUnlocker.account_id == vault.account_id).order_by(KeyVaultUnlocker.created_at, KeyVaultUnlocker.id)
    ).all()
    query = select(KeyVaultJobKey).where(KeyVaultJobKey.account_id == vault.account_id).order_by(KeyVaultJobKey.job_id)
    if cursor:
        query = query.where(KeyVaultJobKey.job_id > cursor)
    rows = s.scalars(query.limit(limit + 1)).all() if limit else []
    next_cursor = rows[limit - 1].job_id if len(rows) > limit else None
    return {
        **summary_json(s, vault),
        "unlockers": [unlocker_json(u) for u in unlockers],
        "job_keys": [job_key_json(r) for r in rows[:limit]],
        "next_cursor": next_cursor,
    }


# ------------------------------------------------------------------ changes


def create(s: Session, account_id: str, master_key_id: str, unlockers: list[Unlocker], now: float | None = None) -> KeyVault:
    now = _now(now)
    _check_id(master_key_id, "master_key_id")
    if not 1 <= len(unlockers) <= MAX_UNLOCKERS:
        raise VaultError(422, "invalid_unlockers", f"A vault needs 1-{MAX_UNLOCKERS} unlockers.")
    if s.get(KeyVault, account_id, with_for_update=True) is not None:
        raise VaultError(409, "vault_exists", "Key sync is already set up for this account. Unlock it instead.")
    vault = KeyVault(account_id=account_id, master_key_id=master_key_id, version=1, created_at=now, updated_at=now)
    s.add(vault)
    _add_unlockers(s, account_id, unlockers, now)
    s.flush()
    return vault


def add_unlocker(s: Session, account_id: str, master_key_id: str, unlocker: Unlocker, now: float | None = None) -> KeyVault:
    now = _now(now)
    vault = require_vault(s, account_id)
    _check_generation(vault, master_key_id)
    if _count(s, KeyVaultUnlocker, account_id) >= MAX_UNLOCKERS:
        raise VaultError(409, "too_many_unlockers", f"A vault can have {MAX_UNLOCKERS} unlockers. Remove one first.")
    _add_unlockers(s, account_id, [unlocker], now)
    _touch(vault, now)
    s.flush()
    return vault


def remove_unlocker(s: Session, account_id: str, unlocker_id: str, now: float | None = None) -> KeyVault:
    now = _now(now)
    vault = require_vault(s, account_id)
    row = s.get(KeyVaultUnlocker, unlocker_id)
    if row is None or row.account_id != account_id:
        raise VaultError(404, "not_found", "No such unlocker.")
    if _count(s, KeyVaultUnlocker, account_id) <= 1:
        raise VaultError(
            409, "last_unlocker",
            "This is the only way to unlock your keys. Add another recovery code or passkey first, or turn key sync off.",
        )
    s.delete(row)
    _touch(vault, now)
    _tombstone(s, TOMBSTONE_UNLOCKER, unlocker_id, account_id, now)
    return vault


def put_job_key(
    s: Session, account_id: str, job_id: str, master_key_id: str, wrapped: str, now: float | None = None,
) -> tuple[KeyVault, KeyVaultJobKey, bool]:
    """Stores or replaces one private job's wrapped key record. Returns (vault, row, created)."""
    now = _now(now)
    check_wrapped_job_key(wrapped)
    vault = require_vault(s, account_id)
    _check_generation(vault, master_key_id)
    job = s.get(Job, job_id)
    if job is None or job.account_id != account_id:
        raise VaultError(404, "not_found", "No such video job.")
    if (job.privacy or "private") != "private":
        raise VaultError(422, "not_private", "Only private videos have keys to sync. Standard videos open with your sign-in.")
    row = s.get(KeyVaultJobKey, (account_id, job_id), with_for_update=True)
    created = row is None
    if row is None:
        if _count(s, KeyVaultJobKey, account_id) >= MAX_JOB_KEYS:
            raise VaultError(409, "vault_full", f"Key sync holds up to {MAX_JOB_KEYS:,} video keys. Back up the rest to a file.")
        row = KeyVaultJobKey(account_id=account_id, job_id=job_id, wrapped=wrapped, created_at=now, updated_at=now)
        s.add(row)
    else:
        row.wrapped, row.updated_at = wrapped, now
    _touch(vault, now)
    s.flush()
    return vault, row, created


def delete_job_key(s: Session, account_id: str, job_id: str, now: float | None = None) -> bool:
    """Deletes one job's wrapped key, if stored. Also called when the owner deletes the video."""
    now = _now(now)
    row = s.get(KeyVaultJobKey, (account_id, job_id))
    if row is None:
        return False
    s.delete(row)
    vault = s.get(KeyVault, account_id, with_for_update=True)
    if vault is not None:
        _touch(vault, now)
    _tombstone(s, TOMBSTONE_JOB_KEY, job_id, account_id, now)
    return True


# The deletion hook's name: nothing can open a deleted video, so its key goes with it.
forget_job = delete_job_key


def rotate(
    s: Session, account_id: str, *, expected_version: int, master_key_id: str, unlockers: list[Unlocker],
    job_keys: list[tuple[str, str]], element_keys: list[tuple[str, str]] | None = None, now: float | None = None,
) -> KeyVault:
    """Replaces the master key generation atomically: every unlocker, every job key re-wrapped under the new master
    key, and every Element's key re-wrapped under the new Elements key derived from it (elements.py). `job_keys` and
    `element_keys` must name exactly the jobs and Elements the account holds, and `expected_version` must be current, so
    a key another device added meanwhile can't be dropped. Element writes bump the vault's version for the same reason."""
    from . import elements

    now = _now(now)
    _check_id(master_key_id, "master_key_id")
    if not 1 <= len(unlockers) <= MAX_UNLOCKERS:
        raise VaultError(422, "invalid_unlockers", f"A vault needs 1-{MAX_UNLOCKERS} unlockers.")
    for _, wrapped in job_keys:
        check_wrapped_job_key(wrapped)
    given = dict(job_keys)
    if len(given) != len(job_keys):
        raise VaultError(422, "duplicate_job_key", "Each job appears once in a rotation.")
    vault = require_vault(s, account_id)
    if vault.version != expected_version:
        raise VaultError(409, "vault_changed", "Your keys changed on another device. Load them again, then rotate.", version=vault.version)
    if master_key_id == vault.master_key_id:
        raise VaultError(422, "same_master_key", "A rotation needs a new master key and master_key_id.")
    current = {row.job_id: row for row in s.scalars(select(KeyVaultJobKey).where(KeyVaultJobKey.account_id == account_id)).all()}
    missing, unknown = sorted(set(current) - set(given)), sorted(set(given) - set(current))
    if missing or unknown:
        raise VaultError(
            409, "vault_changed", "The rotation must re-wrap exactly the keys the vault holds.",
            version=vault.version, missing_job_ids=missing[:50], unknown_job_ids=unknown[:50],
        )
    # Checked before anything changes; an Element written meanwhile waits on the vault's lock (elements._vault).
    element_rows = elements.plan_rotation(s, account_id, list(element_keys or []), vault.version)
    old = s.scalars(select(KeyVaultUnlocker).where(KeyVaultUnlocker.account_id == account_id)).all()
    old_ids = {row.id for row in old}
    if any(u.unlocker_id in old_ids for u in unlockers):
        raise VaultError(422, "unlocker_reused", "A rotation makes new unlockers; their ids must be new too.")
    for row in old:
        s.delete(row)
        _tombstone(s, TOMBSTONE_UNLOCKER, row.id, account_id, now)
    s.flush()
    _add_unlockers(s, account_id, unlockers, now)
    for job_id, row in current.items():
        row.wrapped, row.updated_at = given[job_id], now
    elements.apply_rotation(element_rows, list(element_keys or []), master_key_id, now)
    vault.master_key_id = master_key_id
    _touch(vault, now)
    s.flush()
    return vault


def purge_account(s: Session, account_id: str, now: float | None = None) -> dict[str, int]:
    """Deletes an account's vault, unlockers and job keys (turning key sync off, or closing the account)."""
    now = _now(now)
    vault = s.get(KeyVault, account_id, with_for_update=True)
    unlockers = s.scalars(select(KeyVaultUnlocker).where(KeyVaultUnlocker.account_id == account_id)).all()
    job_keys = s.scalars(select(KeyVaultJobKey).where(KeyVaultJobKey.account_id == account_id)).all()
    for row in (*unlockers, *job_keys):
        s.delete(row)
    if vault is not None:
        s.delete(vault)
    if vault is not None or unlockers or job_keys:
        _tombstone(s, TOMBSTONE_VAULT, account_id, account_id, now)
    return {"vaults": int(vault is not None), "unlockers": len(unlockers), "job_keys": len(job_keys)}


delete_vault = purge_account


def export_account(s: Session, account_id: str) -> dict:
    """An account's key sync data for a data export: wrapped material only, which nobody can open without the customer's
    recovery code or passkey."""
    vault = s.get(KeyVault, account_id)
    unlockers = s.scalars(
        select(KeyVaultUnlocker).where(KeyVaultUnlocker.account_id == account_id).order_by(KeyVaultUnlocker.created_at)
    ).all()
    job_keys = s.scalars(select(KeyVaultJobKey).where(KeyVaultJobKey.account_id == account_id).order_by(KeyVaultJobKey.job_id)).all()
    return {
        "about": (
            "Key sync data, wrapped in your browser. The master key is AES-256-GCM wrapped under each unlocker's key "
            "(recovery code: PBKDF2-HMAC-SHA256 with the listed salt and iterations; passkey: HKDF-SHA256 of the WebAuthn "
            "PRF output). Each job key record is AES-256-GCM wrapped under the master key. KunoWorld can't unwrap any of it."
        ),
        "vault": None if vault is None else {
            "master_key_id": vault.master_key_id,
            "version": vault.version,
            "created_at": vault.created_at,
            "updated_at": vault.updated_at,
        },
        "unlockers": [unlocker_json(u) for u in unlockers],
        "job_keys": [job_key_json(k) for k in job_keys],
    }
