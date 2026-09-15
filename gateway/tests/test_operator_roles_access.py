"""Operators sign in by email and hold roles: moderator vs admin permissions, granting and revoking over the API and
the CLI, the audit log naming the signed-in email, and the shared admin token as break-glass only."""

from __future__ import annotations

import json
import re

import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit

from kuno_gateway.app import create_app, main, role_command
from kuno_gateway.settings import Settings


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    return Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})


@pytest.fixture
def client(settings) -> TestClient:
    return TestClient(create_app(settings))


def sign_in(client: TestClient, settings: Settings, email: str) -> dict:
    assert client.post("/v1/auth/magic-link", json={"email": email}).status_code == 202
    message = json.loads(sorted(settings.outbox_dir.iterdir())[-1].read_text())
    token = re.search(r"token=([A-Za-z0-9_\-]+)", message["text"]).group(1)
    session = client.post("/v1/auth/verify", json={"token": token}).json()["session_token"]
    return {"authorization": f"Bearer {session}"}


def test_the_cli_bootstraps_the_first_admin(client, settings, monkeypatch, capsys):
    assert role_command("grant-role", "Root@Example.com", "admin", settings) == (0, "granted: root@example.com is admin")
    assert role_command("grant-role", "root@example.com", "admin", settings) == (0, "already held: root@example.com is admin")
    assert role_command("grant-role", "not-an-email", "admin", settings)[0] == 2
    assert role_command("grant-role", ("x" * 60) + "@example.com", "admin", settings)[0] == 2

    root = sign_in(client, settings, "root@example.com")
    me = client.get("/v1/me", headers=root).json()
    assert me["roles"] == ["admin"] and me["account"] is not None
    assert client.get("/admin/v1/roles", headers=root).json()[0] | {"granted_at": None} == {
        "user_id": me["user"]["user_id"], "email": "root@example.com", "role": "admin", "granted_by": "cli",
        "granted_at": None, "revoked_at": None,
    }

    # The console script: `kuno-gateway grant-role --email ... --role ...`, configured from the environment. Point it
    # at this test's database, not whatever KUNO_DATABASE_URL the calling shell exports.
    monkeypatch.setenv("KUNO_DATA_DIR", str(settings.data_dir))
    if settings.database_url:
        monkeypatch.setenv("KUNO_DATABASE_URL", settings.database_url)
    else:
        monkeypatch.delenv("KUNO_DATABASE_URL", raising=False)
    with pytest.raises(SystemExit) as done:
        main(["grant-role", "--email", "mo@example.com", "--role", "moderator"])
    assert done.value.code == 0 and "granted: mo@example.com is moderator" in capsys.readouterr().out
    with pytest.raises(SystemExit) as done:
        main(["revoke-role", "--email", "mo@example.com", "--role", "moderator"])
    assert done.value.code == 0
    with pytest.raises(SystemExit) as done:
        main(["revoke-role", "--email", "mo@example.com", "--role", "moderator"])
    assert done.value.code == 1
    log = client.get("/admin/v1/audit-log", headers=root).json()
    assert [(a["operator"], a["action"], a["detail"]["email"]) for a in log] == [
        ("cli", "role.revoke", "mo@example.com"), ("cli", "role.grant", "mo@example.com"), ("cli", "role.grant", "root@example.com"),
    ]


def test_admins_grant_and_revoke_roles_and_the_log_names_them_by_email(client, settings):
    role_command("grant-role", "root@example.com", "admin", settings)
    root = sign_in(client, settings, "root@example.com")
    granted = client.post("/admin/v1/roles", json={"email": "Mo@Example.com", "role": "moderator"}, headers=root)
    assert granted.status_code == 201 and granted.json()["granted"] is True and granted.json()["granted_by"] == "root@example.com"
    assert client.post("/admin/v1/roles", json={"email": "mo@example.com", "role": "moderator"}, headers=root).json()["granted"] is False
    assert client.post("/admin/v1/roles", json={"email": "mo@example.com", "role": "owner"}, headers=root).status_code == 422

    mo = sign_in(client, settings, "mo@example.com")
    assert client.get("/v1/me", headers=mo).json()["roles"] == ["moderator"]
    report = client.post("/v1/reports", json={"url": "https://elsewhere.example/v", "reason": "other"}).json()
    # A self-declared operator name is ignored: the log records who signed in.
    resolved = client.post(f"/admin/v1/reports/{report['report_id']}/resolve", json={"action": "dismiss", "note": "not ours"},
                           headers={**mo, "x-kuno-operator": "mallory"})
    assert resolved.status_code == 200 and resolved.json()["resolved_by"] == "mo@example.com"
    log = client.get("/admin/v1/audit-log", headers=root).json()
    assert (log[0]["operator"], log[0]["action"]) == ("mo@example.com", "report.dismiss")
    assert ("root@example.com", "role.grant") in {(a["operator"], a["action"]) for a in log}

    revoked = client.request("DELETE", "/admin/v1/roles", json={"email": "mo@example.com", "role": "moderator"}, headers=root)
    assert revoked.status_code == 200 and revoked.json()["revoked_at"] is not None
    assert client.request("DELETE", "/admin/v1/roles", json={"email": "mo@example.com", "role": "moderator"}, headers=root).status_code == 404
    # Revocation takes effect on the next request, with the same session.
    assert client.get("/admin/v1/reports", headers=mo).status_code == 403
    assert client.get("/v1/me", headers=mo).json()["roles"] == []


