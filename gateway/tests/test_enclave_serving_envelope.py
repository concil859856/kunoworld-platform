"""Serving envelopes at the gateway (envelopes.py, migration 0016): registration stores, clears or refuses them,
/v1/route and standard jobs route by them, admission refuses a job sealed to an enclave that can't fit it, and a
worker's capacity_refused inside its envelope is recorded as internal_error."""

from __future__ import annotations

import json
import os
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.attestation import OpenTEE, build_evidence, enclave_id_for
from kuno_protocol.canonical import b64e
from kuno_protocol.crypto import generate_hpke_keypair, generate_signing_key, public_key_bytes, request_signature_message
from kuno_protocol.envelope import CAPACITY_REFUSED, EnvelopeQuery, full_table, to_json
from kuno_protocol.hotkey import Sr25519Signer, sign_hotkey_proof
from kuno_protocol.profiles import Mode, load_profiles
from kuno_protocol.schemas import GenerationParams, JobState
from sqlalchemy import func, select

from kuno_gateway import standard_jobs
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job, LedgerEntry
from kuno_gateway.settings import Settings

FAST = load_profiles()["ltx-2.5-fast"]
ROUTE = {"mode": "text_to_video", "profile_id": FAST.id}
EXACT = {"resolution": "1080p", "aspect_ratio": "16:9", "fps": 24}


def small_card() -> dict:
    """1080p 16:9 up to 8 s at 24/25 fps and 4 s at 48/50, no 1080p 21:9 at all, everything else in full."""
    table = full_table(FAST)
    table["1080p"]["16:9"] = {24: 8.0, 25: 8.0, 48: 4.0, 50: 4.0}
    del table["1080p"]["21:9"]
    return to_json(table)


ENVELOPE = {FAST.id: small_card()}


def params(duration_s: float, resolution="1080p", aspect_ratio="16:9", fps=24) -> GenerationParams:
    return GenerationParams(
        profile_id=FAST.id, mode=Mode.TEXT_TO_VIDEO, duration_s=duration_s, resolution=resolution, aspect_ratio=aspect_ratio, fps=fps
    )


class Miner:
    """One worker's keys, its signed requests, and its enclave row."""

    def __init__(self):
        self.key = generate_signing_key()
        _, self.hpke = generate_hpke_keypair()
        self.signing_public = public_key_bytes(self.key)
        self.enclave_id = enclave_id_for(self.hpke, self.signing_public)
        self.hotkey = Sr25519Signer.from_seed(os.urandom(32))

    def send(self, client: TestClient, method: str, path: str, body: bytes = b""):
        timestamp = str(int(time.time()))
        signature = self.key.sign(request_signature_message(method, path, timestamp, body))
        headers = {"x-kuno-enclave": self.enclave_id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature), "content-type": "application/json"}
        return client.request(method, path, content=body, headers=headers)

    def register(self, client: TestClient, envelope: dict | None = None):
        """An open-tier registration, as `GatewayClient.register` sends it; no `envelope` field when there is none."""
        nonce = bytes.fromhex(client.get("/miner/v1/nonce").json()["nonce"])
        evidence = build_evidence(
            OpenTEE(), nonce, self.hpke, self.signing_public, devkit.DEV_IMAGE_DIGEST, [FAST.id], {"gpu": "NVIDIA GeForce RTX 4090", "gpu_count": 1}
        )
        body = {
            "evidence": evidence.model_dump(mode="json"), "miner_hotkey": self.hotkey.ss58_address, "capacity": 1,
            "hotkey_proof": sign_hotkey_proof(self.hotkey, nonce, self.enclave_id, self.signing_public).model_dump(mode="json"),
        }
        if envelope is not None:
            body["envelope"] = envelope
        return self.send(client, "POST", "/miner/v1/enclaves", json.dumps(body).encode())

    def insert(self, state, *, envelope: dict | None = None, tee: str = "mock") -> Miner:
        now = time.time()
        with state.session() as s, s.begin():
            s.add(
                Enclave(
                    id=self.enclave_id, miner_hotkey=self.hotkey.ss58_address, tee=tee, image_digest=devkit.DEV_IMAGE_DIGEST,
                    hpke_public_key=b64e(self.hpke), signing_public_key=b64e(self.signing_public), profiles=json.dumps([FAST.id]),
                    hardware="{}", evidence="{}", capacity=4, inflight=0, status="active", verified_at=now, last_seen=now,
                    envelope=json.dumps(envelope) if envelope else None,
                )
            )
        return self


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw,
        dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
        validator={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"},
    )


