"""USDT top-ups credit only for a signed notification that NOWPayments' own API confirms, and only once."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from kuno_protocol import devkit

from kuno_gateway import nowpayments, payments
from kuno_gateway.db import Account, Payment
from kuno_gateway.nowpayments import (
    InvalidWebhook,
    NowPayments,
    ipn_signature,
    js_json,
    verify_ipn,
)
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState

IPN_SECRET = "ipn-test-secret"

# Signed by Node with the NOWPayments SDK's own algorithm: JSON.stringify(sortObjectDeep(payload)).
NODE_VECTORS = [
    (
        '{"payment_id":5745459419,"payment_status":"finished","pay_address":"TXyz","price_amount":20.0,"price_currency":"usd",'
        '"pay_amount":20.5,"actually_paid":20.5,"pay_currency":"usdttrc20","order_id":"abc123","order_description":"KunoWorld credit",'
        '"purchase_id":"6084744717","outcome_amount":0.00001,"outcome_currency":"usdttrc20","fee":{"currency":"usdttrc20",'
        '"depositFee":1e-7,"withdrawalFee":0,"serviceFee":0.25},"invoice_id":null,"updated_at":1789296000000}'
    ),
    '{"z":1,"a":{"y":[3,2.50,{"b":true,"a":null}],"x":"héllo — ✓"},"big":1.5e21,"neg":-0.000123}',
]


def node_signatures() -> list[str]:
    path = Path(__file__).with_name("nowpayments_ipn_vectors.json")
    return [v["signature"] for v in json.loads(path.read_text())]


def test_signatures_match_what_node_computes_for_the_same_payload():
    for raw, expected in zip(NODE_VECTORS, node_signatures(), strict=True):
        payload = json.loads(raw)
        assert ipn_signature(payload, IPN_SECRET) == expected
        assert verify_ipn(payload, expected.upper(), f"  {IPN_SECRET}\n")  # the SDK trims the secret


def test_numbers_are_written_the_way_javascript_writes_them():
    assert js_json({"b": 20.0, "a": 0.00001, "c": 1e-7, "d": 1.5e21, "e": 2.5, "f": [1, None, True]}) == (
        '{"a":0.00001,"b":20,"c":1e-7,"d":1.5e+21,"e":2.5,"f":[1,null,true]}'
    )


class FakeApi:
    """NOWPayments' API as seen by the gateway: invoices, and the record of each payment."""

    def __init__(self):
        self.calls: list[tuple[str, str, dict | None]] = []
        self.payments: dict[str, dict] = {}
        self.down = False

    def __call__(self, method, path, body=None):
        self.calls.append((method, path, body))
        if self.down:
            import httpx

            raise httpx.ConnectError("unreachable")
        if (method, path) == ("POST", "/v1/invoice"):
            return {"id": f"inv{len(self.calls)}", "invoice_url": f"https://nowpayments.io/payment/?iid=inv{len(self.calls)}"}
        if method == "GET" and path.startswith("/v1/payment/"):
            return self.payments[path.rsplit("/", 1)[1]]
        raise AssertionError(f"unexpected call {method} {path}")


