"""A worker's `safety_blocked` failure report is a strike on the customer's account unless it carries `strike: false`: the
blocked text was written by a model inside the enclave (an enhanced prompt, a plan), or the planner refused a brief that
passed the checks (PROTOCOL.md "Failure reports and strikes"; MODERATION.md "Strikes and automatic restrictions"). The job fails and
is refunded either way. A real mock-TEE worker with the mock backend's test hooks reports through the miner API of a test
app, in both privacy modes; reports it sends by hand cover the wire's edges: a report without the field, as from every
worker before it, strikes as before, and a malformed one is refused."""

from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import SenderSession, signing_key_from_bytes
from kuno_protocol.plans import PLAN_OPTION
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, JobCreate, MinerJob, SealedPayload, job_aad
from kuno_protocol.sealed_payload import seal_payload
from kuno_worker import safety
from kuno_worker.backends.base import ENHANCE_PROMPT_OPTION
from kuno_worker.backends.media_tools import ffmpeg_exe
from kuno_worker.backends.mock import MockBackend
from kuno_worker.config import WorkerConfig
from kuno_worker.safety import SafetyGate
from kuno_worker.worker import PROMPT_BLOCKED, Worker

from kuno_gateway import identity, ledger
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Job
from kuno_gateway.db_moderation import Strike
from kuno_gateway.settings import Settings

pytestmark = pytest.mark.skipif(ffmpeg_exe() is None, reason="the mock backend renders with ffmpeg")

FAST = "ltx-2.5-fast"
TEXT = GenerationParams(profile_id=FAST, mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24)
PLAN = GenerationParams(profile_id=FAST, mode=Mode.PLAN, duration_s=12, resolution="720p", aspect_ratio="16:9", fps=24)
PROMPT = "A lighthouse keeper lights the lamp at dusk"
BLOCKED = "a naked woman on a bed"  # the shared content policy's "sexual" category
# Passes the shared content policy, so the gateway seals it in Standard mode; the worker's classifier blocks it.
CLASSIFIED = "A quiet street at night, ZEBRA-4412"


@pytest.fixture(autouse=True)
def fresh_gate():
    safety.configure(SafetyGate())
    yield
    safety.configure(None)


class MarkerClassifier:
    """A prompt classifier that blocks one text as sexual, whoever wrote it."""

    name = "marker"

    def classify(self, text):
        return {"sexual": 1.0} if text == CLASSIFIED else {}


def forwarding(client: TestClient) -> httpx.MockTransport:
    """The worker's calls to the gateway, answered in process by the app behind `client`."""

    def handle(request: httpx.Request) -> httpx.Response:
        headers = {key: value for key, value in request.headers.items() if key.startswith("x-kuno-") or key == "content-type"}
        answer = client.request(request.method, request.url.raw_path.decode(), content=request.content, headers=headers)
        return httpx.Response(answer.status_code, content=answer.content, headers={"content-type": answer.headers.get("content-type", "")})

    return httpx.MockTransport(handle)


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    app = create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)}))
    return SimpleNamespace(client=TestClient(app), state=app.state.gw, data=data, dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"})


def start_worker(gw, backend: MockBackend) -> Worker:
    """A registered mock-TEE worker (confidential tier; `plan/1`, since the mock backend writes plans)."""
    quote_key = signing_key_from_bytes(b64d((gw.data / "mock_quote.key").read_text()))
    config = WorkerConfig(gateway_url="http://gateway", profiles=[FAST], image_digest=devkit.DEV_IMAGE_DIGEST, miner_hotkey="5Miner",
                          workdir=gw.data / "work")
    worker = Worker(config, MockTEE(quote_key, devkit.DEV_IMAGE_DIGEST), {"*": backend}, transport=forwarding(gw.client))
    worker.register()
    return worker


def pull(worker: Worker) -> MinerJob:
    work = worker.client.pull(wait=0)
    assert work["kind"] == "job", work
    return MinerJob.model_validate(work)


def new_account(gw) -> tuple[str, dict]:
    """A customer eligible for Private mode (an operator credit), and not exempt from restrictions."""
    account_id = uuid.uuid4().hex
    with gw.state.session() as s, s.begin():
        s.add(Account(id=account_id, name="u@example.com", owner_user_id=uuid.uuid4().hex, balance_micros=0, is_validator=False,
                      created_at=time.time()))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "t")
        ledger.post(s, account_id, ledger.to_micros(20), kind=ledger.ADJUSTMENT, source="admin", idempotency_key=f"admin:{account_id}")
    return account_id, {"authorization": f"Bearer {key}"}


