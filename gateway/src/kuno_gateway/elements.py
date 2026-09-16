"""Elements: reusable characters, products, locations, styles and voices that customers attach to video jobs.

Everything that says what an Element is stays with the customer (ELEMENTS.md). The browser or SDK encrypts it with
keys the platform never receives, reusing key sync (key_vault.py):

* **Elements key.** HKDF-SHA256 of the account's key sync master key (salt "kuno/elements/v1", info
  "elements-key|<account_id>"). One per master key generation; a rotation changes it.
* **Element key.** 32 random bytes per Element, new whenever its files are uploaded. Stored wrapped under the Elements
  key with AES-256-GCM: `wrapped_key` is base64url of "KVE1" | 12-byte IV | 32 bytes of ciphertext | 16-byte tag, with
  associated data "KVE1|kuno/elements/element-key|<account_id>|<element_id>". A rotation re-wraps it; nothing else
  changes.
* **Record.** Kind, name, description, consent record and each file's type, size and digest, as JSON framed and padded
  like a sealed request (a power of two from 4 KiB), then sealed with the element key as a KUNOB1 version 2 blob under
  the label "element/<element_id>/meta". `meta` is its base64url.
* **Files.** 1-4 images, or one voice clip, each sealed with the element key as a KUNOB1 version 2 blob under
  "element/<element_id>/file/<position>". They are uploaded through `POST /v1/blobs` and claimed by the write that
  names them.

The gateway checks the formats (magic, version, sizes) and the limits, and refuses anything else, so an unsealed file
or an unwrapped key can't be stored by mistake. It can't check more, because it can't open anything. What it can see:
the account, each Element's random id, revision and times, how many files it has, their padded sizes, and when they
are downloaded.

An Element's key lives under key sync, so Elements need a vault: every write names the vault's current
`master_key_id`, and a rotation (`key_vault.rotate`) re-wraps every Element's key in the same transaction.
"""

from __future__ import annotations

import base64
import binascii
import math
import re
import time
from typing import TYPE_CHECKING

from kuno_protocol import blobs as blob_format
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .db import Blob
from .db_elements import TOMBSTONE_ELEMENT, Element, ElementFile
from .db_vault import KeyVault
from .key_vault import VaultError

if TYPE_CHECKING:
    from .state import GatewayState

KEY_MAGIC = b"KVE1"
IV_BYTES = 12
TAG_BYTES = 16
ELEMENT_KEY_BYTES = 32
WRAPPED_KEY_BYTES = len(KEY_MAGIC) + IV_BYTES + ELEMENT_KEY_BYTES + TAG_BYTES

MIB = 1024 * 1024
MAX_ELEMENTS = 200
MAX_FILES = 4
# A sealed file: a phone photo or a 30-second WAV voice clip fits with room to spare.
MAX_FILE_BYTES = 16 * MIB
# All of an account's sealed files together.
MAX_ACCOUNT_BYTES = 2 * 1024 * MIB
# The record is padded to a power of two from 4 KiB to 16 KiB before sealing, so its sealed size is one of three.
META_MIN_PADDED = 4 * 1024
META_MAX_PADDED = 16 * 1024
MIN_META_BYTES = blob_format.sealed_size(META_MIN_PADDED)
MAX_META_BYTES = blob_format.sealed_size(META_MAX_PADDED)
PAGE_DEFAULT = 100
PAGE_MAX = 200

_ID = re.compile(r"^[0-9a-f]{32}$")
_B64URL = re.compile(r"^[A-Za-z0-9_-]+$")

RULES = (
    "Elements must not show a public figure or anyone under 18, a real person needs their consent (or must be you), "
    "and sexual content is banned."
)


class ElementError(VaultError):
    """A request the Elements store refuses. A VaultError, so the routes that touch both answer them alike."""


# ------------------------------------------------------------------ validation


def check_id(value: object, what: str = "element_id") -> str:
    if not isinstance(value, str) or not _ID.match(value):
        raise ElementError(422, "invalid_id", f"{what} must be 32 lowercase hex characters.")
    return value


