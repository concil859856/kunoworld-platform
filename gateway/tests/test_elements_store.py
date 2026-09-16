"""Elements (elements.py, /v1/elements): only sealed records, wrapped keys and sealed files are accepted, in the documented
formats; owner-only access with an API key or the web session; revisions; replacement and deletion that remove the
ciphertext; limits; key sync rotation re-wrapping every Element; and the closure, export and restore paths.

The client here does what the SDKs do (sdk/js/src/elements.ts), with the Python cryptography primitives."""

from __future__ import annotations

import io
import json
import os
import time
import uuid
import zipfile
from types import SimpleNamespace

import pytest
from account_sessions import build_exports, signed_in
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.blobs import decrypt_blob, encrypt_blob
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.sealed_payload import pad_payload, unpad_payload
from sqlalchemy import select

from kuno_gateway import account_closure, elements, tombstones
from kuno_gateway.app import create_app
from kuno_gateway.db import Blob
from kuno_gateway.db_elements import Element, ElementFile
from kuno_gateway.db_storage import DeletionTombstone
from kuno_gateway.db_vault import KeyVault
from kuno_gateway.settings import Settings
from test_key_vault_constraints import customer, make_vault, recovery_unlocker

PNG = b"\x89PNG\r\n\x1a\n" + b"a silver-haired woman in a green raincoat" * 20


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    app = create_app(settings)
    return SimpleNamespace(client=TestClient(app), state=app.state.gw, settings=settings)


# ------------------------------------------------------------------ what a client does (sdk/js/src/elements.ts)


def elements_key(master_key: bytes, account_id: str) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=b"kuno/elements/v1", info=f"elements-key|{account_id}".encode()).derive(master_key)


def key_aad(account_id: str, element_id: str) -> bytes:
    return f"KVE1|kuno/elements/element-key|{account_id}|{element_id}".encode()


def wrap(key: bytes, account_id: str, element_id: str, element_key: bytes) -> str:
    iv = os.urandom(12)
    return b64e(b"KVE1" + iv + AESGCM(key).encrypt(iv, element_key, key_aad(account_id, element_id)))


def unwrap(key: bytes, account_id: str, element_id: str, wrapped: str) -> bytes:
    raw = b64d(wrapped)
    assert raw[:4] == b"KVE1"
    return AESGCM(key).decrypt(raw[4:16], raw[16:], key_aad(account_id, element_id))


def seal_meta(element_key: bytes, element_id: str, record: dict) -> str:
    return b64e(encrypt_blob(element_key, f"element/{element_id}/meta", pad_payload(json.dumps(record).encode())))


def open_meta(element_key: bytes, element_id: str, meta: str) -> dict:
    return json.loads(unpad_payload(decrypt_blob(element_key, f"element/{element_id}/meta", b64d(meta))))


def seal_file(element_key: bytes, element_id: str, position: int, data: bytes) -> bytes:
    return encrypt_blob(element_key, f"element/{element_id}/file/{position}", data)


def record(name: str = "Mara", kind: str = "character", **extra) -> dict:
    return {
        "v": 1, "kind": kind, "name": name,
        "description": "a woman in her 60s with short silver hair and a green raincoat",
        "consent": {"subject": "Mara Jones", "relationship": "permission", "grantedOn": "2026-09-01", "use": "videos", "affirmedAt": 1},
        "files": [{"mime": "image/png", "size": len(PNG)}], **extra,
    }


