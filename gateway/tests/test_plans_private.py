"""Plans at the gateway (PROTOCOL.md "Plans (Director)"): registration stores and publishes a worker's features, plans
route and are admitted only to confidential enclaves that list `plan/1`, a private plan runs through the miner API with a
receipt that carries `plan` and no `video`, `plan_failed` is refunded and reaches validators as it is, quotes price plans
flat, and plans have their own rate limit on top of the job limits."""

from __future__ import annotations

import json
import os
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE, OpenTEE, build_evidence, enclave_id_for
from kuno_protocol.canonical import b64d, b64e, sha256_hex
from kuno_protocol.crypto import (
    RecipientSession,
    SenderSession,
    generate_hpke_keypair,
    generate_signing_key,
    public_key_bytes,
    request_signature_message,
    signing_key_from_bytes,
)
from kuno_protocol.envelope import full_table, to_json
from kuno_protocol.hotkey import Sr25519Signer, sign_hotkey_proof
from kuno_protocol.plans import PLAN_FAILED, PLAN_FEATURE, PLAN_OPTION, PlanOptions, open_plan
from kuno_protocol.profiles import Mode
from kuno_protocol.receipts import VideoInfo, sign_receipt
from kuno_protocol.schemas import GenerationParams, JobCreate, SealedPayload, job_aad
from kuno_protocol.sealed_payload import open_payload, seal_payload
from plan_helpers import FAST, plan_params, plan_receipt, sealed_plan, write_plan

from kuno_gateway import identity, ledger
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.db_moderation import Strike
from kuno_gateway.settings import Settings

TEXT = GenerationParams(profile_id=FAST.id, mode=Mode.TEXT_TO_VIDEO, duration_s=5, resolution="720p", aspect_ratio="16:9", fps=24)
BRIEF = "A lighthouse keeper lights the lamp as a storm rolls in."


class Worker:
    """One worker's keys, its registration (mock TEE, or open tier) and its signed miner-API calls."""

    def __init__(self, data_dir, open_tier: bool = False):
        self.key = generate_signing_key()
        self.hpke_private, self.hpke = generate_hpke_keypair()
        self.signing_public = public_key_bytes(self.key)
        self.enclave_id = enclave_id_for(self.hpke, self.signing_public)
        self.hotkey = Sr25519Signer.from_seed(os.urandom(32))
        self.tee = OpenTEE() if open_tier else MockTEE(signing_key_from_bytes(b64d((data_dir / "mock_quote.key").read_text())), devkit.DEV_IMAGE_DIGEST)

    def send(self, client: TestClient, method: str, path: str, body: bytes = b""):
        timestamp = str(int(time.time()))
        signature = self.key.sign(request_signature_message(method, path, timestamp, body))
        headers = {"x-kuno-enclave": self.enclave_id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature),
                   "content-type": "application/json"}
        return client.request(method, path, content=body, headers=headers)

    def register(self, client: TestClient, features: list[str] | None = None, envelope: dict | None = None):
        nonce = bytes.fromhex(client.get("/miner/v1/nonce").json()["nonce"])
        evidence = build_evidence(self.tee, nonce, self.hpke, self.signing_public, devkit.DEV_IMAGE_DIGEST, [FAST.id],
                                  {"gpu": "NVIDIA RTX PRO 6000", "gpu_count": 1})
        body = {
            "evidence": evidence.model_dump(mode="json"), "miner_hotkey": self.hotkey.ss58_address, "capacity": 2,
            "hotkey_proof": sign_hotkey_proof(self.hotkey, nonce, self.enclave_id, self.signing_public).model_dump(mode="json"),
        }
        if features is not None:
            body["features"] = features
        if envelope is not None:
            body["envelope"] = envelope
        return self.send(client, "POST", "/miner/v1/enclaves", json.dumps(body).encode())

    def pull(self, client: TestClient) -> dict:
        return self.send(client, "POST", "/miner/v1/pull?wait=0").json()

    def post_json(self, client: TestClient, path: str, value: dict):
        return self.send(client, "POST", path, json.dumps(value).encode())

    def open(self, job: dict) -> tuple[SealedPayload, RecipientSession]:
        params = GenerationParams.model_validate(job["params"])
        session = RecipientSession(self.hpke_private, b64d(job["enc"]))
        return open_payload(session, b64d(job["ciphertext"]), job_aad(job["job_id"], self.enclave_id, params, [])), session

    def upload(self, client: TestClient, job_id: str, sealed: bytes) -> str:
        uploaded = self.send(client, "POST", f"/miner/v1/blobs?job_id={job_id}", sealed)
        assert uploaded.status_code == 201, uploaded.text
        return uploaded.json()["blob_id"]


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    app = create_app(settings)
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw, settings=settings, data=data,
        dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
        validator={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"},
    )


