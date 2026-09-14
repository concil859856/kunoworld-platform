"""HTTP byte ranges for video downloads (RFC 9110: §14 Range, §13.1.5 If-Range, §15.3.7 206, §15.5.17 416).

iOS Safari seeks in a video, and sometimes plays it at all, only when the server answers `Range: bytes=` requests. Used
by `GET /v1/shares/{token}/video`, `GET /v1/standard/videos/{job_id}/video` (and its `/v1/me/...` alias) and
`GET /v1/blobs/{blob_id}`.

What a request gets:

* no `Range`, a unit other than `bytes`, several ranges, or a malformed one: `200` and the whole body. RFC 9110 lets a
  server ignore those; several ranges would need `multipart/byteranges`, which players don't ask for.
* one satisfiable range (`a-b`, `a-`, or the suffix `-n`): `206`, `Content-Range: bytes a-b/size`. An end past the last
  byte is clamped to it.
* a range starting at or past the end, a suffix of zero bytes, or any range of an empty body: `416`,
  `Content-Range: bytes */size`.
* `If-Range` equal to the response's strong ETag honours the range. Any other validator (another tag, a weak tag, or a
  date, since these responses carry no Last-Modified) gets `200` and the whole body.

Every answer carries `Accept-Ranges: bytes`, and `ETag: "<sha256 hex>"` when a digest is known: the video's content
digest (Standard), or the stored blob's digest (ciphertext served as stored).

Sealed at rest: chunked decryption, no whole-file decrypt
--------------------------------------------------------
A Standard video is stored as `KUNOE1 | version | data key id | kuno_protocol.blobs blob` (vault.py). The inner format
is chunked, 1 MiB by default: every chunk is sealed separately with ChaCha20-Poly1305, with its index and a final-chunk
flag in the nonce and the blob header as associated data. A range is served by decrypting only the chunks it covers,
from one ranged read of the store: one chunk in memory at a time, however large the video. So no size cap is needed.

Before a byte is sent, the stored object's size must be exactly what its plaintext length implies. That length is
the byte count recorded when the video was stored, else the authenticated length prefix of a padded (version 2) blob.
A truncated or extended object is therefore refused up front, not only when its final chunk is read. Chunks are
authenticated as they stream; a failure mid-stream can only cut the connection. Padding bytes are never served, so
they aren't read. A blob store without `size`/`open_range` falls back to loading the object.
"""

from __future__ import annotations

import io
import struct
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Protocol

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from fastapi import HTTPException, Request
from fastapi.responses import StreamingResponse
from kuno_protocol import blobs as blob_format
from kuno_protocol.crypto import DecryptionError

if TYPE_CHECKING:
    from .db_moderation import StandardJob
    from .state import GatewayState

# How much plaintext or ciphertext a response yields at a time when nothing else sets the size.
READ_BYTES = 256 * 1024
# Enough of a stored object for its envelope header (23 bytes) and the inner blob header (18 bytes).
HEAD_BYTES = 64
_INNER_HEADER = struct.Struct(">6sBI7s")
assert _INNER_HEADER.size == blob_format.HEADER_LEN


# ------------------------------------------------------------------ parsing


@dataclass(frozen=True)
class ByteRange:
    start: int
    # Inclusive, as in Content-Range.
    end: int

    @property
    def length(self) -> int:
        return self.end - self.start + 1


class RangeNotSatisfiable(Exception):
    pass


def _number(text: str) -> int | None:
    text = text.strip()
    if not text or not text.isascii() or not text.isdigit():
        return None
    # Anything longer is past every file this serves; int() of thousands of digits is refused by Python anyway.
    return int(text) if len(text) <= 30 else 10**30


def parse_range(header: str | None, size: int) -> ByteRange | None:
    """The one range to serve, or None to serve the whole body. Raises RangeNotSatisfiable (answer 416)."""
    if header is None:
        return None
    unit, equals, spec = header.partition("=")
    if not equals or unit.strip().lower() != "bytes":
        return None
    specs = [part.strip() for part in spec.split(",") if part.strip()]
    if len(specs) != 1:
        return None
    first_text, dash, last_text = specs[0].partition("-")
    if not dash:
        return None
    if not first_text.strip():
        suffix = _number(last_text)
        if suffix is None:
            return None
        if suffix == 0 or size == 0:
            raise RangeNotSatisfiable()
        return ByteRange(max(size - suffix, 0), size - 1)
    first = _number(first_text)
    last = _number(last_text) if last_text.strip() else None
    if first is None or (last_text.strip() and last is None) or (last is not None and last < first):
        return None
    if first >= size:
        raise RangeNotSatisfiable()
    return ByteRange(first, size - 1 if last is None else min(last, size - 1))


def strong_etag(digest: str | None) -> str | None:
    return f'"{digest}"' if digest else None


def if_range_allows(if_range: str | None, etag: str | None) -> bool:
    """False sends the whole body. Only a strong ETag equal to this response's matches (RFC 9110 §13.1.5)."""
    if if_range is None:
        return True
    value = if_range.strip()
    return etag is not None and value.startswith('"') and value == etag


