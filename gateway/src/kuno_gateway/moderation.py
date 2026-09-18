"""Account safety: strikes, restrictions, private-mode eligibility, the moderation queue and the operator audit log.

Strikes never carry content. A job that fails with `safety_blocked` is one strike, whichever mode it ran in, unless
the blocked text was written by a model inside the enclave rather than by the customer (state.finish_job's `strike`),
and a Standard upload that matches a blocked hash is another. The rules in `Settings.strike_rules` turn
strikes into restrictions; operators can add, lift and escalate restrictions by hand.
"""

from __future__ import annotations

import json
import time
import uuid

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from . import ledger
from .db import Account, LedgerEntry
from .db_moderation import AccountRestriction, ModerationItem, OperatorAction, Strike
from .settings import Settings

# The accounts the gateway seeds for development and validators (GatewayState._seed_accounts).
SEEDED_ACCOUNT_IDS = ("dev", "validator")
# restricted_until for a restriction with no end: until an operator lifts it (9999-12-31T23:59:59Z).
INDEFINITE_UNTIL = 253402300799.0

DAY = 86400

PRIORITY = {"csam": 100, "sexual_minor": 100, "nonconsensual_intimate": 60, "violent_extremism": 60}
DEFAULT_REPORT_PRIORITY = 20
UPLOAD_MATCH_PRIORITY = 90
ACCOUNT_REVIEW_PRIORITY = 70

# Eligibility reasons, stable codes the site and SDKs translate.
NO_VERIFIED_PAYMENT = "no_verified_payment"
ACCOUNT_RESTRICTED = "account_restricted"
TOO_MANY_STRIKES = "too_many_strikes"


def new_id() -> str:
    return uuid.uuid4().hex


def is_exempt(account: Account) -> bool:
    """Validators, and the seeded dev and validator accounts, skip eligibility and automatic restrictions."""
    return bool(account.is_validator) or (account.owner_user_id is None and account.id in SEEDED_ACCOUNT_IDS)


# ------------------------------------------------------------------ strikes and restrictions


def strike_counts(s: Session, account_id: str, now: float) -> dict[str, int]:
    def since(seconds: float) -> int:
        # Voided strikes (overturned on appeal, appeals.py) don't count.
        return s.scalar(
            select(func.count()).select_from(Strike).where(
                Strike.account_id == account_id, Strike.created_at > now - seconds, Strike.voided_at.is_(None)
            )
        ) or 0

    return {"24h": since(DAY), "7d": since(7 * DAY), "30d": since(30 * DAY)}


def active_restriction(s: Session, account_id: str, now: float) -> AccountRestriction | None:
    """The longest-running restriction in force: an indefinite one first, else the latest end."""
    rows = s.scalars(
        select(AccountRestriction).where(
            AccountRestriction.account_id == account_id,
            AccountRestriction.lifted_at.is_(None),
            or_(AccountRestriction.until.is_(None), AccountRestriction.until > now),
        )
    ).all()
    if not rows:
        return None
    return max(rows, key=lambda r: (r.until is None, r.until or 0.0, r.kind == "ban"))


def restricted_until(restriction: AccountRestriction | None) -> float | None:
    if restriction is None:
        return None
    return INDEFINITE_UNTIL if restriction.until is None else restriction.until


def restrict(
    s: Session, account_id: str, *, until: float | None, reason: str | None, source: str, by: str | None,
    kind: str = "restrict", now: float | None = None,
) -> AccountRestriction:
    row = AccountRestriction(
        id=new_id(), account_id=account_id, kind=kind, until=until, reason=reason, source=source, created_by=by,
        created_at=time.time() if now is None else now,
    )
    s.add(row)
    s.flush()
    return row


def lift_restrictions(s: Session, account_id: str, by: str, now: float) -> int:
    rows = s.scalars(
        select(AccountRestriction).where(AccountRestriction.account_id == account_id, AccountRestriction.lifted_at.is_(None))
    ).all()
    for row in rows:
        row.lifted_at, row.lifted_by = now, by
    return len(rows)


