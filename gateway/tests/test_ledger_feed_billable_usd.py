"""`billable_usd` in the validator ledger feed: the real customer money each job earned the network. Validators' own
jobs, refunded jobs and credit nobody paid for earn nothing; the paid share is fixed when the job is charged."""

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

from kuno_gateway import ledger
from kuno_gateway.api_public import admit_job
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.settings import Settings

ENCLAVE = "f" * 32
# $0.12 a second x 5 s, Private.
PARAMS = GenerationParams(profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=5, resolution="720p", aspect_ratio="16:9", fps=24)
PRICE = 0.60
FEED_FIELDS = {
    "job_id", "enclave_id", "miner_hotkey", "profile_id", "status", "error_code", "privacy", "params", "duration_s",
    "resolution", "created_at", "started_at", "finished_at", "receipt",
}


def credit(s, account_id: str, usd: float, kind: str, source: str) -> None:
    ledger.post(s, account_id, ledger.to_micros(usd), kind=kind, source=source, idempotency_key=f"{source}:{account_id}:{uuid.uuid4().hex}")


@pytest.fixture
def world(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    app = create_app(settings)
    state = app.state.gw
    now = time.time()
    with state.session() as s, s.begin():
        s.add(Enclave(
            id=ENCLAVE, miner_hotkey="5Miner", tee="mock", image_digest="sha256:img", hpke_public_key="k", signing_public_key="s",
            profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}", capacity=8, inflight=0, status="active",
            verified_at=now, last_seen=now,
        ))
        for account_id in ("payer", "promo", "gifted", "chain", "refunded"):
            s.add(Account(id=account_id, name=account_id, balance_micros=0, is_validator=False, created_at=now))
        s.flush()
        credit(s, "payer", 20, ledger.TOPUP, "stripe")
        # Half paid by card, half an operator's promotional credit.
        credit(s, "promo", 10, ledger.TOPUP, "nowpayments")
        credit(s, "promo", 10, ledger.ADJUSTMENT, "admin")
        credit(s, "gifted", 5, ledger.ADJUSTMENT, "signup")
        # A TAO deposit and its bonus: the bonus is granted, not paid.
        credit(s, "chain", 100, ledger.TOPUP, "tao")
        credit(s, "chain", 5, ledger.BONUS, "tao")
        credit(s, "refunded", 20, ledger.TOPUP, "stripe")
        credit(s, "refunded", 20, ledger.ADJUSTMENT, "promo-code")  # a source nobody recognizes counts as granted
        credit(s, "refunded", -10, ledger.ADJUSTMENT, "stripe")  # a card dispute takes paid money back
    return SimpleNamespace(
        client=TestClient(app), state=state, validator={"authorization": f"Bearer {settings.validator_api_key}"},
    )


def charge(state, account_id: str) -> str:
    job_id = str(uuid.uuid4())
    with state.session() as s, s.begin():
        admit_job(
            s, state, s.get(Account, account_id), job_id=job_id, profile=state.profiles["ltx-2.5-fast"], params=PARAMS,
            enclave=s.get(Enclave, ENCLAVE), enc="", ciphertext="", input_blob_ids=[], webhook_url=None, privacy="private",
            now=time.time(),
        )
    return job_id


def finish(state, job_id: str, status: JobState, code: str | None = None) -> None:
    with state.session() as s, s.begin():
        state.finish_job(s, s.get(Job, job_id), status, code, None if code is None else "It didn't work.")


def stored(state, job_id: str) -> float:
    with state.session() as s:
        return s.get(Job, job_id).billable_usd


def test_the_paid_share_counts_real_payments_against_every_other_credit(world):
    with world.state.session() as s:
        shares = {a: ledger.paid_share(s, a) for a in ("payer", "promo", "gifted", "chain", "refunded", "dev", "validator")}
    assert shares["payer"] == 1.0 and shares["promo"] == 0.5 and shares["gifted"] == 0.0
    assert shares["chain"] == pytest.approx(100 / 105)
    assert shares["refunded"] == pytest.approx(10 / 30)
    # Seeded development balances are granted credit.
    assert shares["dev"] == shares["validator"] == 0.0


def test_a_dev_networks_seeded_balance_pays_like_real_money_but_never_in_production(world, monkeypatch):
    with world.state.session() as s:
        assert ledger.paid_share(s, "dev", dev_balances_paid=True) == 1.0
    # Off production the dev account's jobs are billable, so a dev network's validators still pay job work.
    assert not world.state.settings.production
    assert stored(world.state, charge(world.state, "dev")) == PRICE
    monkeypatch.setattr(world.state.settings, "environment", "production")
    assert stored(world.state, charge(world.state, "dev")) == 0.0


def test_the_feed_reports_what_each_job_really_earned_and_keeps_every_other_field(world):
    state = world.state
    paid, promo, gifted, chain = (charge(state, a) for a in ("payer", "promo", "gifted", "chain"))
    canary = charge(state, "validator")
    failed, blocked = charge(state, "payer"), charge(state, "payer")
    assert stored(state, failed) == PRICE  # billable when charged ...

    # Credit granted after a job was charged doesn't change what that job earned.
    with state.session() as s, s.begin():
        credit(s, "payer", 1_000, ledger.ADJUSTMENT, "admin")
    for job_id in (paid, promo, gifted, chain, canary):
        finish(state, job_id, JobState.SUCCEEDED)
    finish(state, failed, JobState.FAILED, "timeout")
    finish(state, blocked, JobState.FAILED, "safety_blocked")
    assert stored(state, failed) == stored(state, blocked) == 0.0  # ... and nothing once refunded

    response = world.client.get("/validator/v1/ledger", headers=world.validator)
    assert response.status_code == 200, response.text
    rows = {row["job_id"]: row for row in response.json()}
    assert {job_id: rows[job_id]["billable_usd"] for job_id in (paid, promo, gifted, chain, canary, failed, blocked)} == {
        paid: PRICE,
        promo: PRICE / 2,
        gifted: 0.0,
        chain: round(PRICE * 100 / 105, 6),
        canary: 0.0,
        failed: 0.0,
        blocked: 0.0,
    }
    for row in rows.values():
        assert FEED_FIELDS | {"billable_usd"} <= set(row)
        assert isinstance(row["billable_usd"], float)
    assert rows[paid]["miner_hotkey"] == "5Miner" and rows[failed]["error_code"] == "timeout"
