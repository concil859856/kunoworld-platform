"""The findings relay (migration 0018): validators publish the main validator's signed findings, the gateway refuses
forged or foreign reports and keeps them for the retention window, and validators read them back to verify."""

from __future__ import annotations

import os
import time

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect

from kuno_gateway.app import create_app
from kuno_gateway.migrations import upgrade_database
from kuno_gateway.settings import Settings
from kuno_protocol import devkit
from kuno_protocol.findings import Finding, FindingsReport, sign_findings
from kuno_protocol.hotkey import Sr25519Signer

from test_migration_enclave_envelope import _downgrade

MAIN = Sr25519Signer.from_seed(os.urandom(32))


def world(tmp_path, **env):
    data = tmp_path / "data"
    keys = devkit.init(data)
    client = TestClient(create_app(Settings.from_env({"KUNO_DATA_DIR": str(data), **env})))
    return client, {"authorization": f"Bearer {keys['KUNO_VALIDATOR_API_KEY']}"}, {"authorization": f"Bearer {keys['KUNO_DEV_API_KEY']}"}


def report(signer=MAIN, issued_at: float | None = None, hotkey: str = "5Caught") -> dict:
    finding = Finding(kind="canary_failed", miner_hotkey=hotkey, detail="receipt signs different params", at=time.time(), job_id="job-1")
    body = FindingsReport(validator_hotkey=signer.ss58_address, issued_at=issued_at or time.time(), window_s=86400.0,
                          findings=[finding], weights={"5Clean": 1.0})
    return sign_findings(signer, body).model_dump(mode="json")


def test_a_validator_publishes_signed_findings_and_validators_read_them_back(tmp_path):
    client, validator, _ = world(tmp_path)
    document = report()
    response = client.post("/validator/v1/findings", json=document, headers=validator)
    assert response.status_code == 201 and response.json() == {"accepted": True, "findings": 1}
    assert client.get("/validator/v1/findings", params={"since": 0}, headers=validator).json() == [document]
    later = client.get("/validator/v1/findings", params={"since": document["report"]["issued_at"]}, headers=validator)
    assert later.json() == []


def test_forged_and_foreign_reports_are_refused(tmp_path):
    client, validator, _ = world(tmp_path, KUNO_MAIN_VALIDATOR_HOTKEY=MAIN.ss58_address)
    forged = report()
    forged["report"]["findings"][0]["miner_hotkey"] = "5Innocent"
    response = client.post("/validator/v1/findings", json=forged, headers=validator)
    assert (response.status_code, response.json()["detail"]["code"]) == (422, "bad_signature")
    other = Sr25519Signer.from_seed(os.urandom(32))
    response = client.post("/validator/v1/findings", json=report(other), headers=validator)
    assert (response.status_code, response.json()["detail"]["code"]) == (403, "not_main_validator")
    response = client.post("/validator/v1/findings", json={"report": {}}, headers=validator)
    assert (response.status_code, response.json()["detail"]["code"]) == (422, "bad_findings")
    assert client.get("/validator/v1/findings", headers=validator).json() == []


def test_findings_are_for_validators_only(tmp_path):
    client, _, customer = world(tmp_path)
    assert client.post("/validator/v1/findings", json=report(), headers=customer).status_code == 403
    assert client.get("/validator/v1/findings", headers=customer).status_code == 403
    assert client.get("/validator/v1/findings").status_code == 401


def test_reports_older_than_the_retention_window_are_dropped(tmp_path):
    client, validator, _ = world(tmp_path, KUNO_FINDINGS_RETENTION_S="3600")
    old = report(issued_at=time.time() - 7200)
    client.post("/validator/v1/findings", json=old, headers=validator)
    fresh = report()
    client.post("/validator/v1/findings", json=fresh, headers=validator)
    assert client.get("/validator/v1/findings", headers=validator).json() == [fresh]


def test_0018_creates_the_findings_table_and_downgrades(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0018")
    assert "validator_findings" in inspect(engine).get_table_names()
    _downgrade(engine, "0017")
    assert "validator_findings" not in inspect(create_engine(f"sqlite:///{tmp_path / 'gw.db'}")).get_table_names()
