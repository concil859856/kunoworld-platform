"""Standard jobs sealed by the gateway, upload scanning, reports (including a private video's key), the moderation
queue, operator actions, the audit log, retention and the validator feed, on a test app with a simulated worker."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e, canonical_json, sha256_hex
from kuno_protocol.crypto import (
    RecipientSession,
    generate_hpke_keypair,
    generate_signing_key,
    public_key_bytes,
)
from kuno_protocol.profiles import InputRole, Mode
from kuno_protocol.receipts import ReceiptBody, VideoInfo, sign_receipt
from kuno_protocol.schemas import (
    GenerationParams,
    JobState,
    SealedPayload,
    input_label,
    job_aad,
    output_label,
)

from kuno_gateway import identity, ledger, moderation, standard_jobs
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Blob, Enclave, Job
from kuno_gateway.db_moderation import (
    ModerationItem,
    Report,
    StandardJob,
    StandardUpload,
    Strike,
)
from kuno_gateway.settings import Settings
from kuno_gateway.upload_scan import Sha256ListMatcher

ENCLAVE = "s" * 32
TEXT = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
IMAGE = TEXT.model_copy(update={"mode": Mode.IMAGE_TO_VIDEO, "input_roles": [InputRole.FIRST_FRAME]})

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")


def _ffmpeg(*args: str, out) -> bytes:
    subprocess.run([shutil.which("ffmpeg"), "-hide_banner", "-loglevel", "error", "-y", *args, str(out)], check=True)
    return out.read_bytes()


@pytest.fixture(scope="module")
def media(tmp_path_factory):
    d = tmp_path_factory.mktemp("standard-media")
    return SimpleNamespace(
        clip=_ffmpeg("-f", "lavfi", "-i", "testsrc2=size=320x176:rate=24:duration=1", "-c:v", "libx264", "-preset", "ultrafast",
                     "-pix_fmt", "yuv420p", "-movflags", "+faststart", out=d / "clip.mp4"),
        red=_ffmpeg("-f", "lavfi", "-i", "color=red:s=64x36", "-frames:v", "1", out=d / "red.png"),
        blue=_ffmpeg("-f", "lavfi", "-i", "color=blue:s=64x36", "-frames:v", "1", out=d / "blue.png"),
    )


@pytest.fixture
def gw(tmp_path, media, monkeypatch):
    # These flows run standard jobs on an open-tier enclave; admission (admission.py) has its own tests.
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    settings.moderation_sample_rate = 1.0
    settings.blocked_hashes_file = data / "blocked_hashes.txt"
    settings.blocked_hashes_file.write_text(f"# known bad\n{sha256_hex(media.blue)} csam\n")
    app = create_app(settings)
    state = app.state.gw
    hpke_private, hpke_public = generate_hpke_keypair()
    signing = generate_signing_key()
    now = time.time()
    with state.session() as s, s.begin():
        # An open-tier miner: standard jobs may run anywhere.
        s.add(Enclave(
            id=ENCLAVE, miner_hotkey="5OpenMiner", tee="open", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key=b64e(hpke_public),
            signing_public_key=b64e(public_key_bytes(signing)), profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}",
            capacity=4, inflight=0, status="active", verified_at=now, last_seen=now,
        ))
    return SimpleNamespace(
        client=TestClient(app), state=state, settings=settings, env=env, hpke_private=hpke_private, signing=signing,
        dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
        validator={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"},
        admin={"authorization": f"Bearer {env['KUNO_ADMIN_TOKEN']}", "x-kuno-operator": "carol"},
    )


def new_account(gw, source: str = "admin") -> tuple[str, dict]:
    account_id = uuid.uuid4().hex
    with gw.state.session() as s, s.begin():
        s.add(Account(id=account_id, name="u@example.com", owner_user_id=uuid.uuid4().hex, balance_micros=0, is_validator=False,
                      created_at=time.time()))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "t")
        ledger.post(s, account_id, ledger.to_micros(50), kind=ledger.ADJUSTMENT, source=source, idempotency_key=f"{source}:{account_id}")
    return account_id, {"authorization": f"Bearer {key}"}


def render(gw, job_id: str, video: bytes, *, tamper: bool = False):
    """What a worker does: open the sealed request, render, seal the output to the job's output key, sign a receipt."""
    with gw.state.session() as s:
        job = s.get(Job, job_id)
    blob_ids = json.loads(job.input_blob_ids)
    params = GenerationParams.model_validate_json(job.params)
    session = RecipientSession(gw.hpke_private, b64d(job.enc))
    payload = SealedPayload.model_validate_json(session.open(b64d(job.ciphertext), job_aad(job_id, ENCLAVE, params, blob_ids)))
    inputs = [decrypt_blob(session.input_key, input_label(job_id, i), gw.state.blobs.get(b)) for i, b in enumerate(blob_ids)]
    sealed = encrypt_blob(session.output_key, output_label(job_id), video)
    now = time.time()
    body = ReceiptBody(
        job_id=job_id, enclave_id=ENCLAVE, profile_id=job.profile_id, image_digest=devkit.DEV_IMAGE_DIGEST,
        params_digest=sha256_hex(canonical_json(params.model_dump(mode="json"))), input_digest="0" * 64,
        output_digest=sha256_hex(sealed), output_bytes=len(sealed), content_digest=sha256_hex(b"forged" if tamper else video),
        attestation_digest="0" * 64, started_at=now, finished_at=now, gpu_seconds=1.0,
        video=VideoInfo(duration_s=1, width=320, height=176, fps=24, frames=24, audio=False),
    )
    receipt = sign_receipt(gw.signing, body)
    with gw.state.session() as s, s.begin():
        job = s.get(Job, job_id)
        job.status, job.started_at = JobState.RUNNING.value, now
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        job.output_blob_id, job.receipt, job.content_digest = blob_id, receipt.model_dump_json(), body.content_digest
        gw.state.finish_job(s, job, JobState.SUCCEEDED)
    return payload, inputs


