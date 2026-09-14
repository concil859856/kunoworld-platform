"""The Turbo router, mounted on a test app: owner-signed specs, candidate enclaves that customers can never
reach, benchmark jobs that only validators can pin to an attested image digest, candidate challenges and
eval sets that stay hidden until their reveal time."""

from __future__ import annotations

import json
import secrets
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from kuno_gateway import api_turbo
from kuno_gateway.app import create_app
from kuno_gateway.db import Enclave, Job
from kuno_gateway.settings import Settings
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE, build_evidence, enclave_id_for, mock_measurements
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import (
    generate_hpke_keypair,
    generate_signing_key,
    public_key_bytes,
    request_signature_message,
    signing_key_from_bytes,
)
from kuno_protocol.hotkey import Sr25519Signer, sign_hotkey_proof
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, MinerChallenge, MinerJob, MinerRegistration
from kuno_protocol.turbo import (
    AdoptionRule,
    BaseMeasurements,
    EvalPrompt,
    EvalSet,
    EvalWindow,
    PipelineDescription,
    QualityFloor,
    SpeedMetric,
    TurboSpec,
    TurboSubmission,
    eval_set_digest,
    sign_submission,
    sign_turbo_spec,
)

PARAMS = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=4, resolution="720p", aspect_ratio="16:9", fps=24)
BASE = mock_measurements("sha256:base")


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    app = create_app(settings)
    app.include_router(api_turbo.router)  # the hook app.py needs
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw, settings=settings, env=env, data=data,
        owner=signing_key_from_bytes(b64d((data / "owner.key").read_text())),
        quote_key=signing_key_from_bytes(b64d((data / "mock_quote.key").read_text())),
    )


def bearer(key: str) -> dict:
    return {"authorization": f"Bearer {key}"}


def make_spec(eval_set: EvalSet, *, starts_at: int | None = None, ends_at: int | None = None, issued_at: int | None = None) -> TurboSpec:
    now = int(time.time())
    return TurboSpec(
        competition_id="ltx-fast-1", issued_at=issued_at or now, target_profile="ltx-2.5-fast", reference_profile="ltx-2.5-pro",
        base_measurements=[BaseMeasurements(platform="mock", **{k: BASE[k] for k in ("mrtd", "rtmr0", "rtmr1", "rtmr2")})],
        hardware_class="C1", quality=QualityFloor(metric="dev-caption", min_mean=0.5),
        speed=SpeedMetric(resolution="720p", durations_s=[4], baseline=10.0), adoption=AdoptionRule(profile_id="ltx-2.5-fast-t1"),
        windows=[EvalWindow(index=0, starts_at=starts_at or now - 60, ends_at=ends_at or now + 3600, eval_set_commitment=eval_set_digest(eval_set))],
    )


def new_eval_set() -> EvalSet:
    return EvalSet(competition_id="ltx-fast-1", window=0, salt=secrets.token_hex(16),
                   prompts=[EvalPrompt(id="p0", prompt="a night train on a snowy bridge", duration_s=4)])


def publish(gw, spec: TurboSpec, key=None):
    signed = sign_turbo_spec(key or gw.owner, spec)
    from operator_sessions import operator_headers

    return gw.client.put("/turbo/v1/spec", json=signed.model_dump(mode="json"), headers=operator_headers(gw.state, "owner@kunoworld.test"))


