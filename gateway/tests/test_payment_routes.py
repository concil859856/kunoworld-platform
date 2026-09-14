"""The payment routes over HTTP: sessions start top-ups, provider signatures authenticate webhooks."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient
from kuno_protocol import devkit
from sqlalchemy import select

from kuno_gateway import identity
from kuno_gateway.app import create_app
from kuno_gateway.db import Account, Payment
from kuno_gateway.nowpayments import ipn_signature
from kuno_gateway.settings import Settings


class FakeStripe:
    def __init__(self):
        self.v1 = SimpleNamespace(checkout=SimpleNamespace(sessions=SimpleNamespace(create=self._create)))
        self.fail = False

    def _create(self, params, options):
        if self.fail:
            import stripe

            raise stripe.APIConnectionError("unreachable")
        return SimpleNamespace(id="cs_test_route", url="https://checkout.stripe.com/c/pay/cs_test_route")


@pytest.fixture
def world(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.stripe_secret_key, settings.stripe_webhook_secret = "sk_test_placeholder", "whsec_route"
    settings.nowpayments_api_key, settings.nowpayments_ipn_secret = "np_key", "np_ipn"
    settings.public_api_url = "https://api.kunoworld.test"
    app = create_app(settings)
    stripe_fake = FakeStripe()
    app.state.stripe_topups._client_factory = lambda: stripe_fake
    np_calls = []

    def np_http(method, path, body=None):
        np_calls.append((method, path, body))
        return {"id": "inv1", "invoice_url": "https://nowpayments.io/payment/?iid=inv1"}

    app.state.nowpayments._http = np_http
    state = app.state.gw
    with state.session() as s, s.begin():
        login = identity.issue_login_token(s, "payer@example.com", settings.login_token_ttl_s)
        user = identity.redeem_login_token(s, login)
        token, _ = identity.open_session(s, user.id, identity.WEB, settings.web_session_ttl_s)
    client = TestClient(app)
    return SimpleNamespace(app=app, state=state, client=client, session={"authorization": f"Bearer {token}"},
                           stripe=stripe_fake, np_calls=np_calls, settings=settings)


def test_config_is_public_and_says_which_methods_are_on(world):
    body = world.client.get("/v1/payments/config").json()
    assert body["card"]["enabled"] and body["usdt"]["enabled"] and not body["tao"]["enabled"]


def test_card_top_ups_start_at_ten_dollars_by_default(world):
    """Stripe keeps 8.9% of a $5 top-up, so the default minimum is $10 (USDT keeps its own, higher one)."""
    assert Settings.from_env({"KUNO_DATA_DIR": str(world.settings.data_dir)}).topup_min_usd == 10.0
    body = world.client.get("/v1/payments/config").json()
    assert (body["min_usd"], body["usdt"]["min_usd"]) == (10.0, 20.0)
    assert body["tao"]["credit_bonus"] == body["alpha"]["credit_bonus"] == 0.05
    below = world.client.post("/v1/me/topups/card", json={"amount_usd": 9.99}, headers=world.session)
    assert (below.status_code, below.json()["detail"]["code"]) == (422, "invalid_amount")
    assert "$10.00" in below.json()["detail"]["message"]
    assert world.client.post("/v1/me/topups/card", json={"amount_usd": 10}, headers=world.session).status_code == 201


def test_top_ups_need_a_signed_in_user(world):
    assert world.client.post("/v1/me/topups/card", json={"amount_usd": 25}).status_code == 401
    dev_key = {"authorization": f"Bearer {world.settings.dev_api_key}"}
    assert world.client.post("/v1/me/topups/card", json={"amount_usd": 25}, headers=dev_key).status_code == 401


def test_a_card_top_up_returns_the_checkout_link(world):
    response = world.client.post("/v1/me/topups/card", json={"amount_usd": 25}, headers=world.session)
    assert response.status_code == 201, response.text
    assert response.json()["checkout_url"] == "https://checkout.stripe.com/c/pay/cs_test_route"
    listed = world.client.get("/v1/me/topups", headers=world.session).json()
    assert [p["status"] for p in listed] == ["created"]


def test_bad_amounts_and_provider_outages_have_their_own_errors(world):
    too_small = world.client.post("/v1/me/topups/card", json={"amount_usd": 1}, headers=world.session)
    assert (too_small.status_code, too_small.json()["detail"]["code"]) == (422, "invalid_amount")
    world.stripe.fail = True
    down = world.client.post("/v1/me/topups/card", json={"amount_usd": 25}, headers=world.session)
    assert (down.status_code, down.json()["detail"]["code"]) == (502, "provider_error")
    world.settings.stripe_secret_key = None
    off = world.client.post("/v1/me/topups/card", json={"amount_usd": 25}, headers=world.session)
    assert (off.status_code, off.json()["detail"]["code"]) == (503, "payments_unavailable")


def test_a_usdt_top_up_sends_the_public_callback_url(world):
    response = world.client.post("/v1/me/topups/usdt", json={"amount_usd": 30, "network": "ethereum"}, headers=world.session)
    assert response.status_code == 201, response.text
    _, _, body = world.np_calls[0]
    assert body["ipn_callback_url"] == "https://api.kunoworld.test/v1/webhooks/nowpayments"
    assert body["pay_currency"] == "usdterc20"


def test_the_stripe_webhook_credits_on_a_signed_event_and_refuses_an_unsigned_one(world):
    world.client.post("/v1/me/topups/card", json={"amount_usd": 25}, headers=world.session)
    with world.state.session() as s:
        payment = s.scalars(select(Payment)).one()
    event = {"id": "evt_route", "type": "checkout.session.completed", "data": {"object": {
        "id": "cs_test_route", "payment_status": "paid", "currency": "usd", "amount_total": 2500, "payment_intent": "pi_route",
        "metadata": {"account_id": payment.account_id, "payment_id": payment.id}}}}
    raw = json.dumps(event).encode()

    unsigned = world.client.post("/v1/webhooks/stripe", content=raw)
    assert (unsigned.status_code, unsigned.json()["detail"]["code"]) == (400, "invalid_signature")

    ts = str(int(time.time()))
    sig = hmac.new(b"whsec_route", ts.encode() + b"." + raw, hashlib.sha256).hexdigest()
    signed = world.client.post("/v1/webhooks/stripe", content=raw, headers={"stripe-signature": f"t={ts},v1={sig}"})
    assert signed.status_code == 200 and signed.json()["outcome"] == "credited"
    with world.state.session() as s:
        assert s.get(Account, payment.account_id).balance_micros == 25_000_000


def test_the_nowpayments_webhook_refuses_forgeries_and_asks_for_a_retry_when_it_cannot_confirm(world):
    world.client.post("/v1/me/topups/usdt", json={"amount_usd": 30}, headers=world.session)
    with world.state.session() as s:
        payment = s.scalars(select(Payment)).one()
    payload = {"payment_id": 77, "payment_status": "finished", "price_amount": 30, "price_currency": "usd", "order_id": payment.id}
    raw = json.dumps(payload).encode()

    forged = world.client.post("/v1/webhooks/nowpayments", content=raw, headers={"x-nowpayments-sig": "00" * 64})
    assert forged.status_code == 400

    def unreachable(method, path, body=None):
        raise httpx.ConnectError("unreachable")

    world.app.state.nowpayments._http = unreachable
    retry = world.client.post("/v1/webhooks/nowpayments", content=raw, headers={"x-nowpayments-sig": ipn_signature(payload, "np_ipn")})
    assert (retry.status_code, retry.json()["detail"]["code"]) == (502, "provider_error")
