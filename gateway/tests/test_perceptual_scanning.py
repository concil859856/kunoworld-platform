"""Standard content scanning end to end (MODERATION.md, "Perceptual matching" and "Output scanning").

* Uploads that perceptually match a list are refused before storage.
* Finished videos that match are refused before they are kept: the job fails as `safety_blocked`, the video is held
  under `output_match`, and a strike and a queue item are recorded. Operators review it only under that hold.
* Scanning fails closed, and private content is never scanned."""

from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from types import SimpleNamespace

import pytest
from kuno_protocol.blobs import encrypt_blob
from kuno_protocol.canonical import sha256_hex
from kuno_protocol.schemas import JobState, output_label

from scan_helpers import ENCLAVE, MODERATOR, TEXT, create_standard, make_gateway, make_media, new_account, render

from kuno_gateway import perceptual, upload_scan
from kuno_gateway.db import Account, Blob, Job
from kuno_gateway.db_holds import PreservationHold
from kuno_gateway.db_moderation import ModerationItem, StandardJob, StandardUpload, Strike

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")

HASHING = SimpleNamespace(ffmpeg_path=None, perceptual_frame_interval_s=1.0, perceptual_max_frames=300, perceptual_timeout_s=60.0)
LIST_NAME = "test child-safety list"


@pytest.fixture(scope="module")
def media(tmp_path_factory):
    return make_media(tmp_path_factory.mktemp("scan-media"))


def pdq_of(data: bytes, mime: str) -> str:
    [frame] = perceptual.media_hashes(HASHING, data, mime)
    return frame.hash.hex


@pytest.fixture
def gw(tmp_path, media, monkeypatch):
    listed = tmp_path / "perceptual.txt"
    listed.write_text(
        "# <pdq hex> <category> <list name>\n"
        f"{'0f' * 32} ncii another list\n"
        f"{pdq_of(media.picture, 'image/png')} csam {LIST_NAME}\n"
    )
    blocked = tmp_path / "blocked.txt"
    blocked.write_text(f"{sha256_hex(media.red)} csam\n")
    gw = make_gateway(tmp_path, monkeypatch, blocked_hashes_file=blocked, perceptual_hash_files=[listed])
    gw.listed = listed
    return gw


def balance(gw, account_id: str) -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


def upload(gw, key, data: bytes, role: str = "first_frame"):
    return gw.client.post("/v1/standard/uploads", params={"role": role}, content=data, headers=key)


def test_an_upload_that_perceptually_matches_a_list_is_refused_held_and_counted(gw, media):
    account_id, key = new_account(gw)
    # A resized, recompressed copy of a listed picture: a different file, the same image to PDQ.
    assert sha256_hex(media.picture_jpeg) != sha256_hex(media.picture)
    refused = upload(gw, key, media.picture_jpeg)
    assert refused.status_code == 422 and refused.json()["detail"] == {"code": "upload_blocked", "message": "This file can't be used."}
    with gw.state.session() as s:
        assert s.query(StandardUpload).count() == 0
        item = s.query(ModerationItem).filter(ModerationItem.kind == "upload_match").one()
        detail = json.loads(item.detail)
        hold = s.query(PreservationHold).filter(PreservationHold.upload_id == detail["upload_id"]).one()
        strike = s.query(Strike).filter(Strike.account_id == account_id).one()
    assert (detail["matcher"], detail["match_kind"], detail["list"], detail["category"]) == ("pdq", "perceptual", LIST_NAME, "csam")
    assert detail["distance"] <= detail["threshold"] == 31 and detail["quality"] >= 50
    assert len(detail["list_version"]) == 16 and len(detail["pdq"]) == 64 and "frame_time_s" not in detail
    assert (hold.reason, hold.created_by, strike.reason) == ("upload_match", "system", "upload_blocked")

    # The exact list still runs first, and unrelated or undecodable files are treated as what they are.
    assert upload(gw, key, media.red).status_code == 422
    with gw.state.session() as s:
        newest = s.query(ModerationItem).filter(ModerationItem.kind == "upload_match").order_by(ModerationItem.created_at.desc()).first()
    assert json.loads(newest.detail)["match_kind"] == "exact"
    assert upload(gw, key, media.unrelated).status_code == 201
    broken = upload(gw, key, b"\x89PNG\r\n\x1a\n" + b"\0" * 256)
    assert broken.status_code == 422 and broken.json()["detail"]["code"] == "unsupported_media"

    # The queue shows the match (distance, list, category), never the file.
    queued = next(i for i in gw.client.get("/admin/v1/moderation/queue", headers=gw.moderator).json() if i["item_id"] == item.id)
    assert (queued["detail"]["distance"], queued["detail"]["list"], queued["content_access"]) == (detail["distance"], LIST_NAME,
                                                                                                "hold:upload_match")