class Client:
    """One account's Elements client: its key sync master key, and the credential it calls with."""

    def __init__(self, gw, who, headers: dict | None = None):
        self.gw, self.who = gw, who
        self.headers = headers or who.api_key
        self.master_key = os.urandom(32)
        self.master_key_id = make_vault(gw, who)
        self.keys: dict[str, bytes] = {}

    @property
    def elements_key(self) -> bytes:
        return elements_key(self.master_key, self.who.account_id)

    def upload(self, sealed: bytes, headers: dict | None = None) -> str:
        uploaded = self.gw.client.post("/v1/blobs", content=sealed, headers=headers or self.headers)
        assert uploaded.status_code == 201, uploaded.text
        return uploaded.json()["blob_id"]

    def body(self, element_id: str, *, files: list[bytes] | None = (PNG,), name: str = "Mara", new_key: bool = True, **extra) -> dict:
        if new_key or element_id not in self.keys:
            self.keys[element_id] = os.urandom(32)
        key = self.keys[element_id]
        body = {
            "master_key_id": self.master_key_id,
            "meta": seal_meta(key, element_id, record(name)),
            "affirm_rules": True,
        }
        if files is not None:
            body["wrapped_key"] = wrap(self.elements_key, self.who.account_id, element_id, key)
            body["file_blob_ids"] = [self.upload(seal_file(key, element_id, i, data)) for i, data in enumerate(files)]
        return {**body, **extra}

    def put(self, element_id: str, body: dict, headers: dict | None = None):
        return self.gw.client.put(f"/v1/elements/{element_id}", json=body, headers=headers or self.headers)

    def create(self, element_id: str | None = None, **kwargs) -> dict:
        element_id = element_id or uuid.uuid4().hex
        made = self.put(element_id, self.body(element_id, **kwargs))
        assert made.status_code == 201, made.text
        return made.json()


def code_of(response) -> str:
    return response.json()["detail"]["code"]


def objects_exist(gw, blob_ids) -> list[bool]:
    return [gw.state.blobs.exists(b) for b in blob_ids]


# ------------------------------------------------------------------ tests


def test_an_element_round_trips_as_ciphertext_with_an_api_key_or_the_session_and_opens_only_with_the_elements_key(gw):
    who = customer(gw)
    element_id = uuid.uuid4().hex
    no_vault = gw.client.put(f"/v1/elements/{element_id}", headers=who.api_key, json={
        "master_key_id": uuid.uuid4().hex, "meta": b64e(encrypt_blob(os.urandom(32), "x", pad_payload(b"{}"))), "affirm_rules": True,
    })
    assert no_vault.status_code == 409 and code_of(no_vault) == "no_vault"

    client = Client(gw, who)
    made = client.create(element_id)
    assert made["revision"] == 1 and made["master_key_id"] == client.master_key_id and len(made["files"]) == 1
    assert set(made) == {"element_id", "revision", "master_key_id", "wrapped_key", "meta", "files", "files_bytes", "created_at", "updated_at"}

    # Another device with the session: the listing, the file, and the key sync master key open everything.
    listed = gw.client.get("/v1/elements", headers=who.session)
    assert listed.status_code == 200 and listed.headers["cache-control"] == "no-store"
    page = listed.json()
    assert (page["count"], page["master_key_id"], page["next_cursor"]) == (1, client.master_key_id, None)
    assert page["limits"]["max_files"] == 4 and page["stored_bytes"] == made["files_bytes"]
    [row] = page["elements"]
    element_key = unwrap(client.elements_key, who.account_id, element_id, row["wrapped_key"])
    assert open_meta(element_key, element_id, row["meta"])["name"] == "Mara"
    got = gw.client.get(f"/v1/elements/{element_id}/files/0", headers=who.session)
    assert got.status_code == 200 and got.headers["etag"] == f'"{row["files"][0]["sha256"]}"'
    assert decrypt_blob(element_key, f"element/{element_id}/file/0", got.content) == PNG
    ranged = gw.client.get(f"/v1/elements/{element_id}/files/0", headers={**who.session, "range": "bytes=0-5"})
    assert ranged.status_code == 206 and ranged.content == b"KUNOB1"

    # The key is bound to its account and Element, and to the Elements key of this master key.
    with pytest.raises(Exception):
        unwrap(client.elements_key, who.account_id, uuid.uuid4().hex, row["wrapped_key"])
    with pytest.raises(Exception):
        unwrap(elements_key(client.master_key, uuid.uuid4().hex), who.account_id, element_id, row["wrapped_key"])
    with pytest.raises(Exception):
        decrypt_blob(element_key, f"element/{element_id}/file/1", got.content)

    # Nothing stored is readable: no name, description or picture in the database or the blob store.
    db = (gw.settings.data_dir / "gateway.db").read_bytes()
    store = b"".join(p.read_bytes() for p in (gw.settings.data_dir / "blobs").iterdir() if p.is_file())
    for plain in (b"Mara", b"silver hair", b"green raincoat", b"character", PNG[:16]):
        assert plain not in db and plain not in store
    assert b64e(element_key).encode() not in db and b64e(client.master_key).encode() not in db

    # The upload now belongs to the Element: the blob routes don't serve it, and the upload sweep leaves it.
    blob_id = row_blob_ids(gw, who.account_id, element_id)[0]
    assert gw.client.get(f"/v1/blobs/{blob_id}", headers=who.api_key).status_code == 404
    gw.state.janitor()
    assert objects_exist(gw, [blob_id]) == [True]