def _b64url(value: object, what: str, max_bytes: int) -> bytes:
    """Strict base64url without padding; a non-canonical encoding is refused like any other."""
    invalid = ElementError(422, "invalid_encoding", f"{what} must be base64url without padding.")
    if not isinstance(value, str) or not value:
        raise invalid
    if len(value) > math.ceil(max_bytes * 4 / 3):
        raise ElementError(413, "too_large", f"{what} is larger than {max_bytes:,} bytes.")
    if not _B64URL.match(value) or len(value) % 4 == 1:
        raise invalid
    try:
        data = base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except (binascii.Error, ValueError):
        raise invalid from None
    if base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii") != value:
        raise invalid
    return data


def check_wrapped_key(value: object) -> str:
    data = _b64url(value, "wrapped_key", WRAPPED_KEY_BYTES)
    if len(data) != WRAPPED_KEY_BYTES or not data.startswith(KEY_MAGIC):
        raise ElementError(
            422, "not_wrapped",
            "wrapped_key must be a KVE1 value: the 32-byte element key wrapped with AES-256-GCM under your Elements key. "
            "Unwrapped keys are never accepted.",
        )
    return value  # type: ignore[return-value]


def _sealed_v2(data: bytes) -> bool:
    return blob_format.blob_version(data) == blob_format.V2


def check_meta(value: object) -> str:
    data = _b64url(value, "meta", MAX_META_BYTES)
    if not _sealed_v2(data) or not MIN_META_BYTES <= len(data) <= MAX_META_BYTES:
        raise ElementError(
            422, "not_sealed",
            f"meta must be a KUNOB1 version 2 blob of {MIN_META_BYTES:,} to {MAX_META_BYTES:,} bytes: the Element's record "
            "padded to 4, 8 or 16 KiB and sealed with its element key.",
        )
    return value  # type: ignore[return-value]


# ------------------------------------------------------------------ helpers


def _now(now: float | None) -> float:
    return time.time() if now is None else now


def _vault(s: Session, account_id: str, master_key_id: str) -> KeyVault:
    """The account's vault, locked, so a rotation and an Element write never interleave. Refuses a stale generation.

    The caller's write bumps the vault's version (`_touch_vault`): a rotation names the version it read, so one prepared
    before an Element changed can't overwrite that Element's new key with a re-wrap of its old one."""
    check_id(master_key_id, "master_key_id")
    vault = s.get(KeyVault, account_id, with_for_update=True)
    if vault is None:
        raise ElementError(
            409, "no_vault", "Elements are encrypted with your key sync keys. Turn on key sync in the studio first.",
        )
    if master_key_id != vault.master_key_id:
        raise ElementError(
            409, "vault_changed", "Your keys were rotated on another device. Unlock again, then retry.",
            master_key_id=vault.master_key_id,
        )
    return vault


def _touch_vault(vault: KeyVault | None, now: float) -> None:
    if vault is not None:
        vault.version += 1
        vault.updated_at = now


def count(s: Session, account_id: str) -> int:
    return s.scalar(select(func.count()).select_from(Element).where(Element.account_id == account_id)) or 0


def stored_bytes(s: Session, account_id: str) -> int:
    return int(s.scalar(select(func.coalesce(func.sum(Element.files_bytes), 0)).where(Element.account_id == account_id)) or 0)


def files_of(s: Session, account_id: str, element_id: str) -> list[ElementFile]:
    return list(
        s.scalars(
            select(ElementFile)
            .where(ElementFile.account_id == account_id, ElementFile.element_id == element_id)
            .order_by(ElementFile.position)
        ).all()
    )


def _forget_files(s: Session, account_id: str, files: list[ElementFile]) -> list[str]:
    """Deletes file rows and records a `blob` tombstone for each object, in the caller's transaction. Returns the object
    ids, which the caller deletes from the store once the transaction commits (`discard_objects`)."""
    from . import tombstones

    for file in files:
        tombstones.record(s, tombstones.BLOB, file.blob_id, account_id)
        s.delete(file)
    return [f.blob_id for f in files]