class Candidate:
    """A worker running a submitted image inside the simulated TEE."""

    def __init__(self, gw, image: str = "sha256:candidate", miner: Sr25519Signer | None = None):
        self.gw, self.image = gw, image
        self.miner = miner or Sr25519Signer.from_seed(secrets.token_bytes(32))
        self.key = generate_signing_key()
        _, self.hpke = generate_hpke_keypair()
        self.signing_public = public_key_bytes(self.key)
        self.enclave_id = enclave_id_for(self.hpke, self.signing_public)

    def submission(self, **overrides):
        fields = dict(
            competition_id="ltx-fast-1", hotkey=self.miner.ss58_address, profile_variant="ltx-2.5-fast+fp8.1",
            pipeline=PipelineDescription(summary="fp8", runtime="ltx-pipelines", steps=6, source_url="https://git.example/x@1"),
            image_digest=self.image, platform="mock", rtmr3=mock_measurements(self.image)["rtmr3"],
        )
        fields.update(overrides)
        return sign_submission(self.miner, TurboSubmission(**fields))

    def evidence(self, nonce: bytes, image: str | None = None, profiles=("ltx-2.5-fast",)):
        image = image or self.image
        return build_evidence(MockTEE(self.gw.quote_key, image), nonce, self.hpke, self.signing_public, image, list(profiles))

    def post(self, path: str, body: dict):
        raw, timestamp = json.dumps(body).encode(), str(int(time.time()))
        signature = self.key.sign(request_signature_message("POST", path, timestamp, raw))
        headers = {"x-kuno-enclave": self.enclave_id, "x-kuno-timestamp": timestamp, "x-kuno-signature": b64e(signature),
                   "content-type": "application/json"}
        return self.gw.client.post(path, content=raw, headers=headers)

    def register(self, submission=None, *, evidence_image=None, profiles=("ltx-2.5-fast",), proof_signer=None, proof=True):
        nonce = bytes.fromhex(self.gw.client.get("/miner/v1/nonce").json()["nonce"])
        hotkey_proof = sign_hotkey_proof(proof_signer or self.miner, nonce, self.enclave_id, self.signing_public) if proof else None
        registration = MinerRegistration(
            evidence=self.evidence(nonce, evidence_image, profiles), miner_hotkey=self.miner.ss58_address, hotkey_proof=hotkey_proof
        )
        body = {"registration": registration.model_dump(mode="json"), "submission": (submission or self.submission()).model_dump(mode="json")}
        return self.post("/turbo/v1/enclaves", body)


def benchmark(gw, enclave_id: str, pin: str, key: str | None = None, **extra):
    body = {"job_id": str(uuid.uuid4()), "params": PARAMS.model_dump(mode="json"), "enclave_id": enclave_id,
            "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": [], "pin_image_digest": pin, **extra}
    return gw.client.post("/turbo/v1/videos", json=body, headers=bearer(key or gw.env["KUNO_VALIDATOR_API_KEY"]))


def add_serving_enclave(gw) -> str:
    now = time.time()
    with gw.state.session() as s, s.begin():
        s.add(Enclave(id="s" * 32, miner_hotkey="5Serving", tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key="x",
                      signing_public_key="y", profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}", capacity=1,
                      inflight=0, status="active", verified_at=now, last_seen=now))
    return "s" * 32


# ---------------------------------------------------------------- spec


def test_the_spec_needs_an_admin_operator_the_owner_signature_and_a_newer_issue(gw):
    spec = make_spec(new_eval_set())
    signed = sign_turbo_spec(gw.owner, spec).model_dump(mode="json")
    assert gw.client.get("/turbo/v1/spec").status_code == 404
    assert gw.client.put("/turbo/v1/spec", json=signed).status_code in (401, 403)
    assert publish(gw, spec, key=generate_signing_key()).json()["detail"]["code"] == "bad_signature"
    assert publish(gw, spec).status_code == 200
    assert gw.client.get("/turbo/v1/spec").json() == signed
    assert publish(gw, spec.model_copy(update={"issued_at": spec.issued_at - 5})).status_code == 409
    assert publish(gw, spec.model_copy(update={"issued_at": spec.issued_at + 5})).status_code == 200


# ---------------------------------------------------------------- candidates


def test_a_candidate_registers_for_its_submission_and_customers_can_never_reach_it(gw):
    publish(gw, make_spec(new_eval_set()))
    candidate = Candidate(gw)
    response = candidate.register()
    assert response.status_code == 200, response.text
    assert response.json()["submission_digest"] == candidate.submission().digest() or response.json()["submission_digest"]
    with gw.state.session() as s:
        row = s.get(Enclave, candidate.enclave_id)
    assert json.loads(row.profiles) == ["turbo:ltx-2.5-fast"] and row.miner_hotkey == candidate.miner.ss58_address

    dev = bearer(gw.env["KUNO_DEV_API_KEY"])
    route = gw.client.get("/v1/route", params={"mode": "text_to_video", "profile_id": "ltx-2.5-fast"}, headers=dev)
    assert candidate.enclave_id not in route.text
    organic = {"job_id": str(uuid.uuid4()), "params": PARAMS.model_dump(mode="json"), "enclave_id": candidate.enclave_id,
               "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": []}
    assert gw.client.post("/v1/videos", json=organic, headers=dev).json()["detail"]["code"] == "enclave_unavailable"
    models = gw.client.get("/v1/models").json()
    assert next(m for m in models["models"] if m["id"] == "ltx-2.5-fast")["workers"] == 0

    listed = gw.client.get("/turbo/v1/enclaves", headers=bearer(gw.env["KUNO_VALIDATOR_API_KEY"])).json()
    assert [e["enclave_id"] for e in listed] == [candidate.enclave_id] and listed[0]["submission_digest"]
    assert gw.client.get("/turbo/v1/enclaves", headers=dev).status_code == 403


