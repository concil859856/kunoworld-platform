"""Where a miner runs matters for MiniMax H3, whatever its customers' countries: the licence bars its Excluded
Territories outright, so an enclave that offers an H3 profile is refused there (and where the country is unknown)."""

from __future__ import annotations

import json
import os
import time

import pytest
from fastapi.testclient import TestClient

from kuno_gateway.app import create_app
from kuno_gateway.settings import Settings
from kuno_protocol import devkit
from kuno_protocol.attestation import MockTEE, build_evidence, enclave_id_for
from kuno_protocol.canonical import b64d, b64e
from kuno_protocol.crypto import (
    generate_hpke_keypair,
    generate_signing_key,
    public_key_bytes,
    request_signature_message,
    signing_key_from_bytes,
)
from kuno_protocol.hotkey import Sr25519Signer, sign_hotkey_proof

H3, LTX = "h3", "ltx-2.5-fast"


class Worker:
    """A worker registering itself, with the country header a gateway behind Cloudflare would see."""

    def __init__(self, data):
        self.key = generate_signing_key()
        _, self.hpke = generate_hpke_keypair()
        self.signing_public = public_key_bytes(self.key)
        self.enclave_id = enclave_id_for(self.hpke, self.signing_public)
        self.signer = Sr25519Signer.from_seed(os.urandom(32))
        self.tee = MockTEE(signing_key_from_bytes(b64d((data / "mock_quote.key").read_text())), devkit.DEV_IMAGE_DIGEST)

    def register(self, client: TestClient, profiles: list[str], country: str | None = None, gpus: int = 4):
        nonce = bytes.fromhex(client.get("/miner/v1/nonce").json()["nonce"])
        evidence = build_evidence(
            self.tee, nonce, self.hpke, self.signing_public, devkit.DEV_IMAGE_DIGEST, profiles,
            {"gpu": "NVIDIA H200", "gpu_count": gpus},
        )
        body = json.dumps({
            "evidence": evidence.model_dump(mode="json"),
            "miner_hotkey": self.signer.ss58_address,
            "capacity": 1,
            "hotkey_proof": sign_hotkey_proof(self.signer, nonce, self.enclave_id, self.signing_public).model_dump(mode="json"),
        }).encode()
        timestamp = str(int(time.time()))
        headers = {
            "x-kuno-enclave": self.enclave_id,
            "x-kuno-timestamp": timestamp,
            "x-kuno-signature": b64e(self.key.sign(request_signature_message("POST", "/miner/v1/enclaves", timestamp, body))),
            "content-type": "application/json",
        }
        if country is not None:
            headers["x-kuno-country"] = country
        return client.post("/miner/v1/enclaves", content=body, headers=headers)


@pytest.fixture
def gateway(tmp_path):
    def build(**env):
        data = tmp_path / "data"
        if not data.exists():
            devkit.init(data)
        settings = Settings.from_env({"KUNO_DATA_DIR": str(data), "KUNO_ALLOW_COUNTRY_OVERRIDE": "1", **env})
        return TestClient(create_app(settings)), Worker(data)

    return build


def test_h3_is_refused_in_an_excluded_territory(gateway):
    client, worker = gateway()

    response = worker.register(client, [H3], country="US")

    assert response.status_code == 403
    detail = response.json()["detail"]
    assert detail["code"] == "region_not_licensed"
    assert H3 in detail["message"] and "US" in detail["message"]


def test_h3_is_refused_when_the_country_is_unknown(gateway):
    client, worker = gateway()

    response = worker.register(client, [H3], country=None)

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "region_not_licensed"


def test_h3_registers_from_a_licensed_country(gateway):
    client, worker = gateway()

    response = worker.register(client, [H3], country="JP")

    assert response.status_code == 200, response.text
    assert response.json()["status"] == "active"


def test_only_the_barred_profiles_are_named(gateway):
    client, worker = gateway()

    response = worker.register(client, [H3, "h3-reference", LTX], country="GB")

    assert response.status_code == 403
    message = response.json()["detail"]["message"]
    assert "h3, h3-reference" in message and LTX not in message


def test_ltx_may_run_anywhere(gateway):
    client, worker = gateway()

    response = worker.register(client, [LTX], country="US", gpus=1)

    assert response.status_code == 200, response.text


def test_a_local_run_can_turn_the_check_off(gateway):
    client, worker = gateway(KUNO_ENFORCE_MINER_REGION="0")

    response = worker.register(client, [H3], country="US")

    assert response.status_code == 200, response.text