def routed(gw, **fit) -> set[str]:
    response = gw.client.get("/v1/route", params={**ROUTE, **fit})
    assert response.status_code == 200, response.text
    return {e["enclave_id"] for e in response.json()["enclaves"]}


def stale(gw, miner: Miner) -> None:
    with gw.state.session() as s, s.begin():
        s.get(Enclave, miner.enclave_id).status = "stale"


def feed(gw) -> dict[str, dict]:
    return {e["enclave_id"]: e for e in gw.client.get("/validator/v1/enclaves", headers=gw.validator).json()}


# ------------------------------------------------------------------ registration


def test_registration_stores_and_publishes_the_envelope_and_one_without_it_clears_it(gw):
    miner = Miner()
    registered = miner.register(gw.client, ENVELOPE)
    assert registered.status_code == 200, registered.text
    with gw.state.session() as s:
        assert json.loads(s.get(Enclave, miner.enclave_id).envelope) == ENVELOPE
    assert feed(gw)[miner.enclave_id]["envelope"] == ENVELOPE

    # A worker from before envelopes, or one whose hardware holds the whole profile, sends no field at all.
    assert miner.register(gw.client).status_code == 200
    with gw.state.session() as s:
        assert s.get(Enclave, miner.enclave_id).envelope is None
    assert feed(gw)[miner.enclave_id]["envelope"] is None


def test_an_invalid_envelope_is_refused_and_nothing_is_registered(gw):
    miner = Miner()
    cases = (
        ({"ltx-2.5-pro": {}}, "does not attest"),
        ({FAST.id: {"1080p": {"16:9": {"24": 1}}}}, "minimum"),
        ({FAST.id: {"1080p": {"16:9": {"30": 5}}}}, "30 fps"),
    )
    for envelope, words in cases:
        refused = miner.register(gw.client, envelope)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_envelope")
        assert words in refused.json()["detail"]["message"]
    with gw.state.session() as s:
        assert s.get(Enclave, miner.enclave_id) is None


# ------------------------------------------------------------------ routing


def test_route_lists_only_enclaves_with_room_for_what_the_client_asks_for(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)
    both = {small.enclave_id, full.enclave_id}
    assert routed(gw) == both  # an older client sends none of the fields
    assert routed(gw, **EXACT, duration_s=8) == both
    assert routed(gw, **EXACT, duration_s=10) == {full.enclave_id}
    assert routed(gw, resolution="1080p", aspect_ratio="21:9") == {full.enclave_id}  # not served at any duration
    # An omitted field matches any value: 720p 21:9 is served in full, and 1080p 1:1 serves 20 s.
    assert routed(gw, aspect_ratio="21:9") == both
    assert routed(gw, resolution="1080p", duration_s=20) == both
    listed = {e["enclave_id"]: e for e in gw.client.get("/v1/route", params=ROUTE).json()["enclaves"]}
    assert listed[small.enclave_id]["envelope"] == ENVELOPE and listed[full.enclave_id]["envelope"] is None

    stale(gw, full)
    refused = gw.client.get("/v1/route", params={**ROUTE, **EXACT, "duration_s": 10})
    detail = refused.json()["detail"]
    assert (refused.status_code, detail["code"], detail["max_duration_s"]) == (503, "no_capacity", 8.0)
    assert "longest available at that size and frame rate is 8 s" in detail["message"]
    assert routed(gw, **EXACT, duration_s=8) == {small.enclave_id}
    # Capacity stays per profile: the small card is a worker for the model whatever it can fit.
    models = {m["id"]: m for m in gw.client.get("/v1/models").json()["models"]}
    assert models[FAST.id]["workers"] == 1


def test_standard_jobs_go_only_to_enclaves_whose_envelope_fits_their_params(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)
    with gw.state.session() as s:
        assert [e.id for e in standard_jobs.enclaves_for(gw.state, s, FAST.id, "standard", fit=EnvelopeQuery.of(params(10)))] == [full.enclave_id]
        fitting = standard_jobs.enclaves_for(gw.state, s, FAST.id, "standard", fit=EnvelopeQuery.of(params(8)))
        assert {e.id for e in fitting} == {small.enclave_id, full.enclave_id}

    def create(duration_s: float):
        body = {"params": params(duration_s).model_dump(mode="json"), "prompt": "a lighthouse keeper lights the lamp at dusk"}
        return gw.client.post("/v1/standard/videos", json=body, headers=gw.dev)

    long = create(10)
    assert long.status_code == 201, long.text
    assert long.json()["enclave_id"] == full.enclave_id

    stale(gw, full)
    refused = create(10)
    assert refused.status_code == 503, refused.text
    assert (refused.json()["detail"]["code"], refused.json()["detail"]["max_duration_s"]) == ("no_capacity", 8.0)
    short = create(8)
    assert short.status_code == 201, short.text
    assert short.json()["enclave_id"] == small.enclave_id


