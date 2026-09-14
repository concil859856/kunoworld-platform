"""Open-tier miners get customer standard jobs only after validators' probe jobs succeed on them."""

from __future__ import annotations

import json
import time

import pytest
from kuno_protocol import devkit

from kuno_gateway import admission
from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState


def enclave(enclave_id: str, tee: str, hotkey: str) -> Enclave:
    now = time.time()
    return Enclave(
        id=enclave_id, miner_hotkey=hotkey, tee=tee, image_digest="sha256:img", hpke_public_key="k", signing_public_key="s",
        profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}", capacity=1, inflight=0, status="active",
        verified_at=now, last_seen=now,
    )


def job(job_id: str, account_id: str, enclave_id: str, status: str = "succeeded") -> Job:
    now = time.time()
    return Job(
        id=job_id, account_id=account_id, profile_id="ltx-2.5-fast", enclave_id=enclave_id, params="{}", enc="", ciphertext="",
        input_blob_ids="[]", status=status, price_usd=0.1, created_at=now, updated_at=now, privacy="standard",
    )


@pytest.fixture
def world(tmp_path):
    devkit.init(tmp_path / "data")
    state = GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))
    with state.session() as s, s.begin():
        s.add(Account(id="customer", name="Customer", balance_micros=0, is_validator=False, created_at=time.time()))
        s.add(enclave("conf", "mock", "5Confidential"))
        s.add(enclave("newbie", "open", "5Newbie"))
    return state


def order(state, account_id: str) -> list[str]:
    with state.session() as s:
        account = s.get(Account, account_id)
        candidates = [s.get(Enclave, "conf"), s.get(Enclave, "newbie")]
        return [e.id for e in admission.order_for_account(s, state.settings, candidates, account)]


def test_customers_skip_an_unadmitted_open_tier_miner_and_validators_probe_it_first(world, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "3")
    assert order(world, "customer") == ["conf"]
    assert order(world, "validator") == ["newbie", "conf"]


def test_enough_succeeded_validator_jobs_admit_the_miner(world, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "3")
    with world.session() as s, s.begin():
        s.add(job("p1", "validator", "newbie"))
        s.add(job("p2", "validator", "newbie"))
        s.add(job("c1", "customer", "newbie"))  # customer work doesn't count as a probe
        s.add(job("f1", "validator", "newbie", status="failed"))  # nor does a failed probe
    assert order(world, "customer") == ["conf"]

    with world.session() as s, s.begin():
        s.add(job("p3", "validator", "newbie"))
    assert order(world, "customer") == ["conf", "newbie"]
    assert order(world, "validator") == ["conf", "newbie"]


def test_admission_can_be_turned_off(world, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    assert order(world, "customer") == ["conf", "newbie"]
