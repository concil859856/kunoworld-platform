"""CyberTipline reports end to end: drafts prepared from items under child-safety holds, admin confirmation, dry runs,
and submission to a fake NCMEC server (success, errors, and resuming a failed submission without duplicating it)."""

from __future__ import annotations

import hashlib
import os
import shutil
import time
import uuid
import xml.etree.ElementTree as ET

import pytest
from kuno_protocol.blobs import encrypt_blob
from kuno_protocol.canonical import b64e, sha256_hex
from kuno_protocol.schemas import JobState, output_label

from scan_helpers import (
    ADMIN, ENCLAVE, MODERATOR, TEXT, FakeNcmec, create_standard, make_gateway, make_media, new_account, render, use_fake_ncmec,
)

from kuno_gateway import cybertip
from kuno_gateway.db import Blob, Job
from kuno_gateway.db_cybertip import CybertipReport
from kuno_gateway.db_holds import PreservationHold
from kuno_gateway.db_moderation import ModerationItem

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="needs ffmpeg")

API = "/admin/v1/cybertip"
YEAR = 365 * 86400


@pytest.fixture(scope="module")
def media(tmp_path_factory):
    return make_media(tmp_path_factory.mktemp("cybertip-media"))


@pytest.fixture
def gw(tmp_path, media, monkeypatch):
    blocked = tmp_path / "blocked.txt"
    blocked.write_text(f"{sha256_hex(media.red)} csam\n{sha256_hex(media.unrelated)} ncii\n{sha256_hex(media.clip)} csam\n")
    return make_gateway(tmp_path, monkeypatch, blocked_hashes_file=blocked)


def latest_item(gw, kind: str) -> ModerationItem:
    with gw.state.session() as s:
        return s.query(ModerationItem).filter(ModerationItem.kind == kind).order_by(ModerationItem.created_at.desc()).first()


def blocked_upload(gw, key, data: bytes) -> str:
    """Refuses one upload and returns its queue item. Every refusal is a strike, so tests that need several use fresh
    accounts (`key=None`) rather than restrict one."""
    key = key or new_account(gw)[1]
    refused = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=data, headers=key)
    assert refused.status_code == 422 and refused.json()["detail"]["code"] == "upload_blocked"
    return latest_item(gw, "upload_match").id


def prepare(gw, item_id: str, **extra):
    return gw.client.post(f"{API}/reports", json={"item_id": item_id, **extra}, headers=gw.moderator)


def submit(gw, report_id: str, headers=None):
    return gw.client.post(f"{API}/reports/{report_id}/submit", json={"confirm": True, "note": "reviewed the draft"},
                          headers=headers or gw.admin)


def private_job(gw, account_id: str, video: bytes) -> tuple[str, bytes]:
    job_id, key, now = str(uuid.uuid4()), os.urandom(32), time.time()
    sealed = encrypt_blob(key, output_label(job_id), video)
    with gw.state.session() as s, s.begin():
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        s.add(Job(
            id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id=ENCLAVE, params=TEXT.model_dump_json(), enc="x",
            ciphertext="y", input_blob_ids="[]", status=JobState.SUCCEEDED.value, progress=1.0, price_usd=1.0, created_at=now - 60,
            updated_at=now, finished_at=now - 30, output_blob_id=blob_id, content_digest=sha256_hex(video), privacy="private",
        ))
    return job_id, key


def audit(gw, target_id: str) -> list[tuple[str, str]]:
    return [(a["operator"], a["action"]) for a in gw.client.get("/admin/v1/audit-log", params={"target_id": target_id}, headers=gw.admin).json()]


# ------------------------------------------------------------------ drafts and confirmation


