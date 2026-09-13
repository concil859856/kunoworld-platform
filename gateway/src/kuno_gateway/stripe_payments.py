"""Card top-ups through Stripe Checkout.

A top-up is a Checkout Session for an exact number of cents. Credit arrives only from Stripe's
signed webhook, never from the browser returning to the success page, and only for a session
Stripe reports as paid, in dollars, for the account that started it. Refunds and disputes take the
money back out, even into a negative balance, which then blocks new videos until it's settled.

Events to enable on the Stripe webhook endpoint: checkout.session.completed,
checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
checkout.session.expired, refund.created, charge.dispute.created.
"""

from __future__ import annotations

import json
import time
import uuid
from collections.abc import Callable

import stripe
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import ledger, payments
from .db import Payment
from .settings import Settings

PROVIDER = "stripe"
MICROS_PER_CENT = 10_000


class InvalidWebhook(Exception):
    pass


class StripeTopups:
    def __init__(self, settings: Settings, client_factory: Callable[[], object] | None = None):
        self.settings = settings
        self._client_factory = client_factory or (lambda: stripe.StripeClient(settings.stripe_secret_key))

    @property
    def enabled(self) -> bool:
        return bool(self.settings.stripe_secret_key and self.settings.stripe_webhook_secret)

    def start(self, s: Session, account_id: str, amount_usd: float) -> Payment:
        """Opens a Checkout Session and records the pending top-up. The caller commits."""
        if not self.enabled:
            raise payments.PaymentsUnavailable("Card payments aren't set up on this gateway.")
        micros = payments.check_amount(self.settings, amount_usd)
        if micros % MICROS_PER_CENT:
            raise payments.InvalidAmount("Card top-ups are in whole cents.")
        payment_id = uuid.uuid4().hex
        site = self.settings.site_url.rstrip("/")
        metadata = {"account_id": account_id, "payment_id": payment_id}
        session = self._client_factory().v1.checkout.sessions.create(
            params={
                "mode": "payment",
                "line_items": [
                    {
                        "quantity": 1,
                        "price_data": {
                            "currency": "usd",
                            "unit_amount": micros // MICROS_PER_CENT,
                            "product_data": {"name": "KunoWorld credit"},
                        },
                    }
                ],
                "client_reference_id": account_id,
                "metadata": metadata,
                "payment_intent_data": {"metadata": metadata},
                "success_url": f"{site}/account?topup=success",
                "cancel_url": f"{site}/account?topup=canceled",
            },
            # A retried request can't open a second session for the same top-up.
            options={"idempotency_key": f"topup-{payment_id}"},
        )
        return payments.record(
            s, account_id=account_id, provider=PROVIDER, provider_ref=session.id, status="created", id=payment_id,
            requested_usd_micros=micros, asset="usd", checkout_url=session.url,
        )

    def handle_webhook(self, s: Session, payload: bytes, signature: str | None) -> str:
        """Applies one verified Stripe event. Returns what happened, for the response and logs."""
        if not self.enabled:
            raise payments.PaymentsUnavailable("Card payments aren't set up on this gateway.")
        try:
            stripe.Webhook.construct_event(payload, signature, self.settings.stripe_webhook_secret)
        except (stripe.SignatureVerificationError, ValueError) as exc:
            raise InvalidWebhook(str(exc)) from None
        # The signature covers these exact bytes; plain dicts don't change shape between SDK versions.
        event = json.loads(payload)

        kind = event["type"]
        obj = event["data"]["object"]
        if kind in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
            return self._session_paid(s, event["id"], obj)
        if kind in ("checkout.session.async_payment_failed", "checkout.session.expired"):
            payment = payments.find(s, PROVIDER, obj["id"])
            if payment is None:
                return "ignored"
            payments.record(s, account_id=payment.account_id, provider=PROVIDER, provider_ref=obj["id"],
                            status="failed" if kind.endswith("failed") else "expired")
            return "closed"
        if kind == "refund.created":
            return self._claw_back(s, obj.get("payment_intent"), obj["amount"], f"refund:{obj['id']}", "Card refund")
        if kind == "charge.dispute.created":
            return self._claw_back(s, obj.get("payment_intent"), obj["amount"], f"dispute:{obj['id']}", "Card dispute")
        return "ignored"

    def _session_paid(self, s: Session, event_id: str, obj) -> str:
        payment = payments.find(s, PROVIDER, obj["id"])
        if payment is None:
            return "ignored"
        if obj.get("payment_status") != "paid":
            # Asynchronous methods complete the session before the money has settled.
            payments.record(s, account_id=payment.account_id, provider=PROVIDER, provider_ref=obj["id"], status="pending")
            return "pending"
        metadata = obj.get("metadata") or {}
        amount_micros = int(obj.get("amount_total") or 0) * MICROS_PER_CENT
        detail = {"event_id": event_id, "amount_total": obj.get("amount_total"), "currency": obj.get("currency")}
        if obj.get("currency") != "usd" or metadata.get("account_id") != payment.account_id or amount_micros <= 0:
            payments.record(s, account_id=payment.account_id, provider=PROVIDER, provider_ref=obj["id"], status="needs_review", detail=detail)
            return "needs_review"
        payments.record(
            s, account_id=payment.account_id, provider=PROVIDER, provider_ref=obj["id"], status=payment.status,
            tx_hash=obj.get("payment_intent"), detail=detail,
        )
        return "credited" if payments.credit(s, payment, amount_micros, "Card top-up") else "already_credited"

    def _claw_back(self, s: Session, payment_intent: str | None, cents: int, reference: str, description: str) -> str:
        if not payment_intent:
            return "ignored"
        payment = s.scalars(select(Payment).where(Payment.provider == PROVIDER, Payment.tx_hash == payment_intent)).first()
        if payment is None:
            return "ignored"
        entry = ledger.post(
            s, payment.account_id, -int(cents) * MICROS_PER_CENT, kind=ledger.ADJUSTMENT, source=PROVIDER,
            idempotency_key=f"clawback:stripe:{reference}", description=description, allow_overdraft=True,
        )
        payment.status = "needs_review"
        payment.updated_at = time.time()
        return "clawed_back" if entry is not None else "already_clawed_back"