def balance(gw, account_id: str) -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


def struck_jobs(gw, account_id: str) -> list[str]:
    with gw.state.session() as s:
        return [strike.job_id for strike in s.query(Strike).filter(Strike.account_id == account_id).order_by(Strike.created_at)]


def private_job(gw, worker: Worker, headers: dict, prompt: str, params: GenerationParams = TEXT, options: dict | None = None) -> str:
    """Sealed on the customer's side, as the SDKs seal it, to the worker's attested key."""
    job_id = str(uuid.uuid4())
    session = SenderSession(worker.identity.hpke_public)
    payload = SealedPayload(prompt=prompt, seed=7, options=options or {})
    ciphertext = seal_payload(session, payload, job_aad(job_id, worker.identity.enclave_id, params, []))
    job = JobCreate(job_id=job_id, params=params, enclave_id=worker.identity.enclave_id, enc=b64e(session.enc), ciphertext=b64e(ciphertext))
    created = gw.client.post("/v1/videos", json=job.model_dump(mode="json"), headers=headers)
    assert created.status_code == 201, created.text
    return job_id


def standard_job(gw, headers: dict, path: str, body: dict) -> str:
    created = gw.client.post(path, json=body, headers=headers)
    assert created.status_code == 201, created.text
    return created.json()["job_id"]


def run(gw, worker: Worker, headers: dict, job_id: str) -> dict:
    job = pull(worker)
    assert job.job_id == job_id
    worker.handle_job(job)
    return gw.client.get(f"/v1/videos/{job_id}", headers=headers).json()


def blocked(status: dict) -> bool:
    return (status["status"], status["error_code"], status["error"]) == ("failed", "safety_blocked", PROMPT_BLOCKED)


# ------------------------------------------------------------------ prompt enhancement


def test_a_private_enhanced_prompt_the_check_blocks_is_refunded_without_a_strike_and_a_blocked_prompt_strikes(gw):
    worker = start_worker(gw, MockBackend(enhancer=lambda prompt: f"{prompt}, {BLOCKED}"))
    account_id, headers = new_account(gw)
    before = balance(gw, account_id)

    enhanced = private_job(gw, worker, headers, PROMPT, options={ENHANCE_PROMPT_OPTION: True})
    assert blocked(run(gw, worker, headers, enhanced))
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == []
    eligibility = gw.client.get("/v1/account/eligibility", headers=headers).json()
    assert eligibility["private_mode"] == {"eligible": True, "reasons": []} and eligibility["strikes_24h"] == 0

    # The customer's own prompt, blocked before the enhancer runs: refunded, and a strike as always.
    own = private_job(gw, worker, headers, BLOCKED, options={ENHANCE_PROMPT_OPTION: True})
    assert blocked(run(gw, worker, headers, own))
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == [own]


def test_a_standard_enhanced_prompt_the_check_blocks_is_refunded_without_a_strike_and_a_blocked_prompt_strikes(gw):
    safety.configure(SafetyGate(classifier=MarkerClassifier()))
    worker = start_worker(gw, MockBackend(enhancer=lambda _prompt: CLASSIFIED))
    account_id, headers = new_account(gw)
    before = balance(gw, account_id)

    body = {"params": TEXT.model_dump(mode="json"), "prompt": PROMPT, "options": {ENHANCE_PROMPT_OPTION: True}}
    enhanced = standard_job(gw, headers, "/v1/standard/videos", body)
    assert blocked(run(gw, worker, headers, enhanced))
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == []

    # The gateway's content policy passes this prompt; the worker's classifier blocks it as the customer's.
    own = standard_job(gw, headers, "/v1/standard/videos", {**body, "prompt": CLASSIFIED})
    assert blocked(run(gw, worker, headers, own))
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == [own]


