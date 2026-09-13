"""The verified-mode audit relay: validators may only open jobs their own account created,
audits reach only the enclave that ran the job, only enclave-signed openings are accepted,
openings are never served as customer blobs, and audits expire."""

from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from kuno_gateway import api_audits
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Blob, Enclave, Job
from kuno_gateway.db_audits import Audit
from kuno_gateway.settings import Settings
from kuno_protocol import devkit
from kuno_protocol.attestation import enclave_id_for
from kuno_protocol.canonical import b64e, canonical_json, sha256_hex
from kuno_protocol.crypto import generate_hpke_keypair, generate_signing_key, public_key_bytes, request_signature_message
from kuno_protocol.profiles import Mode
from kuno_protocol.receipts import ReceiptBody, VideoInfo, sign_receipt
from kuno_protocol.schemas import GenerationParams
from kuno_protocol.verified import SealedOpening, StepCommitment, opening_signature_message

PARAMS = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
COMMITMENT = StepCommitment(
    root="a" * 64, leaves=12, steps=11, latent_shape=[4, 4, 8, 8], dtype="float32", hardware_class="dev-cpu", transcript_digest="b" * 64
)


class FakeEnclave:
    def __init__(self, state):
        self.key = generate_signing_key()
        _, hpke = generate_hpke_keypair()
        self.id = enclave_id_for(hpke, public_key_bytes(self.key))
        now = time.time()
        with state.session() as s, s.begin():
            s.add(
                Enclave(
                    id=self.id, miner_hotkey="5Miner", tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key=b64e(hpke),
                    signing_public_key=b64e(public_key_bytes(self.key)), profiles=json.dumps([PARAMS.profile_id]), hardware="{}",
                    evidence="{}", capacity=1, inflight=0, status="active", verified_at=now, last_seen=now,
                )
            )

    def request(self, client: TestClient, method: str, path: str, body: bytes = b""):
        timestamp = str(int(time.time()))
        signature = self.key.sign(request_signature_message(method, path, timestamp, body))
        headers = {"x-kuno-enclave": self.id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature), "content-type": "application/json"}
        return client.request(method, path, content=body, headers=headers)

    def sealed(self, audit: dict, **overrides) -> bytes:
        ciphertext = b"sealed-latents"
        opening = SealedOpening(
            audit_id=audit["audit_id"], job_id=audit["job_id"], enclave_id=self.id, step=audit["step"],
            recipient_public_key=audit["recipient_public_key"], enc=b64e(b"\x01" * 32), ciphertext=b64e(ciphertext),
            ciphertext_sha256=sha256_hex(ciphertext),
        )
        opening = opening.model_copy(update=overrides)
        opening.signature = b64e(self.key.sign(opening_signature_message(opening)))
        return opening.model_dump_json().encode()


