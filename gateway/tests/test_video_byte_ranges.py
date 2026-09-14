"""Byte ranges on video downloads (byte_ranges.py). Share links, the owner's Standard download and blob downloads answer
`Range: bytes=`, so players (iOS Safari in particular) can seek. Sealed videos are decrypted only chunk by chunk, on
both blob stores.

The HTTP tests reuse the simulated worker and fixtures of test_standard_moderation_flow.py, and need ffmpeg as it does.
"""

from __future__ import annotations

import os
import random
import shutil
from types import SimpleNamespace

import pytest
from kuno_protocol import blobs as blob_format
from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import sha256_hex
from kuno_protocol.crypto import DecryptionError
from kuno_protocol.schemas import output_label
from test_share_links import public, session_for, share, sign, standard_video
import test_standard_moderation_flow as flow
from test_standard_moderation_flow import _private_job, new_account

from fastapi import HTTPException

from kuno_gateway.blobstore import BlobStore
from kuno_gateway.byte_ranges import (
    ByteRange,
    RangeNotSatisfiable,
    SealedBlob,
    StoredBlob,
    counts_as_view,
    if_range_allows,
    parse_range,
    select,
)
from kuno_gateway.db import Job

needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")

# The flow's fixtures, bound here so pytest finds them in this module.
gw, media = flow.gw, flow.media

KEY = bytes(range(32))
LABEL = "at-rest/0123/standard/video/job"


# ------------------------------------------------------------------ parsing


@pytest.mark.parametrize(
    ("header", "expected"),
    [
        ("bytes=0-1", ByteRange(0, 1)),
        ("bytes=10-", ByteRange(10, 99)),
        ("bytes=-30", ByteRange(70, 99)),
        ("bytes=-500", ByteRange(0, 99)),  # a suffix longer than the file is the whole file
        ("bytes=90-1000", ByteRange(90, 99)),  # an end past the last byte is clamped
        ("Bytes=5-5", ByteRange(5, 5)),
        ("bytes=0-1,", ByteRange(0, 1)),  # empty list elements are allowed
        ("bytes=0-1,4-5", None),  # several ranges: the whole file
        ("bytes=5-1", None),  # malformed ranges are ignored
        ("bytes=abc", None),
        ("bytes=1-2-3", None),
        ("bytes=-", None),
        ("bytes=", None),
        ("items=0-1", None),
        (None, None),
    ],
)
def test_one_range_is_honoured_and_anything_else_is_the_whole_file(header, expected):
    assert parse_range(header, 100) == expected


@pytest.mark.parametrize(("header", "size"), [("bytes=100-", 100), ("bytes=100-200", 100), ("bytes=-0", 100), ("bytes=0-", 0), ("bytes=-5", 0), ("bytes=" + "9" * 40 + "-", 100)])
def test_a_range_outside_the_file_is_unsatisfiable(header, size):
    with pytest.raises(RangeNotSatisfiable):
        parse_range(header, size)


def test_if_range_needs_this_responses_strong_etag():
    assert if_range_allows(None, '"abc"') and if_range_allows(' "abc" ', '"abc"')
    assert not if_range_allows('"abd"', '"abc"') and not if_range_allows('W/"abc"', '"abc"')
    assert not if_range_allows("Wed, 21 Oct 2015 07:28:00 GMT", '"abc"') and not if_range_allows('"abc"', None)

    def request(**headers):
        return SimpleNamespace(headers=headers)

    assert select(request(range="bytes=0-9"), 100, '"abc"') == ByteRange(0, 9)
    assert select(request(range="bytes=0-9", **{"if-range": '"old"'}), 100, '"abc"') is None
    with pytest.raises(HTTPException) as refused:
        select(request(range="bytes=200-"), 100, '"abc"', {"x-robots-tag": "noindex", "content-disposition": "inline"})
    assert refused.value.status_code == 416
    assert refused.value.headers == {"x-robots-tag": "noindex", "accept-ranges": "bytes", "etag": '"abc"', "content-range": "bytes */100"}


def test_a_view_is_a_playback_not_a_probe_or_a_seek():
    assert counts_as_view(None) and counts_as_view(ByteRange(0, 99))
    assert not counts_as_view(ByteRange(0, 1)) and not counts_as_view(ByteRange(50, 99))


# ------------------------------------------------------------------ sealed blobs, chunk by chunk


