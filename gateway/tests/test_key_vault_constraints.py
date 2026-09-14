"""Key sync (key_vault.py, /v1/me/keyvault): only wrapped material is ever accepted or stored, in the documented format,
with size limits, session-only access, atomic rotation, deletion with the video, and the closure/export helpers."""

from __future__ import annotations

import importlib.machinery
import importlib.util
import json
import os
import sys
import time
import types
import uuid
from types import SimpleNamespace

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.canonical import b64d, b64e
from sqlalchemy import select

import kuno_gateway
from kuno_gateway import identity, key_vault
from kuno_gateway.app import create_app
from kuno_gateway.db import Job, User
from kuno_gateway.db_vault import KeyVault, KeyVaultJobKey, KeyVaultUnlocker
from kuno_gateway.settings import Settings

CODE = "7K3Q-9ZXM-2B8D-HW4R-C6NP-JT5V-QA1E-YF0G"


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    app = create_app(settings)
    return SimpleNamespace(client=TestClient(app), state=app.state.gw, settings=settings)


def customer(gw) -> SimpleNamespace:
    now = time.time()
    with gw.state.session() as s, s.begin():
        user = User(id=uuid.uuid4().hex, email=f"{uuid.uuid4().hex[:12]}@example.com", created_at=now)
        s.add(user)
        s.flush()
        account = identity.ensure_account(s, user)
        token, _ = identity.open_session(s, user.id, identity.WEB, 3600)
        key, _ = identity.create_api_key(s, account.id, "program")
    return SimpleNamespace(account_id=account.id, session={"authorization": f"Bearer {token}"}, api_key={"authorization": f"Bearer {key}"})


def add_job(gw, account_id: str, privacy: str = "private") -> str:
    job_id, now = str(uuid.uuid4()), time.time()
    with gw.state.session() as s, s.begin():
        s.add(Job(
            id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id="e" * 32, params="{}", enc="x", ciphertext="y",
            input_blob_ids="[]", status="succeeded", progress=1.0, price_usd=1.0, created_at=now, updated_at=now, privacy=privacy,
        ))
    return job_id


# ------------------------------------------------------------------ what a browser does (lib/keyvault.ts)


def normalize(code: str) -> bytes:
    return code.replace("-", "").upper().encode()


def recovery_kek(code: str, salt: bytes, iterations: int = key_vault.PBKDF2_MIN_ITERATIONS) -> bytes:
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=iterations).derive(normalize(code))


def seal(key: bytes, magic: bytes, plaintext: bytes, aad: str) -> str:
    iv = os.urandom(12)
    return b64e(magic + iv + AESGCM(key).encrypt(iv, plaintext, aad.encode()))


def unseal(key: bytes, magic: bytes, wrapped: str, aad: str) -> bytes:
    raw = b64d(wrapped)
    assert raw[:4] == magic
    return AESGCM(key).decrypt(raw[4:16], raw[16:], aad.encode())


def master_aad(account_id: str, unlocker_id: str, kind: str) -> str:
    return f"KVM1|kuno/keyvault/master-key|{account_id}|{unlocker_id}|{kind}"


def job_aad(account_id: str, job_id: str) -> str:
    return f"KVJ1|kuno/keyvault/job-key|{account_id}|{job_id}"


def fake_master() -> str:
    """Shaped like a wrapped master key. The gateway can't tell it from a real one, and mustn't be able to."""
    return b64e(b"KVM1" + os.urandom(60))


def fake_job_key(size: int = 200) -> str:
    return b64e(b"KVJ1" + os.urandom(size))


def recovery_unlocker(salt: bytes | None = None, wrapped: str | None = None, **params) -> dict:
    return {
        "unlocker_id": uuid.uuid4().hex,
        "kind": "recovery_code",
        "params": {"alg": "PBKDF2-SHA256", "iterations": key_vault.PBKDF2_MIN_ITERATIONS, "salt": b64e(salt or os.urandom(16)), **params},
        "wrapped_master_key": wrapped or fake_master(),
    }


def passkey_unlocker(**params) -> dict:
    return {
        "unlocker_id": uuid.uuid4().hex,
        "kind": "passkey",
        "label": "Laptop passkey",
        "params": {"credential_id": b64e(os.urandom(32)), "prf_salt": b64e(os.urandom(32)), "rp_id": "kunoworld.com",
                   "transports": ["internal", "hybrid"], **params},
        "wrapped_master_key": fake_master(),
    }


