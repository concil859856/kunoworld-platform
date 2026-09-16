"""Private storyboards at the gateway (PROTOCOL.md, "Storyboards"): nothing special-cased beyond the protocol's own rules.
`validate_params` checks the shot list, `/v1/route?mode=storyboard` routes on the longest shot, admission fits the longest
shot against the enclave's serving envelope, the hold is the stitched seconds' price, and `/v1/models` lists the limits.

Reuses the enclaves and fixtures of test_enclave_serving_envelope.py (1080p 16:9 up to 8 s on the small card).
"""

from __future__ import annotations

import json
import uuid

from test_enclave_serving_envelope import (  # fixtures and helpers
    ENVELOPE,
    EXACT,
    FAST,
    Miner,
    balance,
    gw,  # noqa: F401  (fixture)
    routed,
    stale,
)

from kuno_gateway import envelopes, ledger
from kuno_gateway.db import Job
from kuno_protocol.envelope import CAPACITY_REFUSED
from kuno_protocol.profiles import Mode, storyboard_duration_s
from kuno_protocol.schemas import GenerationParams, ShotSpec

STORYBOARD = {"mode": "storyboard", "profile_id": FAST.id}


def board(*durations: float, resolution: str = "1080p", fps: int = 24) -> GenerationParams:
    shots = [ShotSpec(duration_s=d, join="fresh" if i == 0 else "continue") for i, d in enumerate(durations)]
    return GenerationParams(profile_id=FAST.id, mode=Mode.STORYBOARD, duration_s=storyboard_duration_s(FAST, shots, fps),
                            resolution=resolution, aspect_ratio="16:9", fps=fps, shots=shots)


def submit(gw, miner: Miner, params: GenerationParams):
    body = {"job_id": str(uuid.uuid4()), "params": params.model_dump(mode="json"), "enclave_id": miner.enclave_id, "enc": "AAAA",
            "ciphertext": "AAAA", "input_blob_ids": []}
    return gw.client.post("/v1/videos", json=body, headers=gw.dev)


def test_route_serves_storyboard_mode_only_from_profiles_that_offer_it_and_fits_on_the_longest_shot(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)
    answer = gw.client.get("/v1/route", params=STORYBOARD)
    assert (answer.status_code, answer.json()["profile_id"]) == (200, FAST.id)
    pro = gw.client.get("/v1/route", params={"mode": "storyboard", "profile_id": "ltx-2.5-pro"})
    assert (pro.status_code, pro.json()["detail"]["code"]) == (422, "mode_unsupported")

    # A client sends the longest shot as duration_s: eight 8 s shots (a 59 s video) fit the small card, one 10 s shot doesn't.
    assert board(*[8] * 8).duration_s == 59.375
    assert {e["enclave_id"] for e in gw.client.get("/v1/route", params={**STORYBOARD, **EXACT, "duration_s": 8}).json()["enclaves"]} == {
        small.enclave_id, full.enclave_id
    }
    assert {e["enclave_id"] for e in gw.client.get("/v1/route", params={**STORYBOARD, **EXACT, "duration_s": 10}).json()["enclaves"]} == {
        full.enclave_id
    }
    assert routed(gw, **EXACT, duration_s=8) == {small.enclave_id, full.enclave_id}  # text_to_video, unchanged
    stale(gw, full)
    refused = gw.client.get("/v1/route", params={**STORYBOARD, **EXACT, "duration_s": 10})
    detail = refused.json()["detail"]
    assert (refused.status_code, detail["code"], detail["max_duration_s"]) == (503, "no_capacity", 8.0)
    assert "can fit a 10 s 1080p 16:9 storyboard shot at 24 fps" in detail["message"]


def test_a_private_storyboard_is_admitted_by_its_longest_shot_and_held_at_its_stitched_price(gw):
    small, full = Miner().insert(gw.state, envelope=ENVELOPE), Miner().insert(gw.state)
    before = balance(gw)

    # 30 s: longer than any clip the small card renders at 1080p, but no single shot is.
    long_take = board(8, 8, 8, 8)
    assert long_take.duration_s > 30
    admitted = submit(gw, small, long_take)
    assert admitted.status_code == 201, admitted.text
    price = FAST.price_usd(long_take)
    assert admitted.json()["price_usd"] == price == round(0.08 * long_take.duration_s, 4)
    assert before - balance(gw) == ledger.to_micros(price)
    with gw.state.session() as s:
        stored = GenerationParams.model_validate_json(s.get(Job, admitted.json()["job_id"]).params)
    assert stored == long_take and stored.shots == long_take.shots

    held = balance(gw)
    too_long = submit(gw, small, board(5, 10))
    detail = too_long.json()["detail"]
    assert (too_long.status_code, detail["code"], detail["max_duration_s"]) == (409, "envelope_exceeded", 8.0)
    assert "can't render this storyboard's 10 s shot" in detail["message"] and "a storyboard's longest shot" in detail["message"]
    assert balance(gw) == held
    assert submit(gw, full, board(5, 10)).status_code == 201  # no envelope: the profile's limits

    # The protocol's storyboard rules apply to a sealed job exactly as to a Standard one.
    wrong_length = board(5, 5).model_copy(update={"duration_s": 10.0})
    refused = submit(gw, full, wrong_length)
    assert (refused.status_code, refused.json()["detail"]["code"]) == (422, "invalid_params")
    assert "stitched length" in refused.json()["detail"]["message"]
    one_shot = submit(gw, full, board(5))
    assert (one_shot.status_code, one_shot.json()["detail"]["code"]) == (422, "invalid_params")


def test_a_capacity_refusal_of_a_storyboard_whose_longest_shot_fits_is_the_miners_fault():
    class Enclave:
        envelope = json.dumps(ENVELOPE)

    inside, outside = board(8, 8, 8, 8).model_dump_json(), board(5, 10).model_dump_json()
    assert envelopes.failure_code(Enclave(), inside, CAPACITY_REFUSED, "no room")[0] == "internal_error"
    assert envelopes.failure_code(Enclave(), outside, CAPACITY_REFUSED, "no room")[0] == CAPACITY_REFUSED


def test_models_list_storyboard_mode_and_its_limits(gw):
    models = {m["id"]: m for m in gw.client.get("/v1/models").json()["models"]}
    fast = models[FAST.id]
    assert "storyboard" in fast["modes"]
    assert fast["limits"]["storyboard"] == {"max_shots": 12, "max_total_s": 120.0, "overlap_latent_frames": 3}
    # A profile offers the mode exactly where it has the limits (only LTX-2.5 Fast today).
    assert all(("storyboard" in m["modes"]) == (m["limits"]["storyboard"] is not None) for m in models.values())
    assert models["ltx-2.5-pro"]["limits"]["storyboard"] is None