@pytest.fixture
def relay(tmp_path):
    env = devkit.init(tmp_path / "data")
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))
    app.include_router(api_audits.router)
    state = app.state.gw
    return SimpleNamespace(
        client=TestClient(app), state=state, enclave=FakeEnclave(state), other=FakeEnclave(state),
        validator={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"}, customer={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
    )


def add_job(relay, account_id: str, *, commitment: StepCommitment | None = COMMITMENT, status: str = "succeeded", age_s: float = 60.0) -> str:
    job_id = str(uuid.uuid4())
    now = time.time()
    body = ReceiptBody(
        job_id=job_id, enclave_id=relay.enclave.id, profile_id=PARAMS.profile_id, image_digest=devkit.DEV_IMAGE_DIGEST,
        params_digest=sha256_hex(canonical_json(PARAMS.model_dump(mode="json"))), input_digest="0" * 64, output_digest="1" * 64,
        output_bytes=1, content_digest="2" * 64, attestation_digest="3" * 64, started_at=now - age_s - 5, finished_at=now - age_s,
        gpu_seconds=5.0, video=VideoInfo(duration_s=2, width=1280, height=704, fps=24, frames=49, audio=True), step_commitment=commitment,
    )
    receipt = sign_receipt(relay.enclave.key, body).model_dump_json() if status == "succeeded" else None
    with relay.state.session() as s, s.begin():
        s.add(
            Job(
                id=job_id, account_id=account_id, profile_id=PARAMS.profile_id, enclave_id=relay.enclave.id, params=PARAMS.model_dump_json(),
                enc="", ciphertext="", input_blob_ids="[]", status=status, price_usd=0.0, receipt=receipt,
                created_at=now - age_s - 10, updated_at=now - age_s, finished_at=now - age_s,
            )
        )
    return job_id


def ask(relay, job_id: str, step: int = 3, headers=None, **extra):
    _, public = generate_hpke_keypair()
    body = {"job_id": job_id, "step": step, "recipient_public_key": b64e(public), **extra}
    return relay.client.post("/validator/v1/audits", json=body, headers=headers or relay.validator)


def code(response) -> str:
    detail = response.json()["detail"]
    return detail["code"] if isinstance(detail, dict) else "validation"


# ---------------------------------------------------------------- the privacy rule


def test_validators_can_only_audit_jobs_their_own_account_created(relay):
    customer_job = add_job(relay, "dev")
    refused = ask(relay, customer_job)
    assert refused.status_code == 403 and code(refused) == "not_audit_owner"
    unknown = ask(relay, str(uuid.uuid4()))
    assert (unknown.status_code, code(unknown)) == (403, "not_audit_owner")  # no job-id oracle either
    assert ask(relay, customer_job, headers=relay.customer).status_code == 403  # customers can't audit at all
    with relay.state.session() as s:
        assert s.scalars(select(Audit)).all() == []

    own = ask(relay, add_job(relay, "validator"))
    assert own.status_code == 201 and own.json()["enclave_id"] == relay.enclave.id
    items = relay.enclave.request(relay.client, "GET", "/miner/v1/audits").json()["audits"]
    assert [item["audit_id"] for item in items] == [own.json()["audit_id"]]


def test_only_committed_succeeded_jobs_inside_retention_can_be_audited(relay):
    assert code(ask(relay, add_job(relay, "validator", commitment=None))) == "not_auditable"
    assert code(ask(relay, add_job(relay, "validator", status="failed"))) == "not_auditable"
    job = add_job(relay, "validator")
    assert (ask(relay, job, step=12).status_code, code(ask(relay, job, step=12))) == (422, "bad_step")
    assert ask(relay, job, step=0).status_code == 422
    bad_key = relay.client.post("/validator/v1/audits", json={"job_id": job, "step": 1, "recipient_public_key": b64e(b"short")}, headers=relay.validator)
    assert bad_key.status_code == 422
    old = add_job(relay, "validator", age_s=api_audits.AUDIT_RETENTION_S + 60)
    assert (ask(relay, old).status_code, code(ask(relay, old))) == (410, "retention_expired")
    for _ in range(api_audits.MAX_AUDITS_PER_JOB):
        assert ask(relay, job).status_code == 201
    assert code(ask(relay, job)) == "too_many_audits"


# ---------------------------------------------------------------- relay flow


def test_the_audit_reaches_only_its_enclave_and_the_signed_opening_comes_back(relay):
    job = add_job(relay, "validator")
    audit_id = ask(relay, job, step=4, include_leaves=True).json()["audit_id"]
    assert relay.other.request(relay.client, "GET", "/miner/v1/audits").json() == {"audits": []}

    (item,) = relay.enclave.request(relay.client, "GET", "/miner/v1/audits").json()["audits"]
    assert (item["kind"], item["job_id"], item["step"], item["include_leaves"]) == ("audit", job, 4, True)
    assert relay.enclave.request(relay.client, "GET", "/miner/v1/audits").json() == {"audits": []}
    assert relay.client.get(f"/validator/v1/audits/{audit_id}", headers=relay.validator).json()["status"] == "sent"

    posted = relay.enclave.request(relay.client, "POST", f"/miner/v1/audits/{audit_id}/opening", relay.enclave.sealed(item))
    assert posted.status_code == 200, posted.text
    result = relay.client.get(f"/validator/v1/audits/{audit_id}", headers=relay.validator).json()
    assert result["status"] == "answered" and result["opening"]["audit_id"] == audit_id
    assert result["opening"]["enclave_id"] == relay.enclave.id
    assert relay.enclave.request(relay.client, "POST", f"/miner/v1/audits/{audit_id}/opening", relay.enclave.sealed(item)).status_code == 409

    with relay.state.session() as s:
        blob = s.get(Blob, s.get(Audit, audit_id).opening_blob_id)
        assert blob.owner_kind == "audit" and blob.job_id is None
    # Openings are validator-only ciphertext: no customer route serves them.
    for headers in (relay.customer, relay.validator):
        assert relay.client.get(f"/v1/blobs/{blob.id}", headers=headers).status_code == 404


def test_openings_must_be_signed_by_the_enclave_and_name_the_audit(relay):
    job = add_job(relay, "validator")
    audit_id = ask(relay, job).json()["audit_id"]
    (item,) = relay.enclave.request(relay.client, "GET", "/miner/v1/audits").json()["audits"]
    path = f"/miner/v1/audits/{audit_id}/opening"

    forged = json.loads(relay.enclave.sealed(item))
    forged["signature"] = b64e(generate_signing_key().sign(b"anything"))
    response = relay.enclave.request(relay.client, "POST", path, json.dumps(forged).encode())
    assert (response.status_code, code(response)) == (422, "bad_opening")
    response = relay.enclave.request(relay.client, "POST", path, relay.enclave.sealed(item, step=5))
    assert (response.status_code, code(response)) == (422, "bad_opening")
    assert relay.other.request(relay.client, "POST", path, relay.other.sealed(item)).status_code == 404
    assert relay.client.get(f"/validator/v1/audits/{audit_id}", headers=relay.validator).json()["status"] == "sent"


def test_an_enclave_can_decline_and_unanswered_audits_expire(relay):
    declined = ask(relay, add_job(relay, "validator")).json()["audit_id"]
    relay.enclave.request(relay.client, "GET", "/miner/v1/audits")
    body = json.dumps({"code": "not_retained", "message": "gone"}).encode()
    assert relay.enclave.request(relay.client, "POST", f"/miner/v1/audits/{declined}/fail", body).status_code == 200
    result = relay.client.get(f"/validator/v1/audits/{declined}", headers=relay.validator).json()
    assert (result["status"], result["error_code"]) == ("failed", "not_retained")

    late = ask(relay, add_job(relay, "validator")).json()["audit_id"]
    with relay.state.session() as s, s.begin():
        s.get(Audit, late).expires_at = time.time() - 1
    assert relay.enclave.request(relay.client, "GET", "/miner/v1/audits").json() == {"audits": []}
    assert api_audits.expire_audits(relay.state) == 1
    assert relay.client.get(f"/validator/v1/audits/{late}", headers=relay.validator).json()["status"] == "expired"
    item = {"audit_id": late, "job_id": "x", "step": 3, "recipient_public_key": "k"}
    assert relay.enclave.request(relay.client, "POST", f"/miner/v1/audits/{late}/opening", relay.enclave.sealed(item)).status_code == 409

    api_audits.expire_audits(relay.state, now=time.time() + api_audits.OPENING_TTL_S + 60)
    with relay.state.session() as s:
        assert s.scalars(select(Audit)).all() == []
        assert s.get(Account, "validator") is not None
