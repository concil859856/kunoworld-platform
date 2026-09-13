"""The S3 blob store keeps the local store's contract, against an in-process fake S3 (moto).

Needs the test extras: `pip install boto3 'moto[s3]'` (or `uv sync --group test` in the
platform CI workspace). Skipped when they are missing.
"""

from __future__ import annotations

import hashlib
import io
import os

import pytest

pytest.importorskip("boto3")
moto = pytest.importorskip("moto")

import boto3

from kuno_gateway.blobstore import BlobStore
from kuno_gateway.blobstore_s3 import (
    MIN_PART_BYTES,
    S3BlobStore,
    S3Config,
    select_blob_store,
)

BUCKET = "kuno-test-blobs"


@pytest.fixture
def aws_env(monkeypatch):
    # Fake credentials so nothing can reach a real account.
    for key, value in {
        "AWS_ACCESS_KEY_ID": "testing",
        "AWS_SECRET_ACCESS_KEY": "testing",
        "AWS_SESSION_TOKEN": "testing",
        "AWS_DEFAULT_REGION": "us-east-1",
    }.items():
        monkeypatch.setenv(key, value)


@pytest.fixture
def store(aws_env):
    with moto.mock_aws():
        yield S3BlobStore(S3Config(bucket=BUCKET, region="us-east-1", create_bucket=True))


def test_put_returns_id_digest_and_size(store):
    data = b"KUNOB1" + os.urandom(1000)
    blob_id, digest, size = store.put(data)
    assert len(blob_id) == 32 and all(c in "0123456789abcdef" for c in blob_id)
    assert digest == hashlib.sha256(data).hexdigest()
    assert size == len(data)
    assert store.get(blob_id) == data


def test_ids_are_unique(store):
    ids = {store.put(b"x")[0] for _ in range(20)}
    assert len(ids) == 20


def test_objects_live_under_the_prefix(store):
    blob_id, digest, _ = store.put(b"hello")
    head = store.client.head_object(Bucket=BUCKET, Key=f"blobs/{blob_id}")
    assert head["Metadata"]["sha256"] == digest


def test_missing_and_malformed_ids_raise_key_error(store):
    with pytest.raises(KeyError):
        store.get("0" * 32)
    for bad in ("../etc/passwd", "ABC", "", "0" * 31, "g" * 32):
        with pytest.raises(KeyError):
            store.get(bad)
    with pytest.raises(KeyError):
        store.iter_chunks("0" * 32)


def test_delete_removes_and_tolerates_missing(store):
    blob_id, _, _ = store.put(b"gone soon")
    store.delete(blob_id)
    with pytest.raises(KeyError):
        store.get(blob_id)
    store.delete(blob_id)  # already gone
    store.delete("not-an-id")  # malformed: ignored like the local store


def test_empty_blob(store):
    blob_id, digest, size = store.put(b"")
    assert (digest, size) == (hashlib.sha256(b"").hexdigest(), 0)
    assert store.get(blob_id) == b""


def test_streaming_upload_small_and_multipart(store):
    small = os.urandom(1234)
    blob_id, digest, size = store.put_stream(io.BytesIO(small))
    assert (digest, size) == (hashlib.sha256(small).hexdigest(), len(small))
    assert store.get(blob_id) == small

    big = os.urandom(2 * MIN_PART_BYTES + 12345)  # three parts at the minimum chunk size
    multipart = S3BlobStore(store.config, client=store.client, chunk_bytes=MIN_PART_BYTES)
    blob_id, digest, size = multipart.put(io.BytesIO(big))  # file-like objects stream too
    assert (digest, size) == (hashlib.sha256(big).hexdigest(), len(big))
    assert b"".join(multipart.iter_chunks(blob_id, 1 << 20)) == big


def test_failed_multipart_upload_is_aborted(store):
    class Broken(io.RawIOBase):
        def __init__(self):
            self.calls = 0

        def readable(self):
            return True

        def read(self, n=-1):
            self.calls += 1
            if self.calls > 1:
                raise OSError("client went away")
            return b"a" * n

    multipart = S3BlobStore(store.config, client=store.client, chunk_bytes=MIN_PART_BYTES)
    with pytest.raises(OSError):
        multipart.put_stream(Broken())
    assert store.client.list_multipart_uploads(Bucket=BUCKET).get("Uploads", []) == []


def test_behaves_like_the_local_store(store, tmp_path):
    """The same script of calls gives the same observable results on both backends."""
    local = BlobStore(tmp_path / "blobs")
    for backend in (local, store):
        blob_id, digest, size = backend.put(b"same")
        assert (digest, size) == (hashlib.sha256(b"same").hexdigest(), 4)
        assert backend.get(blob_id) == b"same"
        backend.delete(blob_id)
        with pytest.raises(KeyError):
            backend.get(blob_id)
        with pytest.raises(KeyError):
            backend.get("nope")


def test_config_from_env_and_selection(aws_env, tmp_path):
    with pytest.raises(ValueError):
        S3Config.from_env({})
    config = S3Config.from_env(
        {
            "KUNO_S3_BUCKET": BUCKET,
            "KUNO_S3_ENDPOINT_URL": "http://minio:9000",
            "KUNO_S3_REGION": "auto",
            "KUNO_S3_ACCESS_KEY_ID": "id",
            "KUNO_S3_SECRET_ACCESS_KEY": "super-secret",
            "KUNO_S3_ADDRESSING_STYLE": "path",
        }
    )
    assert (config.endpoint_url, config.region, config.addressing_style) == ("http://minio:9000", "auto", "path")
    assert "super-secret" not in repr(config)

    class FakeSettings:
        blob_dir = tmp_path / "blobs"

    assert isinstance(select_blob_store(FakeSettings(), {}), BlobStore)
    with moto.mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket=BUCKET)
        chosen = select_blob_store(FakeSettings(), {"KUNO_BLOB_BACKEND": "s3", "KUNO_S3_BUCKET": BUCKET, "KUNO_S3_REGION": "us-east-1"})
        assert isinstance(chosen, S3BlobStore)
    with pytest.raises(ValueError):
        select_blob_store(FakeSettings(), {"KUNO_BLOB_BACKEND": "floppy"})