def test_a_moderator_prepares_a_draft_and_only_an_admin_confirms_it(gw, media):
    account_id, key = new_account(gw, "suspect@example.com")
    item_id = blocked_upload(gw, key, media.red)

    status = gw.client.get(f"{API}/items/{item_id}", headers=gw.moderator).json()
    assert (status["eligible"], status["hold_reason"], status["reports"]) == (True, "upload_match", [])
    # A match from a list of another category, and a report of another reason, aren't child-safety holds.
    ncii_item = blocked_upload(gw, key, media.unrelated)
    assert gw.client.get(f"{API}/items/{ncii_item}", headers=gw.moderator).json()["eligible"] is False
    assert prepare(gw, ncii_item).json()["detail"]["code"] == "not_under_child_safety_hold"
    gw.client.post("/v1/reports", json={"url": "https://elsewhere.example/v", "reason": "harassment"})
    assert prepare(gw, latest_item(gw, "report").id).status_code == 409

    draft = prepare(gw, item_id)
    assert draft.status_code == 201, draft.text
    body = draft.json()
    assert (body["status"], body["item_id"], body["account_id"], body["created_by"]) == ("draft", item_id, account_id, MODERATOR)
    assert body["incident_type"] == "Child Pornography (possession, manufacture, and distribution)"
    assert body["draft"]["reported"] == {"esp_identifier": account_id, "email": "suspect@example.com",
                                         "esp_service": "KunoWorld video generation, Standard mode"}
    assert any("exact SHA-256 match" in line for line in body["draft"]["summary"])
    [f] = body["files"]
    assert (f["source"], f["sha256"], f["mime"], f["size"], f["ncmec_file_id"]) == ("held_upload", sha256_hex(media.red), "image/png",
                                                                                   len(media.red), None)
    assert body["reporter"]["first_name"] == "[POINT OF CONTACT]" and body["report_xml"] is None
    again = prepare(gw, item_id)
    assert again.status_code == 409 and again.json()["detail"] == {
        "code": "report_exists", "message": "This item already has a CyberTipline report.", "report_id": body["report_id"]}

    report_id = body["report_id"]
    assert gw.client.get(f"{API}/reports/{report_id}", headers=key).status_code == 403
    assert submit(gw, report_id, gw.moderator).status_code == 403
    for unconfirmed in ({"note": "x"}, {"confirm": False, "note": "x"}, {"confirm": True}):
        assert gw.client.post(f"{API}/reports/{report_id}/submit", json=unconfirmed, headers=gw.admin).status_code == 422

    checked = gw.client.post(f"{API}/reports/{report_id}/dry-run", headers=gw.moderator)
    assert checked.status_code == 200, checked.text
    xml = checked.json()["report_xml"]
    root = ET.fromstring(xml)
    assert [c.tag for c in root] == ["incidentSummary", "reporter", "personOrUserReported", "additionalInfo"]
    assert root.findtext("incidentSummary/incidentType") == body["incident_type"]
    assert root.findtext("personOrUserReported/espIdentifier") == account_id
    assert root.findtext("personOrUserReported/personOrUserReportedPerson/email") == "suspect@example.com"
    assert root.findtext("additionalInfo").startswith("Reporting entity: [REPORTING ENTITY].")
    # Metadata only: the draft never carries file contents, and production would refuse the placeholders.
    assert b64e(media.red) not in xml
    assert any("placeholder" in e for e in cybertip.validate_report_xml(xml.encode(), production=True))

    confirmed = submit(gw, report_id)
    assert confirmed.status_code == 200, confirmed.text
    out = confirmed.json()
    assert (out["status"], out["confirmed_by"], out["environment"], out["attempts"], out["ncmec_report_id"]) == ("dry_run", ADMIN, None, 0, None)
    assert audit(gw, report_id) == [(ADMIN, "cybertip.submit"), (MODERATOR, "cybertip.dry_run"), (MODERATOR, "cybertip.prepare")]
    config = gw.client.get(f"{API}/config", headers=gw.moderator).json()
    assert (config["environment"], config["submissions_enabled"], config["credentials_configured"]) == ("disabled", False, False)
    assert {"reporting_entity", "first_name", "email"} <= set(config["reporter_placeholders"])
    listed = gw.client.get(f"{API}/reports", params={"status": "dry_run"}, headers=gw.moderator).json()
    assert [r["report_id"] for r in listed] == [report_id] and listed[0]["report_xml"] is None


# ------------------------------------------------------------------ submitting


