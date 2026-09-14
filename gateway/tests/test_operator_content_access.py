"""Only the owner opens a video. Operators may open content only for an open csam/sexual_minor report or under a
report_csam, report_sexual_minor, upload_match or legal_request hold; every other case is metadata only, and every
content view is logged.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import os

import pytest
from kuno_protocol.canonical import b64e
from operator_sessions import operator_headers
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

from kuno_gateway.db import Enclave

MODERATOR = "mo@kunoworld.test"
NOT_ILLEGAL = ("nonconsensual_intimate", "violent_extremism", "harassment", "copyright", "other")


@pytest.fixture(autouse=True)
def confidential_enclave(gw):
    with gw.state.session() as s, s.begin():
        s.get(Enclave, ENCLAVE).tee = "mock"


def item_for(gw, report_id: str) -> dict:
    return next(i for i in gw.client.get("/admin/v1/moderation/queue", params={"status": "open"}, headers=gw.admin).json()
                if i["report"] and i["report"]["report_id"] == report_id)


def views(gw) -> list[dict]:
    return [a for a in gw.client.get("/admin/v1/audit-log", headers=gw.admin).json() if a["action"].startswith("item.view_")]


def test_reports_of_other_reasons_give_operators_metadata_only(gw, media):
    moderator = operator_headers(gw.state, MODERATOR, "moderator")
    _, key = new_account(gw)
    job = create_standard(gw, key, prompt="a paper crane unfolding")
    render(gw, job["job_id"], media.clip)
    for reason in NOT_ILLEGAL:
        report = gw.client.post("/v1/reports", json={"job_id": job["job_id"], "reason": reason}).json()
        item = item_for(gw, report["report_id"])
        assert (item["content_reviewable"], item["content_access"]) == (False, None), reason
        assert item["job"]["has_video"] is False and item["job"]["prompt"] is None
        detail = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}", headers=moderator).json()
        assert detail["job"]["prompt"] is None and detail["job"]["status"] == "succeeded"
        for who in (moderator, gw.admin):
            refused = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=who)
            assert refused.status_code == 403 and refused.json()["detail"]["code"] == "content_not_reviewable", reason
        # A key is never accepted with such a report.
        keyed = gw.client.post("/v1/reports", json={"job_id": job["job_id"], "reason": reason, "output_key": b64e(os.urandom(32))})
        assert keyed.status_code == 422 and keyed.json()["detail"]["code"] == "key_not_accepted"
    assert views(gw) == []
    # The owner still can.
    assert gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=key).content == media.clip


def test_an_operator_hold_does_not_open_content_but_a_legal_request_hold_does(gw, media):
    moderator = operator_headers(gw.state, MODERATOR, "moderator")
    _, key = new_account(gw)
    job = create_standard(gw, key, prompt="a lighthouse in fog")
    render(gw, job["job_id"], media.clip)
    report = gw.client.post("/v1/reports", json={"job_id": job["job_id"], "reason": "harassment"}).json()
    item = item_for(gw, report["report_id"])
    video = f"/admin/v1/moderation/items/{item['item_id']}/video"

    assert gw.client.post("/admin/v1/holds", json={"job_id": job["job_id"], "reason": "operator", "note": "review pending"},
                          headers=moderator).status_code == 201
    assert gw.client.get(video, headers=moderator).status_code == 403

    legal = gw.client.post("/admin/v1/holds", json={"job_id": job["job_id"], "reason": "legal_request", "note": "court order 99"},
                           headers=moderator)
    assert legal.status_code == 201
    opened = gw.client.get(video, headers=moderator)
    assert opened.status_code == 200 and opened.content == media.clip
    detail = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}", headers=moderator).json()
    assert (detail["content_access"], detail["job"]["prompt"]) == ("hold:legal_request", "a lighthouse in fog")
    logged = {(a["operator"], a["action"], a["detail"].get("basis") or a["detail"].get("access")) for a in views(gw)}
    assert logged == {(MODERATOR, "item.view_video", "hold:legal_request"), (MODERATOR, "item.view_prompt", "hold:legal_request")}

    # Moderators can't release holds; once an admin does, the content is closed again.
    release = f"/admin/v1/holds/{legal.json()['hold_id']}/release"
    assert gw.client.post(release, json={"note": "order lapsed"}, headers=moderator).status_code == 403
    assert gw.client.post(release, json={"note": "order lapsed"}, headers=gw.admin).status_code == 200
    assert gw.client.get(video, headers=moderator).status_code == 403


@pytest.mark.parametrize("reason", ["csam", "sexual_minor"])
def test_an_open_child_safety_report_opens_content_for_moderators(gw, media, reason):
    moderator = operator_headers(gw.state, MODERATOR, "moderator")
    account_id, key = new_account(gw)
    standard = create_standard(gw, key, prompt="a swing in a garden")
    render(gw, standard["job_id"], media.clip)
    private_id, private_key = _private_job(gw, account_id, media.clip)

    standard_report = gw.client.post("/v1/reports", json={"job_id": standard["job_id"], "reason": reason}).json()
    private_report = gw.client.post("/v1/reports", json={"job_id": private_id, "reason": reason, "output_key": b64e(private_key)}).json()
    keyless = gw.client.post("/v1/reports", json={"job_id": private_id, "reason": reason}).json()

    for report_id, expected in ((standard_report["report_id"], media.clip), (private_report["report_id"], media.clip)):
        item = item_for(gw, report_id)
        assert item["content_access"] == f"report:{reason}"
        opened = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}/video", headers=moderator)
        assert opened.status_code == 200 and opened.content == expected
    # A private video still needs its key: reviewable, but nothing to open it with.
    no_key = gw.client.get(f"/admin/v1/moderation/items/{item_for(gw, keyless['report_id'])['item_id']}/video", headers=moderator)
    # The provisional hold holds no key; the report carried none.
    assert no_key.status_code == 403 and no_key.json()["detail"]["code"] == "private_content"
    assert {(a["operator"], a["detail"]["basis"]) for a in views(gw)} == {(MODERATOR, f"report:{reason}")}
