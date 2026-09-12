"""Ciphertext blob storage. Local files for development; swap for S3/R2 in production."""

from __future__ import annotations

import hashlib
import os
import re
import secrets
from pathlib import Path

_ID = re.compile(r"^[0-9a-f]{32}$")


class BlobStore:
    def __init__(self, root: Path):
        self.root = root
        root.mkdir(parents=True, exist_ok=True)

    def _path(self, blob_id: str) -> Path:
        if not _ID.match(blob_id):
            raise KeyError(blob_id)
        return self.root / blob_id

    def put(self, data: bytes) -> tuple[str, str, int]:
        blob_id = secrets.token_hex(16)
        tmp = self.root / f".{blob_id}.tmp"
        tmp.write_bytes(data)
        os.replace(tmp, self._path(blob_id))
        return blob_id, hashlib.sha256(data).hexdigest(), len(data)

    def get(self, blob_id: str) -> bytes:
        path = self._path(blob_id)
        if not path.exists():
            raise KeyError(blob_id)
        return path.read_bytes()

    def delete(self, blob_id: str) -> None:
        try:
            self._path(blob_id).unlink(missing_ok=True)
        except KeyError:
            pass
