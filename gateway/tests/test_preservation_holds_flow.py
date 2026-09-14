"""Preservation holds: removal, owner deletion, retention and the blob sweep hide held content without destroying
it; blocked uploads and report keys are preserved; releasing or expiring a hold lets the normal paths delete.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import time

import pytest
from kuno_protocol.canonical import b64e
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import standard_jobs
from kuno_gateway.db import Blob, Enclave, Job
from kuno_gateway.db_holds import PreservationHold
from kuno_gateway.db_moderation import Report, StandardJob, StandardUpload
from kuno_gateway.settings import Settings

YEAR = 365 * 86400


@pytest.fixture(autouse=True)
def confidential_enclave(gw):
    """A confidential-tier worker serves both modes and needs no open-tier admission (admission.py), so these tests
    don't depend on validator probes."""
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


def holds(gw, status="all", **query) -> list[dict]:
    got = gw.client.get("/admin/v1/holds", params={"status": status, **query}, headers=gw.admin)
    assert got.status_code == 200, got.text
    return got.json()


def audit(gw, target_id: str | None = None) -> list[dict]:
    return gw.client.get("/admin/v1/audit-log", params={"target_id": target_id} if target_id else {}, headers=gw.admin).json()


def resolve(gw, report_id: str, action: str, note: str = "reviewed") -> dict:
    got = gw.client.post(f"/admin/v1/reports/{report_id}/resolve", json={"action": action, "note": note}, headers=gw.admin)
    assert got.status_code == 200, got.text
    return got.json()


def content_ids(gw, job_id: str) -> tuple[StandardJob, list[StandardUpload], list[Blob]]:
    with gw.state.session() as s:
        return (
            s.get(StandardJob, job_id),
            s.query(StandardUpload).filter(StandardUpload.job_id == job_id).all(),
            s.query(Blob).filter(Blob.job_id == job_id).all(),
        )


def test_the_default_hold_period_is_configurable(tmp_path):
    assert Settings.from_env({"KUNO_DATA_DIR": str(tmp_path)}).preservation_days == 365
    assert Settings.from_env({"KUNO_DATA_DIR": str(tmp_path), "KUNO_PRESERVATION_DAYS": "400"}).preservation_days == 400


