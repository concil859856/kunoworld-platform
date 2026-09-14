"""Validators' jobs reach confidential miners that haven't served a family lately, so capacity pay can cover them."""

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
        profiles=json.dumps(["ltx-2.5-fast", "h3"]), hardware="{}", evidence="{}", capacity=1, inflight=0, status="active",
        verified_at=now, last_seen=now,
    )


def finished(job_id: str, enclave_id: str, profile_id: str = "ltx-2.5-pro", status: str = "succeeded", age_s: float = 3600.0) -> Job:
    at = time.time() - age_s
    return Job(
        id=job_id, account_id="customer", profile_id=profile_id, enclave_id=enclave_id, params="{}", enc="", ciphertext="",
        input_blob_ids="[]", status=status, price_usd=0.1, created_at=at, updated_at=at, finished_at=at, privacy="private",
    )


@pytest.fixture
def world(tmp_path, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "0")
    devkit.init(tmp_path / "data")
    state = GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))
    with state.session() as s, s.begin():
        s.add(Account(id="customer", name="Customer", balance_micros=0, is_validator=False, created_at=time.time()))
        s.add(enclave("busy", "mock", "5Busy"))
        s.add(enclave("idle", "mock", "5Idle"))
        s.add(finished("served", "busy"))  # a customer job of the LTX family an hour ago
    return state


def order(state, account_id: str, candidates: list[str], profile_id: str = "ltx-2.5-fast") -> list[str]:
    with state.session() as s:
        account = s.get(Account, account_id)
        ids = admission.family_profile_ids(state.profiles, state.profiles[profile_id])
        enclaves = [s.get(Enclave, c) for c in candidates]
        return [e.id for e in admission.order_for_account(s, state.settings, enclaves, account, profile_ids=ids)]


def test_a_validator_job_goes_first_to_the_miner_that_has_not_served_the_family_today(world):
    assert order(world, "validator", ["busy", "idle"]) == ["idle", "busy"]
    # Customers keep least-loaded routing.
    assert order(world, "customer", ["busy", "idle"]) == ["busy", "idle"]


def test_failed_stale_and_other_family_jobs_do_not_cover_a_miner(world):
    with world.session() as s, s.begin():
        s.add(finished("failed", "idle", status="failed"))
        s.add(finished("yesterday", "idle", age_s=admission.COVERAGE_WINDOW_S + 60))
        s.add(finished("other-family", "idle", profile_id="h3"))
    assert order(world, "validator", ["busy", "idle"]) == ["idle", "busy"]
    # For H3 it is the other way round: only idle served that family.
    assert order(world, "validator", ["idle", "busy"], profile_id="h3") == ["busy", "idle"]


def test_open_tier_work_covers_nothing_and_unadmitted_open_tier_miners_still_come_first(world, monkeypatch):
    monkeypatch.setenv("KUNO_OPEN_TIER_ADMISSION_JOBS", "1")
    with world.session() as s, s.begin():
        s.add(enclave("idle-open", "open", "5Idle"))  # the same hotkey's open-tier worker
        s.add(finished("open-work", "idle-open"))
        s.add(enclave("newbie", "open", "5Newbie"))
    assert order(world, "validator", ["busy", "idle", "newbie"]) == ["newbie", "idle", "busy"]
    assert order(world, "customer", ["busy", "idle", "newbie"]) == ["busy", "idle"]
