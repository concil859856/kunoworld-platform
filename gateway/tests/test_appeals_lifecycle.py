"""Appeals: customers appeal their own strikes, restrictions, removals and report resolutions (one open appeal per
subject, a daily allowance); each is a queue item only the appeal route resolves; moderators uphold or overturn with a
note; an overturn voids a strike (voided strikes stop counting), lifts a restriction or a report's ban, and restores a
removal only while a hold still keeps the content; the customer is emailed; everything is in the audit log.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json
import time

import pytest
from account_sessions import outbox, signed_in
from kuno_protocol.blobs import decrypt_blob
from kuno_protocol.schemas import output_label
from operator_sessions import operator_headers
from test_standard_moderation_flow import (  # fixtures and helpers
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import moderation
from kuno_gateway.db import NEVER_EXPIRES, Blob
from kuno_gateway.db_moderation import Strike

MO = "mo@kunoworld.test"


def strike(gw, account_id: str) -> str:
    with gw.state.session() as s, s.begin():
        return moderation.record_strike(s, gw.settings, account_id, "content_policy").id


def appeal(gw, who, kind: str, subject_id: str, statement: str = "This was a mistake."):
    return gw.client.post(
        "/v1/me/appeals", json={"subject_kind": kind, "subject_id": subject_id, "statement": statement}, headers=who.headers
    )


def decide(gw, headers: dict, appeal_id: str, decision: str, note: str):
    return gw.client.post(f"/admin/v1/appeals/{appeal_id}/resolve", json={"decision": decision, "note": note}, headers=headers)


def eligibility(gw, who) -> dict:
    return gw.client.get("/v1/me/eligibility", headers=who.headers).json()


def audit(gw, target_id: str) -> set[tuple[str, str]]:
    return {(a["operator"], a["action"]) for a in gw.client.get("/admin/v1/audit-log", params={"target_id": target_id}, headers=gw.admin).json()}


def test_customers_appeal_their_own_subjects_one_open_appeal_each_within_a_daily_allowance(gw):
    alice = signed_in(gw, "alice@example.com")
    bob = signed_in(gw, "bob@example.com")
    first = strike(gw, alice.account_id)
    restricted = gw.client.post(f"/admin/v1/accounts/{alice.account_id}/restrict",
                                json={"until": time.time() + 3600, "reason": "internal note: spam wave"}, headers=gw.admin)
    assert restricted.status_code == 200
    standing = gw.client.get("/v1/me/standing", headers=alice.headers).json()
    [listed_strike], [restriction] = standing["strikes"], standing["restrictions"]
    assert (listed_strike["strike_id"], listed_strike["appealable"]) == (first, True)
    assert (restriction["active"], restriction["appealable"], restriction["source"], restriction["reason"]) == (True, True, "operator", None)
    # An operator's reason is their audit note, not the customer's to read.
    assert "internal note" not in json.dumps(standing)

    created = appeal(gw, alice, "strike", first, "It was a cooking video.")
    assert created.status_code == 201, created.text
    body = created.json()
    assert (body["status"], body["decision"], body["summary"]) == ("open", None, ["A reviewer hasn't decided this appeal yet."])
    duplicate = appeal(gw, alice, "strike", first)
    assert duplicate.status_code == 409 and duplicate.json()["detail"]["code"] == "appeal_open"
    assert appeal(gw, alice, "strike", first, "x" * 2001).status_code == 422
    assert appeal(gw, alice, "restriction", restriction["restriction_id"], "   ").json()["detail"]["code"] == "empty_statement"
    stranger = appeal(gw, bob, "strike", first)
    assert stranger.status_code == 404 and stranger.json()["detail"]["code"] == "subject_not_found"
    key = gw.client.post("/v1/me/keys", json={"name": "server"}, headers=alice.headers).json()["key"]
    keyed = gw.client.post("/v1/me/appeals", json={"subject_kind": "strike", "subject_id": first, "statement": "x"},
                           headers={"authorization": f"Bearer {key}"})
    assert keyed.status_code == 401
    listed_strike = gw.client.get("/v1/me/standing", headers=alice.headers).json()["strikes"][0]
    assert (listed_strike["appeal"], listed_strike["appealable"]) == ({"appeal_id": body["appeal_id"], "status": "open"}, False)

    # The queue shows it with its own priority, and only the appeal route decides it.
    [item] = [i for i in gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json() if i["kind"] == "appeal"]
    assert (item["priority"], item["account_id"], item["detail"]["appeal_id"], item["job"]) == (50, alice.account_id, body["appeal_id"], None)
    generic = gw.client.post(f"/admin/v1/moderation/items/{item['item_id']}/resolve", json={"action": "dismiss", "note": "x"}, headers=gw.admin)
    assert generic.status_code == 409 and generic.json()["detail"]["code"] == "appeal_item"
    assert gw.client.get("/admin/v1/appeals", headers=alice.headers).status_code == 403

    # Five a day.
    assert appeal(gw, alice, "restriction", restriction["restriction_id"]).status_code == 201
    for _ in range(3):
        assert appeal(gw, alice, "strike", strike(gw, alice.account_id)).status_code == 201
    limited = appeal(gw, alice, "strike", strike(gw, alice.account_id))
    assert limited.status_code == 429 and limited.json()["detail"]["code"] == "rate_limited"


def test_overturning_a_strike_voids_it_so_it_stops_counting_and_the_customer_is_told(gw):
    alice = signed_in(gw, "alice@example.com")
    moderator = operator_headers(gw.state, MO, "moderator")
    first = strike(gw, alice.account_id)
    strike(gw, alice.account_id)
    before = eligibility(gw, alice)
    assert before["strikes_24h"] == 2 and "too_many_strikes" in before["private_mode"]["reasons"]
    appeal_id = appeal(gw, alice, "strike", first, "The prompt was about a cooking show.").json()["appeal_id"]

    [listed] = gw.client.get("/admin/v1/appeals", headers=moderator).json()
    assert (listed["subject_kind"], listed["statement"], listed["subject"]["reason"], listed["subject"]["strikes_30d"]) == (
        "strike", "The prompt was about a cooking show.", "content_policy", 2
    )
    assert decide(gw, moderator, appeal_id, "overturn", "   ").status_code == 422

    decided = decide(gw, moderator, appeal_id, "overturn", "The classifier misread a cooking prompt.")
    assert decided.status_code == 200, decided.text
    body = decided.json()
    assert (body["status"], body["decision"], body["outcome"], body["resolved_by"]) == ("overturned", "overturn", {"strike_voided": True}, MO)
    assert body["notified_at"] is not None
    again = decide(gw, moderator, appeal_id, "uphold", "second thoughts")
    assert again.status_code == 409 and again.json()["detail"]["code"] == "already_resolved"
    with gw.state.session() as s:
        voided = s.get(Strike, first)
        assert voided.voided_at is not None and voided.voided_by == MO

    after = eligibility(gw, alice)
    assert after["strikes_24h"] == 1 and "too_many_strikes" not in after["private_mode"]["reasons"]
    # The rules count only live strikes: a third strike row is only the second that counts, below 3 in 24 hours.
    strike(gw, alice.account_id)
    assert eligibility(gw, alice)["restricted_until"] is None
    strike(gw, alice.account_id)
    assert eligibility(gw, alice)["restricted_until"] is not None

    [mail] = outbox(gw, alice.email)
    assert mail["subject"] == "Your KunoWorld appeal: the decision was overturned"
    assert "no longer counts" in mail["text"] and "The classifier misread a cooking prompt." in mail["text"]
    mine = gw.client.get("/v1/me/appeals", headers=alice.headers).json()[0]
    assert (mine["status"], mine["note"]) == ("overturned", "The classifier misread a cooking prompt.")
    assert any("no longer counts" in line for line in mine["summary"])

    assert {(f"owner:{alice.user_id}", "appeal.create"), (MO, "appeal.overturn"), ("system", "appeal.notify")} <= audit(gw, appeal_id)
    assert (MO, "strike.void") in audit(gw, first)
    log = gw.client.get("/admin/v1/audit-log", params={"target_id": appeal_id}, headers=gw.admin).text
    assert alice.email not in log
    [item] = [i for i in gw.client.get("/admin/v1/moderation/queue", params={"status": "resolved"}, headers=gw.admin).json() if i["kind"] == "appeal"]
    assert item["resolution"] == "overturn"


def test_upholding_changes_nothing_and_overturning_lifts_a_restriction_or_a_reports_ban(gw, media):
    alice = signed_in(gw, "alice@example.com")
    moderator = operator_headers(gw.state, MO, "moderator")
    until = time.time() + 7 * 86400
    gw.client.post(f"/admin/v1/accounts/{alice.account_id}/restrict", json={"until": until, "reason": "spam"}, headers=gw.admin)
    [restriction] = gw.client.get("/v1/me/standing", headers=alice.headers).json()["restrictions"]

    first = appeal(gw, alice, "restriction", restriction["restriction_id"]).json()
    upheld = decide(gw, moderator, first["appeal_id"], "uphold", "The spam came from this account.").json()
    assert (upheld["status"], upheld["outcome"], upheld["summary"]) == ("upheld", None, ["We reviewed it, and the decision stands."])
    assert eligibility(gw, alice)["restricted_until"] == pytest.approx(until)
    assert [m["subject"] for m in outbox(gw, alice.email)] == ["Your KunoWorld appeal: the decision stands"]

    # A decided appeal can be followed by a new one.
    [restriction] = gw.client.get("/v1/me/standing", headers=alice.headers).json()["restrictions"]
    assert (restriction["appeal"]["status"], restriction["appealable"]) == ("upheld", True)
    second = appeal(gw, alice, "restriction", restriction["restriction_id"], "New evidence: a shared network.").json()
    lifted = decide(gw, moderator, second["appeal_id"], "overturn", "Shared university network.").json()
    assert lifted["outcome"] == {"restriction_lifted": True, "restriction_id": restriction["restriction_id"]}
    assert eligibility(gw, alice)["restricted_until"] is None
    assert (MO, "account.unrestrict") in audit(gw, alice.account_id)

    # A report's resolution: overturning reverses the ban it placed.
    job_id = create_standard(gw, alice.headers)["job_id"]
    render(gw, job_id, media.clip)
    report = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "harassment"}).json()
    gw.client.post(f"/admin/v1/reports/{report['report_id']}/resolve", json={"action": "ban_account", "note": "targeted harassment"},
                   headers=gw.admin)
    assert eligibility(gw, alice)["restricted_until"] == moderation.INDEFINITE_UNTIL
    dismissed = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "other"}).json()
    gw.client.post(f"/admin/v1/reports/{dismissed['report_id']}/resolve", json={"action": "dismiss", "note": "nothing"}, headers=gw.admin)
    refused = appeal(gw, alice, "report_resolution", dismissed["report_id"])
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "not_appealable"

    [resolution] = gw.client.get("/v1/me/standing", headers=alice.headers).json()["report_resolutions"]
    assert (resolution["report_id"], resolution["reason"], resolution["resolution"], resolution["appealable"]) == (
        report["report_id"], "harassment", "ban_account", True
    )
    ban_appeal = appeal(gw, alice, "report_resolution", report["report_id"], "I never sent those messages.").json()
    [listed] = gw.client.get("/admin/v1/appeals", headers=moderator).json()
    assert (listed["subject"]["restriction_active"], listed["subject"]["resolution_note"]) == (True, "targeted harassment")
    reversed_ = decide(gw, moderator, ban_appeal["appeal_id"], "overturn", "The reporter named the wrong job.").json()
    assert (reversed_["outcome"]["restriction_lifted"], reversed_["outcome"]["resolution"]) == (True, "ban_account")
    assert eligibility(gw, alice)["restricted_until"] is None
    assert (MO, "report.overturn") in audit(gw, report["report_id"])


def test_a_removal_is_restored_only_while_a_hold_still_keeps_the_content(gw, media):
    alice = signed_in(gw, "alice@example.com")
    moderator = operator_headers(gw.state, MO, "moderator")
    kept = create_standard(gw, alice.headers, prompt="a harbour, kept")["job_id"]
    gone = create_standard(gw, alice.headers, prompt="a harbour, gone")["job_id"]
    for job_id in (kept, gone):
        render(gw, job_id, media.clip)
    private_id, private_key = _private_job(gw, alice.account_id, media.clip)
    for job_id in (kept, private_id):
        placed = gw.client.post("/admin/v1/holds", json={"job_id": job_id, "reason": "operator", "note": "keep while reviewed"}, headers=gw.admin)
        assert placed.status_code == 201
    for job_id in (kept, gone, private_id):
        report = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "copyright"}).json()
        resolved = gw.client.post(f"/admin/v1/reports/{report['report_id']}/resolve", json={"action": "remove_content", "note": "infringing"},
                                  headers=gw.admin)
        assert resolved.status_code == 200
    assert gw.client.get(f"/v1/standard/videos/{kept}/video", headers=alice.headers).json()["detail"]["code"] == "removed"

    standing = gw.client.get("/v1/me/standing", headers=alice.headers).json()
    assert {r["job_id"]: r["appealable"] for r in standing["removals"]} == {kept: True, gone: True, private_id: True}
    ids = {job_id: appeal(gw, alice, "removal", job_id, "The footage is licensed.").json()["appeal_id"] for job_id in (kept, gone, private_id)}
    subjects = {a["subject_id"]: a["subject"] for a in gw.client.get("/admin/v1/appeals", headers=moderator).json()}
    assert {job_id: subjects[job_id]["content_restorable"] for job_id in ids} == {kept: True, gone: False, private_id: True}

    restored = decide(gw, moderator, ids[kept], "overturn", "Licensed footage: the report was mistaken.").json()
    assert restored["outcome"] == {"content_restored": True, "job_id": kept}
    video = gw.client.get(f"/v1/standard/videos/{kept}/video", headers=alice.headers)
    assert video.status_code == 200 and video.content == media.clip
    with gw.state.session() as s:
        assert {b.expires_at for b in s.query(Blob).filter(Blob.job_id == kept)} == {NEVER_EXPIRES}

    missing = decide(gw, moderator, ids[gone], "overturn", "Licensed footage.").json()
    assert missing["outcome"] == {"content_restored": False, "content_gone": True, "job_id": gone}
    assert any("can't be restored" in line for line in missing["summary"])
    assert gw.client.get(f"/v1/standard/videos/{gone}/video", headers=alice.headers).json()["detail"]["code"] == "removed"

    private = decide(gw, moderator, ids[private_id], "overturn", "Licensed footage.").json()
    assert private["outcome"]["content_restored"] is True
    output_blob = gw.client.get(f"/v1/videos/{private_id}", headers=alice.headers).json()["output_blob_id"]
    sealed = gw.client.get(f"/v1/blobs/{output_blob}", headers=alice.headers)
    assert sealed.status_code == 200 and decrypt_blob(private_key, output_label(private_id), sealed.content) == media.clip

    mails = {m["text"] for m in outbox(gw, alice.email)}
    assert len(mails) == 3 and any("back in your library" in text for text in mails) and any("can't be restored" in text for text in mails)
    assert (MO, "job.restore") in audit(gw, kept) and (MO, "job.restore") in audit(gw, private_id)
    # The holds stay as operators placed them.
    assert len(gw.client.get("/admin/v1/holds", headers=gw.admin).json()) == 2