def test_removing_reported_csam_holds_the_job_hides_it_and_deletes_only_after_release(gw, media):
    account_id, key = new_account(gw)
    job = create_standard(gw, key, prompt="a red square drifting", media=media.red)
    job_id = job["job_id"]
    render(gw, job_id, media.clip)
    report = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "csam"}).json()

    resolved = resolve(gw, report["report_id"], "remove_content", "apparent CSAM; reported per procedure")
    assert resolved["status"] == "resolved"

    # The report placed a provisional hold on arrival (created by the system); removal extended it to the full year.
    [hold] = holds(gw, "active")
    assert (hold["reason"], hold["job_id"], hold["report_id"], hold["account_id"], hold["created_by"]) == (
        "report_csam", job_id, report["report_id"], account_id, "system"
    )
    assert hold["expires_at"] == pytest.approx(time.time() + YEAR, abs=60)
    assert hold["preserved"] | {"sealed_blobs": None} == {"sealed_blobs": None, "video": True, "prompt": True, "uploads": 1, "hidden": True}
    assert hold["preserved"]["sealed_blobs"] == 2

    # Hidden from the owner and validators exactly as a removal without a hold.
    gone = gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=key)
    assert gone.status_code == 410 and gone.json()["detail"]["code"] == "removed"
    assert gw.client.get(f"/v1/standard/videos/{job_id}/thumbnail", headers=key).status_code == 410
    listed = gw.client.get("/v1/standard/videos", headers=key).json()[0]
    assert (listed["prompt"], listed["has_video"], listed["deleted"]) == (None, False, True)
    assert gw.client.get(f"/validator/v1/standard-jobs/{job_id}", headers=gw.validator).status_code == 410
    output_blob = gw.client.get(f"/v1/videos/{job_id}", headers=key).json()["output_blob_id"]
    assert gw.client.get(f"/v1/blobs/{output_blob}", headers=key).status_code == 404

    # ...but nothing is destroyed.
    row, uploads, blobs = content_ids(gw, job_id)
    assert row.prompt == "a red square drifting" and row.inputs and stored(gw, row.video_blob_id)
    assert len(uploads) == 1 and stored(gw, uploads[0].blob_id)
    assert len(blobs) == 2 and all(stored(gw, b.id) for b in blobs)

    # Operators can still review it through the item, and the view is logged.
    item = next(i for i in gw.client.get("/admin/v1/moderation/queue", params={"status": "resolved"}, headers=gw.admin).json()
                if i["report"] and i["report"]["report_id"] == report["report_id"])
    assert item["job"]["held"] is True and [h["hold_id"] for h in item["holds"]] == [hold["hold_id"]]
    view = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin)
    assert view.status_code == 200 and view.content == media.clip

    # Owner delete, retention and the janitor all leave held content alone.
    assert gw.client.delete(f"/v1/standard/videos/{job_id}", headers=key).status_code == 204
    with gw.state.session() as s, s.begin():
        s.get(StandardJob, job_id).expires_at = time.time() - 1
        for upload in s.query(StandardUpload).filter(StandardUpload.job_id == job_id):
            upload.expires_at = time.time() - 1
    standard_jobs.expire(gw.state)
    gw.state.janitor()
    row, uploads, blobs = content_ids(gw, job_id)
    assert row.delete_reason == "removed" and row.prompt and stored(gw, row.video_blob_id)
    assert len(uploads) == 1 and stored(gw, uploads[0].blob_id)
    assert len(blobs) == 2 and all(stored(gw, b.id) for b in blobs)

    released = gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "counsel: preservation ended"}, headers=gw.admin)
    assert released.status_code == 200 and released.json()["status"] == "released" and released.json()["released_by"] == "carol"
    assert gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "again"}, headers=gw.admin).status_code == 409
    assert holds(gw, "active") == [] and [h["hold_id"] for h in holds(gw, "released")] == [hold["hold_id"]]

    video_blob, upload_blob, sealed = row.video_blob_id, uploads[0].blob_id, [b.id for b in blobs]
    gw.state.janitor()
    row, uploads, blobs = content_ids(gw, job_id)
    assert (row.prompt, row.inputs, row.options, row.video_blob_id, row.delete_reason) == (None, None, None, None, "removed")
    assert uploads == [] and blobs == []
    assert not any(stored(gw, b) for b in (video_blob, upload_blob, *sealed))
    assert gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin).status_code == 410
    with gw.state.session() as s:
        assert s.get(Job, job_id).price_usd > 0

    actions = {(a["operator"], a["action"], a["target_id"]) for a in audit(gw)}
    # The report's provisional hold is created by the system on arrival; carol's removal extends it.
    assert {("system", "hold.create", hold["hold_id"]), ("carol", "hold.extend", hold["hold_id"]),
            ("carol", "report.remove_content", report["report_id"]),
            ("carol", "item.view_video", item["item_id"]), ("carol", "hold.release", hold["hold_id"])} <= actions
    created = next(a for a in audit(gw, hold["hold_id"]) if a["action"] == "hold.create")
    assert created["detail"]["automatic"] is True and created["detail"]["report_id"] == report["report_id"]
    removal = next(a for a in audit(gw, report["report_id"]))
    assert removal["detail"]["hold_id"] == hold["hold_id"] and removal["detail"]["preserved"] is True