def worker(gw, features: list[str] | None = (PLAN_FEATURE,), open_tier: bool = False, envelope: dict | None = None) -> Worker:
    w = Worker(gw.data, open_tier=open_tier)
    registered = w.register(gw.client, list(features) if features is not None else None, envelope)
    assert registered.status_code == 200, registered.text
    return w


def balance(gw, account_id: str = "dev") -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


def sealed_job(w: Worker, params: GenerationParams, brief: str = BRIEF, options: PlanOptions | None = None) -> tuple[JobCreate, bytes]:
    """A plan job sealed as a client seals one, and its output key."""
    session = SenderSession(w.hpke)
    job_id = str(uuid.uuid4())
    payload = SealedPayload(prompt=brief, seed=7, options={PLAN_OPTION: (options or PlanOptions()).model_dump(mode="json", exclude_none=True)})
    ciphertext = seal_payload(session, payload, job_aad(job_id, w.enclave_id, params, []))
    return JobCreate(job_id=job_id, params=params, enclave_id=w.enclave_id, enc=b64e(session.enc), ciphertext=b64e(ciphertext)), session.output_key


def submit(gw, w: Worker, params: GenerationParams, path: str = "/v1/videos", headers: dict | None = None):
    job, _ = sealed_job(w, params)
    return gw.client.post(path, json=job.model_dump(mode="json"), headers=headers or gw.dev)


def route(gw, **query) -> set[str]:
    answer = gw.client.get("/v1/route", params={"mode": "plan", "profile_id": FAST.id, **query})
    assert answer.status_code == 200, answer.text
    return {e["enclave_id"] for e in answer.json()["enclaves"]}


def stale(gw, w: Worker) -> None:
    with gw.state.session() as s, s.begin():
        s.get(Enclave, w.enclave_id).status = "stale"


# ------------------------------------------------------------------ features


def test_registration_stores_and_publishes_features_and_a_registration_without_them_clears_them(gw):
    w = worker(gw, features=[PLAN_FEATURE, "future-kind/2", PLAN_FEATURE])
    with gw.state.session() as s:
        assert json.loads(s.get(Enclave, w.enclave_id).features) == ["future-kind/2", PLAN_FEATURE]
    feed = {e["enclave_id"]: e for e in gw.client.get("/validator/v1/enclaves", headers=gw.validator).json()}
    assert feed[w.enclave_id]["features"] == ["future-kind/2", PLAN_FEATURE]
    [listed] = gw.client.get("/v1/route", params={"mode": "text_to_video", "profile_id": FAST.id}).json()["enclaves"]
    assert listed["features"] == ["future-kind/2", PLAN_FEATURE]

    # A worker restarted without a planner sends no field: it stops being sent plans.
    assert w.register(gw.client).status_code == 200
    with gw.state.session() as s:
        assert s.get(Enclave, w.enclave_id).features is None
    assert {e["enclave_id"]: e for e in gw.client.get("/validator/v1/enclaves", headers=gw.validator).json()}[w.enclave_id]["features"] == []
    refused = gw.client.get("/v1/route", params={"mode": "plan", "profile_id": FAST.id})
    assert (refused.status_code, refused.json()["detail"]["code"]) == (503, "no_capacity")


def test_a_malformed_feature_refuses_the_registration(gw):
    w = Worker(gw.data)
    for bad in (["plan"], ["Plan/1"], ["plan/one"], [""], ["plan/1\n"]):
        refused = w.register(gw.client, bad)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_features"), bad
    with gw.state.session() as s:
        assert s.get(Enclave, w.enclave_id) is None