def test_submitting_uploads_the_held_file_describes_it_finishes_the_report_and_extends_the_hold(gw, media):
    account_id, key = new_account(gw)
    item_id = blocked_upload(gw, key, media.red)
    report_id = prepare(gw, item_id).json()["report_id"]
    with FakeNcmec() as fake:
        use_fake_ncmec(gw, fake)
        done = submit(gw, report_id)
        assert done.status_code == 200, done.text
        out = done.json()
        assert (out["status"], out["environment"], out["attempts"], out["last_error_code"]) == ("submitted", "test", 1, None)
        ncmec_id = out["ncmec_report_id"]
        assert [name for name, _ in fake.calls] == ["submit", "upload", "fileinfo", "finish"]
        report = fake.reports[ncmec_id]
        assert report["finished"] and ET.fromstring(report["xml"]).tag == "report"
        [(file_id, stored)] = report["files"].items()
        assert stored["data"] == media.red and stored["name"].endswith(".png")
        details = ET.fromstring(stored["details"])
        assert (details.findtext("reportId"), details.findtext("fileId")) == (ncmec_id, file_id)
        assert [c.tag for c in details] == ["reportId", "fileId", "originalFileName", "uploadedToEspTimestamp", "fileViewedByEsp",
                                           "exifViewedByEsp", "publiclyAvailable", "fileRelevance", "originalFileHash", "additionalInfo"]
        assert details.findtext("fileViewedByEsp") == "false" and details.find("fileAnnotations") is None
        assert details.find("originalFileHash").get("hashType") == "MD5"
        assert details.findtext("originalFileHash") == hashlib.md5(media.red).hexdigest() == out["files"][0]["md5"]
        assert out["files"][0]["ncmec_file_id"] == file_id

        with gw.state.session() as s:
            hold = s.get(PreservationHold, out["hold_id"])
        assert hold.expires_at >= time.time() + YEAR - 60
        actions = [a for _, a in audit(gw, report_id)]
        assert actions[::-1] == ["cybertip.prepare", "cybertip.submit", "cybertip.ncmec_report_opened", "cybertip.file_uploaded",
                                 "cybertip.file_details_sent", "cybertip.submitted"]
        assert "hold.extend" in [a for _, a in audit(gw, hold.id)]

        assert submit(gw, report_id).json()["detail"]["code"] == "already_submitted"
        assert gw.client.post(f"{API}/reports/{report_id}/cancel", json={"note": "x"}, headers=gw.admin).status_code == 409
        # The credentials never leave the gateway.
        for path in (f"{API}/config", f"{API}/reports/{report_id}", f"{API}/items/{item_id}"):
            assert FakeNcmec.PASSWORD not in gw.client.get(path, headers=gw.admin).text
        assert gw.client.get(f"{API}/config", headers=gw.admin).json()["credentials_configured"] is True


def test_a_failed_submission_resumes_where_it_stopped_without_opening_a_second_report(gw, media):
    key = None  # a fresh account for each refusal: every refusal is a strike, and three restrict an account
    with FakeNcmec() as fake:
        use_fake_ncmec(gw, fake)

        # The upload fails: the report NCMEC opened is kept, and the retry doesn't open another.
        first = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        fake.fail["upload"] = [1111]
        failed = submit(gw, first)
        assert failed.status_code == 502 and failed.json()["detail"]["code"] == "ncmec_error"
        assert failed.json()["detail"]["retryable"] is True
        row = gw.client.get(f"{API}/reports/{first}", headers=gw.admin).json()
        assert (row["status"], row["last_error_code"], row["attempts"]) == ("failed", "ncmec_1111", 1)
        assert row["ncmec_report_id"] and row["files"][0]["ncmec_file_id"] is None
        retried = submit(gw, first).json()
        assert (retried["status"], retried["attempts"], retried["ncmec_report_id"]) == ("submitted", 2, row["ncmec_report_id"])
        assert (fake.count("submit"), fake.count("upload"), fake.count("finish")) == (1, 2, 1)

        # The connection drops on the file details: the uploaded file isn't uploaded twice.
        second = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        fake.fail["fileinfo"] = ["drop"]
        assert submit(gw, second).status_code == 502
        row = gw.client.get(f"{API}/reports/{second}", headers=gw.admin).json()
        assert row["last_error_code"] == "network" and row["files"][0]["ncmec_file_id"] and row["files"][0]["details_sent_at"] is None
        assert submit(gw, second).json()["status"] == "submitted"
        assert len(fake.reports[row["ncmec_report_id"]]["files"]) == 1

        # NCMEC finished the report but the answer was lost: "already finished" completes it.
        third = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        fake.fail["finish"] = [1000]
        assert submit(gw, third).status_code == 502
        ncmec_id = gw.client.get(f"{API}/reports/{third}", headers=gw.admin).json()["ncmec_report_id"]
        fake.reports[ncmec_id]["finished"] = True
        assert submit(gw, third).json()["status"] == "submitted"

        # NCMEC deleted the unfinished report (after a day): the next attempt starts a new one.
        fourth = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        fake.fail["upload"] = [cybertip.REPORT_DOES_NOT_EXIST]
        assert submit(gw, fourth).status_code == 502
        row = gw.client.get(f"{API}/reports/{fourth}", headers=gw.admin).json()
        assert (row["last_error_code"], row["ncmec_report_id"]) == ("ncmec_5001", None)
        submits = fake.count("submit")
        final = submit(gw, fourth).json()
        assert final["status"] == "submitted" and fake.count("submit") == submits + 1

        # Wrong credentials are an error, not a success.
        fifth = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        gw.settings.cybertip_password = "wrong"
        refused = submit(gw, fifth)
        assert refused.status_code == 502 and "credentials" in refused.json()["detail"]["message"]
        assert gw.client.get(f"{API}/reports/{fifth}", headers=gw.admin).json()["status"] == "failed"


