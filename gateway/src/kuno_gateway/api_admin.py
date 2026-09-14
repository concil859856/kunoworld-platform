"""Admin controls: the model switch (which must also be signed with the owner key), account credits and operator
roles. Every route needs an operator session with the `admin` role (auth.require_operator)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select

from kuno_protocol.switch import SignedSwitch

from . import ledger, moderation, roles
from .auth import gw, operator_name, require_operator
from .db import Account, LedgerEntry, User

router = APIRouter(prefix="/admin/v1", tags=["admin"], dependencies=[Depends(require_operator(roles.ADMIN))])


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
    """The tool for support corrections and operator credits. Logged with the operator's email."""
    amount = ledger.to_micros(body.amount_usd)
    if amount == 0:
        raise HTTPException(422, {"code": "invalid_amount", "message": "amount_usd must not be zero."})
    by = operator_name(request)
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
        if entry is not None:
            moderation.log_action(
                s, by, "account.credit", "account", account_id, body.note,
                {"amount_usd": body.amount_usd, "idempotency_key": body.idempotency_key},
            )
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


# ------------------------------------------------------------------ operator roles


class RoleBody(BaseModel):
    email: str = Field(max_length=320)
    role: str = Field(max_length=16)


@router.get("/roles")
async def list_roles(request: Request):
    with gw(request).session() as s:
        return roles.operators(s)


@router.post("/roles", status_code=201)
async def grant_role(body: RoleBody, request: Request):
    by = operator_name(request)
    with gw(request).session() as s, s.begin():
        try:
            user, row, created = roles.grant(s, body.email, body.role, by)
        except roles.RoleError as exc:
            raise HTTPException(422, {"code": exc.code, "message": exc.message}) from None
        return {**roles.role_json(row, user), "granted": created}


@router.delete("/roles")
async def revoke_role(body: RoleBody, request: Request):
    by = operator_name(request)
    with gw(request).session() as s, s.begin():
        try:
            row = roles.revoke(s, body.email, body.role, by)
        except roles.RoleError as exc:
            raise HTTPException(422, {"code": exc.code, "message": exc.message}) from None
        if row is None:
            raise HTTPException(404, {"code": "not_found", "message": "That user doesn't hold this role."})
        return roles.role_json(row, s.get(User, row.user_id))