def test_moderators_moderate_and_admins_also_administer(client, settings):
    role_command("grant-role", "root@example.com", "admin", settings)
    role_command("grant-role", "mo@example.com", "moderator", settings)
    root, mo = sign_in(client, settings, "root@example.com"), sign_in(client, settings, "mo@example.com")

    moderator_routes = [
        ("GET", "/admin/v1/reports", None), ("GET", "/admin/v1/moderation/queue", None), ("GET", "/admin/v1/holds", None),
        ("GET", "/admin/v1/accounts/dev/safety", None),
        # Authorized, then 404 for an unknown job: a moderator may place holds.
        ("POST", "/admin/v1/holds", {"job_id": "0" * 36, "reason": "legal_request", "note": "letter"}),
        ("GET", f"/admin/v1/moderation/items/{'a' * 32}", None),
    ]
    admin_routes = [
        ("POST", "/admin/v1/accounts/dev/restrict", {"until": None, "reason": "fraud"}),
        ("POST", "/admin/v1/accounts/dev/unrestrict", {"reason": "cleared"}),
        ("POST", f"/admin/v1/holds/{'c' * 32}/release", {"note": "x"}),
        ("POST", "/admin/v1/accounts/dev/credits", {"amount_usd": 1, "idempotency_key": "ticket-0001"}),
        ("GET", "/admin/v1/accounts/dev", None),
        ("GET", "/admin/v1/audit-log", None),
        ("GET", "/admin/v1/switch", None),
        ("GET", "/admin/v1/roles", None),
        ("POST", "/admin/v1/roles", {"email": "new@example.com", "role": "moderator"}),
    ]
    for method, path, body in moderator_routes:
        for who in (mo, root):
            assert client.request(method, path, json=body, headers=who).status_code != 403, (method, path)
    for method, path, body in admin_routes:
        assert client.request(method, path, json=body, headers=mo).status_code == 403, (method, path)
        assert client.request(method, path, json=body, headers=root).status_code in (200, 201, 404), (method, path)

    # Customers, API keys and signed-in users without a role are not operators.
    customer = sign_in(client, settings, "customer@example.com")
    dev_key = {"authorization": f"Bearer {settings.dev_api_key}"}
    for who in (customer, dev_key):
        assert client.get("/admin/v1/reports", headers=who).status_code == 403
        assert client.get("/admin/v1/switch", headers=who).status_code == 403
    assert client.get("/admin/v1/reports").status_code == 401


def test_the_shared_admin_token_is_break_glass_only(settings):
    token = {"authorization": f"Bearer {settings.admin_token}"}
    assert settings.admin_token and not settings.allow_admin_token
    client = TestClient(create_app(settings))
    # Off by default.
    assert client.get("/admin/v1/reports", headers=token).status_code == 403
    assert client.post("/admin/v1/accounts/dev/restrict", json={"until": None, "reason": "x"}, headers=token).status_code == 403

    settings.allow_admin_token = True
    restricted = client.post("/admin/v1/accounts/dev/restrict", json={"until": None, "reason": "incident 12"}, headers=token)
    assert restricted.status_code == 200
    log = client.get("/admin/v1/audit-log", headers=token).json()
    assert (log[0]["operator"], log[0]["action"]) == ("break-glass", "account.restrict")
    assert client.get("/v1/me", headers=token).status_code == 401

    # Never in production, whatever KUNO_ALLOW_ADMIN_TOKEN says.
    settings.environment = "production"
    assert not settings.break_glass_enabled
    assert client.get("/admin/v1/audit-log", headers=token).status_code == 403
    settings.environment, settings.attestation = None, "production"
    assert client.get("/admin/v1/audit-log", headers=token).status_code == 403
    assert Settings.from_env({"KUNO_DATA_DIR": str(settings.data_dir), "KUNO_ALLOW_ADMIN_TOKEN": "1"}).break_glass_enabled
    assert not Settings.from_env(
        {"KUNO_DATA_DIR": str(settings.data_dir), "KUNO_ALLOW_ADMIN_TOKEN": "1", "KUNO_ENV": "production"}
    ).break_glass_enabled