def create_standard(gw, headers, prompt="a red square drifting", media=None, **extra) -> dict:
    inputs = []
    params = TEXT
    if media is not None:
        up = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media, headers=headers)
        assert up.status_code == 201, up.text
        inputs = [{"upload_id": up.json()["upload_id"], "index": 0, "role": "first_frame"}]
        params = IMAGE
    created = gw.client.post(
        "/v1/standard/videos", json={"params": params.model_dump(mode="json"), "prompt": prompt, "inputs": inputs, **extra}, headers=headers
    )
    assert created.status_code == 201, created.text
    return created.json()


def balance(gw, account_id: str) -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


# ------------------------------------------------------------------ standard jobs


def test_a_standard_job_is_sealed_as_a_client_would_seal_it_and_its_video_is_stored_encrypted(gw, media):
    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=gw.dev)
    assert upload.status_code == 201
    assert upload.json() | {"upload_id": None} == {"upload_id": None, "sha256": sha256_hex(media.red), "size": len(media.red), "mime": "image/png"}
    with gw.state.session() as s:
        stored = gw.state.blobs.get(s.get(StandardUpload, upload.json()["upload_id"]).blob_id)
    assert stored.startswith(b"KUNOB1") and media.red not in stored

    created = gw.client.post(
        "/v1/standard/videos",
        json={"params": IMAGE.model_dump(mode="json"), "prompt": "a red square drifting", "options": {"camera": "pan"},
              "inputs": [{"upload_id": upload.json()["upload_id"], "index": 0, "role": "first_frame"}]},
        headers=gw.dev,
    )
    assert created.status_code == 201, created.text
    job = created.json()
    assert (job["privacy"], job["status"], job["enclave_id"]) == ("standard", "queued", ENCLAVE)
    assert gw.client.get(f"/v1/videos/{job['job_id']}", headers=gw.dev).json()["privacy"] == "standard"
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=gw.dev).status_code == 404

    payload, inputs = render(gw, job["job_id"], media.clip)
    # The worker sees exactly what a client-sealed job carries, with an explicit seed.
    assert payload.prompt == "a red square drifting" and payload.options == {"camera": "pan"}
    assert isinstance(payload.seed, int) and inputs == [media.red]
    assert payload.inputs[0].sha256 == sha256_hex(media.red) and payload.inputs[0].mime == "image/png"

    status = gw.client.get(f"/v1/videos/{job['job_id']}", headers=gw.dev).json()
    assert status["status"] == "succeeded"
    video = gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=gw.dev)
    assert video.status_code == 200 and video.headers["content-type"] == "video/mp4" and video.content == media.clip
    thumb = gw.client.get(f"/v1/standard/videos/{job['job_id']}/thumbnail", headers=gw.dev)
    assert thumb.status_code == 200 and thumb.content.startswith(b"\xff\xd8")
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/thumbnail", headers=gw.dev).content == thumb.content
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        at_rest = [gw.state.blobs.get(row.video_blob_id), gw.state.blobs.get(row.thumbnail_blob_id)]
    assert row.output_key is None
    assert media.clip not in at_rest[0] and thumb.content not in at_rest[1]

    listed = gw.client.get("/v1/standard/videos", headers=gw.dev).json()
    assert [(v["job_id"], v["prompt"], v["has_video"], v["status"]) for v in listed] == [
        (job["job_id"], "a red square drifting", True, "succeeded")
    ]
    # Other accounts can't see it.
    _, other = new_account(gw)
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=other).status_code == 404

    feed = gw.client.get(f"/validator/v1/standard-jobs/{job['job_id']}", headers=gw.validator)
    assert feed.status_code == 200
    assert feed.json() | {"receipt": None, "seed": None} == {
        "job_id": job["job_id"], "privacy": "standard", "params": IMAGE.model_dump(mode="json"), "prompt": "a red square drifting",
        "negative_prompt": None, "seed": None, "options": {"camera": "pan"}, "receipt": None,
        "inputs": [{"index": 0, "role": "first_frame", "sha256": sha256_hex(media.red), "size": len(media.red), "mime": "image/png"}],
    }
    assert feed.json()["seed"] == payload.seed and feed.json()["receipt"]["body"]["job_id"] == job["job_id"]
    assert gw.client.get(f"/validator/v1/standard-jobs/{job['job_id']}", headers=gw.dev).status_code == 403

    assert gw.client.delete(f"/v1/standard/videos/{job['job_id']}", headers=gw.dev).status_code == 204
    gone = gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=gw.dev)
    assert gone.status_code == 410 and gone.json()["detail"]["code"] == "deleted"
    assert gw.client.get("/v1/standard/videos", headers=gw.dev).json()[0]["deleted"] is True
    assert gw.client.get(f"/validator/v1/standard-jobs/{job['job_id']}", headers=gw.validator).status_code == 410
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        assert row.prompt is None and row.inputs is None and row.video_blob_id is None
        assert s.query(Blob).filter(Blob.job_id == job["job_id"]).count() == 0
        assert s.query(StandardUpload).count() == 0
        assert s.get(Job, job["job_id"]).price_usd > 0  # the billing record stays


