"""The gateway's open tier: registration with a mandatory hotkey proof, tier in the feeds, routing by
privacy mode, private jobs kept off open-tier enclaves, and step audits of standard jobs."""

from __future__ import annotations

import json
import os
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from kuno_gateway import api_audits
from kuno_gateway.app import create_app
from kuno_gateway.db import Enclave, HardwareBinding, Job
from kuno_gateway.settings import Settings
from kuno_gateway.state import enclave_serves
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE, OpenTEE, build_evidence, enclave_id_for, parse_manifest, sign_manifest
from kuno_protocol.canonical import b64d, b64e, canonical_json, sha256_hex
from kuno_protocol.crypto import generate_hpke_keypair, generate_signing_key, public_key_bytes, request_signature_message, signing_key_from_bytes
from kuno_protocol.hotkey import Sr25519Signer, sign_hotkey_proof
from kuno_protocol.profiles import Mode
from kuno_protocol.receipts import ReceiptBody, VideoInfo, sign_receipt
from kuno_protocol.schemas import GenerationParams
from kuno_protocol.verified import StepCommitment

PROFILE = "ltx-2.5-fast"
PARAMS = GenerationParams(profile_id=PROFILE, mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
COMMITMENT = StepCommitment(
    root="a" * 64, leaves=12, steps=11, latent_shape=[4, 1, 8, 8], dtype="float32", hardware_class="dev-cpu", transcript_digest="b" * 64
)


def make_world(tmp_path, open_tier: bool = True) -> SimpleNamespace:
    data = tmp_path / "data"
    env = devkit.init(data)
    if not open_tier:
        owner = signing_key_from_bytes(b64d((data / "owner.key").read_text()))
        manifest = parse_manifest((data / "manifest.json").read_text()).model_copy(update={"open_tier": None})
        (data / "manifest.signed.json").write_text(sign_manifest(owner, manifest).model_dump_json())
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw, data=data,
        validator={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"},
    )


@pytest.fixture
def world(tmp_path):
    return make_world(tmp_path)


class Worker:
    """Keys and signed requests of one worker process."""

    def __init__(self, signer: Sr25519Signer | None = None):
        self.key = generate_signing_key()
        _, self.hpke = generate_hpke_keypair()
        self.signing_public = public_key_bytes(self.key)
        self.enclave_id = enclave_id_for(self.hpke, self.signing_public)
        self.signer = signer or Sr25519Signer.from_seed(os.urandom(32))

    def send(self, client: TestClient, method: str, path: str, body: bytes = b""):
        timestamp = str(int(time.time()))
        signature = self.key.sign(request_signature_message(method, path, timestamp, body))
        headers = {"x-kuno-enclave": self.enclave_id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature), "content-type": "application/json"}
        return client.request(method, path, content=body, headers=headers)

    def evidence(self, nonce: bytes, provider=None):
        return build_evidence(
            provider or OpenTEE(), nonce, self.hpke, self.signing_public, devkit.DEV_IMAGE_DIGEST, [PROFILE],
            {"gpu": "NVIDIA GeForce RTX 5090", "gpu_count": 1},
        )

    def register(self, client: TestClient, *, proof: bool = True, prover: Sr25519Signer | None = None, provider=None):
        nonce = bytes.fromhex(client.get("/miner/v1/nonce").json()["nonce"])
        evidence = self.evidence(nonce, provider)
        body = {"evidence": evidence.model_dump(mode="json"), "miner_hotkey": self.signer.ss58_address, "capacity": 1}
        if proof:
            body["hotkey_proof"] = sign_hotkey_proof(prover or self.signer, nonce, self.enclave_id, self.signing_public).model_dump(mode="json")
        return self.send(client, "POST", "/miner/v1/enclaves", json.dumps(body).encode())


def add_confidential_enclave(state, hotkey: str = "5Confidential") -> Worker:
    worker = Worker()
    now = time.time()
    with state.session() as s, s.begin():
        s.add(
            Enclave(
                id=worker.enclave_id, miner_hotkey=hotkey, tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key=b64e(worker.hpke),
                signing_public_key=b64e(worker.signing_public), profiles=json.dumps([PROFILE]), hardware="{}", evidence="{}", capacity=4,
                inflight=0, status="active", verified_at=now, last_seen=now,
            )
        )
    return worker