@pytest.mark.parametrize(
    "case, status, code",
    [
        ("other_image", 403, "image_mismatch"),
        ("wrong_rtmr3", 403, "attestation_failed"),
        ("forged_submission", 403, "submission_invalid"),
        ("proof_by_another_hotkey", 403, "hotkey_proof_invalid"),
        ("extra_profiles", 422, "wrong_profiles"),
        ("other_competition", 409, "wrong_competition"),
    ],
)
def test_candidate_registration_refusals(gw, case, status, code):
    publish(gw, make_spec(new_eval_set()))
    candidate = Candidate(gw)
    kwargs: dict = {}
    if case == "other_image":
        kwargs["evidence_image"] = "sha256:incumbent"
    elif case == "wrong_rtmr3":
        kwargs["submission"] = candidate.submission(rtmr3=mock_measurements("sha256:different")["rtmr3"])
    elif case == "forged_submission":
        signed = candidate.submission()
        kwargs["submission"] = signed.model_copy(update={"submission": signed.submission.model_copy(update={"pipeline": signed.submission.pipeline.model_copy(update={"steps": 2})})})
    elif case == "proof_by_another_hotkey":
        kwargs["proof_signer"] = Sr25519Signer.from_seed(secrets.token_bytes(32))
    elif case == "extra_profiles":
        kwargs["profiles"] = ("ltx-2.5-fast", "ltx-2.5-pro")
    elif case == "other_competition":
        kwargs["submission"] = candidate.submission(competition_id="other-1")
    response = candidate.register(**kwargs)
    assert (response.status_code, response.json()["detail"]["code"]) == (status, code)
    with gw.state.session() as s:
        assert s.get(Enclave, candidate.enclave_id) is None


def test_no_candidates_without_a_running_competition(gw):
    assert Candidate(gw).register().json()["detail"]["code"] == "no_competition"
    past = make_spec(new_eval_set(), starts_at=int(time.time()) - 7200, ends_at=int(time.time()) - 3600)
    publish(gw, past)
    assert Candidate(gw).register().json()["detail"]["code"] == "competition_closed"


# ---------------------------------------------------------------- benchmark jobs


def test_benchmarks_are_validator_only_and_pinned_to_the_attested_image(gw):
    publish(gw, make_spec(new_eval_set()))
    candidate = Candidate(gw)
    assert candidate.register().status_code == 200

    assert benchmark(gw, candidate.enclave_id, candidate.image, key=gw.env["KUNO_DEV_API_KEY"]).status_code == 403
    assert benchmark(gw, candidate.enclave_id, "sha256:incumbent").json()["detail"]["code"] == "image_mismatch"
    assert benchmark(gw, candidate.enclave_id, candidate.image, webhook_url="https://hook.test/").status_code == 422
    created = benchmark(gw, candidate.enclave_id, candidate.image)
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    with gw.state.session() as s:
        job = s.get(Job, job_id)
        assert (job.enclave_id, job.profile_id, job.account_id) == (candidate.enclave_id, "ltx-2.5-fast", "validator")

    work = gw.state.next_work(candidate.enclave_id)
    assert isinstance(work, MinerJob) and work.job_id == job_id and work.params == PARAMS
    # What the enclave receives carries no trace of being a benchmark.
    assert set(work.model_dump(mode="json")) == {"kind", "job_id", "params", "enc", "ciphertext", "input_blob_ids"}