def row_blob_ids(gw, account_id: str, element_id: str) -> list[str]:
    with gw.state.session() as s:
        return [f.blob_id for f in elements.files_of(s, account_id, element_id)]


def test_unsealed_records_files_and_unwrapped_keys_are_refused(gw):
    who = customer(gw)
    client = Client(gw, who)
    element_id = uuid.uuid4().hex
    key = os.urandom(32)
    good = client.body(element_id)

    def attempt(**change):
        return client.put(element_id, {**good, **change})

    small_meta = b64e(encrypt_blob(key, f"element/{element_id}/meta", json.dumps(record()).encode()))
    v1_file = client.upload(encrypt_blob(key, f"element/{element_id}/file/0", PNG, version=1))
    cases = {
        "a bare element key": (attempt(wrapped_key=b64e(key)), 422, "not_wrapped"),
        "a job key's magic": (attempt(wrapped_key=b64e(b"KVJ1" + os.urandom(60))), 422, "not_wrapped"),
        "a record not padded to 4 KiB": (attempt(meta=small_meta), 422, "not_sealed"),
        "a plain JSON record": (attempt(meta=b64e(json.dumps(record()).encode().ljust(5000))), 422, "not_sealed"),
        "an unpadded (version 1) file": (attempt(file_blob_ids=[v1_file]), 422, "not_sealed"),
        "standard base64": (attempt(meta="+" + good["meta"][1:]), 422, "invalid_encoding"),
        "a bad id": (client.put("E" * 32, good), 422, "invalid_id"),
        "no files": (attempt(file_blob_ids=[]), 422, "invalid_files"),
        "five files": (attempt(file_blob_ids=[client.upload(seal_file(key, element_id, i, PNG)) for i in range(5)]), 422, "invalid_files"),
        "the same upload twice": (attempt(file_blob_ids=good["file_blob_ids"] * 2), 422, "invalid_files"),
        "an unknown upload": (attempt(file_blob_ids=[uuid.uuid4().hex]), 422, "invalid_files"),
        "rules not affirmed": (attempt(affirm_rules=False), 422, "rules_not_affirmed"),
        "a stale key generation": (attempt(master_key_id=uuid.uuid4().hex), 409, "vault_changed"),
        "no wrapped key on a new Element": (attempt(wrapped_key=None), 422, "invalid_files"),
    }
    for name, (response, status, code) in cases.items():
        assert (response.status_code, code_of(response)) == (status, code), name
    # Fields the store doesn't define are refused, so nothing readable rides along.
    assert attempt(name="Mara").status_code == 422
    assert attempt(kind="character").status_code == 422
    # Nothing was stored by any of it, and the good request still works.
    with gw.state.session() as s:
        assert s.scalars(select(Element)).all() == []
    assert client.put(element_id, good).status_code == 201

    # Another account's upload, or one already claimed, can't be named.
    other = Client(gw, customer(gw))
    mine = other.body(uuid.uuid4().hex)
    theirs = client.put(uuid.uuid4().hex, {**client.body(uuid.uuid4().hex), "file_blob_ids": mine["file_blob_ids"]})
    assert theirs.status_code == 422 and code_of(theirs) == "invalid_files"
    again = client.put(uuid.uuid4().hex, {**client.body(uuid.uuid4().hex), "file_blob_ids": good["file_blob_ids"]})
    assert again.status_code == 422 and code_of(again) == "invalid_files"


