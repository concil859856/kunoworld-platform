"""Sign-in link limits are settings: production keeps the defaults, local test runs can raise them."""

from __future__ import annotations

from fastapi.testclient import TestClient
from kuno_protocol import devkit

from kuno_gateway.app import create_app
from kuno_gateway.settings import Settings


def test_the_defaults_hold_unless_the_environment_changes_them(tmp_path):
    devkit.init(tmp_path / "data")
    defaults = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    assert (defaults.signin_links_per_ip, defaults.signin_links_per_email) == (20, 5)
    raised = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data"), "KUNO_SIGNIN_LINKS_PER_IP": "1000", "KUNO_SIGNIN_LINKS_PER_EMAIL": "100"})
    assert (raised.signin_links_per_ip, raised.signin_links_per_email) == (1000, 100)


def test_the_per_address_limit_comes_from_settings(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.signin_links_per_ip = 1
    client = TestClient(create_app(settings))
    assert client.post("/v1/auth/magic-link", json={"email": "one@example.com"}).status_code == 202
    limited = client.post("/v1/auth/magic-link", json={"email": "two@example.com"})
    assert limited.status_code == 429 and limited.json()["detail"]["code"] == "rate_limited"