def record_strike(
    s: Session, settings: Settings, account_id: str, reason: str, *, job_id: str | None = None, now: float | None = None,
) -> Strike | None:
    """Adds one strike (once per job and reason) and applies the strike rules. Returns None if already counted."""
    now = time.time() if now is None else now
    if job_id is not None and s.scalars(select(Strike.id).where(Strike.job_id == job_id, Strike.reason == reason)).first():
        return None
    strike = Strike(id=new_id(), account_id=account_id, job_id=job_id, reason=reason, created_at=now)
    s.add(strike)
    s.flush()
    account = s.get(Account, account_id)
    if account is None or is_exempt(account):
        return strike

    triggered: list[tuple[float | None, int, int]] = []
    for count, window_s, length_s in settings.strike_rules:
        n = s.scalar(
            select(func.count()).select_from(Strike).where(
                Strike.account_id == account_id, Strike.created_at > now - window_s, Strike.voided_at.is_(None)
            )
        ) or 0
        if n >= count:
            triggered.append((None if length_s is None else now + length_s, n, window_s))
    if not triggered:
        return strike
    # The strongest rule wins: no end beats any end, then the latest end.
    until, n, window_s = max(triggered, key=lambda t: (t[0] is None, t[0] or 0.0))
    current = active_restriction(s, account_id, now)
    if current is not None and (current.until is None or (until is not None and current.until >= until)):
        return strike
    restrict(
        s, account_id, until=until, source="strikes", by=None, now=now,
        reason=f"{n} safety strikes in {window_s // 3600} h" if window_s < 2 * DAY else f"{n} safety strikes in {window_s // DAY} days",
    )
    if until is None:
        add_item(s, "account_review", ACCOUNT_REVIEW_PRIORITY, account_id=account_id, now=now,
                 detail={"strikes": n, "window_s": window_s})
    return strike


# ------------------------------------------------------------------ eligibility


def has_verified_funding(s: Session, account_id: str) -> bool:
    """A credited top-up (card, USDT, TAO, alpha) or a positive operator credit."""
    return s.scalars(
        select(LedgerEntry.id)
        .where(
            LedgerEntry.account_id == account_id,
            LedgerEntry.amount_micros > 0,
            or_(
                LedgerEntry.kind == ledger.TOPUP,
                # "migration" is an opening balance an operator set before the ledger existed.
                and_(LedgerEntry.kind == ledger.ADJUSTMENT, LedgerEntry.source.in_(("admin", "migration"))),
            ),
        )
        .limit(1)
    ).first() is not None


def private_eligibility(s: Session, settings: Settings, account: Account, now: float) -> tuple[bool, list[str]]:
    if is_exempt(account):
        return True, []
    reasons = []
    if settings.private_requires_payment and not has_verified_funding(s, account.id):
        reasons.append(NO_VERIFIED_PAYMENT)
    if active_restriction(s, account.id, now) is not None:
        reasons.append(ACCOUNT_RESTRICTED)
    if strike_counts(s, account.id, now)["30d"] >= settings.private_max_strikes_30d:
        reasons.append(TOO_MANY_STRIKES)
    return not reasons, reasons


def eligibility_json(s: Session, settings: Settings, account: Account, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    eligible, reasons = private_eligibility(s, settings, account, now)
    counts = strike_counts(s, account.id, now)
    return {
        "private_mode": {"eligible": eligible, "reasons": reasons},
        "restricted_until": restricted_until(active_restriction(s, account.id, now)),
        "strikes_24h": counts["24h"],
        "strikes_7d": counts["7d"],
    }


def enforce(s: Session, settings: Settings, account: Account, privacy: str, now: float | None = None) -> None:
    """Raises the contract's 403s: account_restricted in either mode, private_mode_not_eligible for private jobs."""
    now = time.time() if now is None else now
    restriction = active_restriction(s, account.id, now)
    if restriction is not None:
        until = restricted_until(restriction)
        raise HTTPException(403, {
            "code": "account_restricted",
            "message": "This account can't start videos right now." if restriction.until is None
            else "This account can't start videos until its restriction ends.",
            "restricted_until": until,
        })
    if privacy == "private":
        eligible, reasons = private_eligibility(s, settings, account, now)
        if not eligible:
            raise HTTPException(403, {
                "code": "private_mode_not_eligible",
                "message": "Private mode needs an account in good standing with a verified payment. Standard mode is available.",
                "reasons": reasons,
            })


# ------------------------------------------------------------------ queue and audit log


def add_item(
    s: Session, kind: str, priority: int, *, report_id: str | None = None, job_id: str | None = None,
    account_id: str | None = None, detail: dict | None = None, now: float | None = None,
) -> ModerationItem:
    item = ModerationItem(
        id=new_id(), kind=kind, status="open", priority=priority, report_id=report_id, job_id=job_id,
        account_id=account_id, detail=json.dumps(detail, separators=(",", ":")) if detail else None,
        created_at=time.time() if now is None else now,
    )
    s.add(item)
    return item


def log_action(
    s: Session, operator: str, action: str, target_kind: str, target_id: str, reason: str | None,
    detail: dict | None = None, now: float | None = None,
) -> OperatorAction:
    row = OperatorAction(
        id=new_id(), operator=operator, action=action, target_kind=target_kind, target_id=target_id, reason=reason,
        detail=json.dumps(detail, separators=(",", ":")) if detail else None,
        created_at=time.time() if now is None else now,
    )
    s.add(row)
    return row
