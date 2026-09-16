"""Exact price quotes (api_quote.py, PAYMENTS.md "Quotes"): `POST /v1/quote` routes like /v1/route, fills in the SDKs'
defaults, validates like admission and prices with `ModelProfile.price_usd`, so the quote is the hold. Refusals carry the
codes the job would get; the balance comes back only with a working credential; quotes are rate-limited."""

from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.envelope import full_table, to_json
from kuno_protocol.profiles import load_profiles, storyboard_duration_s
from kuno_protocol.schemas import GenerationParams, ShotSpec

from kuno_gateway import identity, ledger
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.settings import Settings

PROFILES = load_profiles()
FAST = PROFILES["ltx-2.5-fast"]
TURBO = PROFILES["h3-turbo"]
JP = {"x-kuno-country": "JP"}


def add_enclave(state, profile_ids: list[str], *, tee: str = "mock", envelope: dict | None = None) -> str:
    enclave_id = uuid.uuid4().hex
    now = time.time()
    with state.session() as s, s.begin():
        s.add(Enclave(
            id=enclave_id, miner_hotkey=f"5Miner{enclave_id[:8]}", tee=tee, image_digest=devkit.DEV_IMAGE_DIGEST,
            hpke_public_key="x", signing_public_key="y", profiles=json.dumps(profile_ids), hardware="{}", evidence="{}",
            capacity=4, inflight=0, status="active", verified_at=now, last_seen=now,
            envelope=json.dumps(envelope) if envelope else None,
        ))
    return enclave_id


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    settings.allow_country_override = True
    app = create_app(settings)
    return SimpleNamespace(
        client=TestClient(app), state=app.state.gw, settings=settings,
        dev={"authorization": f"Bearer {env['KUNO_DEV_API_KEY']}"},
    )


def quote(gw, headers: dict | None = None, **body):
    return gw.client.post("/v1/quote", json=body, headers=headers or {})


def ok(response) -> dict:
    assert response.status_code == 200, response.text
    return response.json()


def refused(response, status: int, code: str) -> dict:
    assert (response.status_code, response.json()["detail"]["code"]) == (status, code), response.text
    return response.json()["detail"]


def balance_micros(gw) -> int:
    with gw.state.session() as s:
        return s.get(Account, "dev").balance_micros


# ---------------------------------------------------------------- prices


def test_a_bare_quote_prices_the_defaults_the_sdks_fill_in_and_shows_its_working(gw):
    add_enclave(gw.state, [FAST.id])
    body = ok(quote(gw, profile_id=FAST.id))
    params = GenerationParams.model_validate(body["params"])
    assert params == GenerationParams(profile_id=FAST.id, mode="text_to_video", duration_s=5, resolution="720p",
                                      aspect_ratio="16:9", fps=24, audio=True, input_roles=[])
    assert body["price_usd"] == FAST.price_usd(params, "private") == 0.6
    assert (body["privacy"], body["profile_id"], body["profile_name"], body["fallback_reason"]) == ("private", FAST.id, "LTX-2.5 Fast", None)
    assert body["breakdown"] == {
        "usd_per_second": 0.12, "billable_seconds": 5.0, "fps_multiplier": 1.0, "long_clip_over_s": None,
        "long_clip_multiplier": 1.0, "subtotal_usd": 0.6, "min_job_usd": 0.1, "minimum_applied": False,
    }
    # No credential, no balance; the placeholder flag is /v1/models' own.
    assert body["placeholder"] is gw.client.get("/v1/models").json()["pricing_placeholder"] is True
    assert (body["balance_usd"], body["balance_covers"]) == (None, None)

    with_key = ok(quote(gw, gw.dev, profile_id=FAST.id))
    assert with_key["balance_usd"] == ledger.to_usd(balance_micros(gw)) and with_key["balance_covers"] is True
    # A key that doesn't work quotes like no key at all, as routing does.
    assert ok(quote(gw, {"authorization": "Bearer kw_live_nope"}, profile_id=FAST.id))["balance_usd"] is None


def test_standard_fps_and_long_clip_multipliers_follow_price_usd(gw):
    add_enclave(gw.state, [FAST.id, TURBO.id])
    standard = ok(quote(gw, profile_id=FAST.id, privacy="standard", resolution="1080p", fps=48, duration_s=10))
    assert standard["price_usd"] == round(0.13 * 10 * 1.5, 4) == FAST.price_usd(GenerationParams.model_validate(standard["params"]), "standard")
    assert standard["breakdown"]["fps_multiplier"] == 1.5

    # H3 Turbo in Private mode costs 1.4x past 8 s; Standard prices stay flat per second.
    private = ok(quote(gw, JP, profile_id=TURBO.id, duration_s=10))
    assert (private["breakdown"]["long_clip_over_s"], private["breakdown"]["long_clip_multiplier"]) == (8.0, 1.4)
    assert private["price_usd"] == round(0.065 * 10 * 1.4, 4)
    short = ok(quote(gw, JP, profile_id=TURBO.id, duration_s=8))
    assert (short["breakdown"]["long_clip_multiplier"], short["price_usd"]) == (1.0, round(0.065 * 8, 4))
    flat = ok(quote(gw, JP, profile_id=TURBO.id, duration_s=10, privacy="standard"))
    assert (flat["breakdown"]["long_clip_over_s"], flat["price_usd"]) == (None, 0.4)


