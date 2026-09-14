"""Closing an account: a sign-in from the last ten minutes and the typed address first; then content deleted through the
owner's deletion paths (holds respected), every credential, wallet and role revoked, key sync purged, share links ended
and tombstones recorded, the address replaced by a placeholder with a salted hash kept, the balance recorded (not
refunded), and billing, reports, strikes and the audit log kept. The same address then signs in to a fresh account.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json
import re
import time
import uuid

import pytest
from account_sessions import build_exports, outbox, signed_in, stored
from test_standard_moderation_flow import (  # fixtures and helpers
    _private_job,
    create_standard,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import account_closure, identity, lifecycle_hooks, moderation, roles
from kuno_gateway.db import Account, Blob, Job, LedgerEntry, Payment, User, UserSession, WalletLink
from kuno_gateway.db_lifecycle import AccountClosure, AccountExport, Appeal
from kuno_gateway.db_moderation import ModerationItem, Report, StandardJob, StandardUpload, Strike

BALANCE_POLICY = "[BALANCE ON CLOSURE POLICY]"
RETENTION = "[RETENTION OF RECORDS AFTER CLOSURE]"


def close(gw, who, email: str | None = None):
    return gw.client.post("/v1/me/close", json={"confirm_email": email or who.email}, headers=who.headers)


def test_closing_needs_a_sign_in_from_the_last_ten_minutes_and_the_typed_address(gw):
    alice = signed_in(gw, "alice@example.com")
    with gw.state.session() as s, s.begin():
        s.get(UserSession, alice.session_id).created_at = time.time() - 11 * 60
    preview = gw.client.get("/v1/me/close", headers=alice.headers).json()
    assert (preview["reauth_required"], preview["reauth_expires_at"], preview["balance_usd"]) == (True, None, 50)
    assert (preview["balance_policy"], preview["retention_policy"]) == (BALANCE_POLICY, RETENTION)
    stale = close(gw, alice)
    assert stale.status_code == 403 and stale.json()["detail"]["code"] == "reauth_required"

    # Re-authentication is a fresh sign-in link to the account's own address.
    assert gw.client.post("/v1/me/reauth", json={"next": "https://elsewhere.example/"}, headers=alice.headers).status_code == 422
    assert gw.client.post("/v1/me/reauth", headers=alice.headers).status_code == 202
    [mail] = outbox(gw, alice.email)
    assert mail["subject"] == "Confirm it's you to close your KunoWorld account"
    assert "/auth/verify?token=" in mail["text"] and "next=/account%3Fclosing%3D1%23close-account" in mail["text"]
    token = re.search(r"token=([A-Za-z0-9_\-]+)", mail["text"]).group(1)
    verified = gw.client.post("/v1/auth/verify", json={"token": token})
    assert verified.status_code == 200
    fresh = type(alice)(**{**vars(alice), "headers": {"authorization": f"Bearer {verified.json()['session_token']}"}})
    preview = gw.client.get("/v1/me/close", headers=fresh.headers).json()
    assert preview["reauth_required"] is False and preview["reauth_expires_at"] == pytest.approx(time.time() + 600, abs=30)

    wrong = close(gw, fresh, "someone-else@example.com")
    assert wrong.status_code == 422 and wrong.json()["detail"]["code"] == "email_mismatch"
    key = gw.client.post("/v1/me/keys", json={"name": "server"}, headers=fresh.headers).json()["key"]
    assert gw.client.post("/v1/me/close", json={"confirm_email": alice.email}, headers={"authorization": f"Bearer {key}"}).status_code == 401
    closed = close(gw, fresh, "  ALICE@example.com ")
    assert closed.status_code == 200 and closed.json()["closed"] is True


def test_closing_deletes_content_revokes_access_and_keeps_the_records(gw, media):
    alice = signed_in(gw, "alice@example.com")
    now = time.time()
    finished = create_standard(gw, alice.headers, prompt="a harbour at dawn", media=media.red)["job_id"]
    render(gw, finished, media.clip)
    held = create_standard(gw, alice.headers, prompt="a kept lighthouse")["job_id"]
    render(gw, held, media.clip)
    queued = create_standard(gw, alice.headers, prompt="still waiting")["job_id"]
    private_id, _ = _private_job(gw, alice.account_id, media.clip)
    stray = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=alice.headers).json()
    key = gw.client.post("/v1/me/keys", json={"name": "server"}, headers=alice.headers).json()["key"]
    assert gw.client.get("/v1/me/webhook-secret", headers=alice.headers).status_code == 200
    report = gw.client.post("/v1/reports", json={"job_id": finished, "reason": "harassment"}).json()
    hold = gw.client.post("/admin/v1/holds", json={"job_id": held, "reason": "legal_request", "note": "court order"}, headers=gw.admin).json()
    with gw.state.session() as s, s.begin():
        s.add(WalletLink(id=uuid.uuid4().hex, account_id=alice.account_id, address="5" + "a" * 47, created_at=now))
        s.add(Payment(id=uuid.uuid4().hex, account_id=alice.account_id, provider="stripe", provider_ref="cs_test_closure",
                      status="credited", amount_usd_micros=5_000_000, created_at=now, updated_at=now, credited_at=now))
        strike_id = moderation.record_strike(s, gw.settings, alice.account_id, "content_policy").id
        roles.grant(s, alice.email, "moderator", "cli")
    appeal = gw.client.post("/v1/me/appeals", json={"subject_kind": "strike", "subject_id": strike_id, "statement": "A mistake."},
                            headers=alice.headers).json()
    export_id = gw.client.post("/v1/me/exports", headers=alice.headers).json()["export_id"]
    build_exports(gw)
    with gw.state.session() as s:
        parts = json.loads(s.get(AccountExport, export_id).part_blob_ids)
        video_blob = s.get(StandardJob, finished).video_blob_id
        private_blobs = [b.id for b in s.query(Blob).filter(Blob.job_id == private_id)]
        stray_blob = s.get(StandardUpload, stray["upload_id"]).blob_id
        entries_before = s.query(LedgerEntry).filter(LedgerEntry.account_id == alice.account_id).count()
    balance = gw.client.get("/v1/me", headers=alice.headers).json()["account"]["balance_usd"]
    price = gw.client.get(f"/v1/videos/{queued}", headers=alice.headers).json()["price_usd"]

    closed = close(gw, alice)
    assert closed.status_code == 200, closed.text
    body = closed.json()
    # The queued video was canceled and refunded like any cancellation; the balance is recorded, not paid out.
    assert (body["jobs"], body["jobs_canceled"]) == (4, 1)
    assert body["balance_usd"] == pytest.approx(balance + price)
    assert (body["balance_policy"], body["retention_policy"]) == (BALANCE_POLICY, RETENTION)
    assert "hold" not in closed.text

    # Every way in is gone.
    assert gw.client.get("/v1/me", headers=alice.headers).status_code == 401
    assert gw.client.get("/v1/account", headers={"authorization": f"Bearer {key}"}).status_code == 401

    with gw.state.session() as s:
        assert s.get(Job, queued).status == "canceled"
        assert s.query(LedgerEntry).filter(LedgerEntry.idempotency_key == f"refund:{queued}").count() == 1
        assert s.query(LedgerEntry).filter(LedgerEntry.account_id == alice.account_id).count() == entries_before + 1
        row = s.get(StandardJob, finished)
        assert (row.delete_reason, row.prompt, row.video_blob_id) == ("deleted", None, None)
        assert s.query(Blob).filter(Blob.job_id == private_id).count() == 0
        assert s.get(StandardUpload, stray["upload_id"]) is None
        kept = s.get(StandardJob, held)
        assert kept.deleted_at is not None and kept.prompt == "a kept lighthouse" and stored(gw, kept.video_blob_id)
        export = s.get(AccountExport, export_id)
        assert (export.status, export.part_blob_ids) == ("deleted", None)

        user, account = s.get(User, alice.user_id), s.get(Account, alice.account_id)
        assert user.email == f"closed-{alice.user_id}@closed.invalid"
        assert (account.name, account.webhook_secret) == ("Closed account", None) and account.closed_at is not None
        closure = s.query(AccountClosure).one()
        assert alice.email not in closure.email_hash and account_closure.email_matches(closure.email_hash, alice.email)
        assert [c.account_id for c in account_closure.closures_for_email(s, "Alice@Example.com")] == [alice.account_id]
        assert closure.balance_micros == account.balance_micros
        assert s.query(WalletLink).filter(WalletLink.account_id == alice.account_id).count() == 0
        assert roles.active_roles(s, alice.user_id) == []
        assert s.query(UserSession).filter(UserSession.user_id == alice.user_id, UserSession.revoked_at.is_(None)).count() == 0
        # The records that stay.
        assert s.query(Payment).filter(Payment.account_id == alice.account_id).count() == 1
        assert s.get(Report, report["report_id"]) is not None
        assert s.query(Strike).filter(Strike.account_id == alice.account_id).count() == 1
        assert s.get(Job, finished).receipt and s.get(Job, finished).price_usd > 0
        withdrawn = s.get(Appeal, appeal["appeal_id"])
        assert withdrawn.status == "withdrawn" and s.get(ModerationItem, withdrawn.item_id).resolution == "withdrawn"
    assert not stored(gw, video_blob) and not stored(gw, stray_blob)
    assert not any(stored(gw, blob) for blob in (*private_blobs, *parts))

    log = gw.client.get("/admin/v1/audit-log", params={"target_id": alice.account_id}, headers=gw.admin).json()
    [entry] = [a for a in log if a["action"] == "account.close"]
    assert entry["operator"] == f"owner:{alice.user_id}"
    assert (entry["detail"]["jobs_kept_under_hold"], entry["detail"]["roles_revoked"], entry["detail"]["retention"]) == (1, ["moderator"], RETENTION)
    assert alice.email not in json.dumps(entry)
    revoked = gw.client.get("/admin/v1/audit-log", params={"target_id": alice.user_id}, headers=gw.admin).json()
    assert (f"owner:{alice.user_id}", "role.revoke") in {(a["operator"], a["action"]) for a in revoked}

    [mail] = [m for m in outbox(gw, alice.email) if m["subject"] == "Your KunoWorld account is closed"]
    assert BALANCE_POLICY in mail["text"] and RETENTION in mail["text"]

    # The hold still decides when the held content goes.
    gw.state.janitor()
    with gw.state.session() as s:
        assert s.get(StandardJob, held).prompt == "a kept lighthouse"
    gw.client.post(f"/admin/v1/holds/{hold['hold_id']}/release", json={"note": "order lapsed"}, headers=gw.admin)
    gw.state.janitor()
    with gw.state.session() as s:
        assert (s.get(StandardJob, held).prompt, s.get(StandardJob, held).video_blob_id) == (None, None)

    # The same address signs in to a new, empty account.
    again = signed_in(gw, "alice@example.com", credit_usd=0)
    assert again.user_id != alice.user_id and again.account_id != alice.account_id
    me = gw.client.get("/v1/me", headers=again.headers).json()
    assert (me["account"]["balance_usd"], me["roles"]) == (0, [])
    assert gw.client.get("/v1/videos", headers=again.headers).json() == []
    assert gw.client.get(f"/v1/videos/{finished}", headers=again.headers).status_code == 404


def test_closure_purges_key_sync_ends_share_links_and_records_tombstones(gw, media, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    job_id = create_standard(gw, alice.headers)["job_id"]
    render(gw, job_id, media.clip)
    calls = []
    fakes = {
        ("key_vault", "purge_account"): lambda s, account_id: calls.append(("purge", account_id)) or {"vaults": 1, "job_keys": 3},
        ("shares", "revoke_account"): lambda s, account_id: calls.append(("revoke", account_id)) or 2,
        ("tombstones", "record"): lambda s, kind, ref, account_id=None, now=None: calls.append((kind, ref, account_id)),
    }
    real = lifecycle_hooks._function
    monkeypatch.setattr(lifecycle_hooks, "_function", lambda module, name: fakes.get((module, name)) or real(module, name))

    assert close(gw, alice).status_code == 200
    # Purged and ended before anything is deleted.
    assert calls[:2] == [("purge", alice.account_id), ("revoke", alice.account_id)]
    assert {("job_content", job_id, alice.account_id), ("account_closure", alice.account_id, alice.account_id)} <= set(calls)
    with gw.state.session() as s:
        detail = json.loads(s.query(AccountClosure).one().detail)
    assert (detail["key_vault_purged"], detail["share_links_revoked"]) == ({"vaults": 1, "job_keys": 3}, 2)


def test_a_failing_module_stops_the_closure_before_anything_is_deleted(gw, media, monkeypatch):
    alice = signed_in(gw, "alice@example.com")
    job_id = create_standard(gw, alice.headers)["job_id"]
    render(gw, job_id, media.clip)

    def unavailable(s, account_id):
        raise RuntimeError("key vault unavailable")

    real = lifecycle_hooks._function
    monkeypatch.setattr(
        lifecycle_hooks, "_function",
        lambda module, name: unavailable if (module, name) == ("key_vault", "purge_account") else real(module, name),
    )
    with pytest.raises(RuntimeError):
        close(gw, alice)
    assert gw.client.get("/v1/me", headers=alice.headers).status_code == 200
    assert gw.client.get(f"/v1/standard/videos/{job_id}/video", headers=alice.headers).content == media.clip
    with gw.state.session() as s:
        assert s.query(AccountClosure).count() == 0 and s.get(Account, alice.account_id).closed_at is None


def test_a_sign_in_link_sent_before_closure_stops_working(gw):
    alice = signed_in(gw, "alice@example.com")
    with gw.state.session() as s, s.begin():
        pending = identity.issue_login_token(s, alice.email, 900)
    assert close(gw, alice).status_code == 200
    assert gw.client.post("/v1/auth/verify", json={"token": pending}).json()["detail"]["code"] == "invalid_link"
    # Closing twice is refused for the account; its old session can't even ask.
    assert close(gw, alice).status_code == 401
