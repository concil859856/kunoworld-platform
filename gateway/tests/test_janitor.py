"""The janitor is what keeps a dead worker from stranding customers' jobs and money."""

from __future__ import annotations

import json
import time

import pytest

from kuno_gateway.db import Account, Enclave, Job
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState
from kuno_protocol import devkit
from kuno_protocol.profiles import Mode
from kuno_protocol.schemas import GenerationParams, JobState

PARAMS = GenerationParams(
    profile_id="ltx-2.5-fast", mode=Mode.TEXT_TO_VIDEO, duration_s=2, resolution="720p", aspect_ratio="16:9", fps=24
)


@pytest.fixture
def state(tmp_path) -> GatewayState:
    devkit.init(tmp_path / "data")
    return GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))


def add_enclave(state: GatewayState, last_seen_ago: float = 0.0, status: str = "active") -> str:
    now = time.time()
    with state.session() as s, s.begin():
        s.add(
            Enclave(
                id="e" * 32, miner_hotkey="5Miner", tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST,
                hpke_public_key="x", signing_public_key="y", profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}",
                evidence="{}", capacity=1, inflight=0, status=status, verified_at=now, last_seen=now - last_seen_ago,
            )
        )
    return "e" * 32


def add_job(state: GatewayState, enclave_id: str, *, status: JobState, age_s: float = 0.0, price: float = 1.0) -> str:
    now = time.time()
    job_id = f"job-{status.value}-{age_s}"
    with state.session() as s, s.begin():
        s.add(
            Job(
                id=job_id, account_id="dev", profile_id="ltx-2.5-fast", enclave_id=enclave_id, params=PARAMS.model_dump_json(),
                enc="x", ciphertext="y", input_blob_ids="[]", status=status.value, stage=None, progress=0.0, price_usd=price,
                created_at=now - age_s, updated_at=now - age_s, started_at=now - age_s if status is JobState.RUNNING else None,
            )
        )
    return job_id


def balance(state: GatewayState) -> float:
    with state.session() as s:
        return s.get(Account, "dev").balance_micros / 1_000_000


def reload(state: GatewayState, job_id: str) -> Job:
    with state.session() as s:
        return s.get(Job, job_id)


def test_a_job_waiting_on_a_silent_worker_is_released_and_refunded(state):
    enclave = add_enclave(state, last_seen_ago=50)  # past queued_grace_s, inside the heartbeat window
    job_id = add_job(state, enclave, status=JobState.QUEUED, age_s=50, price=2.5)
    before = balance(state)

    state.janitor()

    job = reload(state, job_id)
    assert job.status == JobState.FAILED.value and job.error_code == "enclave_unavailable"
    assert balance(state) == pytest.approx(before + 2.5)


def test_a_job_on_a_live_worker_is_left_alone(state):
    enclave = add_enclave(state, last_seen_ago=2)
    job_id = add_job(state, enclave, status=JobState.QUEUED, age_s=5)
    state.janitor()
    assert reload(state, job_id).status == JobState.QUEUED.value


def test_a_worker_gone_past_the_heartbeat_goes_stale(state):
    add_enclave(state, last_seen_ago=200)
    state.janitor()
    with state.session() as s:
        assert s.get(Enclave, "e" * 32).status == "stale"


def test_a_worker_reporting_progress_through_a_long_render_stays_fresh(state):
    # It hasn't pulled for 100 s because it is rendering (LTX-2.5 Pro takes about that long on one GPU).
    enclave = add_enclave(state, last_seen_ago=100)
    job_id = add_job(state, enclave, status=JobState.RUNNING, age_s=100)
    with state.session() as s, s.begin():
        state.touch(s, enclave, time.time())

    state.janitor()

    assert reload(state, job_id).status == JobState.RUNNING.value
    with state.session() as s:
        assert s.get(Enclave, enclave).status == "active"


def test_a_run_that_overruns_its_profile_timeout_is_failed_and_refunded(state):
    enclave = add_enclave(state, last_seen_ago=1)
    timeout = state.profiles["ltx-2.5-fast"].timeout_s
    job_id = add_job(state, enclave, status=JobState.RUNNING, age_s=timeout + 60, price=1.5)
    before = balance(state)

    state.janitor()

    job = reload(state, job_id)
    assert job.status == JobState.FAILED.value and job.error_code == "timeout"
    assert balance(state) == pytest.approx(before + 1.5)


def test_a_job_nobody_ever_collected_times_out(state):
    enclave = add_enclave(state, last_seen_ago=1)  # worker alive but never pulled this one
    job_id = add_job(state, enclave, status=JobState.QUEUED, age_s=state.settings.queue_timeout_s + 10)
    state.janitor()
    assert reload(state, job_id).error_code in ("queue_timeout", "enclave_unavailable")


def test_successful_jobs_are_never_refunded(state):
    enclave = add_enclave(state, last_seen_ago=1)
    job_id = add_job(state, enclave, status=JobState.SUCCEEDED, age_s=10_000, price=3.0)
    before = balance(state)
    state.janitor()
    assert reload(state, job_id).status == JobState.SUCCEEDED.value and balance(state) == pytest.approx(before)