class CountingStore(BlobStore):
    """The local store, remembering every ranged read."""

    def __init__(self, root):
        super().__init__(root)
        self.reads: list[tuple[int, int | None]] = []

    def open_range(self, blob_id, start, end=None):
        self.reads.append((start, end))
        return super().open_range(blob_id, start, end)


class WholeBlobsOnly:
    """A store with only put and get: bodies fall back to loading the object."""

    def __init__(self):
        self.objects: dict[str, bytes] = {}

    def put(self, data: bytes):
        blob_id = os.urandom(16).hex()
        self.objects[blob_id] = data
        return blob_id, sha256_hex(data), len(data)

    def get(self, blob_id: str) -> bytes:
        return self.objects[blob_id]


def locate(offset: int = 0, key: bytes = KEY):
    return lambda head: (key, LABEL, offset)


@pytest.mark.parametrize("version", [blob_format.V1, blob_format.V2])
@pytest.mark.parametrize("length", [0, 1, 7, 16, 17, 1000])
def test_any_range_of_a_sealed_blob_decrypts_to_those_bytes(tmp_path, version, length):
    rng = random.Random(f"{version}-{length}")
    plaintext = rng.randbytes(length)
    for store in (BlobStore(tmp_path), WholeBlobsOnly()):
        for chunk in (7, 16, 64):
            for envelope in (b"", b"E" * 23):
                blob_id, _, _ = store.put(envelope + encrypt_blob(KEY, LABEL, plaintext, chunk, version=version))
                for expected in (None, length):
                    body = SealedBlob(store, blob_id, locate(len(envelope)), expected_size=expected)
                    assert body.size == length
                    assert b"".join(body.iter_bytes(0, length)) == plaintext
                    for _ in range(20 if length else 0):
                        start = rng.randrange(length)
                        end = rng.randrange(start, length) + 1
                        assert b"".join(body.iter_bytes(start, end)) == plaintext[start:end], (chunk, start, end)


def test_a_range_reads_only_the_headers_and_the_chunks_it_covers(tmp_path):
    store = CountingStore(tmp_path)
    plaintext = os.urandom(10 * 1024)
    blob_id, _, _ = store.put(b"E" * 23 + encrypt_blob(KEY, LABEL, plaintext, 1024))
    body = SealedBlob(store, blob_id, locate(23), expected_size=len(plaintext))
    # The recorded size fits the stored size exactly, so not even the first chunk is read up front.
    assert store.reads == [(0, 64)]
    store.reads.clear()
    assert b"".join(body.iter_bytes(5000, 5100)) == plaintext[5000:5100]
    # Plaintext byte 5000 is stream byte 5008 (after the length prefix): chunk 4, alone.
    first = 23 + blob_format.HEADER_LEN + 4 * (1024 + blob_format.TAG_LEN)
    assert store.reads == [(first, first + 1024 + blob_format.TAG_LEN)]

    store.reads.clear()
    SealedBlob(store, blob_id, locate(23))  # without a recorded size: the headers, then chunk 0 for the length prefix
    assert store.reads == [(0, 64), (23 + blob_format.HEADER_LEN, 23 + blob_format.HEADER_LEN + 1024 + blob_format.TAG_LEN)]


