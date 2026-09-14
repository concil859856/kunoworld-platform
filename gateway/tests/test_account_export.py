"""Data export: what goes in for each mode, what stays out (content deleted or removed, even while a hold keeps it, and
every secret), owner-only download, one export in progress at a time, the zip sealed at rest in parts, and each copy
deleted 7 days after it finished.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import hashlib
import json

import pytest
from account_sessions import build_exports, download_export, export_zip, signed_in, stored
from kuno_protocol.blobs import decrypt_blob
from kuno_protocol.schemas import output_label
from test_standard_moderation_flow import (  # fixtures and helpers
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import account_export, lifecycle_hooks, moderation
from kuno_gateway.db_lifecycle import AccountExport
from kuno_gateway.db_moderation import StandardJob

WEEK = 7 * 86400


def request_export(gw, who) -> str:
    requested = gw.client.post("/v1/me/exports", headers=who.headers)
    assert requested.status_code == 202, requested.text
    return requested.json()["export_id"]


def test_an_export_holds_the_account_its_standard_content_decrypted_and_private_outputs_sealed(gw, media):
    alice = signed_in(gw, "alice@example.com")
    standard = create_standard(gw, alice.headers, prompt="a lantern on a jetty", media=media.red)["job_id"]
    render(gw, standard, media.clip)
    private_id, private_key = _private_job(gw, alice.account_id, media.clip)
    key = gw.client.post("/v1/me/keys", json={"name": "render farm"}, headers=alice.headers).json()["key"]
    secret = gw.client.get("/v1/me/webhook-secret", headers=alice.headers).json()["secret"]
    with gw.state.session() as s, s.begin():
        moderation.record_strike(s, gw.settings, alice.account_id, "content_policy")
    filed = gw.client.post("/v1/reports", json={"url": "https://elsewhere.example/v", "reason": "copyright", "contact_email": alice.email})
    assert filed.status_code == 202

    export_id = request_export(gw, alice)
    again = gw.client.post("/v1/me/exports", headers=alice.headers)
    assert again.status_code == 409 and again.json()["detail"]["code"] == "export_in_progress"
    assert again.json()["detail"]["export"]["export_id"] == export_id
    not_yet = gw.client.get(f"/v1/me/exports/{export_id}/download", headers=alice.headers)
    assert not_yet.status_code == 409 and not_yet.json()["detail"]["code"] == "not_ready"

    assert build_exports(gw) == 1
    [listed] = gw.client.get("/v1/me/exports", headers=alice.headers).json()
    assert listed["status"] == "ready" and listed["expires_at"] == pytest.approx(listed["finished_at"] + WEEK)
    expected = {"standard_videos": 1, "thumbnails": 1, "standard_inputs": 1, "private_outputs": 1, "left_out_deleted": 0,
                "left_out_removed": 0}
    assert {name: listed["contents"][name] for name in expected} == expected

    archive = export_zip(gw, alice.headers, export_id)
    names = set(archive.namelist())
    assert {
        "README.txt", "account.json", "jobs.json", f"standard/{standard}/request.json", f"standard/{standard}/video.mp4",
        f"standard/{standard}/thumbnail.jpg", f"standard/{standard}/inputs/0-first_frame.png", f"private/{private_id}/output.kunob",
    } <= names
    # Standard content, decrypted as the owner's own download is.
    assert archive.read(f"standard/{standard}/video.mp4") == media.clip
    assert archive.read(f"standard/{standard}/video.mp4") == gw.client.get(f"/v1/standard/videos/{standard}/video", headers=alice.headers).content
    assert archive.read(f"standard/{standard}/thumbnail.jpg").startswith(b"\xff\xd8")
    assert archive.read(f"standard/{standard}/inputs/0-first_frame.png") == media.red
    request = json.loads(archive.read(f"standard/{standard}/request.json"))
    assert (request["prompt"], request["inputs"][0]["role"], isinstance(request["seed"], int)) == ("a lantern on a jetty", "first_frame", True)
    # A Private video stays ciphertext: only the customer's key opens it.
    sealed = archive.read(f"private/{private_id}/output.kunob")
    assert media.clip[1000:2000] not in sealed
    assert decrypt_blob(private_key, output_label(private_id), sealed) == media.clip

    account = json.loads(archive.read("account.json"))
    assert (account["user"]["email"], account["account"]["account_id"]) == (alice.email, alice.account_id)
    assert account["account"]["balance_usd"] == gw.client.get("/v1/me", headers=alice.headers).json()["account"]["balance_usd"]
    assert {e["kind"] for e in account["ledger"]} == {"adjustment", "charge"}
    assert [(k["name"], k["prefix"]) for k in account["api_keys"]] == [("render farm", key[:12])]
    assert account["account"]["has_webhook_secret"] is True
    assert [x["reason"] for x in account["strikes"]] == ["content_policy"]
    assert [r["reason"] for r in account["reports_filed"]] == ["copyright"]
    assert account["roles"] == {"active": [], "history": []}
    everything = b"".join(archive.read(name) for name in names)
    assert key.encode() not in everything and secret.encode() not in everything

    jobs = {j["job_id"]: j for j in json.loads(archive.read("jobs.json"))["jobs"]}
    assert (jobs[standard]["privacy"], jobs[standard]["content"], jobs[standard]["receipt"]["body"]["job_id"]) == ("standard", "stored", standard)
    assert (jobs[private_id]["privacy"], jobs[private_id]["content"], jobs[private_id]["files"]) == (
        "private", "stored", [f"private/{private_id}/output.kunob"]
    )
    readme = archive.read("README.txt").decode()
    assert "ciphertext" in readme and "7 days" in readme and "never the keys themselves" in readme

    # Sealed at rest: neither the video nor the address is readable in the stored parts.
    with gw.state.session() as s:
        parts = json.loads(s.get(AccountExport, export_id).part_blob_ids)
    at_rest = b"".join(gw.state.blobs.get(part) for part in parts)
    assert media.clip[1000:2000] not in at_rest and alice.email.encode() not in at_rest

    # Only the owner's web session downloads it.
    bob = signed_in(gw, "bob@example.com")
    assert gw.client.get(f"/v1/me/exports/{export_id}/download", headers=bob.headers).status_code == 404
    assert gw.client.get(f"/v1/me/exports/{export_id}/download", headers={"authorization": f"Bearer {key}"}).status_code == 401
    assert gw.client.post("/v1/me/exports", headers={"authorization": f"Bearer {key}"}).status_code == 401
    assert gw.client.get("/v1/me/exports", headers=bob.headers).json() == []


def test_content_deleted_or_removed_stays_out_even_while_a_hold_keeps_it(gw, media):
    alice = signed_in(gw, "alice@example.com")
    jobs = {}
    for name in ("deleted_held", "removed", "removed_held", "kept"):
        jobs[name] = create_standard(gw, alice.headers, prompt=f"a lighthouse, {name}")["job_id"]
        render(gw, jobs[name], media.clip)
    private_deleted, _ = _private_job(gw, alice.account_id, media.clip)
    private_kept, _ = _private_job(gw, alice.account_id, media.clip)

    def hold(job_id: str) -> None:
        placed = gw.client.post("/admin/v1/holds", json={"job_id": job_id, "reason": "legal_request", "note": "preservation letter"},
                                headers=gw.admin)
        assert placed.status_code == 201

    def remove(job_id: str) -> None:
        report = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "copyright"}).json()
        resolved = gw.client.post(f"/admin/v1/reports/{report['report_id']}/resolve", json={"action": "remove_content", "note": "infringing"},
                                  headers=gw.admin)
        assert resolved.status_code == 200

    hold(jobs["deleted_held"])
    assert gw.client.delete(f"/v1/videos/{jobs['deleted_held']}", headers=alice.headers).status_code == 204
    remove(jobs["removed"])
    hold(jobs["removed_held"])
    remove(jobs["removed_held"])
    hold(private_deleted)
    assert gw.client.delete(f"/v1/videos/{private_deleted}", headers=alice.headers).status_code == 204

    export_id = request_export(gw, alice)
    build_exports(gw)
    archive = export_zip(gw, alice.headers, export_id)
    listed = {j["job_id"]: j for j in json.loads(archive.read("jobs.json"))["jobs"]}
    assert {name: listed[job_id]["content"] for name, job_id in jobs.items()} == {
        "deleted_held": "deleted", "removed": "removed", "removed_held": "removed", "kept": "stored",
    }
    assert (listed[private_deleted]["content"], listed[private_kept]["content"]) == ("deleted", "stored")
    for job_id in (jobs["deleted_held"], jobs["removed"], jobs["removed_held"], private_deleted):
        assert listed[job_id]["files"] == []
        assert not [name for name in archive.namelist() if job_id in name]
    contents = gw.client.get("/v1/me/exports", headers=alice.headers).json()[0]["contents"]
    assert (contents["left_out_deleted"], contents["left_out_removed"]) == (2, 2)
    # The export left the held content out; the store still keeps it for the hold.
    with gw.state.session() as s:
        assert s.get(StandardJob, jobs["removed_held"]).video_blob_id is not None
    everything = b"".join(archive.read(name) for name in archive.namelist())
    assert b"preservation" not in everything and b"legal_request" not in everything and b"removed_held" not in everything


def test_one_export_at_a_time_in_sealed_parts_each_deleted_seven_days_after_it_finished(gw, media, monkeypatch):
    monkeypatch.setattr(account_export, "PART_BYTES", 4096)
    alice = signed_in(gw, "alice@example.com")
    job_id = create_standard(gw, alice.headers)["job_id"]
    render(gw, job_id, media.clip)

    first = request_export(gw, alice)
    build_exports(gw)
    # The first is ready, so another may start.
    second = request_export(gw, alice)
    build_exports(gw)
    with gw.state.session() as s:
        rows = {row.id: row for row in s.query(AccountExport)}
    parts = json.loads(rows[first].part_blob_ids)
    assert len(parts) > 2 and all(stored(gw, part) for part in parts)

    body = download_export(gw, alice.headers, first)
    assert hashlib.sha256(body).hexdigest() == rows[first].sha256 and len(body) == rows[first].size_bytes
    assert export_zip(gw, alice.headers, second).read(f"standard/{job_id}/video.mp4") == media.clip

    finished = sorted(row.finished_at for row in rows.values())
    assert account_export.expire(gw.state, finished[0] + WEEK - 60) == 0
    assert account_export.expire(gw.state, finished[-1] + WEEK + 1) == 2
    assert not any(stored(gw, part) for part in parts)
    gone = gw.client.get(f"/v1/me/exports/{first}/download", headers=alice.headers)
    assert gone.status_code == 410 and gone.json()["detail"]["code"] == "expired"
    listed = gw.client.get("/v1/me/exports", headers=alice.headers).json()
    assert {e["status"] for e in listed} == {"expired"} and all(e["deleted_at"] for e in listed)
    # A copy's deletion deletes nothing else.
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=alice.headers).content == media.clip


def test_wrapped_keys_go_in_with_key_sync_and_the_readme_says_when_it_is_not_installed(gw, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    real = lifecycle_hooks._function
    wrapped = {"about": "wrapped in your browser", "unlockers": [], "job_keys": [{"job_id": "j1", "wrapped_key": "KVJ1AAAA"}]}
    calls = []

    def export_account(s, account_id):
        calls.append(account_id)
        return wrapped

    monkeypatch.setattr(
        lifecycle_hooks, "_function",
        lambda module, name: export_account if (module, name) == ("key_vault", "export_account") else real(module, name),
    )
    with_keys = request_export(gw, alice)
    build_exports(gw)
    archive = export_zip(gw, alice.headers, with_keys)
    assert json.loads(archive.read("private/keys.json"))["keys"] == wrapped and calls == [alice.account_id]
    assert gw.client.get("/v1/me/exports", headers=alice.headers).json()[0]["contents"]["wrapped_keys"] == 1

    monkeypatch.setattr(lifecycle_hooks, "_function", lambda module, name: None if module == "key_vault" else real(module, name))
    without = request_export(gw, alice)
    build_exports(gw)
    archive = export_zip(gw, alice.headers, without)
    assert "private/keys.json" not in archive.namelist()
    assert "key sync isn't available" in archive.read("README.txt").decode()


def test_a_failed_build_keeps_no_parts_and_another_export_can_be_requested(gw, monkeypatch):
    monkeypatch.setattr(account_export, "PART_BYTES", 256)
    alice = signed_in(gw, "alice@example.com")
    create_standard(gw, alice.headers)
    before = {path.name for path in gw.settings.blob_dir.iterdir()}
    export_id = request_export(gw, alice)

    def broken(job):
        raise RuntimeError("the database went away")

    monkeypatch.setattr(account_export, "job_entry", broken)
    build_exports(gw)
    [row] = gw.client.get("/v1/me/exports", headers=alice.headers).json()
    assert (row["export_id"], row["status"], row["error_code"]) == (export_id, "failed", "export_failed")
    # README.txt and account.json had already filled parts; none are left behind.
    assert {path.name for path in gw.settings.blob_dir.iterdir()} == before
    failed = gw.client.get(f"/v1/me/exports/{export_id}/download", headers=alice.headers)
    assert failed.status_code == 409 and failed.json()["detail"]["code"] == "export_failed"

    monkeypatch.undo()
    assert gw.client.post("/v1/me/exports", headers=alice.headers).status_code == 202
