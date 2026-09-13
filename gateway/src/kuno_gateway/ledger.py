"""The money ledger.

Every change to an account's balance is an entry here, written in the same transaction as the
balance it changes, so the balance is always the sum of the entries. Amounts are integer USD
micro-dollars: a float can't hold most prices exactly, and a balance that drifts by a fraction
of a cent per job is simply wrong at scale.

Each entry carries an idempotency key, and posting the same key twice changes nothing. That is
what makes a refund, a payment webhook, or a chain event safe to process more than once.
"""

from __future__ import annotations

import time
import uuid
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import Account, LedgerEntry

MICROS_PER_USD = 1_000_000

CHARGE = "charge"
REFUND = "refund"
TOPUP = "topup"
ADJUSTMENT = "adjustment"


class UnknownAccount(Exception):
    pass


class InsufficientBalance(Exception):
    def __init__(self, balance_micros: int, needed_micros: int):
        super().__init__(f"balance {balance_micros} is below {needed_micros}")
        self.balance_micros = balance_micros
        self.needed_micros = needed_micros


class IdempotencyConflict(Exception):
    """The key was already used for a different movement: a different account, amount or kind."""


def to_micros(usd: float | Decimal | str) -> int:
    """Exact conversion: 0.1 + 0.2 dollars is 300 000 micros, not 300 000.0000000001."""
    return int((Decimal(str(usd)) * MICROS_PER_USD).to_integral_value(rounding=ROUND_HALF_UP))


def to_usd(micros: int) -> float:
    return micros / MICROS_PER_USD


def post(
    s: Session,
    account_id: str,
    amount_micros: int,
    *,
    kind: str,
    source: str,
    idempotency_key: str,
    job_id: str | None = None,
    description: str | None = None,
    allow_overdraft: bool = False,
) -> LedgerEntry | None:
    """Posts one entry and moves the balance with it, inside the caller's transaction.

    Returns None when this exact movement has already been posted under this key. Reusing the
    key for a different movement raises IdempotencyConflict rather than silently doing nothing:
    a retry must be identical, and anything else is a bug in the caller. A debit that would
    take the balance below zero raises InsufficientBalance unless the caller allows it.
    """
    existing = s.scalars(select(LedgerEntry).where(LedgerEntry.idempotency_key == idempotency_key)).first()
    if existing is not None:
        if (existing.account_id, existing.amount_micros, existing.kind) != (account_id, amount_micros, kind):
            raise IdempotencyConflict(idempotency_key)
        return None
    account = s.get(Account, account_id, with_for_update=True)
    if account is None:
        raise UnknownAccount(account_id)
    balance = account.balance_micros + amount_micros
    if amount_micros < 0 and balance < 0 and not allow_overdraft:
        raise InsufficientBalance(account.balance_micros, -amount_micros)
    account.balance_micros = balance
    entry = LedgerEntry(
        id=uuid.uuid4().hex,
        account_id=account_id,
        amount_micros=amount_micros,
        kind=kind,
        source=source,
        idempotency_key=idempotency_key,
        job_id=job_id,
        description=description,
        balance_after_micros=balance,
        created_at=time.time(),
    )
    s.add(entry)
    # Flush now so a racing duplicate fails on the unique key inside this transaction.
    s.flush()
    return entry


def entry_json(entry: LedgerEntry) -> dict:
    return {
        "entry_id": entry.id,
        "kind": entry.kind,
        "source": entry.source,
        "amount_usd": to_usd(entry.amount_micros),
        "balance_after_usd": to_usd(entry.balance_after_micros),
        "job_id": entry.job_id,
        "description": entry.description,
        "created_at": entry.created_at,
    }
