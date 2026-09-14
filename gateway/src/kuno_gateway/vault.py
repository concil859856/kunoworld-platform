"""Encryption at rest for what the platform can read: standard uploads, videos, and keys it holds.

One 32-byte platform key (`KUNO_STANDARD_STORAGE_KEY`, base64url). Data is sealed with the protocol's chunked
blob format under a label that names what it is ("upload/<id>", "video/<job>"), so a stored object can't be
swapped for another. Dev networks generate the key into the data directory; production refuses standard mode
until it is configured, rather than silently minting a key that a restart on another host would lose.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets
from typing import TYPE_CHECKING

from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e

if TYPE_CHECKING:
    from .state import GatewayState

KEY_FILE = "standard_storage.key"


class StorageKeyMissing(Exception):
    """Production without KUNO_STANDARD_STORAGE_KEY."""


class Vault:
    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("the standard storage key must be 32 bytes")
        self._key = key
        self._hash_key = hmac.new(key, b"kuno/at-rest/keyed-hash", hashlib.sha256).digest()

    def seal(self, label: str, data: bytes) -> bytes:
        return encrypt_blob(self._key, f"at-rest/{label}", data)

    def open(self, label: str, sealed: bytes) -> bytes:
        return decrypt_blob(self._key, f"at-rest/{label}", sealed)

    def seal_secret(self, label: str, secret: bytes) -> str:
        return b64e(self.seal(label, secret))

    def open_secret(self, label: str, sealed: str) -> bytes:
        return self.open(label, b64d(sealed))

    def keyed_hash(self, value: str) -> str:
        """A stable pseudonym for a value (such as a reporter's IP) that can't be reversed without the key."""
        return hmac.new(self._hash_key, value.encode(), hashlib.sha256).hexdigest()


def _dev_key(state: GatewayState) -> bytes:
    path = state.settings.data_dir / KEY_FILE
    if not path.exists():
        try:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        except FileExistsError:
            pass  # another process created it first
        else:
            with os.fdopen(fd, "w") as f:
                f.write(b64e(secrets.token_bytes(32)))
    return b64d(path.read_text().strip())


def vault(state: GatewayState) -> Vault:
    cached = getattr(state, "_kuno_vault", None)
    if cached is not None:
        return cached
    configured = state.settings.standard_storage_key
    if configured:
        key = b64d(configured)
    elif state.policy.production:
        raise StorageKeyMissing("KUNO_STANDARD_STORAGE_KEY is required in production")
    else:
        key = _dev_key(state)
    state._kuno_vault = Vault(key)
    return state._kuno_vault
