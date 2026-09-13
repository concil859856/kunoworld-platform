"""Signing in by email link, sessions, studio tokens and API keys."""

from __future__ import annotations

import json
import re

import pytest
from fastapi.testclient import TestClient

from kuno_gateway.app import create_app
from kuno_gateway.settings import Settings
from kuno_protocol import devkit


@pytest.fixture
def settings(tmp_path) -> Settings:
    devkit.init(tmp_path / "data")
    s = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    s.site_url = "https://kunoworld.test"
    return s


@pytest.fixture
def client(settings) -> TestClient:
    return TestClient(create_app(settings))


def bearer(token: str) -> dict:
    return {"authorization": f"Bearer {token}"}


def outbox(settings: Settings) -> list[dict]:
    if not settings.outbox_dir.exists():
        return []
    return [json.loads(p.read_text()) for p in sorted(settings.outbox_dir.iterdir())]


def link_token(message: dict) -> str:
    return re.search(r"token=([A-Za-z0-9_\-]+)", message["text"]).group(1)


def sign_in(client: TestClient, settings: Settings, email: str = "ada@example.com") -> dict:
    assert client.post("/v1/auth/magic-link", json={"email": email}).status_code == 202
    response = client.post("/v1/auth/verify", json={"token": link_token(outbox(settings)[-1])})
    assert response.status_code == 200, response.text
    return response.json()


def test_asking_for_a_link_never_reveals_whether_an_account_exists(client, settings):
    first = client.post("/v1/auth/magic-link", json={"email": "Ada@Example.com"})
    sign_in(client, settings, "ada@example.com")
    again = client.post("/v1/auth/magic-link", json={"email": "ada@example.com"})
    assert first.status_code == again.status_code == 202
    assert first.json() == again.json()
    # The address is normalized, and the link points at the website.
    message = outbox(settings)[-1]
    assert message["to"] == "ada@example.com"
    assert "https://kunoworld.test/auth/verify?token=" in message["text"]


def test_a_link_signs_in_once_and_each_person_has_one_account(client, settings):
    client.post("/v1/auth/magic-link", json={"email": "ada@example.com"})
    token = link_token(outbox(settings)[-1])
    first = client.post("/v1/auth/verify", json={"token": token})
    assert first.status_code == 200
    replay = client.post("/v1/auth/verify", json={"token": token})
    assert replay.status_code == 401 and replay.json()["detail"]["code"] == "invalid_link"

    second = sign_in(client, settings, "ADA@example.com")
    assert second["user"]["user_id"] == first.json()["user"]["user_id"]
    assert second["account"]["account_id"] == first.json()["account"]["account_id"]


def test_an_expired_link_is_refused(settings):
    settings.login_token_ttl_s = -1
    client = TestClient(create_app(settings))
    client.post("/v1/auth/magic-link", json={"email": "ada@example.com"})
    response = client.post("/v1/auth/verify", json={"token": link_token(outbox(settings)[-1])})
    assert response.status_code == 401


def test_bad_emails_and_off_site_redirects_are_rejected(client, settings):
    assert client.post("/v1/auth/magic-link", json={"email": "not-an-email"}).status_code == 422
    for target in ("https://evil.test", "//evil.test", "/\\evil.test"):
        response = client.post("/v1/auth/magic-link", json={"email": "ada@example.com", "next": target})
        assert response.status_code == 422, target
    ok = client.post("/v1/auth/magic-link", json={"email": "ada@example.com", "next": "/studio"})
    assert ok.status_code == 202
    assert "&next=/studio" in outbox(settings)[-1]["text"]


def test_link_requests_are_rate_limited_per_address(client):
    codes = [client.post("/v1/auth/magic-link", json={"email": "ada@example.com"}).status_code for _ in range(6)]
    assert codes == [202] * 5 + [429]
    # Another address is unaffected.
    assert client.post("/v1/auth/magic-link", json={"email": "grace@example.com"}).status_code == 202


def test_a_key_is_shown_once_works_and_stops_when_revoked(client, settings):
    session = sign_in(client, settings)["session_token"]
    created = client.post("/v1/me/keys", json={"name": "render farm"}, headers=bearer(session))
    assert created.status_code == 201
    key = created.json()["key"]
    assert key.startswith("kw_live_") and created.json()["prefix"] == key[:12]

    listed = client.get("/v1/me/keys", headers=bearer(session)).json()
    assert [k["name"] for k in listed] == ["render farm"]
    assert all("key" not in k for k in listed)

    assert client.get("/v1/account", headers=bearer(key)).status_code == 200
    assert client.delete(f"/v1/me/keys/{created.json()['key_id']}", headers=bearer(session)).json()["revoked_at"]
    assert client.get("/v1/account", headers=bearer(key)).status_code == 401


def test_each_credential_only_does_its_own_job(client, settings):
    session = sign_in(client, settings)["session_token"]
    studio = client.post("/v1/me/studio-token", headers=bearer(session))
    assert studio.status_code == 201
    token = studio.json()["token"]
    assert token.startswith("kwt_")

    # A studio token makes videos; it can't manage keys.
    assert client.get("/v1/account", headers=bearer(token)).status_code == 200
    assert client.get("/v1/me/keys", headers=bearer(token)).status_code == 401
    # A web session manages the account; it isn't an API credential.
    assert client.get("/v1/account", headers=bearer(session)).status_code == 401
    # An API key is neither.
    assert client.get("/v1/me", headers=bearer(settings.dev_api_key)).status_code == 401


def test_signing_out_ends_the_session_and_every_studio_token_it_issued(client, settings):
    session = sign_in(client, settings)["session_token"]
    token = client.post("/v1/me/studio-token", headers=bearer(session)).json()["token"]
    assert client.post("/v1/auth/logout", headers=bearer(session)).status_code == 204
    assert client.get("/v1/me", headers=bearer(session)).status_code == 401
    assert client.get("/v1/account", headers=bearer(token)).status_code == 401


def test_a_welcome_credit_is_given_once(settings):
    settings.signup_credit_usd = 5
    client = TestClient(create_app(settings))
    first = sign_in(client, settings)
    second = sign_in(client, settings)
    assert first["account"]["balance_usd"] == second["account"]["balance_usd"] == 5
    history = client.get("/v1/me/ledger", headers=bearer(second["session_token"])).json()
    assert [(e["source"], e["amount_usd"]) for e in history] == [("signup", 5)]


def test_the_seeded_development_keys_still_work(client, settings):
    assert client.get("/v1/account", headers=bearer(settings.dev_api_key)).json()["account_id"] == "dev"
    assert client.get("/v1/account", headers=bearer(settings.validator_api_key)).json()["account_id"] == "validator"
