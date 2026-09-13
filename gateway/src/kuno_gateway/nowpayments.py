"""USDT top-ups through NOWPayments.

A top-up is a NOWPayments invoice for a fixed dollar amount, payable in USDT on TRON or Ethereum,
whose order_id is our payment id. NOWPayments calls back with an IPN signed with HMAC-SHA512 over
the payload's JSON, keys sorted recursively, exactly as JavaScript's JSON.stringify writes it.

An IPN never credits money on its own say-so. For a "finished" payment the gateway re-fetches the
payment from NOWPayments' API and checks status, order, currency and amount before crediting the
invoice amount once. A partial payment is held for review rather than guessed at.

Provider calls happen before any database statement, so no database lock is held while waiting on
the network.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import math
import uuid
from collections.abc import Callable
from decimal import Decimal

import httpx
from sqlalchemy.orm import Session

from . import ledger, payments
from .db import Payment
from .settings import Settings

PROVIDER = "nowpayments"
CURRENCIES = {"tron": "usdttrc20", "ethereum": "usdterc20"}
PENDING = {"waiting", "confirming", "confirmed", "sending"}
CLOSED = {"failed": "failed", "expired": "expired", "refunded": "failed"}
MICROS_PER_CENT = 10_000


class InvalidWebhook(Exception):
    pass


def js_json(value) -> str:
    """JSON as JavaScript's JSON.stringify writes it, with object keys sorted.

    The signature is computed over this exact text, so Python's own formatting (20.0 for 20,
    1e-05 for 0.00001) would reject genuine notifications.
    """
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return "null"
        if value.is_integer() and abs(value) < 1e21:
            return str(int(value))
        if 1e-6 <= abs(value) < 1e21:
            return format(Decimal(repr(value)), "f")
        mantissa, exponent = repr(value).split("e")
        power = int(exponent)
        return f"{mantissa}e{'+' if power > 0 else '-'}{abs(power)}"
    if isinstance(value, str):
        return json.dumps(value, ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ",".join(js_json(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ",".join(json.dumps(k, ensure_ascii=False) + ":" + js_json(value[k]) for k in sorted(value)) + "}"
    raise TypeError(f"can't serialize {type(value).__name__}")


def ipn_signature(payload: dict, secret: str) -> str:
    return hmac.new(secret.strip().encode(), js_json(payload).encode(), hashlib.sha512).hexdigest()


def verify_ipn(payload: dict, signature: str | None, secret: str) -> bool:
    return bool(signature) and hmac.compare_digest(ipn_signature(payload, secret), signature.strip().lower())


class NowPayments:
    def __init__(self, settings: Settings, http: Callable[..., dict] | None = None):
        self.settings = settings
        self._http = http or self._request

    @property
    def enabled(self) -> bool:
        return bool(self.settings.nowpayments_api_key and self.settings.nowpayments_ipn_secret)

    @property
    def base_url(self) -> str:
        return "https://api-sandbox.nowpayments.io" if self.settings.nowpayments_sandbox else "https://api.nowpayments.io"

    def _request(self, method: str, path: str, body: dict | None = None) -> dict:
        response = httpx.request(
            method, self.base_url + path, json=body, timeout=20.0,
            headers={"x-api-key": self.settings.nowpayments_api_key or "", "user-agent": "kunoworld-gateway"},
        )
        response.raise_for_status()
        return response.json()

    def start(self, s: Session, account_id: str, amount_usd: float, network: str, ipn_url: str) -> Payment:
        """Creates the invoice, then records the pending top-up. The caller commits."""
        if not self.enabled:
            raise payments.PaymentsUnavailable("USDT payments aren't set up on this gateway.")
        currency = CURRENCIES.get(network)
        if currency is None:
            raise payments.InvalidAmount("Choose TRON or Ethereum for USDT.")
        micros = payments.check_amount(self.settings, amount_usd, self.settings.nowpayments_min_usd)
        if micros % MICROS_PER_CENT:
            raise payments.InvalidAmount("USDT top-ups are in whole cents.")
        payment_id = uuid.uuid4().hex
        site = self.settings.site_url.rstrip("/")
        invoice = self._http(
            "POST",
            "/v1/invoice",
            {
                "price_amount": float(Decimal(micros) / Decimal(1_000_000)),
                "price_currency": "usd",
                "pay_currency": currency,
                "order_id": payment_id,
                "order_description": "KunoWorld credit",
                "ipn_callback_url": ipn_url,
                "success_url": f"{site}/account?topup=success",
                "cancel_url": f"{site}/account?topup=canceled",
                # The customer pays the quoted USDT amount; the rate doesn't drift under them.
                "is_fixed_rate": True,
                "is_fee_paid_by_user": False,
            },
        )
        return payments.record(
            s, account_id=account_id, provider=PROVIDER, provider_ref=f"invoice:{invoice['id']}", status="created",
            id=payment_id, requested_usd_micros=micros, asset=currency, chain=network, checkout_url=invoice.get("invoice_url"),
            detail={"invoice_id": invoice["id"]},
        )

    def handle_ipn(self, s: Session, raw: bytes, signature: str | None) -> str:
        """Applies one verified IPN. Returns what happened, for the response and logs."""
        if not self.enabled:
            raise payments.PaymentsUnavailable("USDT payments aren't set up on this gateway.")
        try:
            payload = json.loads(raw)
        except ValueError:
            raise InvalidWebhook("not JSON") from None
        if not isinstance(payload, dict) or not verify_ipn(payload, signature, self.settings.nowpayments_ipn_secret):
            raise InvalidWebhook("signature doesn't match")

        status = payload.get("payment_status")
        np_payment_id = payload.get("payment_id")
        # Money only moves on NOWPayments' own record of the payment, fetched here.
        fetched = self._http("GET", f"/v1/payment/{np_payment_id}") if status == "finished" else None

        payment = s.get(Payment, str(payload.get("order_id") or ""))
        if payment is None or payment.provider != PROVIDER:
            return "ignored"
        detail = {k: payload.get(k) for k in ("payment_id", "payment_status", "pay_currency", "pay_amount", "actually_paid", "actually_paid_at_fiat", "outcome_amount")}
        keep = dict(account_id=payment.account_id, provider=PROVIDER, provider_ref=payment.provider_ref)

        if status == "finished":
            problems = []
            if fetched.get("payment_status") != "finished":
                problems.append(f"API status is {fetched.get('payment_status')}")
            if str(fetched.get("order_id")) != payment.id:
                problems.append("order doesn't match")
            if str(fetched.get("price_currency", "")).lower() != "usd":
                problems.append("price currency isn't USD")
            if ledger.to_micros(fetched.get("price_amount") or 0) != payment.requested_usd_micros:
                problems.append("amount doesn't match the invoice")
            if problems:
                if payment.status != "credited":
                    payments.record(s, status="needs_review", detail={**detail, "problems": problems}, **keep)
                return "needs_review"
            if payment.status == "credited":
                return "already_credited"
            payments.record(s, status=payment.status, tx_hash=str(np_payment_id), asset_amount=str(fetched.get("actually_paid")), detail=detail, **keep)
            return "credited" if payments.credit(s, payment, payment.requested_usd_micros, "USDT top-up") else "already_credited"

        if payment.status == "credited":
            return "already_credited"
        if status == "partially_paid":
            payments.record(s, status="needs_review", detail={**detail, "problems": ["partially paid"]}, **keep)
            return "needs_review"
        if status in CLOSED:
            payments.record(s, status=CLOSED[status], detail=detail, **keep)
            return "closed"
        if status in PENDING:
            payments.record(s, status="pending", detail=detail, **keep)
            return "pending"
        return "ignored"
