"""The C2PA issuance log in the database: the JSONL file imported once, per-enclave and global issuance limits, a
certificate never returned unless recorded, and the admin view."""

from __future__ import annotations

import json
import time
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.exc import SQLAlchemyError
from test_c2pa_issuing_ca import FakeEnclave, client, settings  # noqa: F401  (fixtures)

from operator_sessions import operator_headers

from kuno_gateway import c2pa_issuance, ops_cli
from kuno_gateway.app import create_app
from kuno_gateway.db_storage import C2paIssuance


def records(app) -> list[dict]:
    with app.state.gw.session() as s:
        return c2pa_issuance.records(s)


def entry(n: int, **extra) -> dict:
    return {
        "serial": format(0xABC0 + n, "x"), "cert_sha256": f"{n:064x}", "enclave_id": f"{n:032x}",
        "evidence_digest": "ev" * 32, "image_digest": "sha256:" + "0" * 64, "profiles": ["ltx-2.5-fast"],
        "not_before": 1_750_000_000.0 + n, "not_after": 1_750_086_400.0 + n, "issued_at": 1_750_000_300.0 + n,
        "issuer_sha256": "is" * 32, **extra,
    }


def test_the_jsonl_log_is_imported_once(settings):
    path = settings.c2pa_issuance_log
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(entry(n)) for n in (1, 2, 3)]
    path.write_text("\n".join([lines[0], lines[1], "", lines[2], '{"serial": "torn'])+ "\n")

    app = create_app(settings)
    assert app.state.startup_report["c2pa_import"] | {"path": None} == {"path": None, "imported": 3, "already_present": 0, "malformed": 1}
    imported = records(app)
    assert [r["cert_sha256"] for r in imported] == [entry(n)["cert_sha256"] for n in (1, 2, 3)]
    assert imported[0] | {"source": None} == {**entry(1), "source": None} and {r["source"] for r in imported} == {"jsonl"}

    again = create_app(settings)
    assert again.state.startup_report["c2pa_import"]["imported"] == 0 and len(records(again)) == 3
    out: list[str] = []
    assert ops_cli.import_c2pa_log(SimpleNamespace(path=None), settings, out=out.append) == 1  # the torn line is reported
    assert out == [f"{path}: imported 0, already present 3, malformed 1"]
    assert path.exists()  # kept as the historical file; the gateway no longer appends to it


def test_certificates_are_recorded_and_limited_per_enclave(settings, client):
    settings.c2pa_issuance_per_enclave = 2
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    serials = []
    for _ in range(2):
        response = enclave.request_certificate(client)
        assert response.status_code == 200, response.text
        serials.append(response.json()["serial"])

    refused = enclave.request_certificate(client)
    assert refused.status_code == 429 and refused.json()["detail"]["code"] == "rate_limited"
    assert "enclave limit: 2 per 3600s" in refused.json()["detail"]["message"]
    assert 1 <= int(refused.headers["retry-after"]) <= 3600
    logged = records(client.app)
    assert [r["serial"] for r in logged] == serials and {r["source"] for r in logged} == {"gateway"}
    assert {r["enclave_id"] for r in logged} == {enclave.id}

    # The window slides: once the earlier issuances are older than it, the enclave is served again.
    with client.app.state.gw.session() as s, s.begin():
        s.execute(update(C2paIssuance).values(issued_at=time.time() - 7200))
    assert enclave.request_certificate(client).status_code == 200


def test_the_global_limit_counts_every_enclave(settings, client):
    settings.c2pa_issuance_global = 2
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    now = time.time()
    with client.app.state.gw.session() as s, s.begin():
        for n in (1, 2):  # two other enclaves were issued certificates in this window
            c2pa_issuance.record(s, entry(n, issued_at=now - 60 * n))
    refused = enclave.request_certificate(client)
    assert refused.status_code == 429 and "global limit: 2 per 3600s" in refused.json()["detail"]["message"]
    settings.c2pa_issuance_global = 0  # off
    assert enclave.request_certificate(client).status_code == 200


def test_a_certificate_that_cannot_be_recorded_is_never_returned(settings, client, monkeypatch):
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)

    def broken(*args, **kwargs):
        raise SQLAlchemyError("disk full")

    monkeypatch.setattr(c2pa_issuance, "record", broken)
    response = enclave.request_certificate(client)
    assert response.status_code == 503 and response.json()["detail"]["code"] == "ca_unavailable"
    assert "certificate_chain_pem" not in response.text and records(client.app) == []


def test_admins_read_the_issuance_log(settings, client):
    state = client.app.state.gw
    enclave = FakeEnclave(settings.data_dir)
    enclave.register(client)
    for _ in range(3):
        assert enclave.request_certificate(client).status_code == 200
    admin = operator_headers(state, "ca-admin@kunoworld.test", "admin")

    body = client.get("/admin/v1/c2pa/issuances", headers=admin).json()
    issued = [r["issued_at"] for r in body["issuances"]]
    assert len(issued) == 3 and issued == sorted(issued, reverse=True) and body["next_before"] is None
    assert body["limits"] == {"window_s": 3600, "per_enclave_limit": 12, "global_limit": 1000, "global_in_window": 3}
    assert body["ca_configured"] is True and body["issuances"][0]["enclave_id"] == enclave.id

    page = client.get("/admin/v1/c2pa/issuances", params={"limit": 2, "enclave_id": enclave.id}, headers=admin).json()
    assert len(page["issuances"]) == 2 and page["limits"]["enclave_in_window"] == 3
    rest = client.get("/admin/v1/c2pa/issuances", params={"limit": 2, "before": page["next_before"]}, headers=admin).json()
    assert [r["serial"] for r in page["issuances"] + rest["issuances"]] == [r["serial"] for r in body["issuances"]]
    assert client.get("/admin/v1/c2pa/issuances", params={"since": time.time() + 60}, headers=admin).json()["issuances"] == []

    moderator = operator_headers(state, "ca-moderator@kunoworld.test", "moderator")
    assert client.get("/admin/v1/c2pa/issuances", headers=moderator).status_code == 403
    assert client.get("/admin/v1/c2pa/issuances").status_code == 401
    dev_key = {"authorization": f"Bearer {settings.dev_api_key}"}
    assert client.get("/admin/v1/c2pa/issuances", headers=dev_key).status_code == 403


def test_the_admin_view_works_without_a_ca(tmp_path):
    from kuno_gateway.settings import Settings
    from kuno_protocol import devkit

    data = tmp_path / "data"
    devkit.init(data)
    settings = Settings.from_env({"KUNO_DATA_DIR": str(data), "KUNO_C2PA_CA_KEY": "", "KUNO_C2PA_CA_CHAIN": ""})
    app = create_app(settings)
    admin = operator_headers(app.state.gw, "ca-admin@kunoworld.test", "admin")
    body = TestClient(app).get("/admin/v1/c2pa/issuances", headers=admin).json()
    assert body["issuances"] == [] and body["ca_configured"] is False
