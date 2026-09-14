"""Ciphertext blob storage. Local files for development; swap for S3/R2 in production.

Besides whole blobs, `size(blob_id)` and `open_range(blob_id, start, end)` read part of one without loading it, for
HTTP byte ranges (byte_ranges.py). `blobstore_s3.S3BlobStore` has the same two methods.
"""

from __future__ import annotations

import hashlib
import os
import re
import secrets
from pathlib import Path
from typing import BinaryIO

_ID = re.compile(r"^[0-9a-f]{32}$")


class _BoundedReader:
    """Reads at most `remaining` bytes from an open file, then reports end of stream."""

    def __init__(self, handle: BinaryIO, remaining: int):
        self._handle, self._remaining = handle, max(remaining, 0)

    def read(self, n: int = -1) -> bytes:
        if self._remaining <= 0:
            return b""
        n = self._remaining if n is None or n < 0 else min(n, self._remaining)
        data = self._handle.read(n)
        self._remaining -= len(data)
        return data

    def close(self) -> None:
        self._handle.close()


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

    def size(self, blob_id: str) -> int:
        try:
            return self._path(blob_id).stat().st_size
        except FileNotFoundError:
            raise KeyError(blob_id) from None

    def open_range(self, blob_id: str, start: int, end: int | None = None) -> _BoundedReader | BinaryIO:
        """A readable stream of bytes `[start, end)` (to the end when `end` is None). Close it when done."""
        try:
            handle = self._path(blob_id).open("rb")
        except FileNotFoundError:
            raise KeyError(blob_id) from None
        handle.seek(start)
        return handle if end is None else _BoundedReader(handle, end - start)

    def exists(self, blob_id: str) -> bool:
        try:
            return self._path(blob_id).exists()
        except KeyError:
            return False

    def delete(self, blob_id: str) -> None:
        try:
            self._path(blob_id).unlink(missing_ok=True)
        except KeyError:
            pass