def test_a_private_job_is_not_in_the_validator_standard_feed(gw):
    body = {"job_id": str(uuid.uuid4()), "params": TEXT.model_dump(mode="json"), "enclave_id": ENCLAVE, "enc": "AAAA", "ciphertext": "AAAA"}
    with gw.state.session() as s, s.begin():
        s.get(Enclave, ENCLAVE).tee = "mock"
    assert gw.client.post("/v1/videos", json=body, headers=gw.dev).status_code == 201
    assert gw.client.get(f"/validator/v1/standard-jobs/{body['job_id']}", headers=gw.validator).status_code == 404
    assert gw.client.get(f"/validator/v1/standard-jobs/{uuid.uuid4()}", headers=gw.validator).status_code == 404


def test_an_output_that_does_not_match_its_receipt_fails_the_job_and_refunds_it(gw, media):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    job = create_standard(gw, key)
    assert balance(gw, account_id) < before
    render(gw, job["job_id"], media.clip, tamper=True)
    status = gw.client.get(f"/v1/videos/{job['job_id']}", headers=key).json()
    assert (status["status"], status["error_code"]) == ("failed", "bad_output")
    assert balance(gw, account_id) == before
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=key).json()["detail"]["code"] == "not_ready"


def test_standard_job_requests_are_validated_like_private_ones(gw, media):
    post = lambda body, h=gw.dev: gw.client.post("/v1/standard/videos", json=body, headers=h)
    base = {"params": TEXT.model_dump(mode="json"), "prompt": "a lake"}
    assert post({**base, "params": {**base["params"], "fps": 999}}).json()["detail"]["code"] == "invalid_params"
    assert post({**base, "params": IMAGE.model_dump(mode="json")}).json()["detail"]["code"] == "invalid_inputs"
    assert post({**base, "negative_prompt": "blur"}).json()["detail"]["code"] == "unsupported_option"
    assert post({**base, "prompt": "x" * 4001}).json()["detail"]["code"] == "prompt_too_long"
    # An upload belongs to one account and one job.
    _, other = new_account(gw)
    up = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=other).json()
    image = {"params": IMAGE.model_dump(mode="json"), "prompt": "a lake", "inputs": [{"upload_id": up["upload_id"], "index": 0, "role": "first_frame"}]}
    assert post(image).json()["detail"]["code"] == "invalid_inputs"
    assert post(image, other).status_code == 201
    assert post(image, other).json()["detail"]["code"] == "invalid_inputs"
    with gw.state.session() as s, s.begin():
        s.get(Enclave, ENCLAVE).status = "stale"
    assert post(base).json()["detail"]["code"] == "no_capacity"


