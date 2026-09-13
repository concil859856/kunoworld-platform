"""The gateway's hardware registry: one machine serves one miner hotkey at a time."""

from __future__ import annotations

import json
import time

import pytest
from fastapi.testclient import TestClient

from kuno_gateway.app import create_app
from kuno_gateway.db import Enclave, HardwareBinding
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState, HardwareInUse
from kuno_protocol import devkit
from kuno_protocol.hardware import HardwareIdentity, hardware_token


def gpu(name: str) -> HardwareIdentity:
    return HardwareIdentity("gpu", hardware_token("gpu", f"test:{name}"), "mock")


def platform(name: str) -> HardwareIdentity:
    return HardwareIdentity("cpu_platform", hardware_token("cpu_platform", f"test:{name}"), "mock")


RIG = [platform("rig"), gpu("g0"), gpu("g1")]


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


@pytest.fixture
def state(settings) -> GatewayState:
    return GatewayState(settings)


def register(state: GatewayState, enclave_id: str, hotkey: str | None, hardware, *, now: float | None = None) -> list[str]:
    """What POST /miner/v1/enclaves does after verification: upsert the enclave, then bind its hardware."""
    now = time.time() if now is None else now
    with state.hardware_lock, state.session() as s, s.begin():
        enclave = s.get(Enclave, enclave_id)
        if enclave is None:
            enclave = Enclave(
                id=enclave_id, tee="mock", image_digest=devkit.DEV_IMAGE_DIGEST, hpke_public_key="x", signing_public_key="y",
                profiles=json.dumps(["ltx-2.5-fast"]), hardware="{}", evidence="{}", capacity=1, inflight=0,
            )
            s.add(enclave)
        enclave.miner_hotkey, enclave.status = hotkey, "active"
        enclave.verified_at = enclave.last_seen = now
        enclave.gpu_count = sum(1 for h in hardware if h.kind == "gpu")
        return state.bind_hardware(s, enclave, hardware, now)


def update(state: GatewayState, enclave_id: str, **fields) -> None:
    with state.session() as s, s.begin():
        enclave = s.get(Enclave, enclave_id)
        for name, value in fields.items():
            setattr(enclave, name, value)


def status(state: GatewayState, enclave_id: str) -> str:
    with state.session() as s:
        return s.get(Enclave, enclave_id).status


def test_hardware_held_by_another_hotkeys_fresh_enclave_is_refused(state):
    register(state, "a" * 32, "5MinerA", RIG)
    for sybil in ([gpu("g1")], [platform("rig")], [platform("other"), gpu("g1"), gpu("g9")]):
        with pytest.raises(HardwareInUse) as exc:
            register(state, "b" * 32, "5MinerB", sybil)
        assert {enclave for _, enclave, _ in exc.value.holders} == {"a" * 32}
        assert "5MinerA" not in str(exc.value)  # the refusal doesn't name the other miner
    # The refused registration left nothing behind, and the holder is untouched.
    with state.session() as s:
        assert s.get(Enclave, "b" * 32) is None
        assert {b.enclave_id for b in s.query(HardwareBinding).all()} == {"a" * 32}
    assert status(state, "a" * 32) == "active"
    assert register(state, "b" * 32, "5MinerB", [platform("rig-b"), gpu("b0")]) == []


def test_the_same_hotkey_on_the_same_gpus_replaces_its_old_enclave(state):
    register(state, "a" * 32, "5MinerA", RIG)
    assert register(state, "c" * 32, "5MinerA", RIG) == ["a" * 32]
    assert status(state, "a" * 32) == "stale" and status(state, "c" * 32) == "active"
    # The history stays: both enclaves are recorded against the platform.
    with state.session() as s:
        holders = {b.enclave_id for b in s.query(HardwareBinding).filter_by(token=platform("rig").token)}
    assert holders == {"a" * 32, "c" * 32}


def test_the_same_hotkey_may_split_one_host_into_vms_with_their_own_gpus(state):
    register(state, "a" * 32, "5MinerA", [platform("rig"), gpu("g0")])
    assert register(state, "c" * 32, "5MinerA", [platform("rig"), gpu("g1")]) == []
    assert status(state, "a" * 32) == "active" and status(state, "c" * 32) == "active"


@pytest.mark.parametrize(
    "lapse",
    [
        {"status": "stale"},  # retired, replaced or failed a challenge
        {"last_seen": 0.0},  # stopped polling: older than enclave_heartbeat_s
        {"verified_at": 0.0},  # attestation older than enclave_ttl_s
    ],
)
def test_an_enclave_that_is_no_longer_fresh_releases_its_hardware(state, lapse):
    register(state, "a" * 32, "5MinerA", RIG)
    update(state, "a" * 32, **lapse)
    assert register(state, "b" * 32, "5MinerB", RIG) == []
    assert status(state, "b" * 32) == "active"
    # And the new holder now blocks the old hotkey in turn.
    with pytest.raises(HardwareInUse):
        register(state, "d" * 32, "5MinerA", [gpu("g0")])


def test_re_attesting_the_same_enclave_refreshes_its_bindings(state):
    first = time.time()
    register(state, "a" * 32, "5MinerA", RIG, now=first)
    later = first + 5.0
    register(state, "a" * 32, "5MinerA", RIG, now=later)
    with state.session() as s:
        rows = s.query(HardwareBinding).filter_by(enclave_id="a" * 32).all()
    assert len(rows) == 3
    assert {r.first_seen for r in rows} == {first} and {r.last_seen for r in rows} == {later}


def test_evidence_without_identities_binds_nothing(state):
    assert register(state, "a" * 32, "5MinerA", []) == []
    assert register(state, "b" * 32, "5MinerB", []) == []


def test_the_validator_feed_publishes_hashed_identities_and_gpu_count(settings):
    app = create_app(settings)
    register(app.state.gw, "a" * 32, "5MinerA", RIG)
    client = TestClient(app)
    feed = client.get("/validator/v1/enclaves", headers={"authorization": f"Bearer {settings.validator_api_key}"}).json()
    [row] = [r for r in feed if r["enclave_id"] == "a" * 32]
    assert row["gpu_count"] == 2
    assert sorted((h["kind"], h["token"]) for h in row["hardware_ids"]) == sorted((h.kind, h.token) for h in RIG)
    assert all(h["token"].startswith("hw1:") and "test:" not in h["token"] for h in row["hardware_ids"])
    assert client.get("/validator/v1/enclaves", headers={"authorization": f"Bearer {settings.dev_api_key}"}).status_code == 403