def test_only_the_owner_reads_or_deletes_an_element(gw):
    alice, bob = Client(gw, customer(gw)), Client(gw, customer(gw))
    element_id = alice.create()["element_id"]
    for path in (f"/v1/elements/{element_id}", f"/v1/elements/{element_id}/files/0"):
        assert gw.client.get(path, headers=bob.who.api_key).status_code == 404
        assert gw.client.get(path, headers=bob.who.session).status_code == 404
        assert gw.client.get(path).status_code == 401
    assert gw.client.get("/v1/elements", headers=bob.who.api_key).json()["elements"] == []
    assert gw.client.delete(f"/v1/elements/{element_id}", headers=bob.who.api_key).status_code == 204
    assert gw.client.get(f"/v1/elements/{element_id}", headers=alice.who.session).status_code == 200
    # Bob using the same id makes his own Element; Alice's is untouched.
    assert bob.put(element_id, bob.body(element_id)).status_code == 201
    assert gw.client.get(f"/v1/elements/{element_id}", headers=alice.who.api_key).json()["revision"] == 1
    assert gw.client.get("/v1/elements/" + "0" * 32 + "/files/9", headers=alice.who.api_key).status_code == 404


def test_revisions_replacing_files_or_only_the_record_and_deleting_remove_the_ciphertext(gw):
    who = customer(gw)
    client = Client(gw, who)
    element_id = uuid.uuid4().hex
    made = client.create(element_id, files=[PNG, PNG + b"side view"])
    first_objects = row_blob_ids(gw, who.account_id, element_id)
    assert objects_exist(gw, first_objects) == [True, True]

    exists = client.put(element_id, client.body(element_id, new_key=False))
    assert exists.status_code == 409 and code_of(exists) == "element_exists" and exists.json()["detail"]["revision"] == 1
    missing = client.put(uuid.uuid4().hex, client.body(uuid.uuid4().hex, expected_revision=1))
    assert missing.status_code == 404

    # A new name only: the files and the element key stay, and sending a key is refused.
    rename = client.body(element_id, files=None, new_key=False, name="Mara (older)", expected_revision=1)
    with_key = client.put(element_id, {**rename, "wrapped_key": made["wrapped_key"]})
    assert with_key.status_code == 422 and code_of(with_key) == "wrapped_key_unexpected"
    renamed = client.put(element_id, rename)
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()["revision"] == 2 and renamed.json()["wrapped_key"] == made["wrapped_key"]
    assert row_blob_ids(gw, who.account_id, element_id) == first_objects
    key = unwrap(client.elements_key, who.account_id, element_id, renamed.json()["wrapped_key"])
    assert open_meta(key, element_id, renamed.json()["meta"])["name"] == "Mara (older)"

    stale = client.put(element_id, client.body(element_id, files=None, new_key=False, expected_revision=1))
    assert stale.status_code == 409 and code_of(stale) == "element_changed" and stale.json()["detail"]["revision"] == 2
    no_key = client.body(element_id, expected_revision=2)
    no_key.pop("wrapped_key")
    assert code_of(client.put(element_id, no_key)) == "wrapped_key_required"

    # New files come with a new key; the old objects are deleted once it commits, each with a tombstone.
    replaced = client.put(element_id, client.body(element_id, files=[PNG + b"front"], expected_revision=2))
    assert replaced.status_code == 200 and replaced.json()["revision"] == 3 and len(replaced.json()["files"]) == 1
    assert replaced.json()["wrapped_key"] != made["wrapped_key"]
    assert objects_exist(gw, first_objects) == [False, False]
    with gw.state.session() as s:
        kinds = {(t.kind, t.ref) for t in s.scalars(select(DeletionTombstone))}
    assert {("blob", b) for b in first_objects} <= kinds

    latest = row_blob_ids(gw, who.account_id, element_id)
    assert gw.client.delete(f"/v1/elements/{element_id}", headers=who.session).status_code == 204
    assert gw.client.get(f"/v1/elements/{element_id}", headers=who.session).status_code == 404
    assert objects_exist(gw, latest) == [False]
    with gw.state.session() as s:
        assert s.scalars(select(ElementFile)).all() == []
        assert ("element", element_id) in {(t.kind, t.ref) for t in s.scalars(select(DeletionTombstone))}
    assert gw.client.delete(f"/v1/elements/{element_id}", headers=who.session).status_code == 204


