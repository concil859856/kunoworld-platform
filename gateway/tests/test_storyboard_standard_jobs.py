"""Standard storyboards (PROTOCOL.md, "Storyboards"; STANDARD_MODE.md): the gateway takes one prompt per shot next to the
scene, checks each against the profile and the content policy, seals them in `SealedPayload.shots`, charges the stitched
seconds, and stores the shot prompts with the prompt for the owner, validators and deletion.

Reuses the simulated worker and fixtures of test_standard_moderation_flow.py.
"""

from __future__ import annotations

import json

import pytest
from account_sessions import build_exports, export_zip, signed_in
from test_standard_moderation_flow import (  # fixtures and helpers
    ENCLAVE,
    TEXT,
    balance,
    gw,  # noqa: F401  (fixture)
    media,  # noqa: F401  (fixture)
    new_account,
    pytestmark,  # noqa: F401  (needs ffmpeg, like the flow it reuses)
    render,
)

from kuno_gateway import ledger
from kuno_gateway.db import Blob, Enclave, Job
from kuno_gateway.db_moderation import StandardJob, Strike
from kuno_protocol.profiles import Mode, load_profiles, storyboard_duration_s
from kuno_protocol.schemas import GenerationParams, ShotPrompt, ShotSpec

FAST = load_profiles()["ltx-2.5-fast"]
SCENE = "A small blue fishing boat in a quiet harbor at dawn."
SHOTS = ["It leaves the harbor.", "Gulls follow it out past the breakwater.", "Night falls over the open sea."]


def board(*spec: tuple[float, str], resolution: str = "720p") -> GenerationParams:
    shots = [ShotSpec(duration_s=duration, join=join) for duration, join in spec]
    return GenerationParams(profile_id=FAST.id, mode=Mode.STORYBOARD, duration_s=storyboard_duration_s(FAST, shots, 24),
                            resolution=resolution, aspect_ratio="16:9", fps=24, shots=shots)


BOARD = board((5, "fresh"), (5, "continue"), (5, "cut"))


@pytest.fixture(autouse=True)
def confidential(gw):
    """The flow's simulated worker is open-tier; storyboards go only to confidential enclaves (standard_jobs.routing_tier),
    so these tests run it as a confidential one. test_open_tier_workers_get_no_storyboards turns it back."""
    set_tee(gw, "mock")


def set_tee(gw, tee: str) -> None:
    with gw.state.session() as s, s.begin():
        s.get(Enclave, ENCLAVE).tee = tee


def post(gw, headers, *, params: GenerationParams = BOARD, prompt: str = SCENE, shots=SHOTS, **extra):
    body = {"params": params.model_dump(mode="json"), "prompt": prompt, **extra}
    if shots is not None:
        body["shots"] = [{"prompt": shot} for shot in shots]
    return gw.client.post("/v1/standard/videos", json=body, headers=headers)


def nothing_stored(gw, account_id: str) -> bool:
    with gw.state.session() as s:
        return (s.query(Job).filter(Job.account_id == account_id).count() == 0
                and s.query(StandardJob).filter(StandardJob.account_id == account_id).count() == 0
                and s.query(Blob).count() == 0)


def strikes(gw, account_id: str) -> list[str]:
    with gw.state.session() as s:
        return [x.reason for x in s.query(Strike).filter(Strike.account_id == account_id).all()]


