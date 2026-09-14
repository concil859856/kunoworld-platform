"""Private-mode eligibility, strikes and account restrictions, and the rule that private jobs only reach
confidential-tier enclaves (STANDARD_MODE.md)."""

from __future__ import annotations

import json
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, JobState

from kuno_gateway import identity, ledger, moderation
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.db_moderation import ModerationItem, Strike
from kuno_gateway.settings import Settings

PARAMS = GenerationParams(
    profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24
)
CONFIDENTIAL = "c" * 32
OPEN = "o" * 32
DAY = 86400
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def add_enclave(state, enclave_id: str, tee: str) -> None:
    now = time.time()
    with state.session() as s, s.begin():
        s.add(
            Enclave(
                id=enclave_id, miner_hotkey=f"5Miner{tee}", tee=tee, image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key="x",
                signing_public_key="y", profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}", capacity=4,
                inflight=0, status="active", verified_at=now, last_seen=now,
            )
        )


@pytest.fixture
def gw(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data)})
    app = create_app(settings)
    state = app.state.gw
    add_enclave(state, CONFIDENTIAL, "mock")
    add_enclave(state, OPEN, "open")
    return SimpleNamespace(
        client=TestClient(app), state=state, settings=settings, env=env,
        admin={"authorization": f"Bearer {env['KUNO_ADMIN_TOKEN']}"},
    )


def new_account(gw, *, source: str = "signup", kind: str = ledger.ADJUSTMENT, usd: float = 20.0) -> tuple[str, dict]:
    account_id = uuid.uuid4().hex
    with gw.state.session() as s, s.begin():
        s.add(Account(id=account_id, name="someone@example.com", owner_user_id=uuid.uuid4().hex, balance_micros=0,
                      is_validator=False, created_at=time.time()))
        s.flush()
        key, _ = identity.create_api_key(s, account_id, "test")
        ledger.post(s, account_id, ledger.to_micros(usd), kind=kind, source=source, idempotency_key=f"{source}:{account_id}")
    return account_id, {"authorization": f"Bearer {key}"}


def job_body(enclave_id: str = CONFIDENTIAL) -> dict:
    return {
        "job_id": str(uuid.uuid4()), "params": PARAMS.model_dump(mode="json"), "enclave_id": enclave_id,
        "enc": "AAAA", "ciphertext": "AAAA", "input_blob_ids": [],
    }


def balance(gw, account_id: str) -> int:
    with gw.state.session() as s:
        return s.get(Account, account_id).balance_micros


def fail_blocked(gw, account_id: str) -> str:
    """A job that the enclave's safety check refused, reported the way a worker reports it."""
    job_id, now = str(uuid.uuid4()), time.time()
    with gw.state.session() as s, s.begin():
        job = Job(
            id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id=CONFIDENTIAL, params=PARAMS.model_dump_json(),
            enc="x", ciphertext="y", input_blob_ids="[]", status=JobState.RUNNING.value, stage=None, progress=0.0,
            price_usd=0.5, created_at=now, updated_at=now, started_at=now,
        )
        s.add(job)
        s.flush()
        gw.state.finish_job(s, job, JobState.FAILED, "safety_blocked", "The request was blocked by the content policy.")
    return job_id


def strike_at(gw, account_id: str, when: float) -> None:
    with gw.state.session() as s, s.begin():
        moderation.record_strike(s, gw.settings, account_id, "safety_blocked", job_id=str(uuid.uuid4()), now=when)


# ------------------------------------------------------------------ eligibility


def test_an_account_without_a_verified_payment_cannot_start_private_jobs(gw):
    account_id, key = new_account(gw, source="signup")
    before = balance(gw, account_id)
    refused = gw.client.post("/v1/videos", json=job_body(), headers=key)
    assert refused.status_code == 403
    assert refused.json()["detail"]["code"] == "private_mode_not_eligible"
    assert refused.json()["detail"]["reasons"] == ["no_verified_payment"]
    assert balance(gw, account_id) == before
    assert gw.client.get("/v1/account/eligibility", headers=key).json() == {
        "private_mode": {"eligible": False, "reasons": ["no_verified_payment"]},
        "restricted_until": None,
        "strikes_24h": 0,
        "strikes_7d": 0,
    }


def test_an_operator_credit_or_a_credited_top_up_makes_an_account_eligible(gw):
    account_id, key = new_account(gw, source="signup")
    credit = gw.client.post(
        f"/admin/v1/accounts/{account_id}/credits", json={"amount_usd": 2, "idempotency_key": "support-credit-1"}, headers=gw.admin
    )
    assert credit.status_code == 200
    assert gw.client.get("/v1/account/eligibility", headers=key).json()["private_mode"] == {"eligible": True, "reasons": []}
    assert gw.client.post("/v1/videos", json=job_body(), headers=key).status_code == 201

    _, topped_up = new_account(gw, source="stripe", kind=ledger.TOPUP)
    assert gw.client.post("/v1/videos", json=job_body(), headers=topped_up).status_code == 201


