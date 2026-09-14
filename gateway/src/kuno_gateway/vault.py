"""Encryption at rest for what the platform can read: standard uploads, videos, and keys it holds.

Envelope encryption (storage_keys.py): every sealed object gets its own random data key, and only a wrapped copy of
that key is stored, in `storage_data_keys`, wrapped by a key-encryption key (KEK) held by a local key file (dev), AWS KMS
or HashiCorp Vault Transit. Sealed format:

    "KUNOE1" | format version u8 (1) | data key id (16 bytes) | kuno_protocol.blobs blob

The inner blob is `encrypt_blob(data_key, "at-rest/<data key id hex>/<label>", data)`: the label names what the object
is ("standard/video/<job>"), so an object can't be swapped for another, and the data key id is bound in too, so the
header can't be pointed at another key.

Objects sealed before envelope encryption are a bare protocol blob under `KUNO_STANDARD_STORAGE_KEY` with the label
"at-rest/<label>" (legacy KEK v0); they keep decrypting while that key is configured or has been imported by
`kuno-gateway rotate-storage-key`.
"""

from __future__ import annotations

import hashlib
import hmac
import struct
from typing import TYPE_CHECKING

from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import DecryptionError

from .storage_keys import DataKeyGone, StorageKeyMissing, StorageKeyring, keyring_for

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from .state import GatewayState

__all__ = ["ENVELOPE_MAGIC", "DataKeyGone", "StorageKeyMissing", "Vault", "vault"]

ENVELOPE_MAGIC = b"KUNOE1"
ENVELOPE_VERSION = 1
_HEADER = struct.Struct(">6sB16s")
# The generated legacy key of a dev data directory; read if present, never created any more.
KEY_FILE = "standard_storage.key"


def _content_label(dek_id: str, label: str) -> str:
    return f"at-rest/{dek_id}/{label}"


class Vault:
    def __init__(self, keyring: StorageKeyring):
        self.keyring = keyring

    def seal(self, label: str, data: bytes, s: Session | None = None) -> bytes:
        """Pass `s` when sealing inside a transaction of another session factory; inside the gateway's own
        `with state.session() as s, s.begin():` the data key joins that transaction automatically."""
        dek_id, dek = self.keyring.new_data_key(label, s)
        return _HEADER.pack(ENVELOPE_MAGIC, ENVELOPE_VERSION, bytes.fromhex(dek_id)) + encrypt_blob(dek, _content_label(dek_id, label), data)

    def open(self, label: str, sealed: bytes, s: Session | None = None) -> bytes:
        """Raises DataKeyGone (a KeyError) when the object's data key was deleted, DecryptionError when it doesn't
        authenticate."""
        if sealed[: len(ENVELOPE_MAGIC)] == ENVELOPE_MAGIC:
            if len(sealed) < _HEADER.size:
                raise DecryptionError("sealed object too short")
            _, version, raw_id = _HEADER.unpack_from(sealed)
            if version != ENVELOPE_VERSION:
                raise DecryptionError("unknown sealed object version")
            dek_id = raw_id.hex()
            return decrypt_blob(self.keyring.data_key(dek_id, s), _content_label(dek_id, label), sealed[_HEADER.size :])
        legacy = self.keyring.legacy_key(s)
        if legacy is None:
            raise DecryptionError("sealed with the legacy storage key (KUNO_STANDARD_STORAGE_KEY), which is not configured")
        return decrypt_blob(legacy, f"at-rest/{label}", sealed)

    def seal_secret(self, label: str, secret: bytes, s: Session | None = None) -> str:
        return b64e(self.seal(label, secret, s))

    def open_secret(self, label: str, sealed: str, s: Session | None = None) -> bytes:
        return self.open(label, b64d(sealed), s)

    def keyed_hash(self, value: str) -> str:
        """A stable pseudonym for a value (such as a reporter's IP) that can't be reversed without the key."""
        return hmac.new(self.keyring.keyed_hash_key(), value.encode(), hashlib.sha256).hexdigest()

    def forget(self, s: Session, labels, account_id: str | None = None) -> list[str]:
        """Deletes these labels' data keys in the caller's transaction and records a `data_key` tombstone for each label
        that had any. Returns those labels."""
        from . import tombstones

        forgotten = self.keyring.forget(s, labels)
        for label in forgotten:
            tombstones.record(s, tombstones.DATA_KEY, label, account_id)
        return forgotten


def vault(state: GatewayState) -> Vault:
    """The gateway's vault. Raises StorageKeyMissing when storage keys aren't configured (production without a key
    management service); the first call runs the start-up check if create_app didn't."""
    cached = getattr(state, "_kuno_vault", None)
    if cached is not None:
        return cached
    keyring = keyring_for(state)
    keyring.active()
    state._kuno_vault = Vault(keyring)
    return state._kuno_vault