def test_a_restore_that_brings_an_element_back_is_undone_by_its_tombstones(gw):
    who = customer(gw)
    client = Client(gw, who)
    made = client.create()
    element_id = made["element_id"]
    [blob_id] = row_blob_ids(gw, who.account_id, element_id)
    backup = gw.state.blobs.get(blob_id)
    with gw.state.session() as s:
        row = s.get(Element, (who.account_id, element_id))
        saved_row = {c.name: getattr(row, c.name) for c in Element.__table__.columns}
        [file] = elements.files_of(s, who.account_id, element_id)
        saved_file = {c.name: getattr(file, c.name) for c in ElementFile.__table__.columns}
    since = time.time() - 1
    assert gw.client.delete(f"/v1/elements/{element_id}", headers=who.api_key).status_code == 204

    # The database and the bucket come back from before the deletion.
    with gw.state.session() as s, s.begin():
        s.add(Element(**saved_row))
        s.add(ElementFile(**saved_file))
    gw.state.blobs.root.joinpath(blob_id).write_bytes(backup)
    report = tombstones.reapply(gw.state, since, source="db")
    assert report.count(tombstones.DELETED, "element") == 1, report.lines()
    with gw.state.session() as s:
        assert s.get(Element, (who.account_id, element_id)) is None and s.scalars(select(ElementFile)).all() == []
    assert objects_exist(gw, [blob_id]) == [False]
    assert tombstones.reapply(gw.state, since, source="db").count(tombstones.DELETED) == 0


def test_limits_on_count_file_size_account_storage_and_write_rate(gw, monkeypatch):
    who = customer(gw)
    client = Client(gw, who)
    monkeypatch.setattr(elements, "MAX_ELEMENTS", 2)
    client.create()
    client.create()
    full = client.put(uuid.uuid4().hex, client.body(uuid.uuid4().hex))
    assert full.status_code == 409 and code_of(full) == "elements_full"
    monkeypatch.setattr(elements, "MAX_ELEMENTS", 200)

    monkeypatch.setattr(elements, "MAX_FILE_BYTES", 1024)
    big = client.put(uuid.uuid4().hex, client.body(uuid.uuid4().hex, files=[os.urandom(4096)]))
    assert big.status_code == 413 and code_of(big) == "too_large"
    monkeypatch.setattr(elements, "MAX_FILE_BYTES", 16 * 1024 * 1024)

    with gw.state.session() as s:
        used = elements.stored_bytes(s, who.account_id)
    monkeypatch.setattr(elements, "MAX_ACCOUNT_BYTES", used + 10)
    storage = client.put(uuid.uuid4().hex, client.body(uuid.uuid4().hex))
    assert storage.status_code == 409 and code_of(storage) == "storage_full"
    monkeypatch.setattr(elements, "MAX_ACCOUNT_BYTES", 2 * 1024 ** 3)

    gw.settings.element_writes_per_minute = 1
    other = Client(gw, customer(gw))
    assert other.put(uuid.uuid4().hex, other.body(uuid.uuid4().hex)).status_code == 201
    limited = other.put(uuid.uuid4().hex, other.body(uuid.uuid4().hex))
    assert limited.status_code == 429 and code_of(limited) == "rate_limited"
    assert gw.client.get("/v1/elements", headers=other.headers).status_code == 200


def test_a_rotation_rewraps_every_element_key_and_refuses_a_stale_or_partial_set(gw):
    who = customer(gw)
    client = Client(gw, who)
    a, b = client.create()["element_id"], client.create()["element_id"]
    vault = gw.client.get("/v1/me/keyvault?limit=0", headers=who.session).json()
    # Two writes and the vault's creation: every Element write moves the version a rotation must name.
    assert vault["version"] == 3

    new_master, new_id = os.urandom(32), uuid.uuid4().hex
    new_elements_key = elements_key(new_master, who.account_id)
    listed = {e["element_id"]: e for e in gw.client.get("/v1/elements", headers=who.session).json()["elements"]}

    def rewrapped(element_id: str) -> dict:
        key = unwrap(client.elements_key, who.account_id, element_id, listed[element_id]["wrapped_key"])
        return {"element_id": element_id, "wrapped_key": wrap(new_elements_key, who.account_id, element_id, key)}

    def rotate(version: int, element_keys: list[dict]):
        return gw.client.post("/v1/me/keyvault/rotate", headers=who.session, json={
            "expected_version": version, "master_key_id": new_id, "unlockers": [recovery_unlocker()], "job_keys": [],
            "element_keys": element_keys,
        })

    partial = rotate(3, [rewrapped(a)])
    assert partial.status_code == 409 and code_of(partial) == "vault_changed"
    assert partial.json()["detail"]["missing_element_ids"] == [b]
    unwrapped = rotate(3, [rewrapped(a), {"element_id": b, "wrapped_key": b64e(os.urandom(32))}])
    assert unwrapped.status_code == 422 and code_of(unwrapped) == "not_wrapped"

    # A change on another device after the rotation was prepared moves the version, so the rotation is refused.
    renamed = client.put(a, client.body(a, files=None, new_key=False, name="Mara again", expected_revision=1))
    assert renamed.status_code == 200
    assert code_of(rotate(3, [rewrapped(a), rewrapped(b)])) == "vault_changed"

    done = rotate(4, [rewrapped(a), rewrapped(b)])
    assert done.status_code == 200, done.text
    after = {e["element_id"]: e for e in gw.client.get("/v1/elements", headers=who.session).json()["elements"]}
    assert {e["master_key_id"] for e in after.values()} == {new_id}
    for element_id, row in after.items():
        key = unwrap(new_elements_key, who.account_id, element_id, row["wrapped_key"])
        assert key == client.keys[element_id]
        assert open_meta(key, element_id, row["meta"])["kind"] == "character"
        with pytest.raises(Exception):
            unwrap(client.elements_key, who.account_id, element_id, row["wrapped_key"])
    # The old generation can't write any more.
    stale = client.put(uuid.uuid4().hex, client.body(uuid.uuid4().hex))
    assert stale.status_code == 409 and code_of(stale) == "vault_changed" and stale.json()["detail"]["master_key_id"] == new_id