def test_a_finished_video_that_matches_fails_as_safety_blocked_and_only_its_held_copy_remains(gw, media):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    job = create_standard(gw, key)
    render(gw, job["job_id"], media.clip)

    status = gw.client.get(f"/v1/videos/{job['job_id']}", headers=key).json()
    assert (status["status"], status["error_code"]) == ("failed", "safety_blocked")
    assert balance(gw, account_id) == before
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=key).json()["detail"]["code"] == "not_ready"
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        hold = s.query(PreservationHold).filter(PreservationHold.job_id == job["job_id"]).one()
        item = s.query(ModerationItem).filter(ModerationItem.kind == "output_match").one()
        strike = s.query(Strike).filter(Strike.account_id == account_id).one()
    assert row.video_blob_id is None and row.output_key is None
    assert (hold.reason, hold.created_by, hold.account_id) == ("output_match", "system", account_id) and hold.blob_id
    assert media.clip not in gw.state.blobs.get(hold.blob_id)
    detail = json.loads(item.detail)
    assert (item.job_id, detail["sha256"], detail["mime"], detail["hold_id"]) == (job["job_id"], sha256_hex(media.clip), "video/mp4", hold.id)
    assert (detail["match_kind"], detail["list"]) == ("perceptual", LIST_NAME) and detail["distance"] <= 31
    assert detail["frame_time_s"] in (0.0, 1.0)
    assert (strike.reason, strike.job_id) == ("safety_blocked", job["job_id"])

    # Operators: reviewable only under the hold, and every view is logged.
    queued = next(i for i in gw.client.get("/admin/v1/moderation/queue", headers=gw.moderator).json() if i["item_id"] == item.id)
    assert (queued["content_access"], queued["job"]["has_video"], queued["job"]["error_code"]) == ("hold:output_match", True, "safety_blocked")
    assert queued["holds"][0]["preserved"]["blocked_output"] is True
    viewed = gw.client.get(f"/admin/v1/moderation/items/{item.id}/video", headers=gw.moderator)
    assert viewed.status_code == 200 and viewed.content == media.clip and viewed.headers["content-type"] == "video/mp4"
    [entry] = [a for a in gw.client.get("/admin/v1/audit-log", params={"target_id": item.id}, headers=gw.admin).json()
               if a["action"] == "item.view_video"]
    assert (entry["operator"], entry["detail"]["access"], entry["detail"]["basis"]) == (MODERATOR, "held_output", "hold:output_match")

    # The owner deleting the job doesn't destroy the held copy; releasing the hold lets the janitor delete it.
    assert gw.client.delete(f"/v1/standard/videos/{job['job_id']}", headers=key).status_code == 204
    gw.state.janitor()
    assert gw.state.blobs.get(hold.blob_id)
    released = gw.client.post(f"/admin/v1/holds/{hold.id}/release", json={"note": "test over"}, headers=gw.admin)
    assert released.status_code == 200
    gw.state.janitor()
    with pytest.raises(KeyError):
        gw.state.blobs.get(hold.blob_id)
    with gw.state.session() as s:
        assert s.get(PreservationHold, hold.id).blob_id is None
    after = gw.client.get(f"/admin/v1/moderation/items/{item.id}/video", headers=gw.moderator)
    assert after.status_code == 403 and after.json()["detail"]["code"] == "content_not_reviewable"