def test_production_refuses_placeholders_and_nothing_is_sent_without_credentials(gw, media):
    _, key = new_account(gw)
    report_id = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
    with FakeNcmec() as fake:
        use_fake_ncmec(gw, fake, env="production")
        refused = submit(gw, report_id)
        assert refused.status_code == 422 and refused.json()["detail"]["code"] == "invalid_report"
        assert any("placeholder" in e for e in refused.json()["detail"]["errors"])
        gw.settings.cybertip_env = "test"
        gw.settings.cybertip_password = None
        missing = submit(gw, report_id)
        assert missing.status_code == 503 and missing.json()["detail"]["code"] == "cybertip_not_configured"
        gw.settings.cybertip_env = "staging"
        assert submit(gw, report_id).json()["detail"]["code"] == "cybertip_misconfigured"
        assert fake.calls == []
    # The test host override is ignored in production: submissions only ever go to NCMEC's own host there.
    assert cybertip.base_url(gw.settings, "production") == "https://report.cybertip.org/ispws"
    assert cybertip.base_url(gw.settings, "test") == fake.base_url


def test_refused_outputs_and_private_videos_attach_only_what_the_gateway_may_send(gw, media):
    account_id, key = new_account(gw)
    with FakeNcmec() as fake:
        use_fake_ncmec(gw, fake)

        # A Standard video refused by output scanning: the held video, marked as AI-generated.
        job = create_standard(gw, key)
        render(gw, job["job_id"], media.clip)
        item = latest_item(gw, "output_match")
        assert item.job_id == job["job_id"]
        draft = prepare(gw, item.id).json()
        assert [(f["source"], f["sha256"]) for f in draft["files"]] == [("held_output", sha256_hex(media.clip))]
        assert draft["draft"]["context"]["hold_reason"] == "output_match"
        done = submit(gw, draft["report_id"]).json()
        assert done["status"] == "submitted"
        [stored] = fake.reports[done["ncmec_report_id"]]["files"].values()
        assert stored["data"] == media.clip
        details = ET.fromstring(stored["details"])
        assert [a.tag for a in details.find("fileAnnotations")] == ["generativeAi"]

        # A private video reported with its key: attached, decrypted with that key, and marked viewed once an operator opened it.
        private, video_key = private_job(gw, account_id, media.other_clip)
        gw.client.post("/v1/reports", json={"job_id": private, "reason": "csam", "output_key": b64e(video_key)})
        keyed_item = latest_item(gw, "report")
        keyed = prepare(gw, keyed_item.id).json()
        assert [(f["source"], f["sha256"]) for f in keyed["files"]] == [("private_video", sha256_hex(media.other_clip))]
        assert keyed["draft"]["reported"]["esp_service"] == "KunoWorld video generation, Private mode"
        assert gw.client.get(f"/admin/v1/moderation/items/{keyed_item.id}/video", headers=gw.moderator).status_code == 200
        sent = submit(gw, keyed["report_id"]).json()
        [stored] = fake.reports[sent["ncmec_report_id"]]["files"].values()
        assert stored["data"] == media.other_clip
        assert ET.fromstring(stored["details"]).findtext("fileViewedByEsp") == "true"

        # A private video reported without a key: nothing to attach, and the report says why.
        keyless, _ = private_job(gw, account_id, media.other_clip)
        gw.client.post("/v1/reports", json={"job_id": keyless, "reason": "sexual_minor"})
        bare = prepare(gw, latest_item(gw, "report").id).json()
        assert bare["files"] == []
        assert any("no key to it was supplied" in line for line in bare["draft"]["summary"])
        uploads = fake.count("upload")
        assert submit(gw, bare["report_id"]).json()["status"] == "submitted"
        assert fake.count("upload") == uploads