def test_seeded_dev_and_validator_accounts_are_exempt(gw):
    for key in (gw.settings.dev_api_key, gw.settings.validator_api_key):
        headers = {"authorization": f"Bearer {key}"}
        assert gw.client.get("/v1/account/eligibility", headers=headers).json()["private_mode"]["eligible"] is True
        assert gw.client.post("/v1/videos", json=job_body(), headers=headers).status_code == 201


def test_every_job_reports_its_privacy_mode(gw):
    dev = {"authorization": f"Bearer {gw.settings.dev_api_key}"}
    created = gw.client.post("/v1/videos", json=job_body(), headers=dev).json()
    assert created["privacy"] == "private"
    assert gw.client.get(f"/v1/videos/{created['job_id']}", headers=dev).json()["privacy"] == "private"


# ------------------------------------------------------------------ tiers


def test_a_private_job_for_an_open_tier_enclave_is_refused_and_not_charged(gw):
    account_id, key = new_account(gw, source="admin")
    before = balance(gw, account_id)
    refused = gw.client.post("/v1/videos", json=job_body(OPEN), headers=key)
    assert refused.status_code == 409 and refused.json()["detail"]["code"] == "enclave_unavailable"
    assert balance(gw, account_id) == before
    with gw.state.session() as s:
        assert s.get(Job, refused.request.content and json.loads(refused.request.content)["job_id"]) is None
    assert gw.client.post("/v1/videos", json=job_body(CONFIDENTIAL), headers=key).status_code == 201


def test_routing_offers_only_enclaves_whose_tier_serves_the_mode(gw):
    query = {"mode": "text_to_video", "profile_id": "ltx-2.5-fast"}
    private = gw.client.get("/v1/route", params=query).json()
    assert {e["enclave_id"] for e in private["enclaves"]} == {CONFIDENTIAL}
    standard = gw.client.get("/v1/route", params={**query, "privacy": "standard"}).json()
    assert {e["enclave_id"] for e in standard["enclaves"]} == {CONFIDENTIAL, OPEN}

    with gw.state.session() as s, s.begin():
        s.get(Enclave, CONFIDENTIAL).status = "stale"
    # An open-tier miner alone is no capacity for private jobs.
    assert gw.client.get("/v1/route", params=query).status_code == 503
    assert gw.client.get("/v1/route", params={**query, "privacy": "standard"}).status_code == 200


def test_routing_with_an_ineligible_credential_is_refused_but_anonymous_routing_is_public(gw):
    _, key = new_account(gw, source="signup")
    query = {"mode": "text_to_video", "profile_id": "ltx-2.5-fast"}
    refused = gw.client.get("/v1/route", params=query, headers=key)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "private_mode_not_eligible"
    assert gw.client.get("/v1/route", params={**query, "privacy": "standard"}, headers=key).status_code == 200
    assert gw.client.get("/v1/route", params=query).status_code == 200


def test_private_jobs_have_their_own_tighter_per_minute_limit(gw):
    gw.settings.private_jobs_per_minute = 2
    _, key = new_account(gw, source="admin")
    codes = [gw.client.post("/v1/videos", json=job_body(), headers=key).status_code for _ in range(3)]
    assert codes == [201, 201, 429]


# ------------------------------------------------------------------ strikes


def test_three_blocked_jobs_in_a_day_restrict_the_account_for_an_hour(gw):
    account_id, key = new_account(gw, source="admin")
    first = fail_blocked(gw, account_id)
    fail_blocked(gw, account_id)
    eligibility = gw.client.get("/v1/account/eligibility", headers=key).json()
    assert eligibility["strikes_24h"] == 2 and eligibility["restricted_until"] is None
    assert eligibility["private_mode"] == {"eligible": False, "reasons": ["too_many_strikes"]}

    fail_blocked(gw, account_id)
    refused = gw.client.post("/v1/videos", json=job_body(), headers=key)
    assert refused.status_code == 403 and refused.json()["detail"]["code"] == "account_restricted"
    assert refused.json()["detail"]["restricted_until"] == pytest.approx(time.time() + 3600, abs=60)
    upload = gw.client.post("/v1/standard/uploads", params={"role": "first_frame"}, content=PNG, headers=key)
    assert upload.status_code == 403 and upload.json()["detail"]["code"] == "account_restricted"
    eligibility = gw.client.get("/v1/account/eligibility", headers=key).json()
    assert eligibility["private_mode"]["reasons"] == ["account_restricted", "too_many_strikes"]
    assert eligibility["strikes_24h"] == eligibility["strikes_7d"] == 3

    with gw.state.session() as s, s.begin():
        # A failure reported twice is one strike, and a strike records a code, never content.
        assert moderation.record_strike(s, gw.settings, account_id, "safety_blocked", job_id=first) is None
        strikes = s.query(Strike).filter(Strike.account_id == account_id).all()
    assert len(strikes) == 3 and {st.reason for st in strikes} == {"safety_blocked"}