def test_the_minimum_charge_shows_in_the_breakdown(gw, monkeypatch):
    add_enclave(gw.state, [FAST.id])
    cheap = FAST.model_copy(update={"pricing": FAST.pricing.model_copy(update={"standard_usd_per_second": {"720p": 0.01, "1080p": 0.01}})})
    # The gateway's profile table is kuno_protocol's cached one: put it back afterwards.
    monkeypatch.setitem(gw.state.profiles, FAST.id, cheap)
    body = ok(quote(gw, profile_id=FAST.id, privacy="standard", duration_s=2))
    assert body["price_usd"] == 0.1 and body["breakdown"]["subtotal_usd"] == 0.02 and body["breakdown"]["minimum_applied"] is True


def test_a_storyboard_is_quoted_for_its_stitched_seconds_with_the_sdks_shot_defaults(gw):
    add_enclave(gw.state, [FAST.id])
    shots = [{"duration_s": 5}, {"duration_s": 5}, {"duration_s": 5}]
    private = ok(quote(gw, profile_id=FAST.id, resolution="720p", shots=shots))
    standard = ok(quote(gw, profile_id=FAST.id, resolution="720p", shots=shots, privacy="standard"))
    specs = [ShotSpec(duration_s=5, join="fresh"), ShotSpec(duration_s=5, join="continue"), ShotSpec(duration_s=5, join="continue")]
    assert private["params"]["mode"] == "storyboard" and [ShotSpec(**s) for s in private["params"]["shots"]] == specs
    assert private["params"]["duration_s"] == storyboard_duration_s(FAST, specs, 24) == private["breakdown"]["billable_seconds"]
    # PAYMENTS.md: three 5 s shots with two joins are 13.708 s, $1.645 Private and $1.2337 Standard at 720p.
    assert (private["price_usd"], standard["price_usd"]) == (1.645, 1.2337)

    # Defaults: a clip's length for each shot, fresh first; explicit joins are kept.
    defaults = ok(quote(gw, profile_id=FAST.id, shots=[{}, {"join": "cut"}]))
    assert defaults["params"]["shots"] == [{"duration_s": 5.0, "join": "fresh"}, {"duration_s": 5.0, "join": "cut"}]
    # A quote never takes a prompt.
    assert quote(gw, profile_id=FAST.id, shots=[{"duration_s": 5, "prompt": "a boat"}, {}]).status_code == 422


def test_family_routing_and_a_region_fallback_are_quoted_on_the_model_that_would_serve(gw):
    add_enclave(gw.state, [FAST.id])
    # MiniMax H3 isn't licensed without a known allowed country; the switch (auto) falls back to LTX-2.5 and the requested
    # settings are adapted to it, exactly as the SDKs adapt them.
    body = ok(quote(gw, profile_id=TURBO.id, duration_s=12, resolution="768p", aspect_ratio="21:9"))
    assert (body["profile_id"], body["requested_profile_id"], body["fallback_reason"]) == (FAST.id, TURBO.id, "region")
    assert {k: body["params"][k] for k in ("resolution", "aspect_ratio", "duration_s")} == {"resolution": "720p", "aspect_ratio": "21:9", "duration_s": 12.0}
    assert body["price_usd"] == round(0.12 * 12, 4)
    assert ok(quote(gw, family="ltx-2.5"))["profile_id"] == FAST.id


def test_the_quote_is_what_admission_holds(gw):
    enclave_id = add_enclave(gw.state, [FAST.id])
    body = ok(quote(gw, gw.dev, profile_id=FAST.id, resolution="1080p", fps=25, shots=[{"duration_s": 4}, {"duration_s": 6, "join": "cut"}]))
    before = balance_micros(gw)
    job = {"job_id": str(uuid.uuid4()), "params": body["params"], "enclave_id": enclave_id, "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": []}
    admitted = gw.client.post("/v1/videos", json=job, headers=gw.dev)
    assert admitted.status_code == 201, admitted.text
    assert admitted.json()["price_usd"] == body["price_usd"]
    assert before - balance_micros(gw) == ledger.to_micros(body["price_usd"])
    with gw.state.session() as s:
        assert s.get(Job, job["job_id"]).price_usd == body["price_usd"]