@pytest.fixture
def setup(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.nowpayments_api_key = "np_test_key"
    settings.nowpayments_ipn_secret = IPN_SECRET
    settings.site_url = "https://kunoworld.test"
    api = FakeApi()
    return GatewayState(settings), NowPayments(settings, http=api), api


def balance(state) -> int:
    with state.session() as s:
        return s.get(Account, "dev").balance_micros


def start(state, provider, amount=25.0, network="tron") -> Payment:
    with state.session() as s, s.begin():
        return provider.start(s, "dev", amount, network, "https://api.kunoworld.test/v1/webhooks/nowpayments")


def notify(state, provider, payload: dict, secret=IPN_SECRET) -> str:
    raw = json.dumps(payload).encode()
    with state.session() as s, s.begin():
        return provider.handle_ipn(s, raw, ipn_signature(payload, secret))


def ipn(payment: Payment, status: str, np_id="5001", **overrides) -> dict:
    return {
        "payment_id": int(np_id), "invoice_id": 1, "payment_status": status, "price_amount": 25, "price_currency": "usd",
        "pay_amount": 25.1, "actually_paid": 25.1, "pay_currency": "usdttrc20", "order_id": payment.id, **overrides,
    }


def confirm(api, np_id="5001", **overrides):
    api.payments[np_id] = {"payment_id": int(np_id), "payment_status": "finished", "price_amount": 25, "price_currency": "usd",
                           "actually_paid": 25.1, "order_id": overrides.pop("order_id"), **overrides}


def test_starting_a_top_up_opens_a_fixed_rate_invoice_for_this_payment(setup):
    state, provider, api = setup
    payment = start(state, provider, 25.0, "ethereum")
    method, path, body = api.calls[0]
    assert (method, path) == ("POST", "/v1/invoice")
    assert body["price_amount"] == 25.0 and body["price_currency"] == "usd" and body["pay_currency"] == "usdterc20"
    assert body["order_id"] == payment.id and body["is_fixed_rate"] is True
    assert body["ipn_callback_url"] == "https://api.kunoworld.test/v1/webhooks/nowpayments"
    assert (payment.status, payment.requested_usd_micros, payment.chain) == ("created", 25_000_000, "ethereum")
    assert payment.checkout_url.startswith("https://nowpayments.io/")


def test_small_amounts_unknown_networks_and_missing_configuration_are_refused(setup):
    state, provider, _ = setup
    for amount, network in ((10.0, "tron"), (25.0, "solana"), (25.001, "tron")):
        with pytest.raises(payments.InvalidAmount):
            start(state, provider, amount, network)
    provider.settings.nowpayments_ipn_secret = None
    with pytest.raises(payments.PaymentsUnavailable):
        start(state, provider)


def test_a_confirmed_finished_payment_is_credited_once_however_often_it_is_notified(setup):
    state, provider, api = setup
    payment = start(state, provider)
    before = balance(state)
    confirm(api, order_id=payment.id)
    assert notify(state, provider, ipn(payment, "finished")) == "credited"
    assert notify(state, provider, ipn(payment, "finished")) == "already_credited"
    assert balance(state) == before + 25_000_000
    with state.session() as s:
        stored = s.get(Payment, payment.id)
    assert (stored.status, stored.amount_usd_micros, stored.tx_hash, stored.asset_amount) == ("credited", 25_000_000, "5001", "25.1")


def test_a_forged_notification_changes_nothing_and_never_reaches_the_api(setup):
    state, provider, api = setup
    payment = start(state, provider)
    before, calls = balance(state), len(api.calls)
    with pytest.raises(InvalidWebhook):
        notify(state, provider, ipn(payment, "finished"), secret="guessed")
    with pytest.raises(InvalidWebhook), state.session() as s, s.begin():
        provider.handle_ipn(s, b"not json", "00")
    assert balance(state) == before and len(api.calls) == calls


def test_a_signed_finished_notice_the_api_does_not_back_up_is_held_for_review(setup):
    state, provider, api = setup
    before = balance(state)
    # Still confirming according to the API.
    early = start(state, provider)
    confirm(api, "6001", order_id=early.id, payment_status="confirming")
    assert notify(state, provider, ipn(early, "finished", "6001")) == "needs_review"
    # A payment that belongs to another order.
    other = start(state, provider)
    confirm(api, "6002", order_id="someone-else")
    assert notify(state, provider, ipn(other, "finished", "6002")) == "needs_review"
    # An amount that doesn't match the invoice.
    short = start(state, provider)
    confirm(api, "6003", order_id=short.id, price_amount=5)
    assert notify(state, provider, ipn(short, "finished", "6003")) == "needs_review"
    assert balance(state) == before
    with state.session() as s:
        assert "problems" in s.get(Payment, short.id).detail


def test_partial_failed_and_in_progress_payments_credit_nothing(setup):
    state, provider, _ = setup
    before = balance(state)
    waiting, partial, failed = start(state, provider), start(state, provider), start(state, provider)
    assert notify(state, provider, ipn(waiting, "confirming")) == "pending"
    assert notify(state, provider, ipn(partial, "partially_paid", actually_paid=10)) == "needs_review"
    assert notify(state, provider, ipn(failed, "expired")) == "closed"
    assert balance(state) == before
    with state.session() as s:
        assert [s.get(Payment, p.id).status for p in (waiting, partial, failed)] == ["pending", "needs_review", "expired"]


def test_a_later_notice_cannot_undo_a_credit(setup):
    state, provider, api = setup
    payment = start(state, provider)
    confirm(api, order_id=payment.id)
    notify(state, provider, ipn(payment, "finished"))
    assert notify(state, provider, ipn(payment, "failed")) == "already_credited"
    with state.session() as s:
        assert s.get(Payment, payment.id).status == "credited"


def test_when_the_api_is_unreachable_the_notice_fails_so_nowpayments_retries(setup):
    state, provider, api = setup
    payment = start(state, provider)
    before = balance(state)
    api.down = True
    import httpx

    with pytest.raises(httpx.HTTPError):
        notify(state, provider, ipn(payment, "finished"))
    assert balance(state) == before
    api.down = False
    confirm(api, order_id=payment.id)
    assert notify(state, provider, ipn(payment, "finished")) == "credited"


def test_unknown_orders_are_acknowledged_and_ignored(setup):
    state, provider, api = setup
    fake = Payment(id="nope", provider_ref="x")
    assert notify(state, provider, ipn(fake, "confirming")) == "ignored"
    assert nowpayments.PROVIDER == "nowpayments"
