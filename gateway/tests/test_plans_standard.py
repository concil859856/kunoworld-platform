"""Standard plans (PROTOCOL.md "Plans (Director)"; STANDARD_MODE.md): `POST /v1/standard/plans` checks the brief, style and
any revision like a Standard prompt, seals them to a confidential enclave that lists `plan/1`, and charges the flat
Standard plan price. When the plan arrives the gateway decrypts it, checks it against the receipt, the protocol and the
content policy, and keeps it readable for the owner, validators and export until the owner deletes it.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json
import time

from account_sessions import build_exports, export_zip, signed_in
from plan_helpers import FAST, plan_params, plan_receipt, sealed_plan, write_plan
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    TEXT,
    balance,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
)

import pytest
from kuno_protocol.canonical import b64d, sha256_hex
from kuno_protocol.crypto import RecipientSession
from kuno_protocol.plans import PLAN_FEATURE, PLAN_OPTION, Plan, PlanOptions, PlanRevision
from kuno_protocol.schemas import GenerationParams, JobState, job_aad
from kuno_protocol.sealed_payload import open_payload

from kuno_gateway import ledger
from kuno_gateway.db import Blob, Enclave, Job
from kuno_gateway.db_moderation import StandardJob, Strike

BRIEF = "A lighthouse keeper lights the lamp as a storm rolls in over the sea."
NSFW = "n.u.d.e woman walking on a beach"
PARAMS = plan_params(30)


@pytest.fixture(autouse=True)
def plan_worker(gw):
    """The flow's simulated worker is open-tier; plans go only to confidential enclaves that list plan/1."""
    set_worker(gw, tee="mock", features=[PLAN_FEATURE])


def set_worker(gw, *, tee: str, features: list[str] | None) -> None:
    with gw.state.session() as s, s.begin():
        enclave = s.get(Enclave, ENCLAVE)
        enclave.tee, enclave.features = tee, json.dumps(features) if features else None


def post(gw, headers, *, params: GenerationParams = PARAMS, brief: str = BRIEF, path: str = "/v1/standard/plans", **extra):
    return gw.client.post(path, json={"params": params.model_dump(mode="json"), "brief": brief, **extra}, headers=headers)


def strikes(gw, account_id: str) -> list[str]:
    with gw.state.session() as s:
        return [x.reason for x in s.query(Strike).filter(Strike.account_id == account_id).all()]


def nothing_stored(gw, account_id: str) -> bool:
    with gw.state.session() as s:
        return (s.query(Job).filter(Job.account_id == account_id).count() == 0
                and s.query(StandardJob).filter(StandardJob.account_id == account_id).count() == 0 and s.query(Blob).count() == 0)


def deliver(gw, job_id: str, *, prompt: str | None = None, tamper: bool = False) -> tuple[Plan, bytes]:
    """What a worker does for a plan job: open the sealed request, write and fit a plan, seal it, sign a receipt."""
    with gw.state.session() as s:
        job = s.get(Job, job_id)
    params = GenerationParams.model_validate_json(job.params)
    session = RecipientSession(gw.hpke_private, b64d(job.enc))
    payload = open_payload(session, b64d(job.ciphertext), job_aad(job_id, ENCLAVE, params, []))
    plan = write_plan(params, payload.prompt or "the plan", PlanOptions.model_validate(payload.options.get(PLAN_OPTION) or {}), prompt=prompt)
    plan_json, sealed = sealed_plan(session.output_key, job_id, plan)
    receipt = plan_receipt(gw.signing, job_id=job_id, enclave_id=ENCLAVE, params=params, plan=plan, plan_json=plan_json, sealed=sealed,
                           content_digest=sha256_hex(b"forged") if tamper else None)
    now = time.time()
    with gw.state.session() as s, s.begin():
        job = s.get(Job, job_id)
        job.status, job.started_at = JobState.RUNNING.value, now
        blob_id, digest, size = gw.state.blobs.put(sealed)
        s.add(Blob(id=blob_id, owner_kind="enclave", owner_id=ENCLAVE, job_id=job_id, size=size, sha256=digest, created_at=now,
                   expires_at=now + 3600))
        job.output_blob_id, job.receipt, job.content_digest = blob_id, receipt.model_dump_json(), receipt.body.content_digest
        gw.state.finish_job(s, job, JobState.SUCCEEDED)
    return plan, plan_json