def make_vault(gw, who, *unlockers) -> str:
    master_key_id = uuid.uuid4().hex
    created = gw.client.post("/v1/me/keyvault", json={"master_key_id": master_key_id, "unlockers": list(unlockers) or [recovery_unlocker()]},
                             headers=who.session)
    assert created.status_code == 201, created.text
    return master_key_id


def code_of(response) -> str:
    return response.json()["detail"]["code"]


def stored_text(gw) -> str:
    with gw.state.session() as s:
        rows = [*s.scalars(select(KeyVault)), *s.scalars(select(KeyVaultUnlocker)), *s.scalars(select(KeyVaultJobKey))]
        return json.dumps([{c.name: getattr(r, c.name) for c in r.__table__.columns} for r in rows], default=str)


# ------------------------------------------------------------------ tests


def test_a_new_device_unwraps_a_synced_key_with_the_recovery_code_and_the_gateway_holds_only_wrapped_values(gw):
    who = customer(gw)
    job_id = add_job(gw, who.account_id)
    master_key, output_key, signing_key = os.urandom(32), os.urandom(32), os.urandom(32)
    salt, unlocker_id, master_key_id = os.urandom(16), uuid.uuid4().hex, uuid.uuid4().hex
    wrapped_master = seal(recovery_kek(CODE, salt), b"KVM1", master_key, master_aad(who.account_id, unlocker_id, "recovery_code"))
    unlocker = {**recovery_unlocker(salt=salt, wrapped=wrapped_master), "unlocker_id": unlocker_id}
    assert gw.client.post("/v1/me/keyvault", json={"master_key_id": master_key_id, "unlockers": [unlocker]}, headers=who.session).status_code == 201
    record = json.dumps({"v": 1, "jobId": job_id, "outputKey": b64e(output_key), "signingPublicKey": b64e(signing_key),
                         "contentDigest": "ab" * 32, "meta": {"prompt": "a kite over dunes"}}).encode()
    put = gw.client.put(f"/v1/me/keyvault/job-keys/{job_id}",
                        json={"master_key_id": master_key_id, "wrapped": seal(master_key, b"KVJ1", record, job_aad(who.account_id, job_id))},
                        headers=who.session)
    assert put.status_code == 200 and put.json()["created"] is True and put.json()["version"] == 2

    # Another device: only the session and the recovery code.
    vault = gw.client.get("/v1/me/keyvault", headers=who.session)
    assert vault.status_code == 200 and vault.headers["cache-control"] == "no-store"
    body = vault.json()
    assert (body["master_key_id"], body["version"], body["job_key_count"]) == (master_key_id, 2, 1)
    [got_unlocker] = body["unlockers"]
    params = got_unlocker["params"]
    kek = recovery_kek(CODE, b64d(params["salt"]), params["iterations"])
    unwrapped = unseal(kek, b"KVM1", got_unlocker["wrapped_master_key"], master_aad(who.account_id, got_unlocker["unlocker_id"], "recovery_code"))
    assert unwrapped == master_key
    [job_key] = body["job_keys"]
    opened = json.loads(unseal(unwrapped, b"KVJ1", job_key["wrapped"], job_aad(who.account_id, job_id)))
    assert b64d(opened["outputKey"]) == output_key and opened["meta"]["prompt"] == "a kite over dunes"

    # The associated data binds a record to its account and job: moved elsewhere, it doesn't open.
    with pytest.raises(Exception):
        unseal(unwrapped, b"KVJ1", job_key["wrapped"], job_aad(who.account_id, str(uuid.uuid4())))
    with pytest.raises(Exception):
        unseal(unwrapped, b"KVJ1", job_key["wrapped"], job_aad(uuid.uuid4().hex, job_id))

    # Nothing stored opens anything by itself.
    stored = stored_text(gw)
    for secret in (master_key, output_key, kek):
        assert b64e(secret) not in stored and secret.hex() not in stored
    assert "a kite over dunes" not in stored and CODE not in stored and normalize(CODE).decode() not in stored


