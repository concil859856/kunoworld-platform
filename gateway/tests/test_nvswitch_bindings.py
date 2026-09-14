"""A Protected PCIe VM runs one worker per GPU group: its enclaves share the platform and the NVSwitches, never a GPU."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from kuno_gateway.app import create_app
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState, HardwareInUse
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE, parse_manifest, sign_manifest
from kuno_protocol.canonical import b64d
from kuno_protocol.crypto import signing_key_from_bytes
from kuno_protocol.hardware import HardwareIdentity, hardware_token
from kuno_protocol.hotkey import Sr25519Signer

from test_hardware_registry import gpu, platform, register, status
from test_open_tier_registration import Worker


def nvswitch(name: str) -> HardwareIdentity:
    return HardwareIdentity("nvswitch", hardware_token("nvswitch", f"test:{name}"), "mock")


SWITCHES = [nvswitch(f"s{i}") for i in range(4)]


@pytest.fixture
def gateway(tmp_path) -> GatewayState:
    devkit.init(tmp_path / "data")
    return GatewayState(Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")}))


def test_one_hotkeys_workers_in_one_protected_pcie_vm_share_its_switches_and_both_stay_active(gateway):
    first = [platform("hgx"), *SWITCHES, *(gpu(f"g{i}") for i in range(4))]
    second = [platform("hgx"), *SWITCHES, *(gpu(f"g{i}") for i in range(4, 8))]
    assert register(gateway, "a" * 32, "5MinerA", first) == []
    assert register(gateway, "b" * 32, "5MinerA", second) == []
    assert status(gateway, "a" * 32) == status(gateway, "b" * 32) == "active"
    # A restarted first worker (same GPUs, new keys) replaces only its own old enclave.
    assert register(gateway, "c" * 32, "5MinerA", first) == ["a" * 32]
    assert status(gateway, "b" * 32) == "active"


def test_another_hotkey_cannot_attest_a_switch_a_fresh_enclave_holds(gateway):
    register(gateway, "a" * 32, "5MinerA", [platform("hgx"), *SWITCHES, gpu("g0")])
    with pytest.raises(HardwareInUse) as exc:
        register(gateway, "b" * 32, "5MinerB", [platform("elsewhere"), SWITCHES[2], gpu("x0")])
    assert [kind for kind, _, _ in exc.value.holders] == ["nvswitch"] and "nvswitch" in str(exc.value)


def test_two_simulated_workers_of_one_vm_register_and_a_group_of_the_wrong_size_or_mode_is_refused(tmp_path):
    data = tmp_path / "data"
    env = devkit.init(data)
    owner = signing_key_from_bytes(b64d((data / "owner.key").read_text()))
    manifest = parse_manifest((data / "manifest.json").read_text())
    pinned = manifest.allowed[0].model_copy(update={"gpu_mode": "ppcie", "gpus_per_enclave": 4, "nvswitches_per_enclave": 4})
    (data / "manifest.signed.json").write_text(sign_manifest(owner, manifest.model_copy(update={"allowed": [pinned]})).model_dump_json())
    client = TestClient(create_app(Settings.from_env({"KUNO_DATA_DIR": str(data)})))
    quote_key = signing_key_from_bytes(b64d((data / "mock_quote.key").read_text()))
    signer = Sr25519Signer.from_seed(os.urandom(32))

    def vm(indices, mode="ppcie", switches=4):
        return MockTEE(quote_key, devkit.DEV_IMAGE_DIGEST, machine_id="hgx-1", gpu_indices=indices, gpu_mode=mode, nvswitches=switches)

    first, second = Worker(signer), Worker(signer)
    assert first.register(client, provider=vm([0, 1, 2, 3])).status_code == 200
    assert second.register(client, provider=vm([4, 5, 6, 7])).status_code == 200
    feed = client.get("/validator/v1/enclaves", headers={"authorization": f"Bearer {env['KUNO_VALIDATOR_API_KEY']}"}).json()
    rows = {row["enclave_id"]: row for row in feed}

    def tokens(worker, kind):
        return {h["token"] for h in rows[worker.enclave_id]["hardware_ids"] if h["kind"] == kind}

    assert rows[first.enclave_id]["status"] == rows[second.enclave_id]["status"] == "active"
    assert tokens(first, "nvswitch") == tokens(second, "nvswitch") and len(tokens(first, "nvswitch")) == 4
    assert not tokens(first, "gpu") & tokens(second, "gpu") and rows[first.enclave_id]["gpu_count"] == 4

    small = Worker(signer).register(client, provider=vm([0, 1]))
    assert small.status_code == 403 and "requires 4 per enclave" in small.json()["detail"]["message"]
    single = Worker(signer).register(client, provider=vm([0, 1, 2, 3], mode="spt", switches=0))
    assert single.status_code == 403 and "requires ppcie" in single.json()["detail"]["message"]