def _base_headers(etag: str | None) -> dict[str, str]:
    return {"accept-ranges": "bytes", **({"etag": etag} if etag else {})}


def select(request: Request, size: int, etag: str | None = None, headers: dict[str, str] | None = None) -> ByteRange | None:
    """The range this request gets, or None for the whole body. Raises a 416 HTTPException carrying `headers`."""
    header = request.headers.get("range")
    if header is None or not if_range_allows(request.headers.get("if-range"), etag):
        return None
    try:
        return parse_range(header, size)
    except RangeNotSatisfiable:
        kept = {k: v for k, v in (headers or {}).items() if k.lower() != "content-disposition"}
        raise HTTPException(
            416,
            {"code": "range_not_satisfiable", "message": f"The requested range is outside this {size}-byte file."},
            headers={**kept, **_base_headers(etag), "content-range": f"bytes */{size}"},
        ) from None


# ------------------------------------------------------------------ responses


class Body(Protocol):
    size: int

    def iter_bytes(self, start: int, end: int) -> Iterator[bytes]:
        """Bytes [start, end) of the body."""


def response(
    body: Body, wanted: ByteRange | None, *, media_type: str, headers: dict[str, str] | None = None, etag: str | None = None,
) -> StreamingResponse:
    out = {**(headers or {}), **_base_headers(etag)}
    if wanted is None:
        return StreamingResponse(body.iter_bytes(0, body.size), media_type=media_type, headers={**out, "content-length": str(body.size)})
    out["content-length"] = str(wanted.length)
    out["content-range"] = f"bytes {wanted.start}-{wanted.end}/{body.size}"
    return StreamingResponse(body.iter_bytes(wanted.start, wanted.end + 1), status_code=206, media_type=media_type, headers=out)


def serve(
    request: Request, body: Body, *, media_type: str, headers: dict[str, str] | None = None, etag: str | None = None,
) -> StreamingResponse:
    return response(body, select(request, body.size, etag, headers), media_type=media_type, headers=headers, etag=etag)


def counts_as_view(wanted: ByteRange | None) -> bool:
    """One view per playback, not per request: the whole file, or a range from the first byte that is more than a
    player's 2-byte probe (Safari asks for `bytes=0-1` first). Seeking asks for later bytes and isn't counted."""
    return wanted is None or (wanted.start == 0 and wanted.length > 2)


# ------------------------------------------------------------------ bodies


def _stored_size(store: Any, blob_id: str) -> int:
    sizer = getattr(store, "size", None)
    return sizer(blob_id) if sizer is not None else len(store.get(blob_id))


def _open_range(store: Any, blob_id: str, start: int, end: int) -> Any:
    opener = getattr(store, "open_range", None)
    if opener is not None:
        return opener(blob_id, start, end)
    return io.BytesIO(store.get(blob_id)[start:end])