def test_a_storyboard_is_sealed_with_its_shot_prompts_charged_by_its_stitched_seconds_and_stored_with_the_prompt(gw, media):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    created = post(gw, key, seed=7)
    assert created.status_code == 201, created.text
    job = created.json()
    assert (job["privacy"], job["params"]["mode"], job["params"]["shots"]) == ("standard", "storyboard", BOARD.model_dump(mode="json")["shots"])
    # 3 x 5 s shots, two of them joined: 13.708 stitched seconds at the Standard 720p rate, not 15.
    assert BOARD.duration_s == pytest.approx(13.708, abs=1e-3)
    assert job["price_usd"] == FAST.price_usd(BOARD, "standard") == round(0.09 * BOARD.duration_s, 4)
    assert before - balance(gw, account_id) == ledger.to_micros(job["price_usd"])

    # The worker opens exactly what a client-sealed storyboard carries: the scene, then one prompt per shot, in order.
    payload, inputs = render(gw, job["job_id"], media.clip)
    assert (payload.prompt, payload.shots, payload.seed, payload.inputs, inputs) == (SCENE, [ShotPrompt(prompt=p) for p in SHOTS], 7, [], [])
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
    assert (row.prompt, json.loads(row.shots)) == (SCENE, [{"prompt": p} for p in SHOTS])

    # A clip made alongside it keeps its old shape everywhere: no `shots` key.
    clip = gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": "a quiet beach"}, headers=key)
    assert clip.status_code == 201, clip.text
    listed = {row["job_id"]: row for row in gw.client.get("/v1/standard/videos", headers=key).json()}
    assert (listed[job["job_id"]]["prompt"], listed[job["job_id"]]["shots"]) == (SCENE, [{"prompt": p} for p in SHOTS])
    assert "shots" not in listed[clip.json()["job_id"]]

    feed = gw.client.get(f"/validator/v1/standard-jobs/{job['job_id']}", headers=gw.validator).json()
    assert (feed["prompt"], feed["shots"], feed["seed"], feed["params"]["shots"]) == (SCENE, [{"prompt": p} for p in SHOTS], 7, job["params"]["shots"])
    assert "shots" not in gw.client.get(f"/validator/v1/standard-jobs/{clip.json()['job_id']}", headers=gw.validator).json()
    # The ledger feed bills the stitched length and carries the shot list the receipt's params digest covers.
    [row] = [r for r in gw.client.get("/validator/v1/ledger", headers=gw.validator).json() if r["job_id"] == job["job_id"]]
    assert (row["duration_s"], row["params"]) == (BOARD.duration_s, BOARD.model_dump(mode="json"))

    assert gw.client.delete(f"/v1/standard/videos/{job['job_id']}", headers=key).status_code == 204
    with gw.state.session() as s:
        row = s.get(StandardJob, job["job_id"])
        assert row.prompt is None and row.shots is None
    listed = {row["job_id"]: row for row in gw.client.get("/v1/standard/videos", headers=key).json()}
    assert (listed[job["job_id"]]["prompt"], listed[job["job_id"]]["shots"], listed[job["job_id"]]["deleted"]) == (None, None, True)


def test_a_storyboard_scene_may_be_empty_but_every_other_prompt_may_not(gw):
    account_id, key = new_account(gw)
    created = post(gw, key, prompt="")
    assert created.status_code == 201, created.text
    with gw.state.session() as s:
        assert s.get(StandardJob, created.json()["job_id"]).prompt == ""
    # As before storyboards: an empty prompt is a validation error on `prompt` for any other job.
    refused = gw.client.post("/v1/standard/videos", json={"params": TEXT.model_dump(mode="json"), "prompt": ""}, headers=key)
    assert refused.status_code == 422
    [error] = refused.json()["detail"]
    assert (error["loc"], error["type"]) == (["body", "prompt"], "string_too_short")


@pytest.mark.parametrize(
    ("scene", "shots"),
    [
        (SCENE, ["It leaves the harbor.", "n.u.d.e woman walking on a beach", "Night falls."]),  # one shot on its own
        # Neither half alone, but the prompt the model sees for the shot: the scene names a child, the shot a pose.
        ("A 12 year old girl on a school stage.", ["She waves.", "She strikes a provocative pose for the camera.", "The lights dim."]),
        ("n.u.d.e woman", SHOTS),  # the scene
    ],
)
def test_a_blocked_scene_or_shot_is_a_content_policy_refusal_with_one_strike_and_nothing_charged(gw, scene, shots):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    refused = post(gw, key, prompt=scene, shots=shots)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "content_policy"), refused.text
    assert balance(gw, account_id) == before and nothing_stored(gw, account_id)
    assert strikes(gw, account_id) == ["content_policy"]


