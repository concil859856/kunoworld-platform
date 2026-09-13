"""Card top-ups credit only from Stripe's signed word that a session was paid, and only once."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from types import SimpleNamespace

import pytest
from kuno_protocol import devkit

from kuno_gateway import ledger, payments
from kuno_gateway.db import Account, Payment
from kuno_gateway.settings import Settings
from kuno_gateway.state import GatewayState
from kuno_gateway.stripe_payments import InvalidWebhook, StripeTopups

WEBHOOK_SECRET = "whsec_test_secret"


class FakeStripe:
    def __init__(self):
        self.calls = []
        self.v1 = SimpleNamespace(checkout=SimpleNamespace(sessions=SimpleNamespace(create=self._create)))

    def _create(self, params, options):
        self.calls.append((params, options))
        n = len(self.calls)
        return SimpleNamespace(id=f"cs_test_{n}", url=f"https://checkout.stripe.com/c/pay/cs_test_{n}")


@pytest.fixture
def setup(tmp_path):
    devkit.init(tmp_path / "data")
    settings = Settings.from_env({"KUNO_DATA_DIR": str(tmp_path / "data")})
    settings.stripe_secret_key = "sk_test_placeholder"
    settings.stripe_webhook_secret = WEBHOOK_SECRET
    settings.site_url = "https://kunoworld.test"
    state = GatewayState(settings)
    fake = FakeStripe()
    return state, StripeTopups(settings, client_factory=lambda: fake), fake


def signed(event: dict, secret: str = WEBHOOK_SECRET) -> tuple[bytes, str]:
    payload = json.dumps(event).encode()
    timestamp = str(int(time.time()))
    signature = hmac.new(secret.encode(), timestamp.encode() + b"." + payload, hashlib.sha256).hexdigest()
    return payload, f"t={timestamp},v1={signature}"


def event(kind: str, obj: dict, event_id: str = "evt_1") -> dict:
    return {"id": event_id, "object": "event", "type": kind, "data": {"object": obj}}


def balance(state: GatewayState) -> int:
    with state.session() as s:
        return s.get(Account, "dev").balance_micros


def start(state, topups, amount=25.0) -> Payment:
    with state.session() as s, s.begin():
        return topups.start(s, "dev", amount)


def paid_session(payment: Payment, **overrides) -> dict:
    return {
        "id": payment.provider_ref, "object": "checkout.session", "payment_status": "paid", "currency": "usd",
        "amount_total": 2500, "payment_intent": "pi_test_1", "metadata": {"account_id": "dev", "payment_id": payment.id},
        **overrides,
    }


def apply(state, topups, evt, secret=WEBHOOK_SECRET) -> str:
    payload, header = signed(evt, secret)
    with state.session() as s, s.begin():
        return topups.handle_webhook(s, payload, header)


def test_starting_a_top_up_opens_a_session_for_exact_cents(setup):
    state, topups, fake = setup
    payment = start(state, topups, 25.0)
    params, options = fake.calls[0]
    assert params["line_items"][0]["price_data"] == {"currency": "usd", "unit_amount": 2500, "product_data": {"name": "KunoWorld credit"}}
    assert params["metadata"] == {"account_id": "dev", "payment_id": payment.id}
    assert params["success_url"] == "https://kunoworld.test/account?topup=success"
    assert options == {"idempotency_key": f"topup-{payment.id}"}
    assert (payment.status, payment.requested_usd_micros, payment.checkout_url) == ("created", 25_000_000, "https://checkout.stripe.com/c/pay/cs_test_1")


def test_amounts_outside_the_limits_or_in_fractions_of_a_cent_are_refused(setup):
    state, topups, _ = setup
    for amount in (1.0, 10_000.0, 10.005):
        with pytest.raises(payments.InvalidAmount), state.session() as s, s.begin():
            topups.start(s, "dev", amount)


def test_nothing_happens_when_card_payments_are_not_configured(setup):
    state, topups, _ = setup
    topups.settings.stripe_secret_key = None
    with pytest.raises(payments.PaymentsUnavailable), state.session() as s, s.begin():
        topups.start(s, "dev", 25.0)


def test_a_paid_session_is_credited_once_however_often_stripe_retries(setup):
    state, topups, _ = setup
    payment = start(state, topups)
    before = balance(state)
    assert apply(state, topups, event("checkout.session.completed", paid_session(payment))) == "credited"
    assert apply(state, topups, event("checkout.session.completed", paid_session(payment), "evt_2")) == "already_credited"
    assert balance(state) == before + 25_000_000
    with state.session() as s:
        stored = s.get(Payment, payment.id)
    assert (stored.status, stored.amount_usd_micros, stored.tx_hash) == ("credited", 25_000_000, "pi_test_1")


def test_an_unsigned_or_wrongly_signed_event_changes_nothing(setup):
    state, topups, _ = setup
    payment = start(state, topups)
    before = balance(state)
    with pytest.raises(InvalidWebhook):
        apply(state, topups, event("checkout.session.completed", paid_session(payment)), secret="whsec_wrong")
    with pytest.raises(InvalidWebhook), state.session() as s, s.begin():
        topups.handle_webhook(s, json.dumps(event("checkout.session.completed", paid_session(payment))).encode(), None)
    assert balance(state) == before


def test_a_session_for_another_account_or_currency_is_held_for_review(setup):
    state, topups, _ = setup
    before = balance(state)
    other = start(state, topups)
    assert apply(state, topups, event("checkout.session.completed", paid_session(other, metadata={"account_id": "validator"}))) == "needs_review"
    euro = start(state, topups)
    assert apply(state, topups, event("checkout.session.completed", paid_session(euro, currency="eur"))) == "needs_review"
    assert balance(state) == before


def test_asynchronous_payments_wait_and_expired_sessions_close(setup):
    state, topups, _ = setup
    before = balance(state)
    waiting = start(state, topups)
    assert apply(state, topups, event("checkout.session.completed", paid_session(waiting, payment_status="unpaid"))) == "pending"
    assert balance(state) == before
    assert apply(state, topups, event("checkout.session.async_payment_succeeded", paid_session(waiting), "evt_async")) == "credited"
    assert balance(state) == before + 25_000_000

    abandoned = start(state, topups)
    assert apply(state, topups, event("checkout.session.expired", {"id": abandoned.provider_ref}, "evt_exp")) == "closed"
    with state.session() as s:
        assert s.get(Payment, abandoned.id).status == "expired"


def test_refunds_and_disputes_take_the_money_back_once(setup):
    state, topups, _ = setup
    payment = start(state, topups)
    apply(state, topups, event("checkout.session.completed", paid_session(payment)))
    after_credit = balance(state)

    refund = {"id": "re_1", "object": "refund", "amount": 1000, "payment_intent": "pi_test_1"}
    assert apply(state, topups, event("refund.created", refund, "evt_r1")) == "clawed_back"
    assert apply(state, topups, event("refund.created", refund, "evt_r1_retry")) == "already_clawed_back"
    assert balance(state) == after_credit - 10_000_000

    dispute = {"id": "dp_1", "object": "dispute", "amount": 2500, "payment_intent": "pi_test_1"}
    assert apply(state, topups, event("charge.dispute.created", dispute, "evt_d1")) == "clawed_back"
    assert balance(state) == after_credit - 35_000_000
    with state.session() as s:
        assert s.get(Payment, payment.id).status == "needs_review"
        clawbacks = s.query(ledger.LedgerEntry).filter(ledger.LedgerEntry.idempotency_key.like("clawback:stripe:%"))
        assert sum(e.amount_micros for e in clawbacks) == -35_000_000