# ------------------------------------------------------------------ plans


def test_a_plan_the_planner_wrote_blocked_text_into_or_refused_is_no_strike_in_either_mode(gw):
    writes_blocked = MockBackend(plan_reply=lambda reply: reply.replace("The camera slowly pushes in.", f"{BLOCKED}."))
    account_id, headers = new_account(gw)
    before = balance(gw, account_id)
    brief = "A lighthouse keeper climbs the tower at dusk and lights the lamp as a storm rolls in."
    for backend in (writes_blocked, MockBackend(plan_reply=lambda _reply: '{"refusal": "I can\'t plan this brief."}')):
        worker = start_worker(gw, backend)
        private = private_job(gw, worker, headers, brief, params=PLAN, options={PLAN_OPTION: {}})
        assert blocked(run(gw, worker, headers, private))
        standard = standard_job(gw, headers, "/v1/standard/plans", {"params": PLAN.model_dump(mode="json"), "brief": brief})
        assert blocked(run(gw, worker, headers, standard))
        worker.retire()
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == []

    # A brief the worker's check blocks is the customer's: a strike, before the planner runs.
    worker = start_worker(gw, writes_blocked)
    own = private_job(gw, worker, headers, BLOCKED, params=PLAN, options={PLAN_OPTION: {}})
    assert blocked(run(gw, worker, headers, own))
    assert balance(gw, account_id) == before and struck_jobs(gw, account_id) == [own]


# ------------------------------------------------------------------ the wire


def report(worker: Worker, job_id: str, body: dict) -> httpx.Response:
    """A failure report sent as written, signed by the enclave."""
    try:
        worker.client._send("POST", f"/miner/v1/jobs/{job_id}/fail", json.dumps(body).encode())
    except Exception as exc:  # GatewayError: the status and code the gateway answered
        return httpx.Response(exc.status, json={"detail": {"code": exc.code}})
    return httpx.Response(200)


def test_a_report_without_the_field_strikes_as_before_and_a_malformed_one_is_refused(gw):
    worker = start_worker(gw, MockBackend())
    # The seeded dev account collects strikes but, exempt, stays eligible for Private mode through the second.
    account_id, headers = "dev", gw.dev

    # Every worker from before the field: its report is exactly this, and strikes.
    older = private_job(gw, worker, headers, PROMPT)
    worker.client.fail(pull(worker).job_id, "safety_blocked", PROMPT_BLOCKED)
    assert struck_jobs(gw, account_id) == [older]

    explicit = private_job(gw, worker, headers, PROMPT)
    assert report(worker, pull(worker).job_id, {"code": "safety_blocked", "message": PROMPT_BLOCKED, "strike": True}).status_code == 200
    assert struck_jobs(gw, account_id) == [older, explicit]

    # Not a boolean: refused, and the job stays running until a well-formed report comes.
    malformed = private_job(gw, worker, headers, PROMPT)
    pull(worker)
    for value in ("false", 0, None):
        refused = report(worker, malformed, {"code": "safety_blocked", "message": PROMPT_BLOCKED, "strike": value})
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_body"), value
    with gw.state.session() as s:
        assert s.get(Job, malformed).status == "running"
    worker.client.fail(malformed, "safety_blocked", PROMPT_BLOCKED, strike=False)
    assert blocked(gw.client.get(f"/v1/videos/{malformed}", headers=headers).json())
    assert struck_jobs(gw, account_id) == [older, explicit]

    # Meaningless for any other code, which is never a strike; and fields the gateway doesn't know are ignored, which is
    # how gateways from before `strike` read a report that carries it.
    other = private_job(gw, worker, headers, PROMPT)
    assert report(worker, pull(worker).job_id, {"code": "internal_error", "message": "Generation failed inside the worker.", "strike": False,
                                                "later": "field"}).status_code == 200
    status = gw.client.get(f"/v1/videos/{other}", headers=headers).json()
    assert (status["status"], status["error_code"]) == ("failed", "internal_error")
    assert struck_jobs(gw, account_id) == [older, explicit]
