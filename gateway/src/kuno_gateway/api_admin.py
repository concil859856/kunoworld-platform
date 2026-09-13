"""Owner controls. The model switch must be signed with the owner key; the admin
token alone cannot change it."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from kuno_protocol.switch import SignedSwitch

from . import ledger
from .auth import gw, require_admin
from .db import Account, LedgerEntry

router = APIRouter(prefix="/admin/v1", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/switch")
async def get_switch(request: Request):
    return gw(request).switch.model_dump(mode="json")


@router.put("/switch")
async def put_switch(signed: SignedSwitch, request: Request):
    state = gw(request)
    if state.owner_public_key is None:
        raise HTTPException(503, {"code": "no_owner_key", "message": "Gateway has no owner public key configured."})
    if not signed.verify(state.owner_public_key):
        raise HTTPException(403, {"code": "bad_signature", "message": "Switch config is not signed by the owner key."})
    if signed.config.issued_at <= state.switch.config.issued_at and state.switch.signature is not None:
        raise HTTPException(409, {"code": "stale_config", "message": "issued_at must be newer than the current switch."})
    state.set_switch(signed)
    return signed.model_dump(mode="json")


class CreditRequest(BaseModel):
    # Positive adds credit; negative removes it, but never below zero.
    amount_usd: float
    # Makes the call safe to retry: the same key posts once.
    idempotency_key: str = Field(min_length=8, max_length=160)
    note: str | None = Field(default=None, max_length=500)


@router.post("/accounts/{account_id}/credits")
async def credit_account(account_id: str, body: CreditRequest, request: Request):
    """The only way to add money until payment providers land, and the tool for support corrections."""
    amount = ledger.to_micros(body.amount_usd)
    if amount == 0:
        raise HTTPException(422, {"code": "invalid_amount", "message": "amount_usd must not be zero."})
    with gw(request).session() as s, s.begin():
        try:
            entry = ledger.post(
                s, account_id, amount, kind=ledger.ADJUSTMENT, source="admin",
                idempotency_key=f"admin:{account_id}:{body.idempotency_key}", description=body.note,
            )
        except ledger.UnknownAccount:
            raise HTTPException(404, {"code": "not_found", "message": "No such account."}) from None
        except ledger.InsufficientBalance:
            raise HTTPException(409, {"code": "insufficient_balance", "message": "That would take the balance below zero."}) from None
        except ledger.IdempotencyConflict:
            raise HTTPException(
                409, {"code": "idempotency_conflict", "message": "That key was already used for a different amount."}
            ) from None
        balance = s.get(Account, account_id).balance_micros
    return {"account_id": account_id, "posted": entry is not None, "balance_usd": ledger.to_usd(balance)}


@router.get("/accounts/{account_id}")
async def get_account(account_id: str, request: Request, limit: int = 50):
    with gw(request).session() as s:
        account = s.get(Account, account_id)
        if account is None:
            raise HTTPException(404, {"code": "not_found", "message": "No such account."})
        entries = s.scalars(
            select(LedgerEntry)
            .where(LedgerEntry.account_id == account_id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(min(max(limit, 1), 200))
        ).all()
    return {
        "account_id": account.id,
        "name": account.name,
        "balance_usd": ledger.to_usd(account.balance_micros),
        "entries": [ledger.entry_json(e) for e in entries],
    }
