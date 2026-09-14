"""Envelope encryption at rest: a data key per object, wrapped by a local key file, AWS KMS (moto) or Vault Transit
(a fake); objects sealed with the legacy KUNO_STANDARD_STORAGE_KEY; rotation in resumable batches; retirement; the
start-up canary; and data keys that commit or roll back with the caller's transaction."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import stat

import httpx
import pytest
from cryptography.hazmat.primitives.ciphers.aead import ChaCha20Poly1305
from sqlalchemy import func, select

from kuno_gateway import storage_keys
from kuno_gateway.app import create_app
from kuno_gateway.db import Nonce
from kuno_gateway.db_storage import DeletionTombstone, StorageDataKey, StorageKek
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState
from kuno_gateway.storage_keys import (
    ACTIVE,
    PREVIOUS,
    RETIRED,
    CanaryFailed,
    DataKeyGone,
    KekConfig,
    KekUnavailable,
    LocalKekProvider,
    Providers,
    StorageKeyring,
    dek_context,
    rotate,
)
from kuno_gateway.vault import ENVELOPE_MAGIC, vault
from kuno_protocol import devkit
from kuno_protocol.blobs import encrypt_blob
from kuno_protocol.canonical import b64e
from kuno_protocol.crypto import DecryptionError

VAULT_TOKEN = "hvs.test-token-never-logged"


def new_state(data_dir, **env) -> GatewayState:
    if not (data_dir / "manifest.json").exists():
        devkit.init(data_dir)
    return GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(data_dir), **env}))


def unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def dek_id_of(sealed: bytes) -> str:
    assert sealed[:6] == ENVELOPE_MAGIC and sealed[6] == 1
    return sealed[7:23].hex()


def keks(state) -> dict[int, tuple[str, str, str, str]]:
    with state.session() as s:
        return {k.version: (k.provider, k.key_id, k.provider_version, k.status) for k in s.scalars(select(StorageKek)).all()}


def on_version(state, version: int) -> int:
    with state.session() as s:
        return s.scalar(select(func.count()).select_from(StorageDataKey).where(StorageDataKey.kek_version == version))


# ------------------------------------------------------------------ local key file


def test_every_object_gets_its_own_wrapped_data_key(tmp_path):
    state = new_state(tmp_path / "data")
    store = vault(state)
    first = store.seal("standard/video/job-1", b"first video")
    second = store.seal("standard/video/job-2", b"second video")
    assert first.startswith(b"KUNOE1") and b"first video" not in first
    assert dek_id_of(first) != dek_id_of(second)
    assert store.open("standard/video/job-1", first) == b"first video"
    with state.session() as s:
        row = s.get(StorageDataKey, dek_id_of(first))
        assert (row.label, row.kek_version) == ("standard/video/job-1", 1)
        data_key = state._kuno_keyring.data_key(row.id)
        assert base64.urlsafe_b64encode(data_key).rstrip(b"=").decode() not in row.wrapped_key
    key_file = tmp_path / "data" / "storage_kek.json"
    assert stat.S_IMODE(key_file.stat().st_mode) == 0o600
    assert keks(state)[1][0] == "local" and keks(state)[1][3] == ACTIVE

    # The label and the data key id are both bound in: another label, or a header pointing elsewhere, fails.
    with pytest.raises(DecryptionError):
        store.open("standard/video/job-2", first)
    swapped = first[:7] + second[7:23] + first[23:]
    with pytest.raises(DecryptionError):
        store.open("standard/video/job-1", swapped)
    sealed_secret = store.seal_secret("standard/output-key/job-1", b"k" * 32)
    assert store.open_secret("standard/output-key/job-1", sealed_secret) == b"k" * 32

    # A new process (cold cache) unwraps from the database with the key file.
    fresh = new_state(tmp_path / "data")
    assert vault(fresh).open("standard/video/job-2", second) == b"second video"


def test_a_deleted_data_key_makes_every_copy_unreadable(tmp_path):
    state = new_state(tmp_path / "data")
    store = vault(state)
    sealed = store.seal("standard/upload/u1", b"uploaded frame")
    backup_copy = bytes(sealed)
    with state.session() as s, s.begin():
        assert store.forget(s, ["standard/upload/u1", "standard/upload/never-sealed"], "acct1") == ["standard/upload/u1"]
    with pytest.raises(DataKeyGone):
        store.open("standard/upload/u1", backup_copy)
    with pytest.raises(KeyError):  # callers treat it as content that is gone
        vault(new_state(tmp_path / "data")).open("standard/upload/u1", backup_copy)
    with state.session() as s:
        [tombstone] = s.scalars(select(DeletionTombstone)).all()
        assert (tombstone.kind, tombstone.ref, tombstone.account_id) == ("data_key", "standard/upload/u1", "acct1")


def test_a_data_key_commits_or_rolls_back_with_the_callers_transaction(tmp_path):
    state = new_state(tmp_path / "data")
    store = vault(state)
    now = 1.0

    class Abort(Exception):
        pass

    with pytest.raises(Abort):
        with state.session() as s, s.begin():
            s.add(Nonce(nonce="a" * 64, expires_at=now))
            s.flush()  # the caller already holds SQLite's write lock: an own-transaction write here would wait on itself
            rolled_back = store.seal("standard/video/rolled-back", b"never kept")
            assert s.get(StorageDataKey, dek_id_of(rolled_back)) is not None
            raise Abort
    with state.session() as s:
        assert s.get(StorageDataKey, dek_id_of(rolled_back)) is None and s.get(Nonce, "a" * 64) is None

    with state.session() as s, s.begin():
        s.add(Nonce(nonce="b" * 64, expires_at=now))
        s.flush()
        kept = store.seal("standard/video/kept", b"kept")
        assert store.open("standard/video/kept", kept) == b"kept"  # readable before commit, in the same transaction
    outside = store.seal("standard/video/outside", b"own transaction")
    fresh = vault(new_state(tmp_path / "data"))
    assert fresh.open("standard/video/kept", kept) == b"kept"
    assert fresh.open("standard/video/outside", outside) == b"own transaction"


def test_start_up_refuses_a_key_file_that_changed_or_went_missing(tmp_path):
    data = tmp_path / "data"
    state = new_state(data)
    sealed = vault(state).seal("standard/video/j", b"video")
    key_file = data / "storage_kek.json"
    original = key_file.read_text()

    body = json.loads(original)
    body["versions"]["1"] = b64e(os.urandom(32))  # same key id, different material
    key_file.write_text(json.dumps(body))
    with pytest.raises(CanaryFailed, match="canary"):
        StorageKeyring(new_state(data)).check()

    key_file.unlink()
    with pytest.raises(CanaryFailed, match="missing"):
        StorageKeyring(new_state(data)).check()
    assert not key_file.exists()  # never silently replaced
    with pytest.raises(CanaryFailed):
        create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))

    key_file.write_text(original)
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))
    assert app.state.startup_report["storage_keys"]["active_version"] == 1
    assert vault(app.state.gw).open("standard/video/j", sealed) == b"video"


# ------------------------------------------------------------------ legacy KUNO_STANDARD_STORAGE_KEY (KEK v0)


def test_objects_sealed_with_the_legacy_key_keep_decrypting_through_import(tmp_path):
    data = tmp_path / "data"
    legacy = os.urandom(32)
    env = {"KUNO_STANDARD_STORAGE_KEY": b64e(legacy)}
    # What the gateway stored before envelope encryption: a bare protocol blob under the platform key.
    old_video = encrypt_blob(legacy, "at-rest/standard/video/old", b"an old video")
    old_hash_key = hmac.new(legacy, b"kuno/at-rest/keyed-hash", hashlib.sha256).digest()
    expected_pseudonym = hmac.new(old_hash_key, b"203.0.113.9", hashlib.sha256).hexdigest()

    state = new_state(data, **env)
    store = vault(state)
    assert store.open("standard/video/old", old_video) == b"an old video"
    assert store.keyed_hash("203.0.113.9") == expected_pseudonym  # reporter pseudonyms stay stable
    assert store.seal("standard/video/new", b"new").startswith(b"KUNOE1")
    assert keks(state)[0] == ("legacy", "KUNO_STANDARD_STORAGE_KEY", "", PREVIOUS)

    with pytest.raises(CanaryFailed, match="not the legacy storage key"):
        StorageKeyring(new_state(data, KUNO_STANDARD_STORAGE_KEY=b64e(os.urandom(32)))).check()

    report = rotate(new_state(data, **env))
    assert report.legacy_imported and any("KEK v0 retired" in line for line in report.lines())
    assert keks(state)[0][3] == RETIRED

    # The environment variable can go now: the legacy key lives on, wrapped by the KEK.
    without = new_state(data)
    assert without.settings.standard_storage_key is None
    assert vault(without).open("standard/video/old", old_video) == b"an old video"
    assert vault(without).keyed_hash("203.0.113.9") == expected_pseudonym


def test_without_any_legacy_key_a_legacy_object_does_not_open(tmp_path):
    state = new_state(tmp_path / "data")
    with pytest.raises(DecryptionError, match="legacy"):
        vault(state).open("standard/video/old", encrypt_blob(os.urandom(32), "at-rest/standard/video/old", b"x"))


# ------------------------------------------------------------------ rotation


def test_rotation_rewraps_in_resumable_batches_and_retires_the_old_version(tmp_path):
    data = tmp_path / "data"
    state = new_state(data)
    store = vault(state)
    sealed = {f"standard/video/j{i}": store.seal(f"standard/video/j{i}", f"video {i}".encode()) for i in range(7)}
    total = on_version(state, 1)  # the seven objects and the keyed-hash key
    assert total == 8

    dry = rotate(state, dry_run=True)
    assert dry.dry_run and dry.remaining == 0 and on_version(state, 1) == total  # already on the configured version

    interrupted = rotate(state, provider_rotate=True, batch_size=3, max_batches=2)
    assert (interrupted.target_version, interrupted.provider_version) == (2, "2")
    assert interrupted.rewrapped == 6 and interrupted.remaining == total - 6 and interrupted.retired == []
    assert keks(state)[1][3] == PREVIOUS and keks(state)[2][3] == ACTIVE
    # Sealing carries on during an interrupted rotation, under the new version.
    late = store.seal("standard/video/late", b"late")
    assert on_version(state, 2) == 7

    resumed = rotate(new_state(data), batch_size=3)
    assert resumed.rewrapped == total - 6 and resumed.remaining == 0 and resumed.retired == [1]
    assert keks(state)[1][3] == RETIRED
    assert any("keep retired key material" in line for line in resumed.lines())
    # The key file keeps version 1 until the operator removes it after backups age out.
    assert set(json.loads((data / "storage_kek.json").read_text())["versions"]) == {"1", "2"}

    fresh = vault(new_state(data))
    for label, blob in sealed.items():
        assert fresh.open(label, blob) == f"video {label[-1]}".encode()
    assert fresh.open("standard/video/late", late) == b"late"
    assert rotate(new_state(data)).rewrapped == 0  # nothing left to do


def test_rotation_moves_data_keys_from_a_local_file_to_aws_kms_and_back_to_rewrap_inside_kms(tmp_path, monkeypatch):
    boto3 = pytest.importorskip("boto3")
    moto = pytest.importorskip("moto")
    for key, value in {"AWS_ACCESS_KEY_ID": "testing", "AWS_SECRET_ACCESS_KEY": "testing", "AWS_DEFAULT_REGION": "us-east-1"}.items():
        monkeypatch.setenv(key, value)
    data = tmp_path / "data"
    with moto.mock_aws():
        kms = boto3.client("kms", region_name="us-east-1")
        first = kms.create_key(Description="kuno storage 1")["KeyMetadata"]
        kms.create_alias(AliasName="alias/kuno-storage", TargetKeyId=first["KeyId"])
        second = kms.create_key(Description="kuno storage 2")["KeyMetadata"]

        local = new_state(data)
        from_file = vault(local).seal("standard/video/before-kms", b"sealed under the key file")

        env = {"KUNO_STORAGE_KEK_PROVIDER": "aws-kms", "KUNO_STORAGE_KMS_KEY_ID": "alias/kuno-storage", "KUNO_STORAGE_KMS_REGION": "us-east-1"}
        state = new_state(data, **env)
        store = vault(state)
        under_kms = store.seal("standard/video/kms", b"sealed under KMS")
        assert keks(state)[2] == ("aws-kms", first["Arn"], "", ACTIVE)  # the alias resolved to the key ARN
        with state.session() as s:
            row = s.get(StorageDataKey, dek_id_of(under_kms))
        wrapped = unb64(row.wrapped_key)
        # A real KMS ciphertext, bound to its encryption context.
        assert kms.decrypt(CiphertextBlob=wrapped, KeyId=first["Arn"], EncryptionContext=dek_context(row.id))["Plaintext"] == \
            state._kuno_keyring.data_key(row.id)

        report = rotate(state)  # local v1 -> KMS v2: unwrap with the file, wrap with KMS
        assert report.target_version == 2 and report.remaining == 0 and report.retired == [1]

        # Another KMS key: re-wrapped inside KMS with ReEncrypt.
        calls = []
        original = storage_keys.AwsKmsKekProvider._call

        def spy(self, operation, **kwargs):
            calls.append(operation)
            return original(self, operation, **kwargs)

        monkeypatch.setattr(storage_keys.AwsKmsKekProvider, "_call", spy)
        moved = new_state(data, **{**env, "KUNO_STORAGE_KMS_KEY_ID": second["Arn"]})
        report = rotate(moved)
        assert report.target_version == 3 and report.remaining == 0 and report.retired == [2]
        assert "ReEncrypt" in calls and "Decrypt" not in calls[calls.index("ReEncrypt"):]

        fresh = vault(new_state(data, **{**env, "KUNO_STORAGE_KMS_KEY_ID": second["Arn"]}))
        assert fresh.open("standard/video/before-kms", from_file) == b"sealed under the key file"
        assert fresh.open("standard/video/kms", under_kms) == b"sealed under KMS"
        with pytest.raises(storage_keys.StorageKeyError, match="rotates key material itself"):
            rotate(moved, provider_rotate=True)


# ------------------------------------------------------------------ Vault Transit


class FakeTransit:
    """The parts of Vault's Transit API the provider uses: datakey/plaintext, encrypt, decrypt, rewrap, keys, rotate."""

    def __init__(self):
        self.versions = {1: os.urandom(32)}
        self.min_decryption_version = 1
        self.calls: list[str] = []
        self.namespaces: set[str | None] = set()

    def _seal(self, version: int, plaintext: bytes) -> str:
        nonce = os.urandom(12)
        return f"vault:v{version}:" + base64.b64encode(nonce + ChaCha20Poly1305(self.versions[version]).encrypt(nonce, plaintext, None)).decode()

    def _open(self, ciphertext: str) -> bytes | None:
        match = re.match(r"^vault:v(\d+):(.+)$", ciphertext)
        version = int(match.group(1))
        if version < self.min_decryption_version:
            return None
        raw = base64.b64decode(match.group(2))
        return ChaCha20Poly1305(self.versions[version]).decrypt(raw[:12], raw[12:], None)

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.headers.get("x-vault-token") != VAULT_TOKEN:
            return httpx.Response(403, json={"errors": ["permission denied"]})
        self.namespaces.add(request.headers.get("x-vault-namespace"))
        match = re.match(r"^/v1/transit/(datakey/plaintext|encrypt|decrypt|rewrap|keys)/([^/]+)(/rotate)?$", request.url.path)
        if match is None or match.group(2) != "kuno-storage":
            return httpx.Response(404, json={"errors": []})
        operation = "rotate" if match.group(3) else match.group(1)
        self.calls.append(operation)
        body = json.loads(request.content or b"{}")
        latest = max(self.versions)
        version = int(body.get("key_version") or latest)
        if operation == "keys":
            return httpx.Response(200, json={"data": {"latest_version": latest, "min_decryption_version": self.min_decryption_version}})
        if operation == "rotate":
            self.versions[latest + 1] = os.urandom(32)
            return httpx.Response(204)
        if operation == "datakey/plaintext":
            plaintext = os.urandom(body.get("bits", 256) // 8)
            return httpx.Response(200, json={"data": {"plaintext": base64.b64encode(plaintext).decode(), "ciphertext": self._seal(version, plaintext)}})
        if operation == "encrypt":
            return httpx.Response(200, json={"data": {"ciphertext": self._seal(version, base64.b64decode(body["plaintext"]))}})
        plaintext = self._open(body["ciphertext"])
        if plaintext is None:
            return httpx.Response(400, json={"errors": ["ciphertext or signature version is disallowed by policy (too old)"]})
        if operation == "decrypt":
            return httpx.Response(200, json={"data": {"plaintext": base64.b64encode(plaintext).decode()}})
        return httpx.Response(200, json={"data": {"ciphertext": self._seal(version, plaintext)}})


def transit_state(data, fake: FakeTransit, token: str = VAULT_TOKEN) -> GatewayState:
    state = new_state(
        data, KUNO_STORAGE_KEK_PROVIDER="vault-transit", KUNO_STORAGE_VAULT_ADDR="https://vault.internal:8200",
        KUNO_STORAGE_VAULT_KEY="kuno-storage", KUNO_STORAGE_VAULT_TOKEN=token, KUNO_STORAGE_VAULT_NAMESPACE="kuno",
    )
    client = httpx.Client(transport=httpx.MockTransport(fake.handler))
    state._kuno_keyring = StorageKeyring(state, providers=Providers(KekConfig.from_settings(state.settings), vault_client=client))
    return state


def test_vault_transit_wraps_rotates_and_rewraps_without_exposing_plaintext(tmp_path):
    data = tmp_path / "data"
    fake = FakeTransit()
    state = transit_state(data, fake)
    store = vault(state)
    sealed = store.seal("standard/thumbnail/j", b"thumbnail")
    assert store.open("standard/thumbnail/j", sealed) == b"thumbnail"
    assert keks(state)[1] == ("vault-transit", "transit/kuno-storage", "1", ACTIVE)
    with state.session() as s:
        wrapped = unb64(s.get(StorageDataKey, dek_id_of(sealed)).wrapped_key)
    assert wrapped.startswith(b"vault:v1:") and fake.namespaces == {"kuno"}
    assert VAULT_TOKEN not in repr(state.settings) and VAULT_TOKEN not in repr(state._kuno_keyring.config)

    report = rotate(state, provider_rotate=True, batch_size=1)
    assert (report.target_version, report.provider_version, report.remaining, report.retired) == (2, "2", 0, [1])
    assert "rotate" in fake.calls and "rewrap" in fake.calls
    with state.session() as s:
        assert all(r.wrapped_key for r in s.scalars(select(StorageDataKey)).all())
        wrapped = unb64(s.get(StorageDataKey, dek_id_of(sealed)).wrapped_key)
    assert wrapped.startswith(b"vault:v2:")

    # With every data key re-wrapped, the operator may raise min_decryption_version: old objects still open.
    fake.min_decryption_version = 2
    fresh = transit_state(data, fake)
    assert vault(fresh).open("standard/thumbnail/j", sealed) == b"thumbnail"
    assert keks(fresh)[2][3] == ACTIVE


def test_vault_transit_errors_name_the_problem_not_the_token(tmp_path):
    state = transit_state(tmp_path / "data", FakeTransit(), token="hvs.wrong-token")
    with pytest.raises(KekUnavailable) as caught:
        vault(state)
    assert "HTTP 403" in str(caught.value) and "permission denied" in str(caught.value)
    assert "hvs.wrong-token" not in str(caught.value)


def test_a_local_key_file_version_that_is_missing_is_reported(tmp_path):
    provider = LocalKekProvider.create(tmp_path / "kek.json")
    wrapped = provider.wrap(b"x" * 32, dek_context("d"), "1")
    assert provider.unwrap(wrapped, dek_context("d"), "1") == b"x" * 32
    with pytest.raises(KekUnavailable, match="no version 7"):
        provider.unwrap(wrapped, dek_context("d"), "7")
    with pytest.raises(KekUnavailable, match="did not unwrap"):
        provider.unwrap(wrapped, dek_context("other"), "1")