def test_five_strikes_in_a_week_restrict_the_account_for_seven_days(gw):
    account_id, _ = new_account(gw, source="admin")
    now = time.time()
    for when in (now - 4 * DAY, now - 3 * DAY, now - 2 * DAY, now - DAY + 60, now):
        strike_at(gw, account_id, when)
    with gw.state.session() as s:
        restriction = moderation.active_restriction(s, account_id, now)
    assert restriction is not None and restriction.until == pytest.approx(now + 7 * DAY)


def test_ten_strikes_in_a_month_restrict_the_account_until_an_operator_reviews_it(gw):
    account_id, key = new_account(gw, source="admin")
    now = time.time()
    for i in range(10):
        strike_at(gw, account_id, now - 29 * DAY + i * 3.2 * DAY)
    assert gw.client.get("/v1/account/eligibility", headers=key).json()["restricted_until"] == moderation.INDEFINITE_UNTIL
    queue = gw.client.get("/admin/v1/moderation/queue", headers=gw.admin).json()
    assert [(i["kind"], i["account_id"]) for i in queue] == [("account_review", account_id)]

    lifted = gw.client.post(
        f"/admin/v1/accounts/{account_id}/unrestrict", json={"reason": "reviewed, false positives"},
        headers={**gw.admin, "x-kuno-operator": "alice"},
    )
    assert lifted.status_code == 200 and lifted.json()["lifted"] == 1
    eligibility = gw.client.get("/v1/account/eligibility", headers=key).json()
    assert eligibility["restricted_until"] is None
    assert eligibility["private_mode"]["reasons"] == ["too_many_strikes"]
    log = gw.client.get("/admin/v1/audit-log", params={"target_id": account_id}, headers=gw.admin).json()
    assert [(a["operator"], a["action"], a["reason"]) for a in log] == [("alice", "account.unrestrict", "reviewed, false positives")]


def test_strike_thresholds_are_configurable(gw):
    gw.settings.strike_rules = [(1, DAY, 600)]
    account_id, _ = new_account(gw, source="admin")
    fail_blocked(gw, account_id)
    with gw.state.session() as s:
        assert moderation.active_restriction(s, account_id, time.time()).until == pytest.approx(time.time() + 600, abs=30)


def test_validators_collect_strikes_without_being_restricted(gw):
    for _ in range(4):
        fail_blocked(gw, "validator")
    with gw.state.session() as s:
        assert moderation.active_restriction(s, "validator", time.time()) is None
        assert moderation.strike_counts(s, "validator", time.time())["24h"] == 4
        assert s.query(ModerationItem).count() == 0


# ------------------------------------------------------------------ operator restrictions


def test_operators_restrict_and_unrestrict_accounts_and_every_action_is_logged(gw):
    account_id, key = new_account(gw, source="admin")
    bob = {**gw.admin, "x-kuno-operator": "bob"}
    until = time.time() + 3600
    restricted = gw.client.post(f"/admin/v1/accounts/{account_id}/restrict", json={"until": until, "reason": "chargeback fraud"}, headers=bob)
    assert restricted.status_code == 200 and restricted.json()["restricted_until"] == pytest.approx(until)
    refused = gw.client.post("/v1/videos", json=job_body(), headers=key)
    assert refused.json()["detail"] == {
        "code": "account_restricted", "message": refused.json()["detail"]["message"], "restricted_until": pytest.approx(until),
    }

    assert gw.client.post(f"/admin/v1/accounts/{account_id}/unrestrict", headers=bob).status_code == 200
    assert gw.client.post("/v1/videos", json=job_body(), headers=key).status_code == 201

    log = gw.client.get("/admin/v1/audit-log", params={"target_id": account_id}, headers=gw.admin).json()
    assert [(a["action"], a["operator"]) for a in log] == [("account.unrestrict", "bob"), ("account.restrict", "bob")]
    assert log[1]["reason"] == "chargeback fraud" and log[1]["created_at"] > 0

    past = gw.client.post(f"/admin/v1/accounts/{account_id}/restrict", json={"until": time.time() - 1, "reason": "x"}, headers=bob)
    assert past.status_code == 422
    assert gw.client.post(f"/admin/v1/accounts/{account_id}/restrict", json={"until": None, "reason": "x"}, headers=key).status_code == 403