def test_retention_deletes_standard_content_and_unused_uploads(gw, media):
    job = create_standard(gw, gw.dev)
    render(gw, job["job_id"], media.clip)
    stray = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=gw.dev).json()
    with gw.state.session() as s, s.begin():
        s.get(StandardJob, job["job_id"]).expires_at = time.time() - 1
        s.get(StandardUpload, stray["upload_id"]).expires_at = time.time() - 1
    assert standard_jobs.expire(gw.state) == {"purged": 1, "uploads": 1}
    expired = gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=gw.dev)
    assert expired.status_code == 410 and expired.json()["detail"]["code"] == "expired"
    with gw.state.session() as s:
        assert s.get(StandardUpload, stray["upload_id"]) is None


# ------------------------------------------------------------------ upload scanning


def test_a_blocked_upload_is_refused_queued_for_review_and_counted_as_a_strike(gw, media, caplog):
    account_id, key = new_account(gw)
    refused = gw.client.post("/v1/standard/uploads", params={"role": "reference_image"}, content=media.blue, headers=key)
    assert refused.status_code == 422
    assert refused.json()["detail"] == {"code": "upload_blocked", "message": "This file can't be used."}
    with gw.state.session() as s:
        assert s.query(StandardUpload).count() == 0
        item = s.query(ModerationItem).filter(ModerationItem.kind == "upload_match").one()
        strike = s.query(Strike).filter(Strike.account_id == account_id).one()
    detail = json.loads(item.detail)
    assert (item.account_id, detail["sha256"], detail["category"], detail["match_kind"]) == (account_id, sha256_hex(media.blue), "csam", "exact")
    assert strike.reason == "upload_blocked"
    assert gw.client.get("/v1/account/eligibility", headers=key).json()["strikes_24h"] == 1

    # The list is re-read when it changes.
    assert gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).status_code == 201
    time.sleep(0.01)
    with open(gw.settings.blocked_hashes_file, "a") as f:
        f.write(f"{sha256_hex(media.red)}\n")
    os.utime(gw.settings.blocked_hashes_file, (time.time() + 5, time.time() + 5))
    assert gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).status_code == 422

    # A file that isn't what its role needs never reaches the scanner, and an unreadable list refuses uploads.
    wrong = gw.client.post("/v1/standard/uploads", params={"role": "reference_audio"}, content=media.red, headers=key)
    assert wrong.json()["detail"]["code"] == "unsupported_media"
    gw.settings.blocked_hashes_file.unlink()
    assert gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).status_code == 503


def test_the_hash_list_ignores_comments_and_malformed_lines(tmp_path):
    path = tmp_path / "list.txt"
    good = "ab" * 32
    path.write_text(f"# header\n\n{good.upper()} ncii  # trailing\nnot-a-hash\n{'cd' * 31}\n")
    matcher = Sha256ListMatcher(path)
    assert len(matcher) == 1
    assert matcher.match(b"", good, "image/png").category == "ncii"
    assert matcher.match(b"", "cd" * 32, "image/png") is None


# ------------------------------------------------------------------ reports and review