def add_job(state, enclave: Worker, *, privacy: str, account_id: str = "dev", status: str = "succeeded") -> str:
    job_id, now = str(uuid.uuid4()), time.time()
    receipt = None
    if status == "succeeded":
        body = ReceiptBody(
            job_id=job_id, enclave_id=enclave.enclave_id, profile_id=PROFILE, image_digest=devkit.DEV_IMAGE_DIGEST,
            params_digest=sha256_hex(canonical_json(PARAMS.model_dump(mode="json"))), input_digest="0" * 64, output_digest="1" * 64,
            output_bytes=1, content_digest=sha256_hex(job_id.encode()), attestation_digest="3" * 64, started_at=now - 20, finished_at=now - 10,
            gpu_seconds=5.0, video=VideoInfo(duration_s=2, width=1280, height=704, fps=24, frames=49, audio=True), step_commitment=COMMITMENT,
        )
        receipt = sign_receipt(enclave.key, body).model_dump_json()
    fields = dict(
        id=job_id, account_id=account_id, profile_id=PROFILE, enclave_id=enclave.enclave_id, params=PARAMS.model_dump_json(), enc="",
        ciphertext="", input_blob_ids="[]", status=status, price_usd=0.0, receipt=receipt, created_at=now - 30, updated_at=now,
        finished_at=now - 10 if status == "succeeded" else None,
    )
    if hasattr(Job, "privacy"):
        fields["privacy"] = privacy
    with state.session() as s, s.begin():
        s.add(Job(**fields))
    return job_id


@pytest.fixture
def privacy_column(monkeypatch):
    """Works before and after the jobs table gains `privacy` (migration 0008)."""
    if hasattr(Job, "privacy"):
        return
    standard: set[str] = set()
    monkeypatch.setattr(api_audits, "job_privacy", lambda job: "standard" if job.id in standard else "private")
    pytest.skip("jobs have no privacy column in this gateway")


def feed_row(world, enclave_id: str) -> dict:
    rows = world.client.get("/validator/v1/enclaves", headers=world.validator).json()
    (row,) = [r for r in rows if r["enclave_id"] == enclave_id]
    return row


# ---------------------------------------------------------------- registration


def test_an_open_tier_worker_that_proves_its_hotkey_registers_on_the_open_tier(world):
    worker = Worker()
    response = worker.register(world.client)
    assert response.status_code == 200, response.text
    row = feed_row(world, worker.enclave_id)
    assert (row["tier"], row["tee"], row["miner_hotkey"]) == ("open", "open", worker.signer.ss58_address)
    # Nothing about its hardware is attested: self-reported only, no identities bound, no attested GPU count.
    assert row["hardware"]["gpu"] == "NVIDIA GeForce RTX 5090" and row["hardware_ids"] == [] and row["gpu_count"] is None
    with world.state.session() as s:
        assert s.scalars(select(HardwareBinding).where(HardwareBinding.enclave_id == worker.enclave_id)).all() == []
    assert not world.state.policy.production


def test_open_tier_registration_needs_a_valid_hotkey_proof_even_on_a_dev_network(world):
    worker = Worker()
    missing = worker.register(world.client, proof=False)
    assert (missing.status_code, missing.json()["detail"]["code"]) == (403, "hotkey_proof_required")
    forged = worker.register(world.client, prover=Sr25519Signer.from_seed(os.urandom(32)))
    assert (forged.status_code, forged.json()["detail"]["code"]) == (403, "hotkey_proof_invalid")
    with world.state.session() as s:
        assert s.get(Enclave, worker.enclave_id) is None


def test_a_manifest_that_does_not_allow_the_open_tier_refuses_open_workers(tmp_path):
    world = make_world(tmp_path, open_tier=False)
    response = Worker().register(world.client)
    assert response.status_code == 403 and response.json()["detail"]["code"] == "attestation_failed"
    assert "does not allow the open tier" in response.json()["detail"]["message"]


def test_enclave_keys_cannot_change_tier_between_registrations(world):
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    quote_key = signing_key_from_bytes(b64d((world.data / "mock_quote.key").read_text()))
    response = worker.register(world.client, provider=MockTEE(quote_key, devkit.DEV_IMAGE_DIGEST))
    assert (response.status_code, response.json()["detail"]["code"]) == (409, "tier_changed")


def test_challenges_answered_with_open_evidence_keep_the_enclave_active(world):
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    nonce = os.urandom(32)
    created = world.client.post("/validator/v1/challenges", json={"enclave_id": worker.enclave_id, "nonce": nonce.hex()}, headers=world.validator)
    work = worker.send(world.client, "POST", "/miner/v1/pull?wait=0").json()
    assert work["kind"] == "challenge" and work["challenge_id"] == created.json()["challenge_id"]
    body = json.dumps({"evidence": worker.evidence(nonce).model_dump(mode="json")}).encode()
    answer = worker.send(world.client, "POST", f"/miner/v1/challenges/{work['challenge_id']}", body).json()
    assert answer == {"ok": True, "reasons": []}
    assert feed_row(world, worker.enclave_id)["status"] == "active"


