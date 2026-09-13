"""The account page reads and rotates the webhook secret with the web session, and only with it."""

from __future__ import annotations

from fastapi.testclient import TestClient
from kuno_protocol import devkit

from kuno_gateway import identity
from kuno_gateway.app import create_app
from kuno_gateway.db import Account
from kuno_gateway.settings import Settings


def test_the_web_session_reads_and_rotates_the_same_secret_the_api_key_sees(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    app = create_app(settings)
    state = app.state.gw
    with state.session() as s, s.begin():
        user = identity.redeem_login_token(s, identity.issue_login_token(s, "hooks@example.com", settings.login_token_ttl_s))
        session_token, _ = identity.open_session(s, user.id, identity.WEB, settings.web_session_ttl_s)
        account_id = identity.account_for_user(s, user.id).id
        api_key, _ = identity.create_api_key(s, account_id, "server")
    client = TestClient(app)
    web, key = {"authorization": f"Bearer {session_token}"}, {"authorization": f"Bearer {api_key}"}

    first = client.get("/v1/me/webhook-secret", headers=web).json()["secret"]
    assert first.startswith("whsec_")
    assert client.get("/v1/account/webhook-secret", headers=key).json()["secret"] == first

    rotated = client.post("/v1/me/webhook-secret/rotate", headers=web).json()["secret"]
    assert rotated != first
    with state.session() as s:
        assert s.get(Account, account_id).webhook_secret == rotated

    # API keys use the /v1/account routes; the /v1/me routes belong to the signed-in person.
    assert client.get("/v1/me/webhook-secret", headers=key).status_code == 401
    assert client.post("/v1/me/webhook-secret/rotate").status_code == 401