def test_malformed_storyboards_are_refused_before_the_content_check_so_they_charge_nothing_and_strike_nothing(gw, media):
    account_id, key = new_account(gw)
    before = balance(gw, account_id)
    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=media.red, headers=key).json()
    nsfw = "n.u.d.e woman walking on a beach"
    cases = [
        (dict(shots=SHOTS[:2]), "invalid_shots", "one shot prompt for each of its 3 shots"),
        (dict(shots=None), "invalid_shots", "one shot prompt for each of its 3 shots"),
        (dict(shots=[SHOTS[0], "   ", nsfw]), "invalid_shots", "Shot 2 needs a prompt"),
        (dict(params=TEXT, prompt="a quiet beach", shots=[nsfw]), "invalid_shots", "Only storyboard jobs take shots"),
        (dict(shots=[nsfw, *SHOTS[1:]], inputs=[{"upload_id": upload["upload_id"], "index": 0, "role": "first_frame"}]),
         "invalid_inputs", "Storyboards take no inputs"),
        (dict(shots=[SHOTS[0], "x" * (FAST.limits.max_prompt_chars - len(SCENE) - 1), nsfw]), "prompt_too_long",
         f"Shot 2's prompt, with the scene before it, is over the {FAST.limits.max_prompt_chars}-character limit"),
        (dict(params=BOARD.model_copy(update={"duration_s": 15.0}), shots=[nsfw, *SHOTS[1:]]), "invalid_params", "stitched length"),
        (dict(params=board((5, "continue"), (5, "continue"), (5, "cut"))), "invalid_params", "first shot must be fresh"),
    ]
    for change, code, words in cases:
        refused = post(gw, key, **change)
        detail = refused.json()["detail"]
        assert (refused.status_code, detail["code"]) == (422, code), (change, refused.text)
        assert words in detail["message"], detail
    # Exactly at the limit is fine: scene, blank line, shot.
    at_limit = post(gw, key, shots=[SHOTS[0], "x" * (FAST.limits.max_prompt_chars - len(SCENE) - 2), SHOTS[2]])
    assert at_limit.status_code == 201, at_limit.text
    assert strikes(gw, account_id) == []
    assert before - balance(gw, account_id) == ledger.to_micros(at_limit.json()["price_usd"])


def test_a_storyboard_on_a_profile_without_one_is_refused(gw):
    pro = load_profiles()["ltx-2.5-pro"]
    params = BOARD.model_copy(update={"profile_id": pro.id})
    refused = post(gw, gw.dev, params=params)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_params")
    assert "does not support storyboard" in refused.json()["detail"]["message"]


def test_operators_see_a_storyboards_shot_prompts_exactly_when_they_may_see_its_prompt(gw, media):
    _, key = new_account(gw)
    created = post(gw, key, prompt="")
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    render(gw, job_id, media.clip)

    def item_for(report_id: str) -> dict:
        return next(i for i in gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json()
                    if i["report"] and i["report"]["report_id"] == report_id)

    harassment = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "harassment"}).json()
    item = item_for(harassment["report_id"])
    detail = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}", headers=gw.admin).json()
    # Metadata only: nothing of the prompt, though there is one (the scene is empty, the shots aren't).
    assert (detail["job"]["prompt"], detail["job"]["shots"], detail["job"]["has_prompt"]) == (None, None, True)

    csam = gw.client.post("/v1/reports", json={"job_id": job_id, "reason": "csam"}).json()
    item = item_for(csam["report_id"])
    detail = gw.client.get(f"/admin/v1/moderation/items/{item['item_id']}", headers=gw.admin).json()
    assert (detail["job"]["prompt"], detail["job"]["shots"]) == ("", [{"prompt": p} for p in SHOTS])
    viewed = [a for a in gw.client.get("/admin/v1/audit-log", headers=gw.admin).json() if a["action"] == "item.view_prompt"]
    assert [a["detail"]["job_id"] for a in viewed] == [job_id]


def test_the_owners_data_export_carries_a_storyboards_shot_prompts(gw, media):
    alice = signed_in(gw, "alice@example.com")
    created = post(gw, alice.headers)
    assert created.status_code == 201, created.text
    job_id = created.json()["job_id"]
    render(gw, job_id, media.clip)
    requested = gw.client.post("/v1/me/exports", headers=alice.headers)
    assert requested.status_code == 202, requested.text
    assert build_exports(gw) == 1
    request = json.loads(export_zip(gw, alice.headers, requested.json()["export_id"]).read(f"standard/{job_id}/request.json"))
    assert (request["prompt"], request["shots"], request["seed"] is not None) == (SCENE, [{"prompt": p} for p in SHOTS], True)


def test_open_tier_workers_get_no_storyboards(gw):
    # Storyboards carry no step commitment, and step audits are the only integrity check on the open tier.
    set_tee(gw, "open")
    account_id, headers = new_account(gw)
    before = balance(gw, account_id)
    refused = post(gw, headers)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (503, "no_capacity"), refused.text
    assert balance(gw, account_id) == before and nothing_stored(gw, account_id)
    route = gw.client.get("/v1/route", params={"mode": "storyboard", "profile_id": FAST.id, "privacy": "standard"}, headers=headers)
    assert route.json()["detail"]["code"] == "no_capacity"
    # An ordinary Standard job still reaches the same open-tier worker.
    clip = GenerationParams(profile_id=FAST.id, mode=Mode.TEXT_TO_VIDEO, duration_s=5, resolution="720p", aspect_ratio="16:9", fps=24)
    assert post(gw, headers, params=clip, prompt="A red square drifting", shots=None).status_code == 201