def test_holds_on_live_content_survive_owner_deletion_retention_and_expire_on_schedule(gw, media):
    account_id, key = new_account(gw)
    deleted = create_standard(gw, key, prompt="first")["job_id"]
    retained = create_standard(gw, key, prompt="second")["job_id"]
    for job_id in (deleted, retained):
        render(gw, job_id, media.clip)
    stray = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).json()

    placed = [
        gw.client.post("/admin/v1/holds", json={"job_id": job_id, "reason": "legal_request", "days": 30, "note": "preservation letter 42"},
                       headers=gw.admin)
        for job_id in (deleted, retained)
    ] + [gw.client.post("/admin/v1/holds", json={"upload_id": stray["upload_id"], "reason": "operator", "note": "keep"}, headers=gw.admin)]
    assert [p.status_code for p in placed] == [201, 201, 201]
    assert placed[0].json()["expires_at"] == pytest.approx(time.time() + 30 * 86400, abs=60)
    assert placed[2].json()["account_id"] == account_id and placed[2].json()["preserved"] == {"upload": True}
    # Holding doesn't hide live content.
    assert gw.client.get(f"/v1/standard/videos/{retained}/video", headers=key).status_code == 200

    assert gw.client.delete(f"/v1/standard/videos/{deleted}", headers=key).status_code == 204
    assert gw.client.get(f"/v1/standard/videos/{deleted}/video", headers=key).json()["detail"]["code"] == "deleted"
    with gw.state.session() as s, s.begin():
        s.get(StandardJob, retained).expires_at = time.time() - 1
        s.get(StandardUpload, stray["upload_id"]).expires_at = time.time() - 1
        # Past the 7-day blob retention too: the sweep would normally delete these.
        for blob in s.query(Blob).filter(Blob.job_id.in_([deleted, retained])):
            blob.expires_at = time.time() - 1
    assert standard_jobs.expire(gw.state) == {"purged": 1, "uploads": 0}
    gw.state.janitor()
    assert gw.client.get(f"/v1/standard/videos/{retained}/video", headers=key).json()["detail"]["code"] == "expired"
    for job_id in (deleted, retained):
        # Text-to-video: the sealed output is the job's only sealed blob.
        row, _, blobs = content_ids(gw, job_id)
        assert row.prompt and stored(gw, row.video_blob_id) and len(blobs) == 1 and stored(gw, blobs[0].id)
    with gw.state.session() as s:
        assert stored(gw, s.get(StandardUpload, stray["upload_id"]).blob_id)

    # The holds reach their end: the janitor releases them as the system and the content follows normal deletion.
    with gw.state.session() as s, s.begin():
        for hold in s.query(PreservationHold):
            hold.expires_at = time.time() - 1
    assert holds(gw, "active") == []
    gw.state.janitor()
    assert {(h["status"], h["released_by"]) for h in holds(gw)} == {("released", "system")}
    for job_id in (deleted, retained):
        row, uploads, blobs = content_ids(gw, job_id)
        assert row.prompt is None and row.video_blob_id is None and uploads == [] and blobs == []
    assert standard_jobs.expire(gw.state)["uploads"] == 1
    expired = [a for a in audit(gw) if a["action"] == "hold.expire"]
    assert len(expired) == 3 and {a["operator"] for a in expired} == {"system"}


def test_hold_requests_are_validated_and_admin_only(gw):
    _, key = new_account(gw)
    job = create_standard(gw, key)
    post = lambda body, h=gw.admin: gw.client.post("/admin/v1/holds", json=body, headers=h)
    assert post({"reason": "operator", "note": "x"}).status_code == 422
    assert post({"job_id": job["job_id"], "upload_id": "a" * 32, "reason": "operator", "note": "x"}).status_code == 422
    assert post({"job_id": job["job_id"], "reason": "because", "note": "x"}).status_code == 422
    assert post({"job_id": job["job_id"], "reason": "operator", "note": ""}).status_code == 422
    assert post({"job_id": job["job_id"], "reason": "operator", "note": "x", "days": 0}).status_code == 422
    assert post({"job_id": "0" * 36, "reason": "operator", "note": "x"}).status_code == 404
    assert post({"upload_id": "b" * 32, "reason": "operator", "note": "x"}).status_code == 404
    assert post({"job_id": job["job_id"], "reason": "operator", "note": "x"}, key).status_code == 403
    assert gw.client.get("/admin/v1/holds", headers=key).status_code == 403
    assert gw.client.post(f"/admin/v1/holds/{'c' * 32}/release", json={"note": "x"}, headers=gw.admin).status_code == 404