def _read_exactly(stream: Any, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        piece = stream.read(n - len(buf))
        if not piece:
            break
        buf += piece
    return bytes(buf)


class BytesBody:
    """A body already in memory."""

    def __init__(self, data: bytes):
        self.data, self.size = data, len(data)

    def iter_bytes(self, start: int, end: int) -> Iterator[bytes]:
        view = memoryview(self.data)
        for offset in range(start, end, READ_BYTES):
            yield bytes(view[offset : min(offset + READ_BYTES, end)])


class StoredBlob:
    """A blob served exactly as stored (ciphertext its client decrypts). Construct it off the event loop: it asks the
    store for the size now, so a missing blob raises KeyError before any header is sent."""

    def __init__(self, store: Any, blob_id: str):
        self.store, self.blob_id = store, blob_id
        self.size = _stored_size(store, blob_id)

    def iter_bytes(self, start: int, end: int) -> Iterator[bytes]:
        if start >= end:
            return
        stream = _open_range(self.store, self.blob_id, start, end)
        try:
            remaining = end - start
            while remaining:
                piece = stream.read(min(READ_BYTES, remaining))
                if not piece:
                    raise OSError(f"blob {self.blob_id} ended {remaining} bytes early")
                remaining -= len(piece)
                yield piece
        finally:
            stream.close()


# `locate(head) -> (base key, blob label, offset of the blob in the object)`: vault.Vault.locate for objects sealed at
# rest; `lambda head: (key, label, 0)` for a bare protocol blob.
Locator = Callable[[bytes], "tuple[bytes, str, int]"]


class SealedBlob:
    """A `kuno_protocol.blobs` blob, optionally inside the at-rest envelope, served as its plaintext by decrypting only
    the chunks a range covers. Construct it off the event loop (it reads the headers, and for a padded blob without a
    recorded size, the first chunk). Raises KeyError when the object or its data key is gone, DecryptionError when it
    isn't what it should be."""

    def __init__(self, store: Any, blob_id: str, locate: Locator, expected_size: int | None = None):
        self.store, self.blob_id = store, blob_id
        self.stored = _stored_size(store, blob_id)
        stream = _open_range(store, blob_id, 0, min(self.stored, HEAD_BYTES))
        try:
            head = _read_exactly(stream, min(self.stored, HEAD_BYTES))
        finally:
            stream.close()
        key, label, offset = locate(head)
        if len(head) < offset + blob_format.HEADER_LEN:
            raise DecryptionError("blob too short")
        self.header = head[offset : offset + blob_format.HEADER_LEN]
        magic, version, chunk_size, self.nonce_prefix = _INNER_HEADER.unpack(self.header)
        if magic != blob_format.MAGIC or version not in blob_format.VERSIONS or not 0 < chunk_size <= blob_format.MAX_CHUNK:
            raise DecryptionError("not a KunoWorld blob")
        self.version, self.chunk_size = version, chunk_size
        self.body_start = offset + blob_format.HEADER_LEN

        # The chunk layout follows from the stored size: every chunk but the last is chunk_size + tag, and the last
        # holds at least one byte unless it is the only one.
        body = self.stored - self.body_start
        step = chunk_size + blob_format.TAG_LEN
        self.chunks = max(1, -(-body // step))
        last = body - (self.chunks - 1) * step
        if body < blob_format.TAG_LEN or last < blob_format.TAG_LEN or (self.chunks > 1 and last == blob_format.TAG_LEN):
            raise DecryptionError("blob is truncated")
        stream_length = body - self.chunks * blob_format.TAG_LEN
        self._aead = ChaCha20Poly1305(blob_format._blob_key(key, label))

        if version == blob_format.V1:
            self.skip, length = 0, stream_length
        else:
            self.skip = blob_format.LENGTH_LEN
            if stream_length < blob_format.LENGTH_LEN:
                raise DecryptionError("padded blob is too short to hold its length")
            if expected_size is not None and blob_format.padded_stream_length(expected_size) == stream_length:
                # The size recorded with the job fits this object exactly; chunk 0's authenticated prefix is checked
                # against it whenever a range reads chunk 0.
                length = expected_size
            else:
                length = self._length_prefix()
            if blob_format.padded_stream_length(length) != stream_length:
                raise DecryptionError("padded blob is not padded to its size bucket")
        if expected_size is not None and length != expected_size:
            raise DecryptionError("blob does not hold the recorded number of bytes")
        self.size = length

    def iter_bytes(self, start: int, end: int) -> Iterator[bytes]:
        return self._stream(start + self.skip, end + self.skip)

    def _length_prefix(self) -> int:
        prefix = b"".join(self._stream(0, blob_format.LENGTH_LEN, check_prefix=False))
        if len(prefix) != blob_format.LENGTH_LEN:
            raise DecryptionError("padded blob is too short to hold its length")
        return struct.unpack(">Q", prefix)[0]

    def _open_chunk(self, index: int, sealed: bytes) -> bytes:
        nonce = blob_format._nonce(self.nonce_prefix, index, index == self.chunks - 1)
        try:
            return self._aead.decrypt(nonce, sealed, self.header)
        except InvalidTag:
            raise DecryptionError("blob failed authentication (wrong key, label, or tampered/truncated data)") from None

    def _stream(self, start: int, end: int, check_prefix: bool = True) -> Iterator[bytes]:
        """The framed stream's bytes [start, end), from one ranged read of the chunks they fall in."""
        if start >= end:
            return
        size, step = self.chunk_size, self.chunk_size + blob_format.TAG_LEN
        first, last = start // size, (end - 1) // size
        read_from = self.body_start + first * step
        read_to = min(self.body_start + (last + 1) * step, self.stored)
        stream = _open_range(self.store, self.blob_id, read_from, read_to)
        try:
            for index in range(first, last + 1):
                sealed = _read_exactly(stream, min(step, read_to - (self.body_start + index * step)))
                if len(sealed) < blob_format.TAG_LEN:
                    raise DecryptionError("blob ended early")
                plain = self._open_chunk(index, sealed)
                if (
                    check_prefix and index == 0 and self.version == blob_format.V2 and len(plain) >= blob_format.LENGTH_LEN
                    and struct.unpack_from(">Q", plain)[0] != self.size
                ):
                    raise DecryptionError("blob does not hold the recorded number of bytes")
                base = index * size
                yield plain[max(start - base, 0) : min(end - base, len(plain))]
        finally:
            stream.close()


def standard_video(state: GatewayState, row: StandardJob) -> SealedBlob:
    """A stored Standard video as a ranged body. Blocking: call it off the event loop. KeyError when it isn't stored
    (or its data key was deleted); StorageKeyMissing without at-rest storage."""
    from .standard_jobs import video_label
    from .vault import vault

    if row.video_blob_id is None:
        raise KeyError(row.job_id)
    store = vault(state)
    label = video_label(row.job_id)
    return SealedBlob(state.blobs, row.video_blob_id, lambda head: store.locate(label, head), expected_size=row.video_bytes)