def _private_job(gw, account_id: str, video: bytes) -> tuple[str, bytes]:
    job_id, key, now = str(uuid.uuid4()), os.urandom(32), time.time()
    sealed = encrypt_blob(key, output_label(job_id), video)
    with gw.state.session() as s, s.begin():
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        s.add(Job(
            id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id=ENCLAVE, params=TEXT.model_dump_json(), enc="x",
            ciphertext="y", input_blob_ids="[]", status=JobState.SUCCEEDED.value, progress=1.0, price_usd=1.0, created_at=now,
            updated_at=now, finished_at=now, output_blob_id=blob_id, content_digest=sha256_hex(video), privacy="private",
        ))
    return job_id, key


def test_a_report_with_a_private_videos_key_lets_operators_review_that_one_video(gw, media):
    account_id, _ = new_account(gw)
    job_id, key = _private_job(gw, account_id, media.clip)
    other_job, _ = _private_job(gw, account_id, media.clip)

    low = gw.client.post("/v1/reports", json={"content_digest": "a" * 64, "reason": "copyright", "details": "my film"})
    # Not csam/sexual_minor: those place a preservation hold on removal (test_preservation_holds_flow.py).
    keyed = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "nonconsensual_intimate", "output_key": b64e(key)})
    keyless = gw.client.post("/v1/reports", json={"job_id": other_job, "reason": "harassment"})
    wrong = gw.client.post("/v1/reports", json={"job_id": other_job, "reason": "other", "output_key": b64e(os.urandom(32))})
    assert [r.status_code for r in (low, keyed, keyless, wrong)] == [202, 202, 202, 202]

    reports = gw.client.get("/admin/v1/reports", headers=gw.admin)
    assert b64e(key) not in reports.text
    first = reports.json()[0]
    assert first["reason"] == "nonconsensual_intimate"
    assert (first["job_id"], first["account_id"], first["has_output_key"]) == (job_id, account_id, True)
    with gw.state.session() as s:
        assert b64e(key) not in s.get(Report, keyed.json()["report_id"]).output_key

    queue = gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json()
    items = {i["report"]["report_id"]: i for i in queue if i["report"]}
    keyed_item = items[keyed.json()["report_id"]]
    assert queue[0]["item_id"] == keyed_item["item_id"] and keyed_item["job"]["has_video"] is True
    assert keyed_item["job"]["privacy"] == "private" and keyed_item["job"]["prompt"] is None

    video = gw.client.get(f"/admin/v1/moderation/items/{keyed_item['item_id']}/video", headers=gw.admin)
    assert video.status_code == 200 and video.content == media.clip
    blind = gw.client.get(f"/admin/v1/moderation/items/{items[keyless.json()['report_id']]['item_id']}/video", headers=gw.admin)
    assert blind.status_code == 403 and blind.json()["detail"]["code"] == "private_content"
    mismatch = gw.client.get(f"/admin/v1/moderation/items/{items[wrong.json()['report_id']]['item_id']}/video", headers=gw.admin)
    assert mismatch.status_code == 422 and mismatch.json()["detail"]["code"] == "key_mismatch"

    resolved = gw.client.post(
        f"/admin/v1/reports/{keyed.json()['report_id']}/resolve", json={"action": "remove_content", "note": "confirmed; reported to NCMEC"},
        headers=gw.admin,
    )
    assert resolved.status_code == 200 and resolved.json()["status"] == "resolved" and resolved.json()["has_output_key"] is False
    with gw.state.session() as s:
        assert s.get(Report, keyed.json()["report_id"]).output_key is None
        assert s.query(Blob).filter(Blob.job_id == job_id).count() == 0
    assert gw.client.get(f"/admin/v1/moderation/items/{keyed_item['item_id']}/video", headers=gw.admin).status_code == 403
    again = gw.client.post(f"/admin/v1/reports/{keyed.json()['report_id']}/resolve", json={"action": "dismiss", "note": "x"}, headers=gw.admin)
    assert again.status_code == 409

    log = gw.client.get("/admin/v1/audit-log", headers=gw.admin).json()
    assert [(a["operator"], a["action"]) for a in log[:2]] == [("carol", "report.remove_content"), ("carol", "item.view_video")]
    assert log[0]["reason"] == "confirmed; reported to NCMEC"