# ------------------------------------------------------------------ admission


def balance(gw, account_id: str = "dev") -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


def test_a_private_job_sealed_to_an_enclave_that_cannot_fit_it_is_refused_before_anything_is_charged(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)

    def submit(miner: Miner, p: GenerationParams):
        body = {"job_id": str(uuid.uuid4()), "params": p.model_dump(mode="json"), "enclave_id": miner.enclave_id, "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": []}
        return gw.client.post("/v1/videos", json=body, headers=gw.dev)

    before = balance(gw)
    too_long = submit(small, params(10))
    detail = too_long.json()["detail"]
    assert (too_long.status_code, detail["code"], detail["max_duration_s"]) == (409, "envelope_exceeded", 8.0)
    assert "serves 1080p 16:9 at 24 fps up to 8 s" in detail["message"] and "/v1/route" in detail["message"]
    unserved = submit(small, params(2, aspect_ratio="21:9"))
    assert (unserved.status_code, unserved.json()["detail"]["code"], unserved.json()["detail"]["max_duration_s"]) == (409, "envelope_exceeded", None)
    assert balance(gw) == before
    with gw.state.session() as s:
        assert s.scalar(select(func.count()).select_from(Job)) == 0

    assert submit(small, params(8)).status_code == 201
    assert submit(full, params(10)).status_code == 201  # no envelope: the profile's limits


# ------------------------------------------------------------------ failure codes


def running_job(gw, miner: Miner, p: GenerationParams) -> str:
    job_id, now = str(uuid.uuid4()), time.time()
    with gw.state.session() as s, s.begin():
        s.add(
            Job(
                id=job_id, account_id="dev", profile_id=FAST.id, enclave_id=miner.enclave_id, params=p.model_dump_json(), enc="x",
                ciphertext="y", input_blob_ids="[]", status=JobState.RUNNING.value, stage=None, progress=0.0, price_usd=0.5,
                created_at=now, updated_at=now, started_at=now,
            )
        )
    return job_id


def test_capacity_refused_inside_the_envelope_is_recorded_as_internal_error_and_outside_it_is_kept(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)
    cases = [
        (small, params(8), CAPACITY_REFUSED, "internal_error"),  # it advertised 8 s: refusing it is a fault
        (small, params(10), CAPACITY_REFUSED, CAPACITY_REFUSED),  # beyond what it advertised
        (small, params(2, aspect_ratio="21:9"), CAPACITY_REFUSED, CAPACITY_REFUSED),  # a size it doesn't serve
        (full, params(20), CAPACITY_REFUSED, "internal_error"),  # no envelope: the profile's limits
        (small, params(10), "invalid_params", "invalid_params"),  # other codes are untouched
    ]
    for miner, p, sent, recorded in cases:
        job_id = running_job(gw, miner, p)
        body = json.dumps({"code": sent, "message": "O1.rtx-4090-24gb.x1.int8 cannot fit this request (99 latent tokens)"}).encode()
        answer = miner.send(gw.client, "POST", f"/miner/v1/jobs/{job_id}/fail", body)
        assert answer.status_code == 200, answer.text
        with gw.state.session() as s:
            job = s.get(Job, job_id)
            refund = s.scalars(select(LedgerEntry).where(LedgerEntry.idempotency_key == f"refund:{job_id}")).first()
        assert (job.status, job.error_code) == (JobState.FAILED.value, recorded), (p, sent)
        assert refund is not None and refund.amount_micros == 500_000  # refunded either way
        if sent == CAPACITY_REFUSED and recorded == "internal_error":
            assert "inside the serving envelope it advertised" in job.error and "99 latent tokens" in job.error

    scoring = pytest.importorskip("kuno_validator.scoring")
    assert CAPACITY_REFUSED not in scoring.MINER_FAULT_CODES and "internal_error" in scoring.MINER_FAULT_CODES