def test_a_standard_plan_is_sealed_charged_flat_kept_readable_exported_and_deleted_by_its_owner(gw, media):
    alice = signed_in(gw, "alice@example.com")
    before = balance(gw, alice.account_id)
    created = post(gw, alice.headers, style="35mm film, warm", seed=11, options={"max_shots": 6})
    assert created.status_code == 201, created.text
    job = created.json()
    assert (job["privacy"], job["params"]["mode"], job["price_usd"]) == ("standard", "plan", FAST.pricing.standard_plan_usd)
    assert before - balance(gw, alice.account_id) == ledger.to_micros(0.08)

    # The worker opens exactly what a client-sealed plan carries: the brief as the prompt and options.plan.
    with gw.state.session() as s:
        stored = s.get(Job, job["job_id"])
    payload = open_payload(RecipientSession(gw.hpke_private, b64d(stored.enc)), b64d(stored.ciphertext),
                           job_aad(job["job_id"], ENCLAVE, PARAMS, []))
    assert (payload.prompt, payload.seed, payload.negative_prompt, payload.shots) == (BRIEF, 11, None, None)
    assert payload.options == {PLAN_OPTION: {"v": 1, "style": "35mm film, warm", "min_shots": 2, "max_shots": 6}}
    assert gw.client.get(f"/v1/standard/plans/{job['job_id']}", headers=alice.headers).json()["detail"]["code"] == "not_ready"

    plan, plan_json = deliver(gw, job["job_id"])
    status = gw.client.get(f"/v1/plans/{job['job_id']}", headers=alice.headers).json()
    assert status["status"] == "succeeded" and "video" not in status["receipt"]["body"]
    got = gw.client.get(f"/v1/standard/plans/{job['job_id']}", headers=alice.headers)
    assert (got.status_code, got.headers["content-type"]) == (200, "application/json")
    # Byte for byte the JSON the receipt's content digest covers, and a valid Plan v1.
    assert got.content == plan_json and sha256_hex(got.content) == status["receipt"]["body"]["content_digest"]
    assert Plan.model_validate_json(got.content) == plan
    assert gw.client.get(f"/v1/me/standard/plans/{job['job_id']}", headers=alice.headers).content == plan_json
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        assert (row.prompt, row.plan, row.output_key, row.video_blob_id) == (BRIEF, plan_json.decode(), None, None)

    [listed] = gw.client.get("/v1/standard/plans", headers=alice.headers).json()
    assert (listed["brief"], listed["style"], listed["plan"], listed["deleted"]) == (BRIEF, "35mm film, warm", json.loads(plan_json), False)
    # Not a video: the videos list leaves it out, and the video routes point at the plan.
    assert gw.client.get("/v1/standard/videos", headers=alice.headers).json() == []
    not_video = gw.client.get(f"/v1/standard/videos/{job['job_id']}/video", headers=alice.headers)
    assert (not_video.status_code, not_video.json()["detail"]["code"]) == (404, "not_a_video")

    feed = gw.client.get(f"/validator/v1/standard-jobs/{job['job_id']}", headers=gw.validator).json()
    assert (feed["prompt"], feed["plan"], feed["options"][PLAN_OPTION]["style"]) == (BRIEF, json.loads(plan_json), "35mm film, warm")
    video = gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": "a quiet beach"}, headers=alice.headers)
    assert "plan" not in gw.client.get(f"/validator/v1/standard-jobs/{video.json()['job_id']}", headers=gw.validator).json()

    export_id = gw.client.post("/v1/me/exports", headers=alice.headers).json()["export_id"]
    assert build_exports(gw) == 1
    archive = export_zip(gw, alice.headers, export_id)
    assert archive.read(f"standard/{job['job_id']}/plan.json") == plan_json
    assert json.loads(archive.read(f"standard/{job['job_id']}/request.json"))["prompt"] == BRIEF

    assert gw.client.delete(f"/v1/standard/plans/{job['job_id']}", headers=alice.headers).status_code == 204
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        assert (row.prompt, row.plan, row.options) == (None, None, None) and row.deleted_at is not None
    gone = gw.client.get(f"/v1/standard/plans/{job['job_id']}", headers=alice.headers)
    assert (gone.status_code, gone.json()["detail"]["code"]) == (410, "deleted")
    [listed] = gw.client.get("/v1/standard/plans", headers=alice.headers).json()
    assert (listed["brief"], listed["style"], listed["plan"], listed["deleted"]) == (None, None, None, True)