def test_unwrapped_keys_unknown_fields_and_weak_parameters_are_refused(gw):
    who = customer(gw)
    master_key_id = uuid.uuid4().hex
    raw_key = b64e(os.urandom(32))

    def create(unlocker: dict, **extra):
        return gw.client.post("/v1/me/keyvault", json={"master_key_id": master_key_id, "unlockers": [unlocker], **extra}, headers=who.session)

    cases = {
        "a bare 32-byte key": (create({**recovery_unlocker(), "wrapped_master_key": raw_key}), "not_wrapped"),
        "the wrong magic": (create({**recovery_unlocker(), "wrapped_master_key": b64e(b"KVJ1" + os.urandom(60))}), "not_wrapped"),
        "a short value": (create({**recovery_unlocker(), "wrapped_master_key": b64e(b"KVM1" + os.urandom(44))}), "not_wrapped"),
        "padding": (create({**recovery_unlocker(), "wrapped_master_key": fake_master() + "=="}), "invalid_encoding"),
        "standard base64": (create({**recovery_unlocker(), "wrapped_master_key": "+" + fake_master()[1:]}), "invalid_encoding"),
        "too few iterations": (create(recovery_unlocker(iterations=100_000)), "weak_kdf"),
        "too many iterations": (create(recovery_unlocker(iterations=key_vault.PBKDF2_MAX_ITERATIONS + 1)), "weak_kdf"),
        "a boolean iteration count": (create(recovery_unlocker(iterations=True)), "weak_kdf"),
        "another KDF": (create(recovery_unlocker(alg="PBKDF2-SHA1")), "invalid_params"),
        "a short salt": (create(recovery_unlocker(salt=os.urandom(8))), "invalid_params"),
        "a recovery code in params": (create(recovery_unlocker(code=CODE)), "invalid_params"),
        "a short PRF salt": (create(passkey_unlocker(prf_salt=b64e(os.urandom(16)))), "invalid_params"),
        "a PRF output in params": (create(passkey_unlocker(prf_output=raw_key)), "invalid_params"),
        "an upper-case rp id": (create(passkey_unlocker(rp_id="KunoWorld.com")), "invalid_params"),
        "a bad master key id": (gw.client.post("/v1/me/keyvault", json={"master_key_id": "X" * 32, "unlockers": [recovery_unlocker()]},
                                               headers=who.session), "invalid_id"),
        "a control character in a label": (create({**passkey_unlocker(), "label": "a\x00b"}), "invalid_label"),
    }
    for name, (response, code) in cases.items():
        assert response.status_code == 422, name
        assert code_of(response) == code, name
    # Fields the vault doesn't define are refused outright, so a key can't ride along unnoticed.
    assert create(recovery_unlocker(), master_key=raw_key).status_code == 422
    assert create({**recovery_unlocker(), "master_key": raw_key}).status_code == 422
    assert gw.client.get("/v1/me/keyvault", headers=who.session).json()["detail"]["code"] == "no_vault"

    job_id = add_job(gw, who.account_id)
    make_vault(gw, who)
    vault = gw.client.get("/v1/me/keyvault", headers=who.session).json()

    def put(wrapped, **extra):
        return gw.client.put(f"/v1/me/keyvault/job-keys/{job_id}", json={"master_key_id": vault["master_key_id"], "wrapped": wrapped, **extra},
                             headers=who.session)

    assert code_of(put(raw_key)) == "not_wrapped"
    assert code_of(put(b64e(b"KVJ1" + os.urandom(40)))) == "not_wrapped"
    assert code_of(put(b64e(b"KVM1" + os.urandom(200)))) == "not_wrapped"
    assert code_of(put("K" * (key_vault.MAX_WRAPPED_JOB_CHARS + 1))) == "too_large"
    assert put(fake_job_key(), output_key=raw_key).status_code == 422
    assert gw.client.get("/v1/me/keyvault", headers=who.session).json()["job_key_count"] == 0
    # The largest value allowed fits.
    largest = fake_job_key(3 * key_vault.MAX_WRAPPED_JOB_CHARS // 4 - 4)
    assert len(largest) <= key_vault.MAX_WRAPPED_JOB_CHARS and put(largest).status_code == 200
    assert raw_key not in stored_text(gw)


def test_only_the_web_session_reaches_key_sync(gw):
    who = customer(gw)
    make_vault(gw, who)
    job_id = add_job(gw, who.account_id)
    for method, path, body in (
        ("GET", "/v1/me/keyvault", None),
        ("POST", "/v1/me/keyvault", {"master_key_id": uuid.uuid4().hex, "unlockers": [recovery_unlocker()]}),
        ("DELETE", "/v1/me/keyvault", None),
        ("POST", "/v1/me/keyvault/unlockers", {"master_key_id": uuid.uuid4().hex, "unlocker": passkey_unlocker()}),
        ("PUT", f"/v1/me/keyvault/job-keys/{job_id}", {"master_key_id": uuid.uuid4().hex, "wrapped": fake_job_key()}),
        ("DELETE", f"/v1/me/keyvault/job-keys/{job_id}", None),
        ("POST", "/v1/me/keyvault/rotate", {"expected_version": 1, "master_key_id": uuid.uuid4().hex, "unlockers": [recovery_unlocker()]}),
    ):
        for headers in (who.api_key, {}):
            assert gw.client.request(method, path, json=body, headers=headers).status_code == 401, (method, path)
    assert gw.client.get("/v1/me/keyvault", headers=who.session).status_code == 200


def test_job_keys_belong_to_the_accounts_own_private_jobs_and_the_current_master_key(gw):
    who, other = customer(gw), customer(gw)
    mine, standard, theirs = add_job(gw, who.account_id), add_job(gw, who.account_id, "standard"), add_job(gw, other.account_id)

    def put(job_id, master_key_id):
        return gw.client.put(f"/v1/me/keyvault/job-keys/{job_id}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()},
                             headers=who.session)

    assert code_of(put(mine, uuid.uuid4().hex)) == "no_vault"
    master_key_id = make_vault(gw, who)
    assert code_of(gw.client.post("/v1/me/keyvault", json={"master_key_id": uuid.uuid4().hex, "unlockers": [recovery_unlocker()]},
                                  headers=who.session)) == "vault_exists"
    assert put(theirs, master_key_id).status_code == 404
    assert put(str(uuid.uuid4()), master_key_id).status_code == 404
    assert code_of(put(standard, master_key_id)) == "not_private"
    stale = put(mine, uuid.uuid4().hex)
    assert stale.status_code == 409 and code_of(stale) == "vault_changed" and stale.json()["detail"]["master_key_id"] == master_key_id
    assert put(mine, master_key_id).json()["created"] is True
    replaced = put(mine, master_key_id).json()
    assert replaced["created"] is False and replaced["version"] == 3
    # Another account's session sees nothing of this vault.
    assert code_of(gw.client.get("/v1/me/keyvault", headers=other.session)) == "no_vault"
    assert gw.client.delete(f"/v1/me/keyvault/job-keys/{mine}", headers=other.session).status_code == 204
    assert gw.client.get("/v1/me/keyvault", headers=who.session).json()["job_key_count"] == 1


def test_counts_are_limited(gw, monkeypatch):
    monkeypatch.setattr(key_vault, "MAX_JOB_KEYS", 2)
    monkeypatch.setattr(key_vault, "MAX_UNLOCKERS", 2)
    who = customer(gw)
    master_key_id = make_vault(gw, who)
    jobs = [add_job(gw, who.account_id) for _ in range(3)]
    answers = [
        gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
        for job in jobs
    ]
    assert [a.status_code for a in answers] == [200, 200, 409] and code_of(answers[2]) == "vault_full"
    add = lambda: gw.client.post("/v1/me/keyvault/unlockers", json={"master_key_id": master_key_id, "unlocker": passkey_unlocker()},  # noqa: E731
                                 headers=who.session)
    assert add().status_code == 201
    assert code_of(add()) == "too_many_unlockers"


def test_the_last_unlocker_stays(gw):
    who = customer(gw)
    first = recovery_unlocker()
    master_key_id = make_vault(gw, who, first)
    only = gw.client.delete(f"/v1/me/keyvault/unlockers/{first['unlocker_id']}", headers=who.session)
    assert only.status_code == 409 and code_of(only) == "last_unlocker"
    passkey = passkey_unlocker()
    added = gw.client.post("/v1/me/keyvault/unlockers", json={"master_key_id": master_key_id, "unlocker": passkey}, headers=who.session)
    assert added.status_code == 201 and added.json()["version"] == 2
    again = gw.client.post("/v1/me/keyvault/unlockers", json={"master_key_id": master_key_id, "unlocker": passkey}, headers=who.session)
    assert code_of(again) == "unlocker_exists"
    stale = gw.client.post("/v1/me/keyvault/unlockers", json={"master_key_id": uuid.uuid4().hex, "unlocker": passkey_unlocker()},
                           headers=who.session)
    assert code_of(stale) == "vault_changed"
    assert gw.client.delete(f"/v1/me/keyvault/unlockers/{first['unlocker_id']}", headers=who.session).json() == {"version": 3}
    [left] = gw.client.get("/v1/me/keyvault", headers=who.session).json()["unlockers"]
    assert (left["kind"], left["label"], left["params"]["transports"]) == ("passkey", "Laptop passkey", ["internal", "hybrid"])
    assert gw.client.delete(f"/v1/me/keyvault/unlockers/{uuid.uuid4().hex}", headers=who.session).status_code == 404


def test_rotation_replaces_every_wrapped_value_at_once_or_nothing(gw):
    who = customer(gw)
    old_unlocker = recovery_unlocker()
    master_key_id = make_vault(gw, who, old_unlocker)
    jobs = [add_job(gw, who.account_id) for _ in range(2)]
    for job in jobs:
        gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    before = gw.client.get("/v1/me/keyvault", headers=who.session).json()
    new_id = uuid.uuid4().hex
    rewrapped = {job: fake_job_key() for job in jobs}

    def rotate(**overrides):
        body = {"expected_version": before["version"], "master_key_id": new_id, "unlockers": [recovery_unlocker()],
                "job_keys": [{"job_id": j, "wrapped": w} for j, w in rewrapped.items()], **overrides}
        return gw.client.post("/v1/me/keyvault/rotate", json=body, headers=who.session)

    assert code_of(rotate(expected_version=before["version"] - 1)) == "vault_changed"
    missing = rotate(job_keys=[{"job_id": jobs[0], "wrapped": rewrapped[jobs[0]]}])
    assert code_of(missing) == "vault_changed" and missing.json()["detail"]["missing_job_ids"] == [jobs[1]]
    unknown = rotate(job_keys=[*({"job_id": j, "wrapped": w} for j, w in rewrapped.items()), {"job_id": str(uuid.uuid4()), "wrapped": fake_job_key()}])
    assert unknown.json()["detail"]["unknown_job_ids"]
    assert code_of(rotate(master_key_id=master_key_id)) == "same_master_key"
    assert code_of(rotate(unlockers=[old_unlocker])) == "unlocker_reused"
    assert code_of(rotate(job_keys=[{"job_id": jobs[0], "wrapped": b64e(os.urandom(32))}, {"job_id": jobs[1], "wrapped": rewrapped[jobs[1]]}])) == "not_wrapped"
    assert gw.client.get("/v1/me/keyvault", headers=who.session).json() == before

    rotated = rotate()
    assert rotated.status_code == 200, rotated.text
    after = gw.client.get("/v1/me/keyvault", headers=who.session).json()
    assert after["master_key_id"] == new_id and after["version"] == before["version"] + 1
    assert [u["unlocker_id"] for u in after["unlockers"]] != [old_unlocker["unlocker_id"]]
    assert {k["job_id"]: k["wrapped"] for k in after["job_keys"]} == rewrapped
    # Keys wrapped for the old master key are refused from now on.
    stale = gw.client.put(f"/v1/me/keyvault/job-keys/{jobs[0]}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    assert code_of(stale) == "vault_changed"


def test_job_keys_page_by_job_id(gw):
    who = customer(gw)
    master_key_id = make_vault(gw, who)
    jobs = sorted(add_job(gw, who.account_id) for _ in range(5))
    for job in jobs:
        gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    seen, cursor = [], None
    while True:
        page = gw.client.get("/v1/me/keyvault", params={"limit": 2, **({"cursor": cursor} if cursor else {})}, headers=who.session).json()
        assert len(page["job_keys"]) <= 2 and page["job_key_count"] == 5
        seen += [k["job_id"] for k in page["job_keys"]]
        cursor = page["next_cursor"]
        if cursor is None:
            break
    assert seen == jobs


def test_deleting_a_video_deletes_its_wrapped_key(gw):
    who = customer(gw)
    master_key_id = make_vault(gw, who)
    kept, deleted_by_session, deleted_by_key = (add_job(gw, who.account_id) for _ in range(3))
    for job in (kept, deleted_by_session, deleted_by_key):
        gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    assert gw.client.delete(f"/v1/videos/{deleted_by_session}", headers=who.session).status_code == 204
    assert gw.client.delete(f"/v1/videos/{deleted_by_key}", headers=who.api_key).status_code == 204
    assert [k["job_id"] for k in gw.client.get("/v1/me/keyvault", headers=who.session).json()["job_keys"]] == [kept]


def test_turning_key_sync_off_purging_and_exporting(gw):
    who, other = customer(gw), customer(gw)
    master_key_id = make_vault(gw, who, recovery_unlocker(), passkey_unlocker())
    job = add_job(gw, who.account_id)
    wrapped = fake_job_key()
    gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": wrapped}, headers=who.session)
    make_vault(gw, other)

    with gw.state.session() as s:
        exported = key_vault.export_account(s, who.account_id)
        assert key_vault.export_account(s, uuid.uuid4().hex) | {"about": None} == {"about": None, "vault": None, "unlockers": [], "job_keys": []}
    assert exported["vault"]["master_key_id"] == master_key_id
    assert [k["wrapped"] for k in exported["job_keys"]] == [wrapped]
    assert {u["kind"] for u in exported["unlockers"]} == {"recovery_code", "passkey"}
    assert all(set(u) == {"unlocker_id", "kind", "label", "params", "wrapped_master_key", "created_at"} for u in exported["unlockers"])

    assert gw.client.delete("/v1/me/keyvault", headers=who.session).status_code == 204
    assert code_of(gw.client.get("/v1/me/keyvault", headers=who.session)) == "no_vault"
    assert gw.client.delete("/v1/me/keyvault", headers=who.session).status_code == 204
    with gw.state.session() as s, s.begin():
        assert key_vault.purge_account(s, other.account_id) == {"vaults": 1, "unlockers": 1, "job_keys": 0}
        assert s.scalars(select(KeyVaultUnlocker)).all() == [] and s.scalars(select(KeyVaultJobKey)).all() == []


def test_vault_deletions_leave_tombstones_when_the_backup_module_is_installed(gw, monkeypatch):
    recorded = []
    installed = importlib.util.find_spec("kuno_gateway.tombstones") is not None
    if installed:
        import kuno_gateway.tombstones as tombstones

        original = tombstones.record

        def record(s, kind, ref, account_id=None, now=None):
            recorded.append((kind, ref, account_id))
            return original(s, kind, ref, account_id=account_id, now=now)

        monkeypatch.setattr(tombstones, "record", record)
    else:
        fake = types.ModuleType("kuno_gateway.tombstones")
        fake.__spec__ = importlib.machinery.ModuleSpec("kuno_gateway.tombstones", None)
        fake.record = lambda s, kind, ref, account_id=None, now=None: recorded.append((kind, ref, account_id))
        monkeypatch.setitem(sys.modules, "kuno_gateway.tombstones", fake)
        monkeypatch.setattr(kuno_gateway, "tombstones", fake, raising=False)

    who = customer(gw)
    first, second = recovery_unlocker(), passkey_unlocker()
    master_key_id = make_vault(gw, who, first, second)
    job = add_job(gw, who.account_id)
    gw.client.put(f"/v1/me/keyvault/job-keys/{job}", json={"master_key_id": master_key_id, "wrapped": fake_job_key()}, headers=who.session)
    gw.client.delete(f"/v1/me/keyvault/unlockers/{second['unlocker_id']}", headers=who.session)
    gw.client.delete(f"/v1/videos/{job}", headers=who.session)
    gw.client.delete("/v1/me/keyvault", headers=who.session)
    # Other modules record their own kinds for the same deletions (blobs, videos); these are the vault's.
    assert [r for r in recorded if r[0].startswith("key_vault")] == [
        ("key_vault_unlocker", second["unlocker_id"], who.account_id),
        ("key_vault_job_key", job, who.account_id),
        ("key_vault", who.account_id, who.account_id),
    ]