def test_canceling_retracts_a_report_ncmec_opened_but_never_finished(gw, media):
    _, key = new_account(gw)
    with FakeNcmec() as fake:
        use_fake_ncmec(gw, fake)
        report_id = prepare(gw, blocked_upload(gw, key, media.red)).json()["report_id"]
        fake.fail["upload"] = [1000]
        assert submit(gw, report_id).status_code == 502
        ncmec_id = gw.client.get(f"{API}/reports/{report_id}", headers=gw.admin).json()["ncmec_report_id"]
        assert gw.client.post(f"{API}/reports/{report_id}/cancel", json={"note": "prepared twice"}, headers=gw.moderator).status_code == 403
        canceled = gw.client.post(f"{API}/reports/{report_id}/cancel", json={"note": "prepared twice"}, headers=gw.admin)
        assert canceled.status_code == 200 and canceled.json()["status"] == "canceled"
        assert fake.reports[ncmec_id]["retracted"] and fake.count("retract") == 1
        assert ("carol@kunoworld.test", "cybertip.retract") in audit(gw, report_id)
        # A canceled report can't be submitted, and the item can have a new draft.
        assert submit(gw, report_id).json()["detail"]["code"] == "already_canceled"
        with gw.state.session() as s:
            item_id = s.get(CybertipReport, report_id).item_id
        assert prepare(gw, item_id).status_code == 201


# ------------------------------------------------------------------ XML and NCMEC's answers


def test_validation_catches_what_ncmec_documents_and_answers_are_parsed():
    now = time.time()
    draft = {"incident": {"type": cybertip.DEFAULT_INCIDENT_TYPE, "date_time": cybertip.iso(now - 60)},
             "reported": {"esp_identifier": "acct"}, "summary": []}
    person = {"reporting_entity": "KunoWorld Ltd", "first_name": "Pat", "last_name": "Lee", "email": "safety@kunoworld.test"}
    good = cybertip.build_report_xml(draft, person)
    assert cybertip.validate_report_xml(good, production=True, now=now) == []
    future = cybertip.build_report_xml({**draft, "incident": {**draft["incident"], "date_time": cybertip.iso(now + 3600)}}, person)
    assert any("in the past" in e for e in cybertip.validate_report_xml(future, production=False, now=now))
    wrong_type = cybertip.build_report_xml({**draft, "incident": {**draft["incident"], "type": "Spam"}}, person)
    assert any("incident type" in e for e in cybertip.validate_report_xml(wrong_type, production=False, now=now))
    no_email = cybertip.build_report_xml(draft, {**person, "email": "not-an-address"})
    assert any("<email>" in e for e in cybertip.validate_report_xml(no_email, production=False, now=now))
    reordered = good.replace(b"<incidentSummary>", b"<additionalInfo>x</additionalInfo><incidentSummary>", 1)
    assert any("order" in e for e in cybertip.validate_report_xml(reordered, production=False, now=now))
    assert cybertip.validate_report_xml(b"<report>", production=False) and cybertip.validate_report_xml(b"<fileDetails/>", production=False)

    details = cybertip.build_file_details_xml(report_id="1", file_id="f", file={"file_name": "a.png", "sha256": "0" * 64},
                                              viewed_by_esp=False, md5="0" * 32, industry_classification="B1")
    assert cybertip.validate_file_details_xml(details) == []
    assert cybertip.validate_file_details_xml(details.replace(b"<exifViewedByEsp>false", b"<exifViewedByEsp>true"))
    assert cybertip.validate_file_details_xml(details.replace(b">B1<", b">C9<"))
    assert cybertip.validate_file_details_xml(details.replace(b"<publiclyAvailable>false", b"<publiclyAvailable>no"))

    ok = cybertip.parse_response(200, b"<reportResponse><responseCode>0</responseCode><reportId>42</reportId></reportResponse>")
    assert (ok.code, ok.report_id) == (0, "42")
    done = cybertip.parse_response(200, b"<reportDoneResponse><responseCode>0</responseCode><reportId>42</reportId>"
                                        b"<files><fileId>abc</fileId></files></reportDoneResponse>")
    assert done.file_id == "abc"
    with pytest.raises(cybertip.NcmecError) as error:
        cybertip.parse_response(400, b"<reportResponse><responseCode>4100</responseCode><responseDescription>Validation failed"
                                     b"</responseDescription></reportResponse>")
    assert (error.value.code, error.value.retryable, error.value.error_code) == (4100, False, "ncmec_4100")
    with pytest.raises(cybertip.NcmecError) as error:
        cybertip.parse_response(502, b"<html>bad gateway</html>")
    assert error.value.code is None and error.value.retryable