def test_the_brief_style_and_a_revision_are_checked_like_a_standard_prompt(gw):
    earlier = write_plan(PARAMS, BRIEF)
    for extra in (
        {"brief": NSFW},
        {"style": NSFW},
        {"options": {"revise": {"plan": earlier.model_dump(mode="json"), "instruction": NSFW, "shots": [1]}}},
        # The earlier plan goes to the planner too, and a partial revision returns its other shots as they are.
        {"options": {"revise": {"plan": write_plan(PARAMS, NSFW).model_dump(mode="json"), "instruction": "darker"}}},
    ):
        account_id, key = new_account(gw)
        before = balance(gw, account_id)
        refused = post(gw, key, **extra)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "content_policy"), extra
        assert strikes(gw, account_id) == ["content_policy"] and balance(gw, account_id) == before and nothing_stored(gw, account_id)

    # Malformed requests are refused before the check, and are never a strike.
    other_id, other = new_account(gw)
    for extra, code in (
        ({"brief": "x" * 4001}, "prompt_too_long"),
        ({"style": "x" * 501}, "prompt_too_long"),
        ({"brief": "  "}, "invalid_brief"),
        ({"style": "warm", "options": {"style": "cold"}}, "invalid_options"),
        ({"options": {"min_shots": 13}}, "invalid_options"),
        ({"options": {"max_shot_s": 1}}, "invalid_options"),
        ({"options": {"revise": {"plan": write_plan(plan_params(30, resolution="1080p"), BRIEF).model_dump(mode="json"), "instruction": "darker"}}}, "invalid_options"),
        ({"params": TEXT}, "invalid_params"),
        ({"params": plan_params(200)}, "invalid_params"),
    ):
        refused = post(gw, other, **extra)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (422, code), (extra, refused.text)
    assert strikes(gw, other_id) == [] and nothing_stored(gw, other_id)
    # A revision may leave the brief empty.
    revised = post(gw, other, brief="", options={"revise": {"plan": earlier.model_dump(mode="json"), "instruction": "make shot 2 darker", "shots": [2]}})
    assert revised.status_code == 201, revised.text
    # Plans aren't videos: the video route refuses them before any check.
    refused = gw.client.post("/v1/standard/videos", json={"params": PARAMS.model_dump(mode="json"), "prompt": NSFW}, headers=other)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_params") and strikes(gw, other_id) == []


def test_a_plan_the_content_policy_refuses_fails_safety_blocked_refunded_and_without_a_strike(gw):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    job = post(gw, key).json()
    deliver(gw, job["job_id"], prompt=NSFW)
    status = gw.client.get(f"/v1/plans/{job['job_id']}", headers=key).json()
    assert (status["status"], status["error_code"]) == ("failed", "safety_blocked")
    assert "content policy" in status["error"]
    assert balance(gw, account_id) == before and strikes(gw, account_id) == []
    with gw.state.session() as s:
        assert s.get(StandardJob, job["job_id"]).plan is None


def test_a_plan_that_doesnt_match_its_receipt_is_not_kept(gw):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    job = post(gw, key).json()
    deliver(gw, job["job_id"], tamper=True)
    status = gw.client.get(f"/v1/plans/{job['job_id']}", headers=key).json()
    assert (status["status"], status["error_code"]) == ("failed", "bad_output") and "content digest" in status["error"]
    assert balance(gw, account_id) == before
    with gw.state.session() as s:
        assert s.get(StandardJob, job["job_id"]).plan is None


def test_standard_plans_go_only_to_confidential_workers_that_write_plans(gw):
    _, key = new_account(gw)
    for tee, features in (("open", [PLAN_FEATURE]), ("mock", None)):
        set_worker(gw, tee=tee, features=features)
        refused = post(gw, key)
        assert (refused.status_code, refused.json()["detail"]["code"]) == (503, "no_capacity"), (tee, features)
    set_worker(gw, tee="mock", features=[PLAN_FEATURE])
    assert post(gw, key, path="/v1/me/standard/plans").status_code in (401, 403)  # the web routes take a session
    assert post(gw, key).status_code == 201


def test_a_revision_is_sealed_with_the_earlier_plan(gw):
    _, key = new_account(gw)
    earlier = write_plan(PARAMS, BRIEF)
    revise = PlanRevision(plan=earlier, instruction="make shot 2 a close-up", shots=[2])
    job = post(gw, key, options={"revise": revise.model_dump(mode="json")}).json()
    with gw.state.session() as s:
        stored = s.get(Job, job["job_id"])
    payload = open_payload(RecipientSession(gw.hpke_private, b64d(stored.enc)), b64d(stored.ciphertext), job_aad(job["job_id"], ENCLAVE, PARAMS, []))
    assert PlanOptions.model_validate(payload.options[PLAN_OPTION]).revise == revise


def test_the_plan_and_video_lists_page_separately(gw):
    _, key = new_account(gw)
    plan = post(gw, key).json()
    videos = [gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": f"a quiet beach {i}"},
                             headers=key).json() for i in range(2)]
    # The plan is older than both videos, and still the one row of a one-row page of plans.
    assert [row["job_id"] for row in gw.client.get("/v1/standard/plans", params={"limit": 1}, headers=key).json()] == [plan["job_id"]]
    listed = gw.client.get("/v1/standard/videos", params={"limit": 5}, headers=key).json()
    assert [row["job_id"] for row in listed] == [videos[1]["job_id"], videos[0]["job_id"]]