def test_other_videos_are_kept_and_a_video_without_faststart_is_still_scanned(gw, media):
    _, key = new_account(gw)
    kept = create_standard(gw, key)
    render(gw, kept["job_id"], media.other_clip)
    assert gw.client.get(f"/v1/videos/{kept['job_id']}", headers=key).json()["status"] == "succeeded"
    assert gw.client.get(f"/v1/standard/videos/{kept['job_id']}/video", headers=key).content == media.other_clip
    slow = create_standard(gw, key)
    render(gw, slow["job_id"], media.clip_no_faststart)
    assert gw.client.get(f"/v1/videos/{slow['job_id']}", headers=key).json()["error_code"] == "safety_blocked"


def test_scanning_fails_closed(gw, media):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    job = create_standard(gw, key)
    gw.listed.unlink()
    render(gw, job["job_id"], media.other_clip)
    status = gw.client.get(f"/v1/videos/{job['job_id']}", headers=key).json()
    assert (status["status"], status["error_code"]) == ("failed", "scan_unavailable")
    assert balance(gw, account_id) == before
    with gw.state.session() as s:
        assert s.query(Strike).filter(Strike.account_id == account_id).count() == 0
        assert s.query(ModerationItem).count() == 0
        assert s.get(StandardJob, job["job_id"]).video_blob_id is None
    refused = upload(gw, key, media.unrelated)
    assert refused.status_code == 503 and refused.json()["detail"]["code"] == "scan_unavailable"

    # A membership programme enabled before an adapter exists refuses content rather than letting it through unchecked.
    enabled = SimpleNamespace(blocked_hashes_file=None, perceptual_hash_files=[], hash_sharing_programmes=["stopncii"])
    with pytest.raises(upload_scan.ScanUnavailable):
        upload_scan.build_scanner(enabled).scan(media.picture, sha256_hex(media.picture), "image/png")


def test_private_content_is_never_scanned(gw, media, monkeypatch):
    scanned: list[str] = []
    monkeypatch.setattr(upload_scan.UploadScanner, "scan", lambda self, data, sha256, mime: scanned.append(mime))
    account_id, key = new_account(gw)

    # A private upload is ciphertext the gateway can't open: stored as it is.
    blob = gw.client.post("/v1/blobs", content=encrypt_blob(os.urandom(32), "input/0", media.picture), headers=key)
    assert blob.status_code == 201
    # A private job finishing: its output is sealed to the customer's key, so nothing is decrypted or scanned.
    job_id, now = str(uuid.uuid4()), time.time()
    sealed = encrypt_blob(os.urandom(32), output_label(job_id), media.clip)
    with gw.state.session() as s, s.begin():
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        job = Job(
            id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id=ENCLAVE, params=TEXT.model_dump_json(), enc="x",
            ciphertext="y", input_blob_ids="[]", status=JobState.RUNNING.value, progress=1.0, price_usd=1.0, created_at=now,
            updated_at=now, started_at=now, output_blob_id=blob_id, content_digest=sha256_hex(media.clip), privacy="private",
        )
        s.add(job)
        s.flush()
        gw.state.finish_job(s, job, JobState.SUCCEEDED)
    assert gw.client.get(f"/v1/videos/{job_id}", headers=key).json()["status"] == "succeeded"
    assert scanned == []
    with gw.state.session() as s:
        assert s.query(ModerationItem).count() == 0 and s.query(Strike).count() == 0

    # A Standard job's output, by contrast, is scanned once as it finishes.
    standard = create_standard(gw, key)
    render(gw, standard["job_id"], media.other_clip)
    assert scanned == ["video/mp4"]