def test_a_truncated_extended_tampered_or_wrongly_keyed_blob_is_refused(tmp_path):
    store = BlobStore(tmp_path)
    plaintext = os.urandom(5000)
    sealed = encrypt_blob(KEY, LABEL, plaintext, 1024)
    step = 1024 + blob_format.TAG_LEN
    body_length = len(sealed) - blob_format.HEADER_LEN
    last_chunk = body_length - (body_length // step) * step or step

    for broken in (sealed[:-last_chunk], sealed[:-1], sealed + bytes(blob_format.TAG_LEN)):
        blob_id, _, _ = store.put(broken)
        with pytest.raises(DecryptionError):
            SealedBlob(store, blob_id, locate(), expected_size=len(plaintext))
        with pytest.raises(DecryptionError):
            b"".join(SealedBlob(store, blob_id, locate()).iter_bytes(0, 1))

    flipped = bytearray(sealed)
    flipped[blob_format.HEADER_LEN + 2 * step + 5] ^= 1
    blob_id, _, _ = store.put(bytes(flipped))
    body = SealedBlob(store, blob_id, locate(), expected_size=len(plaintext))
    assert b"".join(body.iter_bytes(0, 1000)) == plaintext[:1000]  # chunks before the damage still open
    with pytest.raises(DecryptionError):
        b"".join(body.iter_bytes(2100, 2200))

    good, _, _ = store.put(sealed)
    with pytest.raises(DecryptionError):
        SealedBlob(store, good, locate(key=bytes(32)))
    with pytest.raises(DecryptionError):
        b"".join(SealedBlob(store, good, locate(key=bytes(32)), expected_size=len(plaintext)).iter_bytes(0, 10))
    # A recorded size that doesn't match what chunk 0 says is caught when chunk 0 is read.
    lying = SealedBlob(store, good, locate(), expected_size=len(plaintext) - 1) if blob_format.padded_stream_length(len(plaintext) - 1) == blob_format.padded_stream_length(len(plaintext)) else None
    if lying is not None:
        with pytest.raises(DecryptionError):
            b"".join(lying.iter_bytes(0, 10))


def test_missing_blobs_raise_key_error_before_anything_is_sent(tmp_path):
    store = BlobStore(tmp_path)
    with pytest.raises(KeyError):
        StoredBlob(store, "0" * 32)
    with pytest.raises(KeyError):
        SealedBlob(store, "0" * 32, locate())
    with pytest.raises(KeyError):
        store.open_range("0" * 32, 0, 10)
    blob_id, _, _ = store.put(b"0123456789")
    reader = store.open_range(blob_id, 3)
    assert reader.read() == b"3456789"
    reader.close()
    stored = StoredBlob(store, blob_id)
    assert stored.size == 10 and b"".join(stored.iter_bytes(2, 5)) == b"234"


def test_ranges_read_from_the_s3_store_with_ranged_gets(monkeypatch):
    pytest.importorskip("boto3")
    moto = pytest.importorskip("moto")
    from kuno_gateway.blobstore_s3 import S3BlobStore, S3Config

    for name, value in {"AWS_ACCESS_KEY_ID": "testing", "AWS_SECRET_ACCESS_KEY": "testing", "AWS_SESSION_TOKEN": "testing", "AWS_DEFAULT_REGION": "us-east-1"}.items():
        monkeypatch.setenv(name, value)
    with moto.mock_aws():
        store = S3BlobStore(S3Config(bucket="kuno-range-test", region="us-east-1", create_bucket=True))
        gets = []
        real_get = store.client.get_object
        store.client.get_object = lambda **kwargs: gets.append(kwargs.get("Range")) or real_get(**kwargs)
        plaintext = os.urandom(3000)
        object_bytes = b"E" * 23 + encrypt_blob(KEY, LABEL, plaintext, 256)
        blob_id, _, _ = store.put(object_bytes)
        assert store.size(blob_id) == len(object_bytes)
        reader = store.open_range(blob_id, 5, 25)
        assert reader.read() == object_bytes[5:25]
        reader.close()
        body = SealedBlob(store, blob_id, locate(23), expected_size=len(plaintext))
        assert b"".join(body.iter_bytes(1000, 2000)) == plaintext[1000:2000]
        assert all(r is not None for r in gets) and "bytes=0-63" in gets
        stored = StoredBlob(store, blob_id)
        assert b"".join(stored.iter_bytes(0, stored.size)) == object_bytes
        with pytest.raises(KeyError):
            store.size("0" * 32)
        with pytest.raises(KeyError):
            store.open_range("0" * 32, 0, 10)


# ------------------------------------------------------------------ over HTTP


@needs_ffmpeg
def test_a_standard_share_link_answers_byte_ranges_so_players_can_seek(gw, media):
    account_id, key = new_account(gw)
    me = session_for(gw, account_id)
    job_id = standard_video(gw, media, key)
    token = share(gw, job_id, me).json()["token"]
    clip, size = media.clip, len(media.clip)
    etag = f'"{sha256_hex(clip)}"'

    def get(**headers):
        return gw.client.get(f"/v1/shares/{token}/video", headers={"cf-connecting-ip": "198.51.100.20", **headers})

    whole = get()
    assert whole.status_code == 200 and whole.content == clip
    assert (whole.headers["accept-ranges"], whole.headers["etag"], whole.headers["content-length"]) == ("bytes", etag, str(size))

    probe = get(range="bytes=0-1")
    assert probe.status_code == 206 and probe.content == clip[:2]
    assert (probe.headers["content-range"], probe.headers["content-length"]) == (f"bytes 0-1/{size}", "2")
    for name in ("x-robots-tag", "cache-control", "referrer-policy", "content-type", "content-disposition", "etag"):
        assert probe.headers[name] == whole.headers[name], name

    clamped = get(range=f"bytes=100-{size + 50}")
    assert clamped.status_code == 206 and clamped.content == clip[100:] and clamped.headers["content-range"] == f"bytes 100-{size - 1}/{size}"
    assert get(range="bytes=-64").content == clip[-64:]
    assert get(range=f"bytes={size // 2}-").content == clip[size // 2 :]

    beyond = get(range=f"bytes={size}-")
    assert beyond.status_code == 416 and beyond.headers["content-range"] == f"bytes */{size}"
    assert beyond.headers["x-robots-tag"] == "noindex, nofollow" and beyond.json()["detail"]["code"] == "range_not_satisfiable"

    assert (lambda r: (r.status_code, r.content))(get(range="bytes=0-1,5-6")) == (200, clip)
    assert get(range="bytes=0-9", **{"if-range": etag}).status_code == 206
    for stale in ('"0000"', 'W/' + etag, "Wed, 21 Oct 2015 07:28:00 GMT"):
        answer = get(range="bytes=0-9", **{"if-range": stale})
        assert (answer.status_code, answer.content) == (200, clip)

    # One view per playback: whole files and ranges from the first byte count; the 2-byte probe, seeks and 416s don't.
    # Counted: whole, the two ranges asked for several at once, bytes=0-9 with a matching If-Range, and three stale ones.
    [row] = gw.client.get("/v1/me/shares", headers=me).json()
    assert row["view_count"] == 6


@needs_ffmpeg
def test_the_owners_standard_download_answers_ranges_with_the_content_digest_as_etag(gw, media):
    account_id, key = new_account(gw)
    job_id = standard_video(gw, media, key)
    size = len(media.clip)
    for path, credential in ((f"/v1/standard/videos/{job_id}/video", key), (f"/v1/me/standard/videos/{job_id}/video", session_for(gw, account_id))):
        part = gw.client.get(path, headers={**credential, "range": "bytes=10-19"})
        assert part.status_code == 206 and part.content == media.clip[10:20]
        assert (part.headers["content-range"], part.headers["etag"]) == (f"bytes 10-19/{size}", f'"{sha256_hex(media.clip)}"')
        assert (part.headers["content-type"], part.headers["content-disposition"]) == ("video/mp4", f'inline; filename="{job_id}.mp4"')
        assert gw.client.get(path, headers=credential).content == media.clip
    _, other = new_account(gw)
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers={**other, "range": "bytes=0-1"}).status_code == 404


@needs_ffmpeg
def test_ciphertext_downloads_answer_ranges_and_still_open_whole(gw, media):
    account_id, key = new_account(gw)
    job_id, output_key = _private_job(gw, account_id, media.clip)
    sign(gw, job_id, media.clip)
    token = share(gw, job_id, key, path="/v1/videos/{job_id}/shares").json()["token"]

    whole = public(gw, token, "/video")
    sealed = whole.content
    assert whole.status_code == 200 and decrypt_blob(output_key, output_label(job_id), sealed) == media.clip
    assert (whole.headers["etag"], whole.headers["accept-ranges"]) == (f'"{sha256_hex(sealed)}"', "bytes")
    part = gw.client.get(f"/v1/shares/{token}/video", headers={"cf-connecting-ip": "198.51.100.9", "range": "bytes=6-"})
    assert part.status_code == 206 and part.content == sealed[6:] and part.headers["content-type"] == "application/octet-stream"

    with gw.state.session() as s:
        blob_id = s.get(Job, job_id).output_blob_id
    tail = gw.client.get(f"/v1/blobs/{blob_id}", headers={**key, "range": "bytes=-16"})
    assert tail.status_code == 206 and tail.content == sealed[-16:]
    assert tail.headers["content-range"] == f"bytes {len(sealed) - 16}-{len(sealed) - 1}/{len(sealed)}"
    assert gw.client.get(f"/v1/blobs/{blob_id}", headers=key).content == sealed