def test_modes_come_from_the_input_roles_as_the_sdks_infer_them(gw):
    add_enclave(gw.state, [FAST.id])
    assert ok(quote(gw, profile_id=FAST.id, input_roles=["first_frame", "last_frame"]))["params"]["mode"] == "first_last_frame"
    image = ok(quote(gw, profile_id=FAST.id, mode="image_to_video"))
    assert image["params"]["input_roles"] == ["first_frame"]  # what the mode needs, when no roles are given
    refused(quote(gw, profile_id=FAST.id, mode="image_to_video", input_roles=[]), 422, "invalid_params")


# ---------------------------------------------------------------- refusals


def test_refusals_carry_the_codes_the_job_would_get(gw, monkeypatch):
    refused(quote(gw, profile_id=FAST.id), 503, "no_capacity")  # nobody serves it yet
    refused(quote(gw, profile_id=TURBO.id), 451, "region_restricted")  # and no licensed alternative has capacity either
    add_enclave(gw.state, [FAST.id])
    refused(quote(gw, profile_id=FAST.id, duration_s=30), 422, "invalid_params")
    refused(quote(gw, profile_id=FAST.id, fps=48, duration_s=12), 422, "invalid_params")
    refused(quote(gw, profile_id=FAST.id, resolution="4k"), 422, "invalid_params")
    refused(quote(gw, profile_id=FAST.id, shots=[{"duration_s": 5}]), 422, "invalid_params")  # one shot isn't a storyboard
    refused(quote(gw, profile_id=FAST.id, shots=[{"duration_s": 20}] * 7), 422, "invalid_params")  # over 120 s stitched
    refused(quote(gw, profile_id=FAST.id, shots=[{}, {}], duration_s=10), 422, "invalid_params")
    refused(quote(gw, profile_id=FAST.id, shots=[{}, {}], mode="text_to_video"), 422, "invalid_shots")
    refused(quote(gw, profile_id=FAST.id, mode="storyboard"), 422, "invalid_shots")
    refused(quote(gw, profile_id=FAST.id, shots=[{}, {}], input_roles=["first_frame"]), 422, "invalid_inputs")
    refused(quote(gw, profile_id="ltx-2.5-pro", shots=[{}, {}]), 422, "mode_unsupported")
    refused(quote(gw, profile_id="nope"), 404, "unknown_model")

    private_only = FAST.model_copy(update={"pricing": FAST.pricing.model_copy(update={"standard_usd_per_second": None})})
    monkeypatch.setitem(gw.state.profiles, FAST.id, private_only)
    refused(quote(gw, profile_id=FAST.id, privacy="standard"), 422, "privacy_mode_unavailable")


def test_a_quote_nobodys_hardware_can_fit_is_refused_with_the_longest_available(gw):
    table = full_table(FAST)
    table["1080p"]["16:9"] = {24: 8.0, 25: 8.0, 48: 4.0, 50: 4.0}
    add_enclave(gw.state, [FAST.id], envelope={FAST.id: to_json(table)})
    assert ok(quote(gw, profile_id=FAST.id, resolution="1080p", duration_s=8))["price_usd"] == round(0.17 * 8, 4)
    detail = refused(quote(gw, profile_id=FAST.id, resolution="1080p", duration_s=10), 503, "no_capacity")
    assert detail["max_duration_s"] == 8.0
    # A storyboard is fitted by its longest shot, however long the stitched video.
    assert ok(quote(gw, profile_id=FAST.id, resolution="1080p", shots=[{"duration_s": 8}] * 4))["params"]["duration_s"] > 30
    refused(quote(gw, profile_id=FAST.id, resolution="1080p", shots=[{"duration_s": 8}, {"duration_s": 9}]), 503, "no_capacity")


def test_a_credential_brings_the_accounts_standing_into_it(gw):
    add_enclave(gw.state, [FAST.id])
    account_id = uuid.uuid4().hex
    with gw.state.session() as s, s.begin():
        s.add(Account(id=account_id, name="new@example.com", owner_user_id=uuid.uuid4().hex, balance_micros=0,
                      is_validator=False, created_at=time.time()))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "test")
    unpaid = {"authorization": f"Bearer {key}"}
    detail = refused(quote(gw, unpaid, profile_id=FAST.id), 403, "private_mode_not_eligible")
    assert "no_verified_payment" in detail["reasons"]
    standard = ok(quote(gw, unpaid, profile_id=FAST.id, privacy="standard"))
    assert (standard["balance_usd"], standard["balance_covers"]) == (0.0, False)


def test_quotes_are_rate_limited_per_account_and_per_network(gw):
    add_enclave(gw.state, [FAST.id])
    gw.settings.quotes_per_minute = 2
    for _ in range(2):
        ok(quote(gw, gw.dev, profile_id=FAST.id))
    refused(quote(gw, gw.dev, profile_id=FAST.id), 429, "rate_limited")
    # Anonymous quotes have their own count, per network.
    for _ in range(2):
        ok(quote(gw, profile_id=FAST.id))
    refused(quote(gw, profile_id=FAST.id), 429, "rate_limited")
    ok(quote(gw, {"cf-connecting-ip": "203.0.113.9"}, profile_id=FAST.id))