def discard_objects(state: GatewayState, blob_ids: list[str]) -> None:
    """Best effort: an object left behind is ciphertext nobody can open, and its tombstone deletes it on replay."""
    from .standard_jobs import discard_blobs

    discard_blobs(state, blob_ids)


def _claim(state: GatewayState, s: Session, account_id: str, blob_ids: list[str], now: float) -> list[Blob]:
    if not 1 <= len(blob_ids) <= MAX_FILES:
        raise ElementError(422, "invalid_files", f"An Element has 1 to {MAX_FILES} files.")
    if len(set(blob_ids)) != len(blob_ids):
        raise ElementError(422, "invalid_files", "Each file is a different upload.")
    claimed = []
    for blob_id in blob_ids:
        blob = s.get(Blob, blob_id, with_for_update=True) if isinstance(blob_id, str) and _ID.match(blob_id) else None
        if blob is None or blob.owner_kind != "account" or blob.owner_id != account_id or blob.job_id is not None:
            raise ElementError(422, "invalid_files", f"Upload {blob_id} is unknown, not yours, or already used.")
        if blob.expires_at <= now:
            raise ElementError(422, "invalid_files", f"Upload {blob_id} has expired. Upload it again.")
        if blob.size > MAX_FILE_BYTES:
            raise ElementError(413, "too_large", f"Each sealed file is at most {MAX_FILE_BYTES // MIB} MiB.")
        try:
            reader = state.blobs.open_range(blob_id, 0, blob_format.HEADER_LEN)
            try:
                head = reader.read(blob_format.HEADER_LEN)
            finally:
                reader.close()
        except KeyError:
            raise ElementError(422, "invalid_files", f"Upload {blob_id} is unknown, not yours, or already used.") from None
        if not _sealed_v2(head):
            raise ElementError(
                422, "not_sealed", "Each file must be a KUNOB1 version 2 blob, sealed with the Element's key before upload.",
            )
        claimed.append(blob)
    return claimed


# ------------------------------------------------------------------ JSON


def file_json(row: ElementFile) -> dict:
    return {"position": row.position, "size": row.size, "sha256": row.sha256}


