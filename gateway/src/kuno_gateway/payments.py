"""Top-ups: money arriving from outside, credited to the ledger exactly once.

Every payment method records a Payment keyed by (provider, provider_ref) — a Stripe Checkout
session, a NOWPayments payment, or a chain event — and credits the ledger under a key derived from
that same reference. However many times a webhook is delivered or a block is reprocessed, the money
lands once.
"""

from __future__ import annotations

import json
import time
import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import ledger
from .db import Payment
from .settings import Settings

PROVIDERS = ledger.PAID_SOURCES


class PaymentsUnavailable(Exception):
    """This payment method isn't configured on this gateway."""


class InvalidAmount(ValueError):
    pass


def check_amount(settings: Settings, amount_usd: float, minimum_usd: float | None = None) -> int:
    """A requested top-up in micro-dollars, inside this gateway's limits."""
    minimum = max(settings.topup_min_usd, minimum_usd or 0.0)
    micros = ledger.to_micros(amount_usd)
    if micros < ledger.to_micros(minimum) or micros > ledger.to_micros(settings.topup_max_usd):
        raise InvalidAmount(f"Top-ups must be between ${minimum:,.2f} and ${settings.topup_max_usd:,.2f}.")
    return micros


def find(s: Session, provider: str, provider_ref: str) -> Payment | None:
    return s.scalars(select(Payment).where(Payment.provider == provider, Payment.provider_ref == provider_ref)).first()


def record(s: Session, *, account_id: str, provider: str, provider_ref: str, status: str, **fields) -> Payment:
    """Creates the payment, or updates it if this provider reference is already known."""
    now = time.time()
    payment = find(s, provider, provider_ref)
    if payment is None:
        payment = Payment(
            id=uuid.uuid4().hex, account_id=account_id, provider=provider, provider_ref=provider_ref,
            status=status, created_at=now, updated_at=now,
        )
        s.add(payment)
    elif payment.status not in ("credited",):
        payment.status = status
    for name, value in fields.items():
        if name == "detail" and value is not None and not isinstance(value, str):
            value = json.dumps(value, default=str, separators=(",", ":"))
        setattr(payment, name, value)
    payment.updated_at = now
    s.flush()
    return payment


def credit(s: Session, payment: Payment, amount_micros: int, description: str) -> bool:
    """Credits the payment's account once. Returns False if it was already credited."""
    if payment.status == "credited":
        return False
    entry = ledger.post(
        s, payment.account_id, amount_micros, kind=ledger.TOPUP, source=payment.provider,
        idempotency_key=f"topup:{payment.provider}:{payment.provider_ref}", description=description,
    )
    now = time.time()
    payment.status = "credited"
    payment.amount_usd_micros = amount_micros
    payment.credited_at = payment.updated_at = now
    return entry is not None


def credit_bonus(s: Session, payment: Payment, credited_micros: int, share: float, description: str) -> bool:
    """Extra credit on a credited payment, `share` of what it credited, rounded down to the micro-dollar.

    It is its own ledger entry (kind `bonus`, key `bonus:{provider}:{reference}`), so it is auditable apart from the
    payment, posts at most once, and never counts as paid money (ledger.paid_share). Returns False if nothing posted.
    """
    micros = int(Decimal(credited_micros) * Decimal(str(share)))
    if micros <= 0:
        return False
    entry = ledger.post(
        s, payment.account_id, micros, kind=ledger.BONUS, source=payment.provider,
        idempotency_key=f"bonus:{payment.provider}:{payment.provider_ref}", description=description,
    )
    return entry is not None


def payment_json(payment: Payment) -> dict:
    return {
        "payment_id": payment.id,
        "provider": payment.provider,
        "status": payment.status,
        "requested_usd": ledger.to_usd(payment.requested_usd_micros) if payment.requested_usd_micros is not None else None,
        "amount_usd": ledger.to_usd(payment.amount_usd_micros) if payment.amount_usd_micros is not None else None,
        "asset": payment.asset,
        "asset_amount": payment.asset_amount,
        "chain": payment.chain,
        "tx_hash": payment.tx_hash,
        "from_address": payment.from_address,
        "rate_usd": payment.rate_usd,
        "checkout_url": payment.checkout_url if payment.status in ("created", "pending") else None,
        "created_at": payment.created_at,
        "credited_at": payment.credited_at,
    }
