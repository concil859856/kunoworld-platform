"""Endorsements at the gateway (migration 0017): what Intel and NVIDIA signed for an enclave's evidence is stored at
registration, replaced with the evidence at every re-attestation, and served next to it; and the owner-signed manifest
is served whole, so a client that pins the owner key needn't trust this gateway for either.

The gateway's verifiers are stood in for (no TDX host here): the verdict they return carries endorsements, as
kuno_protocol's DCAP and NRAS verifiers' verdicts do. What the tests prove is the storage and serving, and that a
re-attested enclave's served evidence is the fresh one, which SDKs require once registration evidence is an hour old.
"""

from __future__ import annotations

import json
import os
import time

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

from kuno_protocol import devkit
from kuno_protocol.attestation import SignedManifest
from kuno_protocol.canonical import b64d
from kuno_protocol.endorsements import Endorsements
from kuno_protocol.nvidia import NvidiaResult

from test_migration_enclave_envelope import INSERT_ENCLAVE, _columns, _downgrade
from test_open_tier_registration import Worker, feed_row, make_world
from kuno_gateway.app import create_app
from kuno_gateway.migrations import upgrade_database
from kuno_gateway.settings import Settings


def endorsing(world, collateral: str):
    """Wraps the gateway's policy so every ok verdict carries endorsements naming `collateral`."""
    verify = world.state.policy.verify

    def verify_with_endorsements(*args, **kwargs):
        verdict = verify(*args, **kwargs)
        if verdict.ok:
            verdict.endorsements = Endorsements(
                tdx_collateral={"tcb_info": collateral},
                nvidia=[NvidiaResult(device="gpu", answer=[["JWT", "a.b.c"], {"GPU-0": "d.e.f"}], keys=[{"kid": "k"}])],
            )
        return verdict

    world.state.policy.verify = verify_with_endorsements


def test_registration_stores_the_endorsements_and_the_feeds_serve_them(tmp_path):
    world = make_world(tmp_path)
    endorsing(world, "at-registration")
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    served = feed_row(world, worker.enclave_id)["endorsements"]
    assert Endorsements.model_validate(served).tdx_collateral == {"tcb_info": "at-registration"}
    assert served["nvidia"][0]["answer"] == [["JWT", "a.b.c"], {"GPU-0": "d.e.f"}]


def test_an_enclave_without_signed_material_serves_none(tmp_path):
    world = make_world(tmp_path)
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    assert feed_row(world, worker.enclave_id)["endorsements"] is None


def test_a_re_attested_enclave_serves_its_fresh_evidence_and_endorsements(tmp_path):
    world = make_world(tmp_path)
    endorsing(world, "at-registration")
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    registered = feed_row(world, worker.enclave_id)["evidence"]

    endorsing(world, "at-re-attestation")
    nonce = os.urandom(32)
    world.client.post("/validator/v1/challenges", json={"enclave_id": worker.enclave_id, "nonce": nonce.hex()}, headers=world.validator)
    work = worker.send(world.client, "POST", "/miner/v1/pull?wait=0").json()
    fresh = worker.evidence(nonce)
    fresh.created_at = time.time() + 1
    body = json.dumps({"evidence": fresh.model_dump(mode="json")}).encode()
    assert worker.send(world.client, "POST", f"/miner/v1/challenges/{work['challenge_id']}", body).json()["ok"]

    row = feed_row(world, worker.enclave_id)
    assert row["evidence"]["nonce"] == nonce.hex() != registered["nonce"]
    assert row["evidence"]["created_at"] > registered["created_at"]
    assert row["endorsements"]["tdx_collateral"] == {"tcb_info": "at-re-attestation"}


def test_a_failed_re_attestation_leaves_the_served_evidence_alone(tmp_path):
    world = make_world(tmp_path)
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    registered = feed_row(world, worker.enclave_id)["evidence"]
    nonce = os.urandom(32)
    world.client.post("/validator/v1/challenges", json={"enclave_id": worker.enclave_id, "nonce": nonce.hex()}, headers=world.validator)
    work = worker.send(world.client, "POST", "/miner/v1/pull?wait=0").json()
    wrong = worker.evidence(os.urandom(32))  # answers a different nonce
    body = json.dumps({"evidence": wrong.model_dump(mode="json")}).encode()
    assert not worker.send(world.client, "POST", f"/miner/v1/challenges/{work['challenge_id']}", body).json()["ok"]
    assert feed_row(world, worker.enclave_id)["evidence"] == registered


def test_the_owner_signed_manifest_is_served_whole_and_verifies(tmp_path):
    world = make_world(tmp_path)  # devkit writes manifest.signed.json and points KUNO_SIGNED_MANIFEST at it
    response = world.client.get("/v1/manifest/signed")
    assert response.status_code == 200
    signed = SignedManifest.model_validate(response.json())
    assert signed.verify(b64d(devkit_owner_public(world.data)))
    assert signed.manifest == world.state.manifest

    bare_data = tmp_path / "bare"
    devkit.init(bare_data)
    env = bare_data / "dev.env"
    env.write_text("".join(line for line in env.read_text().splitlines(keepends=True) if not line.startswith("KUNO_SIGNED_MANIFEST=")))
    bare = TestClient(create_app(Settings.from_env({"KUNO_DATA_DIR": str(bare_data)})))
    response = bare.get("/v1/manifest/signed")
    assert (response.status_code, response.json()["detail"]["code"]) == (404, "unsigned_manifest")


def devkit_owner_public(data) -> str:
    from kuno_protocol.canonical import b64e
    from kuno_protocol.crypto import public_key_bytes, signing_key_from_bytes

    return b64e(public_key_bytes(signing_key_from_bytes(b64d((data / "owner.key").read_text()))))


def test_0017_adds_a_nullable_endorsements_column_and_downgrades(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0016")
    with engine.begin() as conn:
        conn.execute(text(INSERT_ENCLAVE), {"id": "before", "t": time.time()})
    upgrade_database(engine, "0017")
    assert _columns(engine)["endorsements"] is True
    with engine.begin() as conn:
        assert conn.execute(text("select endorsements from enclaves where id = 'before'")).scalar_one() is None
    _downgrade(engine, "0016")
    assert "endorsements" not in _columns(engine)
    upgrade_database(engine)
    assert "endorsements" in _columns(engine)