def test_open_tier_enclaves_are_not_issued_c2pa_certificates(world):
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    response = worker.send(world.client, "POST", "/miner/v1/certificate", json.dumps({"csr_pem": "-----BEGIN CERTIFICATE REQUEST-----"}).encode())
    code = response.json()["detail"]["code"]
    assert (response.status_code, code) in ((403, "tier_not_eligible"), (503, "ca_unavailable"))


# ---------------------------------------------------------------- routing


def test_routing_by_privacy_never_offers_an_open_tier_enclave_for_a_private_job(world):
    state = world.state
    opened, confidential = Worker(), add_confidential_enclave(state)
    assert opened.register(world.client).status_code == 200
    profile = state.profiles[PROFILE]
    with state.session() as s:
        assert [e.id for e in state.routable_enclaves(s, PROFILE, "private")] == [confidential.enclave_id]
        assert {e.id for e in state.routable_enclaves(s, PROFILE, "standard")} == {opened.enclave_id, confidential.enclave_id}
        assert state.routable_enclaves(s, PROFILE, "public") == []
        assert {e.id for e in state.fresh_enclaves(s, PROFILE)} == {opened.enclave_id, confidential.enclave_id}  # no mode: every tier
        assert state.capacity_counts(s, privacy="private")[PROFILE] == 1 and state.capacity_counts(s, privacy="standard")[PROFILE] == 2
        assert not enclave_serves(s.get(Enclave, opened.enclave_id), "private") and enclave_serves(s.get(Enclave, opened.enclave_id), "standard")
    assert state.has_capacity(profile, privacy="private")

    with state.session() as s, s.begin():
        s.get(Enclave, confidential.enclave_id).status = "stale"
    assert not state.has_capacity(profile, privacy="private")
    assert state.has_capacity(profile, privacy="standard") and state.has_capacity(profile)


def test_a_private_job_that_reaches_an_open_enclave_is_failed_before_its_ciphertext_leaves(world):
    worker = Worker()
    assert worker.register(world.client).status_code == 200
    private = add_job(world.state, worker, privacy="private", account_id="nobody", status="queued")
    assert worker.send(world.client, "POST", "/miner/v1/pull?wait=0").json() == {"kind": "none"}
    with world.state.session() as s:
        job, enclave = s.get(Job, private), s.get(Enclave, worker.enclave_id)
        assert (job.status, job.error_code, enclave.inflight) == ("failed", "enclave_unavailable", 0)
    if hasattr(Job, "privacy"):
        standard = add_job(world.state, worker, privacy="standard", account_id="nobody", status="queued")
        work = worker.send(world.client, "POST", "/miner/v1/pull?wait=0").json()
        assert (work["kind"], work["job_id"]) == ("job", standard)


# ---------------------------------------------------------------- validators


def test_ledger_rows_carry_the_privacy_mode(world, privacy_column):
    enclave = add_confidential_enclave(world.state)
    standard, private = add_job(world.state, enclave, privacy="standard"), add_job(world.state, enclave, privacy="private")
    rows = {r["job_id"]: r for r in world.client.get("/validator/v1/ledger", headers=world.validator).json()}
    assert rows[standard]["privacy"] == "standard" and rows[private]["privacy"] == "private"


def test_validators_may_audit_any_standard_job_but_only_their_own_private_jobs(world, privacy_column):
    enclave = add_confidential_enclave(world.state)
    _, public = generate_hpke_keypair()

    def ask(job_id):
        return world.client.post(
            "/validator/v1/audits", json={"job_id": job_id, "step": 3, "recipient_public_key": b64e(public)}, headers=world.validator
        )

    customer_private = add_job(world.state, enclave, privacy="private")
    refused = ask(customer_private)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (403, "not_audit_owner")
    assert ask(add_job(world.state, enclave, privacy="private", account_id="validator")).status_code == 201

    customer_standard = add_job(world.state, enclave, privacy="standard")
    for _ in range(api_audits.MAX_AUDITS_PER_JOB):
        assert ask(customer_standard).status_code == 201
    capped = ask(customer_standard)
    assert (capped.status_code, capped.json()["detail"]["code"]) == (429, "too_many_audits")
