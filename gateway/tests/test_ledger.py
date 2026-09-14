"""Money moves only through the ledger, exactly, and never twice for the same reason."""

from __future__ import annotations

import json
import random
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from kuno_gateway import ledger
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Job, LedgerEntry
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState
from kuno_protocol import devkit
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, JobState

PARAMS = GenerationParams(
    profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24
)


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


@pytest.fixture
def state(settings) -> GatewayState:
    return GatewayState(settings)


def balance(state: GatewayState, account_id: str = "dev") -> int:
    with state.session() as s:
        return s.get(Account, account_id).balance_micros


def entries_total(state: GatewayState, account_id: str = "dev") -> int:
    with state.session() as s:
        return s.scalar(select(func.coalesce(func.sum(LedgerEntry.amount_micros), 0)).where(LedgerEntry.account_id == account_id))


def add_job(state: GatewayState, job_id: str, price_usd: float) -> None:
    now = time.time()
    with state.session() as s, s.begin():
        ledger.post(s, "dev", -ledger.to_micros(price_usd), kind=ledger.CHARGE, source="job", idempotency_key=f"charge:{job_id}", job_id=job_id)
        s.add(
            Job(
                id=job_id, account_id="dev", profile_id="ltx-2.5-fast", enclave_id="e" * 32,
                params=PARAMS.model_dump_json(), enc="x", ciphertext="y", input_blob_ids=json.dumps([]),
                status=JobState.QUEUED.value, progress=0.0, price_usd=price_usd, created_at=now, updated_at=now,
            )
        )


def test_prices_are_exact_in_micro_dollars():
    assert ledger.to_micros(0.12) == 120_000
    assert ledger.to_micros(1.2345) == 1_234_500
    assert ledger.to_micros(0.1 + 0.2) == 300_000
    assert ledger.to_micros("19.999999") == 19_999_999


def test_the_starting_balance_is_itself_a_ledger_entry(state, settings):
    assert balance(state) == ledger.to_micros(settings.dev_balance_usd)
    assert entries_total(state) == balance(state)


def test_a_charge_that_would_overdraw_is_refused_and_changes_nothing(state):
    before = balance(state)
    with pytest.raises(ledger.InsufficientBalance):
        with state.session() as s, s.begin():
            ledger.post(s, "dev", -(before + 1), kind=ledger.CHARGE, source="job", idempotency_key="charge:too-much")
    assert balance(state) == before
    assert entries_total(state) == before


def test_a_failed_job_is_refunded_once_however_often_the_failure_is_reported(state):
    before = balance(state)
    add_job(state, "job-1", 0.12)
    assert balance(state) == before - 120_000

    for _ in range(3):
        with state.session() as s, s.begin():
            state.finish_job(s, s.get(Job, "job-1"), JobState.FAILED, "timeout", "The worker did not finish in time.")

    assert balance(state) == before
    with state.session() as s:
        refunds = s.scalars(select(LedgerEntry).where(LedgerEntry.idempotency_key == "refund:job-1")).all()
    assert len(refunds) == 1


def test_a_safety_blocked_job_is_refunded_like_any_other_failure(state):
    """A job the worker's safety check blocks (or whose output a hash list matches) is refunded once, and still a strike."""
    from kuno_gateway.db_moderation import Strike

    before = balance(state)
    add_job(state, "job-blocked", 0.25)
    for _ in range(2):
        with state.session() as s, s.begin():
            job = s.get(Job, "job-blocked")
            state.finish_job(s, job, JobState.FAILED, "safety_blocked", "The video was blocked by the content policy.")
    assert balance(state) == before
    with state.session() as s:
        refunds = s.scalars(select(LedgerEntry).where(LedgerEntry.idempotency_key == "refund:job-blocked")).all()
        assert [(r.kind, r.amount_micros, r.description) for r in refunds] == [(ledger.REFUND, 250_000, "safety_blocked")]
        assert s.get(Job, "job-blocked").billable_usd == 0.0
        assert s.scalars(select(Strike).where(Strike.job_id == "job-blocked")).first() is not None


def test_a_succeeded_job_keeps_its_charge(state):
    before = balance(state)
    add_job(state, "job-ok", 0.5)
    with state.session() as s, s.begin():
        state.finish_job(s, s.get(Job, "job-ok"), JobState.SUCCEEDED)
    assert balance(state) == before - 500_000


def test_the_balance_always_equals_the_sum_of_its_entries(state):
    rng = random.Random(7)
    for i in range(60):
        amount = rng.randint(-40_000_000, 40_000_000)
        try:
            with state.session() as s, s.begin():
                ledger.post(s, "dev", amount, kind=ledger.ADJUSTMENT, source="test", idempotency_key=f"op:{i % 45}")
        except (ledger.InsufficientBalance, ledger.IdempotencyConflict):
            pass
        assert balance(state) >= 0
        assert entries_total(state) == balance(state)


def test_reusing_a_key_for_a_different_movement_is_refused(state):
    with state.session() as s, s.begin():
        ledger.post(s, "dev", 1_000, kind=ledger.ADJUSTMENT, source="test", idempotency_key="k1")
    before = balance(state)
    with state.session() as s, s.begin():
        assert ledger.post(s, "dev", 1_000, kind=ledger.ADJUSTMENT, source="test", idempotency_key="k1") is None
    for amount, account in ((2_000, "dev"), (1_000, "validator")):
        with pytest.raises(ledger.IdempotencyConflict):
            with state.session() as s, s.begin():
                ledger.post(s, account, amount, kind=ledger.ADJUSTMENT, source="test", idempotency_key="k1")
    assert balance(state) == before


def test_admin_credit_posts_once_per_key_and_refuses_overdrafts(settings):
    client = TestClient(create_app(settings))
    from operator_sessions import operator_headers

    admin = operator_headers(client.app.state.gw, "support@kunoworld.test")
    dev = {"authorization": f"Bearer {settings.dev_api_key}"}
    start = client.get("/v1/account", headers=dev).json()["balance_usd"]

    body = {"amount_usd": 25.5, "idempotency_key": "support-ticket-1042", "note": "Goodwill credit"}
    first = client.post("/admin/v1/accounts/dev/credits", json=body, headers=admin)
    again = client.post("/admin/v1/accounts/dev/credits", json=body, headers=admin)
    assert first.status_code == again.status_code == 200
    assert first.json()["posted"] is True and again.json()["posted"] is False
    assert client.get("/v1/account", headers=dev).json()["balance_usd"] == pytest.approx(start + 25.5)

    overdraw = client.post(
        "/admin/v1/accounts/dev/credits", json={"amount_usd": -1_000_000, "idempotency_key": "too-much-1"}, headers=admin
    )
    assert overdraw.status_code == 409
    assert client.post("/admin/v1/accounts/nobody/credits", json=body, headers=admin).status_code == 404
    assert client.post("/admin/v1/accounts/dev/credits", json=body, headers=dev).status_code == 403
    changed = client.post("/admin/v1/accounts/dev/credits", json={**body, "amount_usd": 99}, headers=admin)
    assert changed.status_code == 409 and changed.json()["detail"]["code"] == "idempotency_conflict"
    # The same ticket number may credit a different customer: keys are scoped per account.
    assert client.post("/admin/v1/accounts/validator/credits", json=body, headers=admin).json()["posted"] is True

    history = client.get("/v1/account/ledger", headers=dev).json()
    assert history[0]["description"] == "Goodwill credit"
    assert history[0]["amount_usd"] == pytest.approx(25.5)