def test_a_blocked_upload_is_stored_encrypted_under_a_hold_and_reviewable_only_by_operators(gw, media, caplog):
    account_id, key = new_account(gw)
    refused = gw.client.post("/v1/standard/uploads", params={"role": "reference_image"}, content=media.blue, headers=key)
    assert refused.status_code == 422
    assert refused.json()["detail"] == {"code": "upload_blocked", "message": "This file can't be used."}
    assert all(media.blue.hex()[:64] not in r.getMessage() for r in caplog.records)

    [hold] = holds(gw, "active")
    assert (hold["reason"], hold["account_id"], hold["created_by"], hold["job_id"]) == ("upload_match", account_id, "system", None)
    assert hold["preserved"] == {"upload": True}
    with gw.state.session() as s:
        assert s.query(StandardUpload).count() == 0
        blob_id = s.get(PreservationHold, hold["hold_id"]).blob_id
    at_rest = gw.state.blobs.get(blob_id)
    assert at_rest.startswith(b"KUNOB1") and media.blue not in at_rest and media.blue[16:64] not in at_rest

    item = next(i for i in gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json() if i["kind"] == "upload_match")
    assert (item["detail"]["upload_id"], item["detail"]["hold_id"]) == (hold["upload_id"], hold["hold_id"])
    assert [h["hold_id"] for h in item["holds"]] == [hold["hold_id"]]

    # The customer never gets the id, and even with it the file can't be used.
    used = gw.client.post(
        "/v1/standard/videos",
        json={"params": {"profile_id": "ltx-2.5-fast", "mode": "image_to_video", "duration_s": 2, "resolution": "720p",
                         "aspect_ratio": "16:9", "fps": 24, "input_roles": ["first_frame"]},
              "prompt": "x", "inputs": [{"upload_id": hold["upload_id"], "index": 0, "role": "first_frame"}]},
        headers=key,
    )
    assert used.status_code == 422 and used.json()["detail"]["code"] == "invalid_inputs"

    view = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin)
    assert view.status_code == 200 and view.content == media.blue and view.headers["content-type"] == "image/png"
    [logged] = [a for a in audit(gw, item["item_id"]) if a["action"] == "item.view_upload"]
    assert logged["operator"] == "carol" and logged["detail"]["access"] == "held_upload"
    assert [a["operator"] for a in audit(gw, hold["hold_id"]) if a["action"] == "hold.create"] == ["system"]

    # Retention and the janitor leave it; an operator hold on the same upload shares the stored copy.
    standard_jobs.expire(gw.state)
    gw.state.janitor()
    assert stored(gw, blob_id)
    second = gw.client.post("/admin/v1/holds", json={"upload_id": hold["upload_id"], "reason": "legal_request", "note": "LE request"},
                            headers=gw.admin)
    assert second.status_code == 201 and second.json()["preserved"] == {"upload": True}

    gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "done"}, headers=gw.admin)
    gw.state.janitor()
    assert stored(gw, blob_id)
    gw.client.post(f"/admin/v1/holds/{second.json()['hold_id']}/release", json={"note": "done"}, headers=gw.admin)
    gw.state.janitor()
    assert not stored(gw, blob_id)
    with gw.state.session() as s:
        assert {h.blob_id for h in s.query(PreservationHold)} == {None}
    assert gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin).status_code == 404