def test_reports_are_validated_and_rate_limited_per_ip(gw):
    gw.settings.reports_per_hour_per_ip = 3
    # Schema failures are refused before the handler runs, so they don't count toward the limit.
    assert gw.client.post("/v1/reports", json={"reason": "other"}).status_code == 422
    assert gw.client.post("/v1/reports", json={"url": "https://x.example/v", "reason": "spam"}).status_code == 422
    # A malformed key is refused after the limiter has counted it: abuse attempts use up the allowance too.
    short = gw.client.post("/v1/reports", json={"url": "https://x.example/v", "reason": "other", "output_key": b64e(b"k" * 8)})
    assert short.json()["detail"]["code"] == "invalid_output_key"
    codes = [gw.client.post("/v1/reports", json={"url": "https://x.example/v", "reason": "other"}).status_code for _ in range(3)]
    assert codes == [202, 202, 429]


def test_operators_act_on_standard_videos_from_reports_and_samples(gw, media):
    account_id, key = new_account(gw)
    job = create_standard(gw, key, prompt="a quiet harbour")
    render(gw, job["job_id"], media.clip)
    digest = gw.client.get(f"/v1/videos/{job['job_id']}", headers=key).json()["receipt"]["body"]["content_digest"]

    queue = gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json()
    sample = next(i for i in queue if i["kind"] == "sample")
    assert sample["job"]["prompt"] == "a quiet harbour" and sample["job"]["has_video"] is True
    assert gw.client.get(f"/admin/v1/moderation/items/{sample['item_id']}/video", headers=gw.admin).content == media.clip

    report = gw.client.post("/v1/reports", json={"content_digest": digest.upper(), "reason": "harassment"}).json()
    restricted = gw.client.post(f"/admin/v1/reports/{report['report_id']}/resolve",
                                json={"action": "restrict_account", "note": "targeted harassment"}, headers=gw.admin)
    assert restricted.status_code == 200 and restricted.json()["account_id"] == account_id
    until = gw.client.get("/v1/account/eligibility", headers=key).json()["restricted_until"]
    assert until == pytest.approx(time.time() + 7 * 86400, abs=60)

    banned = gw.client.post("/v1/reports", json={"job_id": job["job_id"], "reason": "violent_extremism"}).json()
    gw.client.post(f"/admin/v1/reports/{banned['report_id']}/resolve", json={"action": "ban_account", "note": "repeat"}, headers=gw.admin)
    assert gw.client.get("/v1/account/eligibility", headers=key).json()["restricted_until"] == moderation.INDEFINITE_UNTIL
    assert gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": "x"}, headers=key).status_code == 403

    removed = gw.client.post(f"/admin/v1/moderation/items/{sample['item_id']}/resolve",
                             json={"action": "remove_content", "note": "violates policy"}, headers=gw.admin)
    assert removed.status_code == 200 and removed.json()["status"] == "resolved"
    gone = gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=key)
    assert gone.status_code == 410 and gone.json()["detail"]["code"] == "removed"
    assert gw.client.get(f"/admin/v1/moderation/items/{sample['item_id']}/video", headers=gw.admin).status_code == 410

    dismissed = gw.client.post("/v1/reports", json={"url": "https://elsewhere.example/v", "reason": "other"}).json()
    ok = gw.client.post(f"/admin/v1/reports/{dismissed['report_id']}/resolve", json={"action": "dismiss", "note": "not ours"}, headers=gw.admin)
    assert ok.status_code == 200
    no_target = gw.client.post("/v1/reports", json={"url": "https://elsewhere.example/w", "reason": "other"}).json()
    assert gw.client.post(f"/admin/v1/reports/{no_target['report_id']}/resolve", json={"action": "remove_content", "note": "x"},
                          headers=gw.admin).status_code == 422
    assert gw.client.get("/admin/v1/reports", headers={"authorization": key["authorization"]}).status_code == 403

    actions = [a["action"] for a in gw.client.get("/admin/v1/audit-log", headers=gw.admin).json()]
    assert actions == ["report.dismiss", "item.remove_content", "report.ban_account", "report.restrict_account", "item.view_video"]
    assert gw.client.get(f"/admin/v1/accounts/{account_id}/safety", headers=gw.admin).json()["restrictions"][0]["kind"] == "ban"
