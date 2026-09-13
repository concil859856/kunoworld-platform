"""Ciphertext blob storage on S3-compatible object stores (AWS S3, Cloudflare R2, MinIO).

Same interface and semantics as `blobstore.BlobStore`:

* `put(data) -> (blob_id, sha256_hex, size)`; ids are 32 lowercase hex characters.
* `get(blob_id) -> bytes`; raises `KeyError` for a missing object or a malformed id.
* `delete(blob_id)`; missing objects and malformed ids are ignored.

On top of that, for large ciphertexts:

* `put_stream(readable)` hashes while it uploads, switching to multipart above one chunk,
  so a blob never has to sit in memory whole.
* `iter_chunks(blob_id)` returns an iterator of bytes suitable for `StreamingResponse`;
  it raises `KeyError` up front, before the first chunk.

`boto3` is imported lazily and only needed when this backend is selected
(`pip install 'kuno-gateway[s3]'`). `select_blob_store(settings)` picks the backend from
`KUNO_BLOB_BACKEND` (`local`, the default, or `s3`).

Environment (all optional except the bucket):

    KUNO_S3_BUCKET              bucket name (required for the s3 backend)
    KUNO_S3_ENDPOINT_URL        e.g. http://minio:9000 or https://<account>.r2.cloudflarestorage.com
    KUNO_S3_REGION              e.g. us-east-1; "auto" for R2
    KUNO_S3_PREFIX              key prefix, default "blobs/"
    KUNO_S3_ACCESS_KEY_ID       falls back to the standard AWS credential chain when unset
    KUNO_S3_SECRET_ACCESS_KEY
    KUNO_S3_SESSION_TOKEN
    KUNO_S3_ADDRESSING_STYLE    "path" (MinIO), "virtual" or "auto" (default)
    KUNO_S3_CREATE_BUCKET       "1" to create the bucket at start-up if it is missing (dev only)
"""

from __future__ import annotations

import hashlib
import os
import re
import secrets
from collections.abc import Iterator
from dataclasses import dataclass
from typing import IO, Any

_ID = re.compile(r"^[0-9a-f]{32}$")
_MISSING = {"NoSuchKey", "404", "NotFound"}
# S3 requires every multipart part except the last to be at least 5 MiB.
MIN_PART_BYTES = 5 * 1024 * 1024
DEFAULT_CHUNK_BYTES = 8 * 1024 * 1024


@dataclass
class S3Config:
    bucket: str
    endpoint_url: str | None = None
    region: str | None = None
    prefix: str = "blobs/"
    access_key_id: str | None = None
    secret_access_key: str | None = None
    session_token: str | None = None
    addressing_style: str = "auto"
    create_bucket: bool = False

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> S3Config:
        env = dict(os.environ if env is None else env)
        bucket = env.get("KUNO_S3_BUCKET", "").strip()
        if not bucket:
            raise ValueError("KUNO_S3_BUCKET is required when KUNO_BLOB_BACKEND=s3")
        return cls(
            bucket=bucket,
            endpoint_url=env.get("KUNO_S3_ENDPOINT_URL") or None,
            region=env.get("KUNO_S3_REGION") or None,
            prefix=env.get("KUNO_S3_PREFIX", "blobs/"),
            access_key_id=env.get("KUNO_S3_ACCESS_KEY_ID") or None,
            secret_access_key=env.get("KUNO_S3_SECRET_ACCESS_KEY") or None,
            session_token=env.get("KUNO_S3_SESSION_TOKEN") or None,
            addressing_style=env.get("KUNO_S3_ADDRESSING_STYLE", "auto") or "auto",
            create_bucket=env.get("KUNO_S3_CREATE_BUCKET", "0") == "1",
        )

    def __repr__(self) -> str:  # never show credentials in logs or tracebacks
        return f"S3Config(bucket={self.bucket!r}, endpoint_url={self.endpoint_url!r}, region={self.region!r}, prefix={self.prefix!r})"


def make_client(config: S3Config) -> Any:
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:  # pragma: no cover - depends on the install
        raise RuntimeError("The s3 blob backend needs boto3: install kuno-gateway[s3].") from exc
    kwargs: dict[str, Any] = {
        "config": Config(
            s3={"addressing_style": config.addressing_style},
            retries={"max_attempts": 5, "mode": "standard"},
            # boto3 >= 1.36 adds CRC checksums to every upload by default, which some
            # S3-compatible stores reject. Only send them when an operation requires one.
            request_checksum_calculation="when_required",
            response_checksum_validation="when_required",
        )
    }
    if config.endpoint_url:
        kwargs["endpoint_url"] = config.endpoint_url
    if config.region:
        kwargs["region_name"] = config.region
    if config.access_key_id and config.secret_access_key:
        kwargs["aws_access_key_id"] = config.access_key_id
        kwargs["aws_secret_access_key"] = config.secret_access_key
        if config.session_token:
            kwargs["aws_session_token"] = config.session_token
    return boto3.client("s3", **kwargs)


def _error_code(exc: Exception) -> str | None:
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        return str(response.get("Error", {}).get("Code"))
    return None