# ------------------------------------------------------------------ routing and admission


def test_plans_route_only_to_confidential_enclaves_that_list_plan_1_in_either_privacy_mode(gw, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    capable, older, open_tier = worker(gw), worker(gw, features=None), worker(gw, open_tier=True)
    assert route(gw) == {capable.enclave_id}
    assert route(gw, privacy="standard") == {capable.enclave_id}
    # Videos still go everywhere their tier allows.
    videos = gw.client.get("/v1/route", params={"mode": "text_to_video", "profile_id": FAST.id, "privacy": "standard"}).json()
    assert {e["enclave_id"] for e in videos["enclaves"]} == {capable.enclave_id, older.enclave_id, open_tier.enclave_id}

    stale(gw, capable)
    for privacy in ("private", "standard"):
        refused = gw.client.get("/v1/route", params={"mode": "plan", "profile_id": FAST.id, "privacy": privacy})
        assert (refused.status_code, refused.json()["detail"]["code"]) == (503, "no_capacity")


def test_a_plan_ignores_duration_in_routing_and_fits_any_envelope_serving_its_size(gw):
    table = full_table(FAST)
    table["1080p"]["16:9"] = {24: 8.0, 25: 8.0, 48: 4.0, 50: 4.0}
    del table["1080p"]["21:9"]
    small = worker(gw, envelope={FAST.id: to_json(table)})
    exact = {"resolution": "1080p", "aspect_ratio": "16:9", "fps": 24}
    # A 60 s target on a card that renders 8 s at this size: nothing renders, so it fits.
    assert route(gw, duration_s=60, **exact) == {small.enclave_id}
    created = submit(gw, small, plan_params(60, resolution="1080p"))
    assert created.status_code == 201, created.text
    refused = gw.client.get("/v1/route", params={"mode": "plan", "profile_id": FAST.id, "resolution": "1080p", "aspect_ratio": "21:9"})
    detail = refused.json()["detail"]
    assert (refused.status_code, detail["code"]) == (503, "no_capacity")
    assert "a 1080p 21:9 plan" in detail["message"] and " 0 s" not in detail["message"]
    not_served = submit(gw, small, plan_params(30, resolution="1080p", aspect_ratio="21:9"))
    detail = not_served.json()["detail"]
    assert (not_served.status_code, detail["code"]) == (409, "envelope_exceeded")
    assert "can't write a plan for it" in detail["message"]


def test_admission_refuses_a_private_plan_for_an_enclave_that_cant_write_one(gw, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    capable, older, open_tier = worker(gw), worker(gw, features=None), worker(gw, open_tier=True)
    before = balance(gw)
    for w, words in ((older, "doesn't write plans"), (open_tier, "not a confidential worker")):
        refused = submit(gw, w, plan_params())
        detail = refused.json()["detail"]
        assert (refused.status_code, detail["code"]) == (409, "enclave_unavailable") and words in detail["message"]
    assert balance(gw) == before
    # A video to the worker without the feature is as before.
    assert submit(gw, older, TEXT).status_code == 201

    created = submit(gw, capable, plan_params(), path="/v1/plans")
    assert created.status_code == 201, created.text
    job = created.json()
    # Flat, whatever the target: $0.10 Private, no per-second rate and no minimum.
    assert job["price_usd"] == FAST.pricing.plan_usd == FAST.price_usd(plan_params(90)) == 0.1
    assert gw.client.get(f"/v1/plans/{job['job_id']}", headers=gw.dev).json()["params"]["mode"] == "plan"
    wrong = submit(gw, capable, TEXT, path="/v1/plans")
    assert (wrong.status_code, wrong.json()["detail"]["code"]) == (422, "invalid_params")
    video = submit(gw, capable, TEXT).json()
    assert gw.client.get(f"/v1/plans/{video['job_id']}", headers=gw.dev).status_code == 404
    # The protocol's plan rules apply: a target outside 4-120 s, or shots, are refused.
    for params in (plan_params(3), plan_params(121)):
        refused = submit(gw, capable, params)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_params")


# ------------------------------------------------------------------ a private plan end to end


def test_a_private_plan_runs_end_to_end_and_its_receipt_carries_the_plan_and_no_video(gw):
    w = worker(gw)
    before = balance(gw)
    params = plan_params(30)
    job, output_key = sealed_job(w, params, options=PlanOptions(style="35mm film, warm"))
    assert gw.client.post("/v1/plans", json=job.model_dump(mode="json"), headers=gw.dev).status_code == 201
    assert before - balance(gw) == ledger.to_micros(0.1)

    work = w.pull(gw.client)
    assert (work["kind"], work["job_id"], work["params"]["mode"]) == ("job", job.job_id, "plan")
    payload, session = w.open(work)
    assert payload.prompt == BRIEF and PlanOptions.model_validate(payload.options[PLAN_OPTION]).style == "35mm film, warm"
    assert w.post_json(gw.client, f"/miner/v1/jobs/{job.job_id}/progress", {"progress": 0.1, "stage": "planning"}).status_code == 200
    plan = write_plan(params, payload.prompt, PlanOptions.model_validate(payload.options[PLAN_OPTION]))
    plan_json, sealed = sealed_plan(session.output_key, job.job_id, plan)
    blob_id = w.upload(gw.client, job.job_id, sealed)

    # A receipt describing a video for a plan job is refused, and the job keeps running.
    video_body = plan_receipt(w.key, job_id=job.job_id, enclave_id=w.enclave_id, params=params, plan=plan, plan_json=plan_json,
                              sealed=sealed).body.model_copy(update={"plan": None, "video": VideoInfo(duration_s=30, width=1280, height=704, fps=24, frames=720, audio=True)})
    wrong = w.post_json(gw.client, f"/miner/v1/jobs/{job.job_id}/complete",
                        {"output_blob_id": blob_id, "receipt": sign_receipt(w.key, video_body).model_dump(mode="json")})
    assert wrong.status_code == 422 and "receipt describes a video for a plan job" in wrong.json()["detail"]["message"]

    receipt = plan_receipt(w.key, job_id=job.job_id, enclave_id=w.enclave_id, params=params, plan=plan, plan_json=plan_json, sealed=sealed)
    done = w.post_json(gw.client, f"/miner/v1/jobs/{job.job_id}/complete", {"output_blob_id": blob_id, "receipt": receipt.model_dump(mode="json")})
    assert done.status_code == 200, done.text

    status = gw.client.get(f"/v1/plans/{job.job_id}", headers=gw.dev).json()
    assert status["status"] == "succeeded" and status["output_blob_id"] == blob_id
    assert "video" not in status["receipt"]["body"] and status["receipt"]["body"]["plan"]["shots"] == len(plan.shots)
    # The owner fetches the sealed plan like a video and opens it with the key only the client holds.
    fetched = gw.client.get(f"/v1/blobs/{blob_id}", headers=gw.dev)
    assert fetched.status_code == 200 and fetched.content == sealed
    opened, data = open_plan(output_key, job.job_id, fetched.content)
    assert opened == plan and sha256_hex(data) == status["receipt"]["body"]["content_digest"]
    with gw.state.session() as s:
        assert s.get(Enclave, w.enclave_id).inflight == 0

    [row] = [r for r in gw.client.get("/validator/v1/ledger", headers=gw.validator).json() if r["job_id"] == job.job_id]
    assert (row["status"], row["params"]["mode"], row["billable_usd"]) == ("succeeded", "plan", 0.1)
    assert row["receipt"]["body"]["plan"] == receipt.body.plan.model_dump(mode="json") and "video" not in row["receipt"]["body"]
    # Nothing to share: a plan isn't a video.
    share = gw.client.post(f"/v1/videos/{job.job_id}/shares", headers=gw.dev)
    assert (share.status_code, share.json()["detail"]["code"]) == (409, "share_unavailable"), share.text


def test_plan_failed_is_refunded_and_reaches_validators_as_it_is(gw):
    w = worker(gw)
    before = balance(gw)
    assert submit(gw, w, plan_params()).status_code == 201
    work = w.pull(gw.client)
    failed = w.post_json(gw.client, f"/miner/v1/jobs/{work['job_id']}/fail",
                         {"code": PLAN_FAILED, "message": "The planner could not write a usable plan for this brief."})
    assert failed.status_code == 200
    status = gw.client.get(f"/v1/plans/{work['job_id']}", headers=gw.dev).json()
    assert (status["status"], status["error_code"]) == ("failed", PLAN_FAILED)
    assert balance(gw) == before
    with gw.state.session() as s:
        assert s.query(Strike).count() == 0 and s.get(Enclave, w.enclave_id).inflight == 0
    [row] = [r for r in gw.client.get("/validator/v1/ledger", headers=gw.validator).json() if r["job_id"] == work["job_id"]]
    # Not rewritten into a miner fault (validators count internal_error, not plan_failed), and billed nothing.
    assert (row["error_code"], row["billable_usd"]) == (PLAN_FAILED, 0.0)


# ------------------------------------------------------------------ quotes and limits


def test_quotes_price_plans_flat_and_route_them_like_the_job(gw):
    def quote(**body):
        return gw.client.post("/v1/quote", json={"profile_id": FAST.id, "mode": "plan", **body})

    worker(gw, features=None)
    refused = quote(duration_s=30)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (503, "no_capacity")
    w = worker(gw)
    private = quote(duration_s=30, resolution="1080p", fps=48)
    assert private.status_code == 200, private.text
    body = private.json()
    assert (body["price_usd"], body["params"]["mode"], body["params"]["duration_s"]) == (0.1, "plan", 30.0)
    assert body["breakdown"] == {
        "plan_usd": 0.1, "usd_per_second": None, "billable_seconds": 0.0, "fps_multiplier": 1.0, "long_clip_over_s": None,
        "long_clip_multiplier": 1.0, "subtotal_usd": 0.1, "min_job_usd": FAST.pricing.min_job_usd, "minimum_applied": False,
    }
    assert quote(duration_s=120, privacy="standard").json()["price_usd"] == FAST.pricing.standard_plan_usd == 0.08
    for extra, status, code in (
        ({}, 422, "invalid_params"),
        ({"duration_s": 200}, 422, "invalid_params"),
        ({"duration_s": 30, "input_roles": ["first_frame"]}, 422, "invalid_inputs"),
        ({"shots": [{"duration_s": 5}, {"duration_s": 5}]}, 422, "invalid_shots"),
    ):
        answer = quote(**extra)
        assert (answer.status_code, answer.json()["detail"]["code"]) == (status, code), (extra, answer.text)

    # The quote is the hold.
    params = GenerationParams.model_validate(body["params"])
    before = balance(gw)
    assert submit(gw, w, params).json()["price_usd"] == body["price_usd"]
    assert before - balance(gw) == ledger.to_micros(body["price_usd"])


def test_plans_have_their_own_rate_limit_and_count_toward_active_jobs(gw):
    assert Settings.from_env({"KUNO_DATA_DIR": str(gw.data), "KUNO_PLANS_PER_MINUTE": "3"}).plans_per_minute == 3
    gw.state.settings.plans_per_minute = 2
    gw.state.settings.max_active_jobs = 4
    w = worker(gw)
    account_id = uuid.uuid4().hex
    with gw.state.session() as s, s.begin():
        s.add(Account(id=account_id, name="u@example.com", balance_micros=0, is_validator=False, created_at=time.time()))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "t")
        ledger.post(s, account_id, ledger.to_micros(20), kind=ledger.ADJUSTMENT, source="admin", idempotency_key=f"admin:{account_id}")
    headers = {"authorization": f"Bearer {key}"}
    assert [submit(gw, w, plan_params(), headers=headers).status_code for _ in range(2)] == [201, 201]
    limited = submit(gw, w, plan_params(), headers=headers)
    detail = limited.json()["detail"]
    assert (limited.status_code, detail["code"]) == (429, "rate_limited") and "plans" in detail["message"]
    # Videos aren't held to the plan limit, but every queued plan holds an active slot.
    assert [submit(gw, w, TEXT, headers=headers).status_code for _ in range(2)] == [201, 201]
    busy = submit(gw, w, TEXT, headers=headers)
    assert (busy.status_code, busy.json()["detail"]["code"]) == (429, "too_many_active_jobs")
    with gw.state.session() as s:
        assert s.query(Job).filter(Job.account_id == account_id).count() == 4