def test_key_sync_stays_on_while_elements_need_it(gw):
    who = customer(gw)
    client = Client(gw, who)
    element_id = client.create()["element_id"]
    refused = gw.client.delete("/v1/me/keyvault", headers=who.session)
    assert refused.status_code == 409 and code_of(refused) == "elements_exist" and refused.json()["detail"]["count"] == 1
    with gw.state.session() as s:
        assert s.get(KeyVault, who.account_id) is not None
    assert gw.client.delete(f"/v1/elements/{element_id}", headers=who.session).status_code == 204
    assert gw.client.delete("/v1/me/keyvault", headers=who.session).status_code == 204


def test_closing_the_account_deletes_its_elements_and_the_export_carries_them_sealed(gw):
    alice = signed_in(gw, "alice@example.com", credit_usd=0)
    who = SimpleNamespace(account_id=alice.account_id, session=alice.headers, api_key=alice.headers)
    client = Client(gw, who)
    element_id = client.create(files=[PNG, PNG + b"profile"])["element_id"]

    requested = gw.client.post("/v1/me/exports", headers=alice.headers)
    assert requested.status_code == 202, requested.text
    assert build_exports(gw) == 1
    export_id = requested.json()["export_id"]
    [listed] = gw.client.get("/v1/me/exports", headers=alice.headers).json()
    assert (listed["contents"]["elements"], listed["contents"]["element_files"]) == (1, 2)
    zipped = gw.client.get(f"/v1/me/exports/{export_id}/download", headers=alice.headers)
    archive = zipfile.ZipFile(io.BytesIO(zipped.content))
    document = json.loads(archive.read("elements/elements.json"))
    [entry] = document["elements"]
    assert entry["element_id"] == element_id and entry["file_paths"] == [f"elements/{element_id}/0.kunob", f"elements/{element_id}/1.kunob"]
    key = unwrap(client.elements_key, alice.account_id, element_id, entry["wrapped_key"])
    assert decrypt_blob(key, f"element/{element_id}/file/1", archive.read(f"elements/{element_id}/1.kunob")) == PNG + b"profile"
    assert "elements/elements.json" in archive.read("README.txt").decode()
    assert b"Mara" not in zipped.content

    objects = row_blob_ids(gw, alice.account_id, element_id)
    closed = gw.client.post("/v1/me/close", json={"confirm_email": alice.email}, headers=alice.headers)
    assert closed.status_code == 200, closed.text
    with gw.state.session() as s:
        assert s.scalars(select(Element)).all() == [] and s.scalars(select(ElementFile)).all() == []
        assert ("element", element_id) in {(t.kind, t.ref) for t in s.scalars(select(DeletionTombstone))}
        assert s.scalars(select(Blob).where(Blob.id.in_(objects))).all() == []
    assert objects_exist(gw, objects) == [False, False]
    assert any("Elements" in item for item in account_closure.DELETES)
