"""A profile with no Standard price is sold in Private mode only. The gateway says so in /v1/models, routes Standard
requests around it, and refuses a Standard job for it before anything is charged or counted as a strike.

Every shipped profile has a Standard price since 2026-09-16 (H3's matches fal's list prices), so these tests take
MiniMax H3 and H3 Director's Standard prices away in the gateway's profile table."""

from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams
from sqlalchemy import func, select

from kuno_gateway.api_public import admit_job
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.db_moderation import Strike
from kuno_gateway.settings import Settings

# H3 is licensed in Japan, so nothing below is a region refusal.
JP = {"x-kuno-country": "JP"}
PRIVATE_ONLY = ("h3", "h3-reference")


@pytest.fixture
def gw(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.allow_country_override = True
    app = create_app(settings)
    profiles = app.state.gw.profiles
    for profile_id in PRIVATE_ONLY:
        shipped = profiles[profile_id]
        profiles[profile_id] = shipped.model_copy(update={"pricing": shipped.pricing.model_copy(update={"standard_usd_per_second": None})})
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw, settings=settings,
        dev={"authorization": f"Bearer {settings.dev_api_key}", **JP},
    )


def h3_params(profile_id: str = "h3", mode: Mode = Mode.TEXT_TO_VIDEO) -> GenerationParams:
    return GenerationParams(profile_id=profile_id, mode=mode, duration_s=5, resolution="768p", aspect_ratio="16:9", fps=24)


def test_models_list_both_prices_and_the_modes_each_profile_is_sold_in(gw):
    body = gw.client.get("/v1/models").json()
    models = {m["id"]: m for m in body["models"]}
    assert body["pricing_placeholder"] is True
    for profile_id in ("h3", "h3-reference"):
        assert models[profile_id]["privacy_modes"] == ["private"]
        assert models[profile_id]["pricing"]["standard_usd_per_second"] is None
    fast = models["ltx-2.5-fast"]
    assert fast["privacy_modes"] == ["private", "standard"]
    assert fast["pricing"] == {
        "usd_per_second": {"720p": 0.12, "1080p": 0.17},
        "standard_usd_per_second": {"720p": 0.09, "1080p": 0.13},
        "min_job_usd": 0.1,
        "long_clip": None,
        "fps_multipliers": {"48": 1.5, "50": 1.5},
        # A plan (Director) is a flat price in each mode, not per second.
        "plan_usd": 0.1,
        "standard_plan_usd": 0.08,
    }
    assert fast["limits"]["max_duration_s_by_fps"] == {"48": 10.0, "50": 10.0}
    assert models["h3-turbo"]["pricing"]["long_clip"] == {"over_s": 8.0, "multiplier": 1.4}


def test_a_standard_route_to_a_private_only_profile_is_refused(gw):
    for profile_id, mode in (("h3", "text_to_video"), ("h3-reference", "reference_to_video")):
        response = gw.client.get("/v1/route", params={"mode": mode, "profile_id": profile_id, "privacy": "standard"}, headers=JP)
        assert (response.status_code, response.json()["detail"]["code"]) == (422, "privacy_mode_unavailable")
        assert "Private mode only" in response.json()["detail"]["message"]
    # No model does references in Standard mode, so not naming one doesn't help.
    anywhere = gw.client.get("/v1/route", params={"mode": "reference_to_video", "privacy": "standard"}, headers=JP)
    assert (anywhere.status_code, anywhere.json()["detail"]["code"]) == (422, "privacy_mode_unavailable")
    # The same requests in Private mode are only short of workers.
    private = gw.client.get("/v1/route", params={"mode": "text_to_video", "profile_id": "h3", "privacy": "private"}, headers=JP)
    assert private.json()["detail"]["code"] == "no_capacity"


def test_a_private_only_profile_has_no_standard_capacity_even_on_a_worker_that_serves_it(gw):
    now = time.time()
    with gw.state.session() as s, s.begin():
        s.add(Enclave(
            id="c" * 32, miner_hotkey="5Confidential", tee="mock", image_digest="sha256:img", hpke_public_key="k",
            signing_public_key="s", profiles=json.dumps(["h3-turbo", "h3"]), hardware="{}", evidence="{}", capacity=2,
            inflight=0, status="active", verified_at=now, last_seen=now,
        ))
    state = gw.state
    assert state.has_capacity(state.profiles["h3"], privacy="private")
    assert not state.has_capacity(state.profiles["h3"], privacy="standard")
    assert state.has_capacity(state.profiles["h3-turbo"], privacy="standard")
    with state.session() as s:
        assert state.routable_enclaves(s, "h3", "standard") == []
        assert [e.id for e in state.routable_enclaves(s, "h3-turbo", "standard")] == ["c" * 32]


def test_a_standard_job_for_a_private_only_profile_is_refused_before_any_charge_or_strike(gw):
    before = gw.client.get("/v1/account", headers=gw.dev).json()["balance_usd"]
    body = {"params": h3_params().model_dump(mode="json"), "prompt": "A lighthouse keeper lights the lamp at dusk"}
    refused = gw.client.post("/v1/standard/videos", json=body, headers=gw.dev)
    assert refused.status_code == 422, refused.text
    detail = refused.json()["detail"]
    assert (detail["code"], detail["privacy_modes"]) == ("privacy_mode_unavailable", ["private"])
    assert "MiniMax H3 is offered in Private mode only" in detail["message"]
    assert gw.client.get("/v1/account", headers=gw.dev).json()["balance_usd"] == before
    with gw.state.session() as s:
        assert s.scalar(select(func.count()).select_from(Job)) == 0
        assert s.scalar(select(func.count()).select_from(Strike)) == 0
    # H3 Turbo is sold in Standard: the same request gets past that check and is only short of workers.
    turbo = {**body, "params": h3_params("h3-turbo").model_dump(mode="json")}
    assert gw.client.post("/v1/standard/videos", json=turbo, headers=gw.dev).json()["detail"]["code"] == "no_capacity"


def test_a_job_is_charged_the_price_of_its_privacy_mode(gw):
    state = gw.state
    fast = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=5, resolution="1080p", aspect_ratio="16:9", fps=48)
    worker = SimpleNamespace(id="e" * 32)

    def admit(s, params, privacy):
        return admit_job(
            s, state, s.get(Account, "dev"), job_id=str(uuid.uuid4()), profile=state.profiles[params.profile_id], params=params,
            enclave=worker, enc="", ciphertext="", input_blob_ids=[], webhook_url=None, privacy=privacy, now=time.time(),
        )

    with state.session() as s, s.begin():
        private, standard = admit(s, fast, "private"), admit(s, fast, "standard")
        assert (private.price_usd, standard.price_usd) == (1.275, 0.975)  # $0.17 and $0.13 a second, x5 s, x1.5 at 48 fps
    with state.session() as s, s.begin():
        with pytest.raises(HTTPException) as exc:
            admit(s, h3_params(), "standard")
    assert (exc.value.status_code, exc.value.detail["code"]) == (422, "privacy_mode_unavailable")