class S3BlobStore:
    """Blob storage on one bucket. Thread-safe: boto3 clients may be shared across threads."""

    def __init__(self, config: S3Config, client: Any | None = None, chunk_bytes: int = DEFAULT_CHUNK_BYTES):
        if chunk_bytes < MIN_PART_BYTES:
            raise ValueError(f"chunk_bytes must be at least {MIN_PART_BYTES} (the S3 minimum part size)")
        self.config = config
        self.bucket = config.bucket
        self.prefix = config.prefix
        self.chunk_bytes = chunk_bytes
        self.client = client if client is not None else make_client(config)
        if config.create_bucket:
            self.ensure_bucket()

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None, client: Any | None = None) -> S3BlobStore:
        return cls(S3Config.from_env(env), client=client)

    # ------------------------------------------------------------ helpers

    def _key(self, blob_id: str) -> str:
        if not isinstance(blob_id, str) or not _ID.match(blob_id):
            raise KeyError(blob_id)
        return f"{self.prefix}{blob_id}"

    def ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception as exc:
            if _error_code(exc) not in _MISSING | {"NoSuchBucket"}:
                raise
            kwargs: dict[str, Any] = {"Bucket": self.bucket}
            region = self.config.region
            if region and region not in ("us-east-1", "auto"):
                kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
            self.client.create_bucket(**kwargs)

    # ------------------------------------------------------------ interface

    def put(self, data: bytes | bytearray | memoryview | IO[bytes]) -> tuple[str, str, int]:
        if not isinstance(data, (bytes, bytearray, memoryview)):
            return self.put_stream(data)
        data = bytes(data)
        blob_id = secrets.token_hex(16)
        digest = hashlib.sha256(data).hexdigest()
        self.client.put_object(
            Bucket=self.bucket,
            Key=self._key(blob_id),
            Body=data,
            ContentType="application/octet-stream",
            Metadata={"sha256": digest},
        )
        return blob_id, digest, len(data)

    def put_stream(self, stream: IO[bytes]) -> tuple[str, str, int]:
        """Uploads from a readable binary stream without holding the whole blob in memory."""
        blob_id = secrets.token_hex(16)
        key = self._key(blob_id)
        hasher = hashlib.sha256()
        first = _read_exactly(stream, self.chunk_bytes)
        hasher.update(first)
        if len(first) < self.chunk_bytes:
            digest = hasher.hexdigest()
            self.client.put_object(
                Bucket=self.bucket, Key=key, Body=first, ContentType="application/octet-stream", Metadata={"sha256": digest}
            )
            return blob_id, digest, len(first)

        # The digest is only known at the end, so it can't go into object metadata here; the
        # gateway's database row is the record of it either way.
        upload = self.client.create_multipart_upload(Bucket=self.bucket, Key=key, ContentType="application/octet-stream")
        upload_id = upload["UploadId"]
        parts: list[dict[str, Any]] = []
        size = 0
        try:
            chunk = first
            number = 1
            while chunk:
                response = self.client.upload_part(
                    Bucket=self.bucket, Key=key, UploadId=upload_id, PartNumber=number, Body=chunk
                )
                parts.append({"ETag": response["ETag"], "PartNumber": number})
                size += len(chunk)
                chunk = _read_exactly(stream, self.chunk_bytes)
                hasher.update(chunk)
                number += 1
            self.client.complete_multipart_upload(
                Bucket=self.bucket, Key=key, UploadId=upload_id, MultipartUpload={"Parts": parts}
            )
        except BaseException:
            try:
                self.client.abort_multipart_upload(Bucket=self.bucket, Key=key, UploadId=upload_id)
            except Exception:
                pass
            raise
        return blob_id, hasher.hexdigest(), size

    def get(self, blob_id: str) -> bytes:
        body = self._open(blob_id)
        try:
            return body.read()
        finally:
            body.close()

    def iter_chunks(self, blob_id: str, chunk_bytes: int = 1024 * 1024) -> Iterator[bytes]:
        """Opens the object now (so a missing blob raises KeyError here) and yields its bytes."""
        body = self._open(blob_id)

        def chunks() -> Iterator[bytes]:
            try:
                yield from body.iter_chunks(chunk_bytes)
            finally:
                body.close()

        return chunks()

    def delete(self, blob_id: str) -> None:
        try:
            key = self._key(blob_id)
        except KeyError:
            return
        try:
            self.client.delete_object(Bucket=self.bucket, Key=key)
        except Exception as exc:
            if _error_code(exc) not in _MISSING:
                raise

    def _open(self, blob_id: str) -> Any:
        key = self._key(blob_id)
        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"]
        except Exception as exc:
            if _error_code(exc) in _MISSING:
                raise KeyError(blob_id) from None
            raise


def _read_exactly(stream: IO[bytes], n: int) -> bytes:
    """Reads up to n bytes, looping over short reads; returns fewer only at end of stream."""
    buf = bytearray()
    while len(buf) < n:
        piece = stream.read(n - len(buf))
        if not piece:
            break
        buf += piece
    return bytes(buf)


def select_blob_store(settings: Any, env: dict[str, str] | None = None):
    """Returns the blob store the settings/environment ask for.

    Reads `settings.blob_backend` when the Settings dataclass has it, else KUNO_BLOB_BACKEND.
    """
    env = dict(os.environ if env is None else env)
    backend = (getattr(settings, "blob_backend", None) or env.get("KUNO_BLOB_BACKEND") or "local").lower()
    if backend == "local":
        from .blobstore import BlobStore

        return BlobStore(settings.blob_dir)
    if backend == "s3":
        return S3BlobStore(S3Config.from_env(env))
    raise ValueError(f"unknown blob backend {backend!r}; use 'local' or 's3'")
