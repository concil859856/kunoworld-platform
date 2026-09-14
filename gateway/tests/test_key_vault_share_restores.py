"""A database restore can't undo key sync deletions or share-link revocations: their tombstones replay through
`kuno-gateway reapply-deletions` (tombstones.py), with the replayers db_vault.py and db_shares.py register."""

from __future__ import annotations

import time
import uuid

import pytest
from test_key_vault_constraints import (  # fixtures and helpers
    add_job,
    customer,
    fake_job_key,
    gw,  # noqa: F401  (fixture)
    make_vault,
    passkey_unlocker,
    recovery_unlocker,
)

from kuno_gateway import shares
from kuno_gateway.db_shares import VideoShare
from kuno_gateway.db_vault import KeyVault, KeyVaultJobKey, KeyVaultUnlocker

tombstones = pytest.importorskip("kuno_gateway.tombstones")

VAULT_MODELS = (KeyVault, KeyVaultUnlocker, KeyVaultJobKey)


def backup(gw, models) -> list:
    """Detached copies of every row, as a database backup would hold them."""
    with gw.state.session() as s:
        return [model(**{c.name: getattr(row, c.name) for c in model.__table__.columns}) for model in models for row in s.query(model).all()]


def restore(gw, rows) -> None:
    with gw.state.session() as s, s.begin():
        for row in rows:
            s.merge(row)


def test_restored_unlockers_job_keys_and_vaults_are_deleted_again(gw):
    since = time.time() - 1
    who = customer(gw)
    first, second = recovery_unlocker(), passkey_unlocker()
    master_key_id = make_vault(gw, who, first, second)
    jobs = [add_job(gw, who.account_id) for _ in range(2)]
    for job in jobs:
        gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    snapshot = backup(gw, VAULT_MODELS)

    assert gw.client.delete(f"/v1/me/keyvault/unlockers/{second['unlocker_id']}", headers=who.session).status_code == 200
    assert gw.client.delete(f"/v1/videos/{jobs[0]}", headers=who.session).status_code == 204
    restore(gw, snapshot)
    with gw.state.session() as s:
        assert s.get(KeyVaultUnlocker, second["unlocker_id"]) is not None and s.get(KeyVaultJobKey, (who.account_id, jobs[0])) is not None

    dry = tombstones.reapply(gw.state, since, dry_run=True, source="db")
    assert dry.count("would_delete", "key_vault_unlocker") == 1 and dry.count("would_delete", "key_vault_job_key") == 1
    with gw.state.session() as s:
        assert s.get(KeyVaultUnlocker, second["unlocker_id"]) is not None

    report = tombstones.reapply(gw.state, since, source="db")
    assert report.errors == [] and not report.unhandled.get("key_vault_unlocker") and not report.unhandled.get("key_vault_job_key")
    assert report.count("deleted", "key_vault_unlocker") == 1 and report.count("deleted", "key_vault_job_key") == 1
    with gw.state.session() as s:
        assert s.get(KeyVaultUnlocker, second["unlocker_id"]) is None and s.get(KeyVaultJobKey, (who.account_id, jobs[0])) is None
        # What wasn't deleted stays.
        assert s.get(KeyVaultUnlocker, first["unlocker_id"]) is not None and s.get(KeyVaultJobKey, (who.account_id, jobs[1])) is not None
    assert tombstones.reapply(gw.state, since, source="db").count("absent") >= 2

    # Turning key sync off, then restoring: the whole vault goes again.
    snapshot = backup(gw, VAULT_MODELS)
    assert gw.client.delete("/v1/me/keyvault", headers=who.session).status_code == 204
    restore(gw, snapshot)
    tombstones.reapply(gw.state, since, source="db")
    with gw.state.session() as s:
        assert s.get(KeyVault, who.account_id) is None
        assert s.query(KeyVaultUnlocker).filter_by(account_id=who.account_id).count() == 0
        assert s.query(KeyVaultJobKey).filter_by(account_id=who.account_id).count() == 0


def test_a_restored_share_link_is_revoked_again(gw):
    since = time.time() - 1
    who, other = customer(gw), customer(gw)
    revoked_job, deleted_job = add_job(gw, who.account_id), add_job(gw, who.account_id)
    closed_job = add_job(gw, other.account_id)
    now = time.time()

    def link(account_id: str, job_id: str, created_at: float = now) -> str:
        share_id = uuid.uuid4().hex
        with gw.state.session() as s, s.begin():
            s.add(VideoShare(id=share_id, account_id=account_id, job_id=job_id, token_hash=uuid.uuid4().hex * 2, privacy="private",
                             created_at=created_at, view_count=0))
        return share_id

    revoked, deleted, closed = link(who.account_id, revoked_job), link(who.account_id, deleted_job), link(other.account_id, closed_job)
    snapshot = backup(gw, (VideoShare,))
    with gw.state.session() as s, s.begin():
        shares.revoke(s, who.account_id, revoked)
        assert shares.end_for_job(s, deleted_job) == 1
        assert shares.revoke_account(s, other.account_id) == 1
    restore(gw, snapshot)
    # A link made after the deletion (in the database being restored into, it can't exist; here it proves the cut-off).
    later = link(who.account_id, deleted_job, created_at=time.time() + 60)

    report = tombstones.reapply(gw.state, since, source="db")
    assert report.errors == []
    with gw.state.session() as s:
        ended = {row.id: (row.revoked_at is not None, row.ended_reason) for row in s.query(VideoShare).all()}
    assert ended[revoked] == (True, "revoked")
    assert ended[deleted] == (True, "video_deleted")
    assert ended[closed] == (True, "account_closed")
    assert ended[later] == (False, None)
