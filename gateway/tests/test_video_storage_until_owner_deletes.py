"""Stored videos stay until their owner deletes them, in both modes; unused uploads still expire; the owner's DELETE
removes a private job's sealed blobs and a standard job's content, respecting preservation holds; production refuses
local blob storage.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json
import time
import uuid

import pytest
from kuno_protocol import devkit
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    TEXT,
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway.blobstore_s3 import LocalBlobsInProduction
from kuno_gateway.db import NEVER_EXPIRES, Blob, Enclave, Job
from kuno_gateway.db_moderation import StandardJob, StandardUpload
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState

YEARS = 10 * 365 * 86400


@pytest.fixture(autouse=True)
def confidential_enclave(gw):
    """A confidential-tier worker serves both modes."""
    with gw.state.session() as s, s.begin():
        s.get(Enclave, ENCLAVE).tee = "mock"


def stored(gw, blob_id: str | None) -> bool:
    if blob_id is None:
        return False
    try:
        gw.state.blobs.get(blob_id)
    except KeyError:
        return False
    return True


def job_blobs(gw, job_id: str) -> list[Blob]:
    with gw.state.session() as s:
        return s.query(Blob).filter(Blob.job_id == job_id).all()


def test_the_retention_settings_are_gone(tmp_path):
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path), "KUNO_STANDARD_RETENTION_DAYS": "1", "KUNO_MODERATION_SAMPLE_RATE": "1"})
    for name in ("standard_retention_days", "standard_retention_s", "moderation_sample_rate", "blob_retention_s", "studio_token_ttl_s"):
        assert not hasattr(settings, name), name
    assert settings.upload_ttl_s == 86400 and settings.standard_upload_ttl_s == 86400


def test_job_blobs_and_standard_content_never_expire_even_far_in_the_future(gw, media):
    account_id, key = new_account(gw)
    standard = create_standard(gw, key, prompt="a lantern on a jetty", media=media.red)["job_id"]
    render(gw, standard, media.clip)
    private_id, _ = _private_job(gw, account_id, media.clip)
    with gw.state.session() as s, s.begin():
        # _private_job stores its output like a worker would before 0010; completing a job keeps it forever.
        for blob in s.query(Blob).filter(Blob.job_id == private_id):
            blob.expires_at = NEVER_EXPIRES
    with gw.state.session() as s, s.begin():
        row = s.get(StandardJob, standard)
        assert row.expires_at == NEVER_EXPIRES
        job = s.get(Job, standard)
        inputs = json.loads(job.input_blob_ids)
        # The gateway sealed the input and stored it with no expiry.
        assert len(inputs) == 1 and s.get(Blob, inputs[0]).expires_at == NEVER_EXPIRES
        # render() stands in for a worker and doesn't call /miner/v1/jobs/{id}/complete, which keeps the output forever.
        s.get(Blob, job.output_blob_id).expires_at = NEVER_EXPIRES

    far = time.time() + YEARS
    gw.state.janitor()
    from kuno_gateway.holds import sweep_blobs
    from kuno_gateway.standard_jobs import expire_unused_uploads

    with gw.state.session() as s, s.begin():
        sweep_blobs(gw.state, s, far)
        assert expire_unused_uploads(gw.state, s, far) == 0
    with gw.state.session() as s:
        row = s.get(StandardJob, standard)
        assert row.deleted_at is None and row.prompt == "a lantern on a jetty" and stored(gw, row.video_blob_id)
        assert s.query(StandardUpload).filter(StandardUpload.job_id == standard).count() == 1
    assert len(job_blobs(gw, standard)) == 2 and all(stored(gw, b.id) for b in job_blobs(gw, standard))
    assert len(job_blobs(gw, private_id)) == 1 and stored(gw, job_blobs(gw, private_id)[0].id)
    assert gw.client.get(f"/v1/standard/videos/{standard}/video", headers=key).content == media.clip


def test_unused_uploads_of_either_mode_still_expire(gw, media):
    _, key = new_account(gw)
    sealed = gw.client.post("/v1/blobs", content=b"KUNOB1" + b"\x00" * 64, headers=key)
    assert sealed.status_code == 201
    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).json()
    with gw.state.session() as s:
        blob = s.get(Blob, sealed.json()["blob_id"])
        assert blob.job_id is None and blob.expires_at == pytest.approx(time.time() + 86400, abs=60)
        upload_blob = s.get(StandardUpload, upload["upload_id"]).blob_id

    tomorrow = time.time() + 86400 + 60
    from kuno_gateway.holds import sweep_blobs
    from kuno_gateway.standard_jobs import expire_unused_uploads

    with gw.state.session() as s, s.begin():
        sweep_blobs(gw.state, s, tomorrow)
        assert expire_unused_uploads(gw.state, s, tomorrow) == 1
    with gw.state.session() as s:
        assert s.get(Blob, sealed.json()["blob_id"]) is None and s.get(StandardUpload, upload["upload_id"]) is None
    assert not stored(gw, sealed.json()["blob_id"]) and not stored(gw, upload_blob)


def test_a_private_blob_used_by_a_job_stops_expiring(gw):
    _, key = new_account(gw, source="admin")
    blob_id = gw.client.post("/v1/blobs", content=b"KUNOB1" + b"\x01" * 64, headers=key).json()["blob_id"]
    params = TEXT.model_copy(update={"mode": "image_to_video", "input_roles": ["first_frame"]})
    body = {"job_id": str(uuid.uuid4()), "params": params.model_dump(mode="json"), "enclave_id": ENCLAVE, "enc": "AAAA",
            "ciphertext": "AAAA", "input_blob_ids": [blob_id]}
    assert gw.client.post("/v1/videos", json=body, headers=key).status_code == 201, "private job"
    with gw.state.session() as s:
        assert s.get(Blob, blob_id).expires_at == NEVER_EXPIRES


def test_the_owner_deletes_a_private_video_and_nobody_else_can(gw, media):
    account_id, owner = new_account(gw)
    _, stranger = new_account(gw)
    job_id, _ = _private_job(gw, account_id, media.clip)
    [blob] = job_blobs(gw, job_id)

    assert gw.client.delete(f"/v1/videos/{job_id}", headers=stranger).status_code == 404
    assert stored(gw, blob.id)
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=owner).status_code == 204
    assert job_blobs(gw, job_id) == [] and not stored(gw, blob.id)
    assert gw.client.get(f"/v1/blobs/{blob.id}", headers=owner).status_code == 404
    # Billing and the receipt stay; deleting again is harmless.
    status = gw.client.get(f"/v1/videos/{job_id}", headers=owner).json()
    assert status["status"] == "succeeded" and status["price_usd"] > 0
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=owner).status_code == 204


def test_the_owner_deletes_a_standard_video_through_the_shared_route(gw, media):
    _, owner = new_account(gw)
    job_id = create_standard(gw, owner, media=media.red)["job_id"]
    render(gw, job_id, media.clip)
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=owner).status_code == 204
    gone = gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=owner)
    assert gone.status_code == 410 and gone.json()["detail"]["code"] == "deleted"
    with gw.state.session() as s:
        row = s.get(StandardJob, job_id)
        assert row.prompt is None and row.video_blob_id is None
        assert s.query(StandardUpload).filter(StandardUpload.job_id == job_id).count() == 0
        assert s.get(Job, job_id).price_usd > 0
    assert job_blobs(gw, job_id) == []


def test_deleting_a_video_in_progress_cancels_and_refunds_it(gw):
    account_id, owner = new_account(gw)
    job_id = create_standard(gw, owner)["job_id"]
    assert gw.client.delete(f"/v1/videos/{job_id}", headers=owner).status_code == 204
    status = gw.client.get(f"/v1/videos/{job_id}", headers=owner).json()
    assert status["status"] == "canceled"


def test_owner_deletion_under_a_hold_hides_but_keeps_both_modes(gw, media):
    account_id, owner = new_account(gw)
    private_id, _ = _private_job(gw, account_id, media.clip)
    standard_id = create_standard(gw, owner, prompt="a kite over dunes")["job_id"]
    render(gw, standard_id, media.clip)
    for job_id in (private_id, standard_id):
        placed = gw.client.post("/admin/v1/holds", json={"job_id": job_id, "reason": "legal_request", "note": "order 7"}, headers=gw.admin)
        assert placed.status_code == 201
        assert gw.client.delete(f"/v1/videos/{job_id}", headers=owner).status_code == 204

    [private_blob] = job_blobs(gw, private_id)
    assert stored(gw, private_blob.id) and private_blob.expires_at <= time.time()
    assert gw.client.get(f"/v1/blobs/{private_blob.id}", headers=owner).status_code == 404
    assert gw.client.get(f"/v1/standard/videos/{standard_id}/video", headers=owner).json()["detail"]["code"] == "deleted"
    with gw.state.session() as s:
        row = s.get(StandardJob, standard_id)
        assert row.prompt == "a kite over dunes" and stored(gw, row.video_blob_id)
    gw.state.janitor()
    assert stored(gw, private_blob.id)

    for hold in gw.client.get("/admin/v1/holds", headers=gw.admin).json():
        gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "order lapsed"}, headers=gw.admin)
    gw.state.janitor()
    assert not stored(gw, private_blob.id) and job_blobs(gw, private_id) == []
    with gw.state.session() as s:
        row = s.get(StandardJob, standard_id)
        assert row.prompt is None and row.video_blob_id is None


def test_production_refuses_the_local_blob_backend(tmp_path):
    data = tmp_path / "data"
    devkit.init(data)
    for env in ({"KUNO_ENV": "production"}, {"KUNO_ENV": "Production", "KUNO_BLOB_BACKEND": "local"}):
        settings = Settings.from_env({"KUNO_DATA_DIR": str(data), **env})
        assert settings.production
        with pytest.raises(LocalBlobsInProduction):
            GatewayState(settings)
    assert Settings.from_env({"KUNO_DATA_DIR": str(data), "KUNO_ATTESTATION": "production"}).production
    # Development keeps local storage.
    dev = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    assert not dev.production and GatewayState(dev).blobs.__class__.__name__ == "BlobStore"