def test_a_held_private_job_keeps_its_ciphertext_and_the_reported_key_past_resolution(gw, media):
    account_id, owner = new_account(gw)
    job_id, key = _private_job(gw, account_id, media.clip)
    report = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "sexual_minor", "output_key": b64e(key)}).json()

    resolved = resolve(gw, report["report_id"], "remove_content")
    assert resolved["has_output_key"] is False
    [hold] = holds(gw, "active")
    assert (hold["reason"], hold["has_output_key"], hold["preserved"]) == ("report_sexual_minor", True, {"sealed_blobs": 1})
    with gw.state.session() as s:
        assert s.get(Report, report["report_id"]).output_key is None
        sealed_key = s.get(PreservationHold, hold["hold_id"]).output_key
        [blob] = s.query(Blob).filter(Blob.job_id == job_id).all()
    assert b64e(key) not in sealed_key
    assert gw.state.blobs.get(blob.id) and blob.expires_at <= time.time()
    # Hidden from its owner, as a removal without a hold.
    assert gw.client.get(f"/v1/blobs/{blob.id}", headers=owner).status_code == 404

    item = next(i for i in gw.client.get("/admin/v1/moderation/queue", params={"status": "resolved"}, headers=gw.admin).json()
                if i["job"] and i["job"]["job_id"] == job_id)
    assert item["job"]["held"] is True and item["job"]["has_video"] is True
    video = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin)
    assert video.status_code == 200 and video.content == media.clip
    assert audit(gw, item["item_id"])[0]["detail"]["access"] == "private_with_held_key"

    gw.state.janitor()
    assert stored(gw, blob.id)

    # A second hold takes over the key when the first is released.
    legal = gw.client.post("/admin/v1/holds", json={"job_id": job_id, "reason": "legal_request", "note": "court order"}, headers=gw.admin).json()
    assert legal["has_output_key"] is False
    gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "superseded"}, headers=gw.admin)
    gw.state.janitor()
    assert stored(gw, blob.id)
    assert [(h["hold_id"], h["has_output_key"]) for h in holds(gw, "active")] == [(legal["hold_id"], True)]
    assert gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin).status_code == 200

    last = gw.client.post(f"/admin/v1/holds/{legal['hold_id']}/release", json={"note": "order lapsed"}, headers=gw.admin)
    assert last.json()["has_output_key"] is False
    with gw.state.session() as s:
        assert {h.output_key for h in s.query(PreservationHold)} == {None}
    assert gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=gw.admin).status_code == 403
    gw.state.janitor()
    assert not stored(gw, blob.id)
    with gw.state.session() as s:
        assert s.query(Blob).filter(Blob.job_id == job_id).count() == 0
    released = [a for a in audit(gw) if a["action"] == "hold.release"]
    assert [a["detail"].get("output_key_moved_to") for a in reversed(released)] == [legal["hold_id"], None]
    assert released[0]["detail"]["output_key_deleted"] is True


def test_only_csam_and_sexual_minor_removals_and_bans_hold_automatically(gw, media):
    account_id, _ = new_account(gw)
    banned_job, _ = _private_job(gw, account_id, media.clip)
    dismissed_job, _ = _private_job(gw, account_id, media.clip)
    other_job, _ = _private_job(gw, account_id, media.clip)

    ban = gw.client.post("/v1/reports", json={"job_id": banned_job, "reason": "csam"}).json()
    resolve(gw, ban["report_id"], "ban_account")
    [hold] = holds(gw, "active")
    assert (hold["job_id"], hold["reason"]) == (banned_job, "report_csam")
    with gw.state.session() as s:
        # A ban doesn't remove anything: the blobs keep their normal expiry.
        assert s.query(Blob).filter(Blob.job_id == banned_job).one().expires_at > time.time()

    dismiss = gw.client.post("/v1/reports", json={"job_id": dismissed_job, "reason": "sexual_minor"}).json()
    resolve(gw, dismiss["report_id"], "dismiss")
    other = gw.client.post("/v1/reports", json={"job_id": other_job, "reason": "harassment"}).json()
    removal = resolve(gw, other["report_id"], "remove_content")
    assert removal["status"] == "resolved"
    # The dismissed csam-class report held its job on arrival (holds.provisional_hold_for_report); dismissal released it.
    assert [h["job_id"] for h in holds(gw, "active")] == [banned_job]
    assert [h["job_id"] for h in holds(gw, "released")] == [dismissed_job]
    with gw.state.session() as s:
        # Without a hold, removal deletes at once, as before.
        assert s.query(Blob).filter(Blob.job_id == other_job).count() == 0
        assert s.query(Blob).filter(Blob.job_id == dismissed_job).count() == 1
    detail = next(a for a in audit(gw, other["report_id"]))["detail"]
    assert detail["blobs_removed"] == 1 and detail["preserved"] is False and "hold_id" not in detail