def test_validators_can_pin_serving_enclaves_by_digest_too(gw):
    serving = add_serving_enclave(gw)
    assert benchmark(gw, serving, devkit.DEV_IMAGE_DIGEST).status_code == 201
    assert benchmark(gw, serving, "sha256:candidate").json()["detail"]["code"] == "image_mismatch"
    wrong_profile = dict(PARAMS.model_dump(mode="json"), profile_id="ltx-2.5-pro")
    response = gw.client.post(
        "/turbo/v1/videos",
        json={"job_id": str(uuid.uuid4()), "params": wrong_profile, "enclave_id": serving, "enc": "AAAA", "ciphertext": "AAAA",
              "input_blob_ids": [], "pin_image_digest": devkit.DEV_IMAGE_DIGEST},
        headers=bearer(gw.env["KUNO_VALIDATOR_API_KEY"]),
    )
    assert response.status_code in (409, 422)


# ---------------------------------------------------------------- challenges and eval sets


def test_a_candidate_answers_a_validator_challenge_against_its_candidate_manifest(gw):
    publish(gw, make_spec(new_eval_set()))
    candidate = Candidate(gw)
    candidate.register()
    validator = bearer(gw.env["KUNO_VALIDATOR_API_KEY"])
    nonce = secrets.token_bytes(32)
    challenge_id = gw.client.post("/validator/v1/challenges", json={"enclave_id": candidate.enclave_id, "nonce": nonce.hex()},
                                  headers=validator).json()["challenge_id"]
    work = gw.state.next_work(candidate.enclave_id)
    assert isinstance(work, MinerChallenge) and work.challenge_id == challenge_id

    answer = candidate.post(f"/turbo/v1/challenges/{challenge_id}", {"evidence": candidate.evidence(nonce).model_dump(mode="json")})
    assert answer.json() == {"ok": True, "reasons": []}
    state = gw.client.get(f"/validator/v1/challenges/{challenge_id}", headers=validator).json()
    assert state["status"] == "answered" and state["evidence"]["image_digest"] == candidate.image
    with gw.state.session() as s:
        assert s.get(Enclave, candidate.enclave_id).status == "active"


def test_a_serving_enclave_cannot_use_the_candidate_answer_path(gw):
    publish(gw, make_spec(new_eval_set()))
    candidate = Candidate(gw)
    candidate.register()
    with gw.state.session() as s, s.begin():
        s.get(Enclave, candidate.enclave_id).profiles = json.dumps(["ltx-2.5-fast"])  # as if it were a serving enclave
    response = candidate.post("/turbo/v1/challenges/whatever", {"evidence": {}})
    assert response.json()["detail"]["code"] == "not_candidate"


def test_eval_sets_are_validator_only_until_their_reveal(gw):
    eval_set = new_eval_set()
    publish(gw, make_spec(eval_set))
    path = api_turbo.eval_set_path(gw.state, "ltx-fast-1", 0)
    path.parent.mkdir(parents=True)
    path.write_text(eval_set.model_dump_json())
    url = "/turbo/v1/eval-sets/ltx-fast-1/0"
    assert gw.client.get(url).status_code == 401
    assert gw.client.get(url, headers=bearer(gw.env["KUNO_DEV_API_KEY"])).status_code == 403
    assert gw.client.get(url, headers=bearer(gw.env["KUNO_VALIDATOR_API_KEY"])).json() == eval_set.model_dump(mode="json")
    assert gw.client.get("/turbo/v1/eval-sets/..%2F..%2Fsecrets/0").status_code == 404

    tampered = eval_set.model_copy(update={"prompts": [EvalPrompt(id="p0", prompt="something easier", duration_s=4)]})
    path.write_text(tampered.model_dump_json())
    assert gw.client.get(url, headers=bearer(gw.env["KUNO_VALIDATOR_API_KEY"])).json()["detail"]["code"] == "eval_set_mismatch"

    path.write_text(eval_set.model_dump_json())
    ended = make_spec(eval_set, starts_at=int(time.time()) - 7200, ends_at=int(time.time()) - 60, issued_at=int(time.time()) + 10)
    assert publish(gw, ended).status_code == 200
    assert gw.client.get(url).json() == eval_set.model_dump(mode="json"), "revealed sets are public for audit"