def element_json(row: Element, files: list[ElementFile]) -> dict:
    return {
        "element_id": row.element_id,
        "revision": row.revision,
        "master_key_id": row.master_key_id,
        "wrapped_key": row.wrapped_key,
        "meta": row.meta,
        "files": [file_json(f) for f in files],
        "files_bytes": row.files_bytes,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def limits_json() -> dict:
    return {
        "max_elements": MAX_ELEMENTS,
        "max_files": MAX_FILES,
        "max_file_bytes": MAX_FILE_BYTES,
        "max_account_bytes": MAX_ACCOUNT_BYTES,
        "meta_bytes": [MIN_META_BYTES, MAX_META_BYTES],
    }


def list_json(s: Session, account_id: str, cursor: str | None = None, limit: int = PAGE_DEFAULT) -> dict:
    """A page of the account's Elements, ordered by id (`next_cursor` continues), with the vault's current generation."""
    limit = min(max(int(limit), 0), PAGE_MAX)
    query = select(Element).where(Element.account_id == account_id).order_by(Element.element_id)
    if cursor:
        query = query.where(Element.element_id > cursor)
    rows = list(s.scalars(query.limit(limit + 1)).all()) if limit else []
    page = rows[:limit]
    files: dict[str, list[ElementFile]] = {r.element_id: [] for r in page}
    if page:
        for file in s.scalars(
            select(ElementFile)
            .where(ElementFile.account_id == account_id, ElementFile.element_id.in_(list(files)))
            .order_by(ElementFile.element_id, ElementFile.position)
        ).all():
            files[file.element_id].append(file)
    vault = s.get(KeyVault, account_id)
    return {
        "account_id": account_id,
        "master_key_id": vault.master_key_id if vault is not None else None,
        "count": count(s, account_id),
        "stored_bytes": stored_bytes(s, account_id),
        "limits": limits_json(),
        "elements": [element_json(r, files[r.element_id]) for r in page],
        "next_cursor": page[-1].element_id if len(rows) > limit else None,
    }


# ------------------------------------------------------------------ changes


def put(
    state: GatewayState, s: Session, account_id: str, element_id: str, *, master_key_id: str,
    expected_revision: int | None, wrapped_key: str | None, meta: str, file_blob_ids: list[str] | None,
    now: float | None = None,
) -> tuple[Element, list[ElementFile], bool, list[str]]:
    """Creates (`expected_revision` None) or replaces an Element, in the caller's transaction.

    A replacement without `file_blob_ids` keeps the files and the element key, so it must not send `wrapped_key`; one
    with them replaces every file and must send the new key they were sealed with. Returns (row, files, created, object
    ids to delete once the transaction commits)."""
    now = _now(now)
    check_id(element_id)
    check_meta(meta)
    if wrapped_key is not None:
        check_wrapped_key(wrapped_key)
    vault = _vault(s, account_id, master_key_id)
    row = s.get(Element, (account_id, element_id), with_for_update=True)
    if expected_revision is None:
        if row is not None:
            raise ElementError(409, "element_exists", "An Element with this id already exists.", revision=row.revision)
        if file_blob_ids is None or wrapped_key is None:
            raise ElementError(422, "invalid_files", "A new Element needs its files and its wrapped key.")
        if count(s, account_id) >= MAX_ELEMENTS:
            raise ElementError(409, "elements_full", f"An account holds up to {MAX_ELEMENTS} Elements. Delete one first.")
    else:
        if row is None:
            raise ElementError(404, "not_found", "No such Element.")
        if row.revision != expected_revision:
            raise ElementError(
                409, "element_changed", "This Element was changed on another device. Load it again, then retry.",
                revision=row.revision,
            )
        if file_blob_ids is None and wrapped_key is not None:
            raise ElementError(
                422, "wrapped_key_unexpected",
                "The files stay sealed with the key they have, so a change that keeps them sends no wrapped_key.",
            )
        if file_blob_ids is not None and wrapped_key is None:
            raise ElementError(422, "wrapped_key_required", "New files come with the new key they were sealed with.")

    old_objects: list[str] = []
    if file_blob_ids is None:
        files = files_of(s, account_id, element_id)
        files_bytes = row.files_bytes  # type: ignore[union-attr]
    else:
        claimed = _claim(state, s, account_id, file_blob_ids, now)
        files_bytes = sum(b.size for b in claimed)
        others = stored_bytes(s, account_id) - (row.files_bytes if row is not None else 0)
        if others + files_bytes > MAX_ACCOUNT_BYTES:
            raise ElementError(
                409, "storage_full", f"Elements can use up to {MAX_ACCOUNT_BYTES // (1024 * MIB)} GiB in all. Delete some first.",
            )
        if row is not None:
            old_objects = _forget_files(s, account_id, files_of(s, account_id, element_id))
            s.flush()
        files = []
        for position, blob in enumerate(claimed):
            files.append(ElementFile(
                account_id=account_id, element_id=element_id, position=position, blob_id=blob.id, size=blob.size,
                sha256=blob.sha256, created_at=now,
            ))
            # The object now belongs to the Element: no blob route serves it and the upload sweep leaves it alone.
            s.delete(blob)
        s.flush()
        s.add_all(files)

    created = row is None
    if row is None:
        row = Element(
            account_id=account_id, element_id=element_id, revision=1, master_key_id=master_key_id,
            wrapped_key=wrapped_key, meta=meta, files_bytes=files_bytes, rules_affirmed_at=now, created_at=now,
            updated_at=now,
        )
        s.add(row)
    else:
        row.revision += 1
        row.meta, row.files_bytes, row.rules_affirmed_at, row.updated_at = meta, files_bytes, now, now
        if wrapped_key is not None:
            row.wrapped_key, row.master_key_id = wrapped_key, master_key_id
    _touch_vault(vault, now)
    s.flush()
    return row, files, created, old_objects


def delete(s: Session, account_id: str, element_id: str, now: float | None = None) -> list[str]:
    """Deletes an Element's rows and records its tombstones, in the caller's transaction. Returns the object ids to
    delete once it commits; empty when there was no such Element."""
    now = _now(now)
    # The vault's lock before the Element's, the order writes and rotations take them in, so they never deadlock.
    vault = s.get(KeyVault, account_id, with_for_update=True)
    row = s.get(Element, (account_id, element_id), with_for_update=True)
    if row is None:
        return []
    from . import tombstones

    objects = _forget_files(s, account_id, files_of(s, account_id, element_id))
    s.delete(row)
    tombstones.record(s, TOMBSTONE_ELEMENT, element_id, account_id, now)
    _touch_vault(vault, now)
    return objects


def purge_account(state: GatewayState, s: Session, account_id: str, now: float | None = None) -> int:
    """Deletes every Element of an account, closing it: rows, tombstones, and the objects straight away, like the
    closure's other unused uploads."""
    now = _now(now)
    ids = s.scalars(select(Element.element_id).where(Element.account_id == account_id)).all()
    objects: list[str] = []
    for element_id in ids:
        objects.extend(delete(s, account_id, element_id, now))
    discard_objects(state, objects)
    return len(ids)


def file_for(s: Session, account_id: str, element_id: str, position: int) -> ElementFile | None:
    return s.get(ElementFile, (account_id, element_id, position))


# ------------------------------------------------------------------ key sync rotation


def plan_rotation(s: Session, account_id: str, element_keys: list[tuple[str, str]], version: int) -> dict[str, Element]:
    """Checks a rotation re-wraps exactly the account's Elements, before the vault changes anything. Returns the rows."""
    for element_id, wrapped in element_keys:
        check_id(element_id)
        check_wrapped_key(wrapped)
    given = dict(element_keys)
    if len(given) != len(element_keys):
        raise ElementError(422, "duplicate_element_key", "Each Element appears once in a rotation.")
    current = {
        row.element_id: row
        for row in s.scalars(select(Element).where(Element.account_id == account_id).with_for_update()).all()
    }
    missing, unknown = sorted(set(current) - set(given)), sorted(set(given) - set(current))
    if missing or unknown:
        raise ElementError(
            409, "vault_changed", "The rotation must re-wrap exactly the Elements the account holds.",
            version=version, missing_element_ids=missing[:50], unknown_element_ids=unknown[:50],
        )
    return current


def apply_rotation(rows: dict[str, Element], element_keys: list[tuple[str, str]], master_key_id: str, now: float) -> None:
    """The same element keys, wrapped under the new Elements key. Records and files don't change."""
    given = dict(element_keys)
    for element_id, row in rows.items():
        row.wrapped_key, row.master_key_id, row.updated_at = given[element_id], master_key_id, now


# ------------------------------------------------------------------ data export


def export_account(s: Session, account_id: str) -> tuple[dict, list[tuple[str, str]]]:
    """An account's Elements for a data export: `elements.json` (wrapped keys and sealed records, exactly as stored) and
    (path in the zip, object id) for each sealed file. KunoWorld can open none of it."""
    rows = s.scalars(select(Element).where(Element.account_id == account_id).order_by(Element.element_id)).all()
    document = []
    files: list[tuple[str, str]] = []
    for row in rows:
        own = files_of(s, account_id, row.element_id)
        entry = element_json(row, own)
        entry["file_paths"] = [f"elements/{row.element_id}/{f.position}.kunob" for f in own]
        document.append(entry)
        files.extend((f"elements/{row.element_id}/{f.position}.kunob", f.blob_id) for f in own)
    about = (
        "Your Elements, exactly as KunoWorld stores them. Each element key is AES-256-GCM wrapped (KVE1) under your "
        "Elements key, which is derived with HKDF-SHA256 from your key sync master key; each record (meta) and file is a "
        "KUNOB1 blob sealed with the element key. KunoWorld can't open any of it."
    )
    return {"format": "kunoworld-elements", "version": 1, "account_id": account_id, "about": about, "elements": document}, files
