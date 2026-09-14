"""Top-ups and the wallets that pay them.

Signed-in account management (listing top-ups, linking coldkeys) uses the web session like the rest
of /v1/me. Payment provider webhooks are authenticated by their own signatures, not by sessions.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Literal

import httpx
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import identity, nowpayments, payments, stripe_payments, wallets
from .auth import SignedIn, gw, require_user
from .db import Payment, WalletLink

log = logging.getLogger("kuno.payments")

router = APIRouter(prefix="/v1", tags=["payments"])


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def _account_id(s, who: SignedIn) -> str:
    account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise _error(409, "no_account", "This user has no account yet. Sign in again.")
    return account.id


@router.get("/payments/config")
async def payment_config(request: Request):
    """Which top-up methods this gateway accepts, and their limits. Public, so the site can render them."""
    st = gw(request).settings
    return {
        "min_usd": st.topup_min_usd,
        "max_usd": st.topup_max_usd,
        "card": {"enabled": bool(st.stripe_secret_key and st.stripe_webhook_secret)},
        "usdt": {
            "enabled": bool(st.nowpayments_api_key and st.nowpayments_ipn_secret),
            "min_usd": max(st.topup_min_usd, st.nowpayments_min_usd),
            "networks": ["tron", "ethereum"],
        },
        "tao": {
            "enabled": bool(st.tao_treasury_address),
            "treasury_address": st.tao_treasury_address,
            "min_tao": st.tao_min_deposit,
            "confirmation": "finalized",
            # Extra credit, as a share of the credited USD.
            "credit_bonus": st.chain_credit_bonus,
        },
        "alpha": {
            "enabled": bool(st.tao_treasury_address and st.alpha_netuids),
            "netuids": st.alpha_netuids,
            "haircut": st.alpha_haircut,
            "max_usd_per_deposit": st.alpha_max_usd_per_deposit,
            "credit_bonus": st.chain_credit_bonus,
        },
    }


@router.get("/me/topups")
async def list_topups(request: Request, who: SignedIn = Depends(require_user), limit: int = 50):
    with gw(request).session() as s:
        account_id = _account_id(s, who)
        rows = s.scalars(
            select(Payment).where(Payment.account_id == account_id).order_by(Payment.created_at.desc()).limit(min(max(limit, 1), 200))
        ).all()
    return [payments.payment_json(p) for p in rows]


# ------------------------------------------------------------------ Bittensor wallets


class WalletChallengeRequest(BaseModel):
    address: str = Field(min_length=40, max_length=64)


class WalletVerifyRequest(BaseModel):
    challenge_id: str = Field(min_length=16, max_length=64)
    signature: str = Field(min_length=128, max_length=132)


@router.get("/me/wallets")
async def list_wallets(request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s:
        account_id = _account_id(s, who)
        links = s.scalars(select(WalletLink).where(WalletLink.account_id == account_id).order_by(WalletLink.created_at)).all()
    return [wallets.wallet_json(link) for link in links]


@router.post("/me/wallets/challenge", status_code=201)
async def wallet_challenge(body: WalletChallengeRequest, request: Request, who: SignedIn = Depends(require_user)):
    state = gw(request)
    with state.session() as s, s.begin():
        account_id = _account_id(s, who)
        try:
            challenge = wallets.create_challenge(s, account_id, body.address, state.settings.site_url)
        except wallets.InvalidWallet as exc:
            raise _error(422, "invalid_wallet", str(exc)) from None
        payload = {"challenge_id": challenge.id, "message": challenge.message, "expires_at": challenge.expires_at}
    return payload


@router.post("/me/wallets/verify", status_code=201)
async def wallet_verify(body: WalletVerifyRequest, request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        account_id = _account_id(s, who)
        try:
            link = wallets.redeem(s, account_id, body.challenge_id, body.signature)
        except wallets.WalletConflict as exc:
            raise _error(409, "wallet_linked_elsewhere", str(exc)) from None
        except wallets.InvalidWallet as exc:
            raise _error(422, "invalid_signature", str(exc)) from None
        payload = wallets.wallet_json(link)
    return payload


@router.delete("/me/wallets/{address}", status_code=204)
async def wallet_unlink(address: str, request: Request, who: SignedIn = Depends(require_user)):
    with gw(request).session() as s, s.begin():
        account_id = _account_id(s, who)
        link = wallets.link_for_address(s, address)
        if link is None or link.account_id != account_id:
            raise _error(404, "not_found", "That coldkey isn't linked to this account.")
        s.delete(link)
    return Response(status_code=204)


# ------------------------------------------------------------------ starting a top-up


class CardTopup(BaseModel):
    amount_usd: float = Field(gt=0, le=1_000_000)


class UsdtTopup(BaseModel):
    amount_usd: float = Field(gt=0, le=1_000_000)
    network: Literal["tron", "ethereum"] = "tron"


async def _start_topup(request: Request, who: SignedIn, starter) -> dict:
    """Runs a provider call and records the payment, off the event loop.

    The session makes no database statement until the provider has answered, so no lock is held
    while waiting on the network.
    """
    state = gw(request)
    with state.session() as s:
        account_id = _account_id(s, who)

    def run() -> dict:
        with state.session() as s, s.begin():
            return payments.payment_json(starter(s, account_id))

    try:
        return await asyncio.to_thread(run)
    except payments.PaymentsUnavailable as exc:
        raise _error(503, "payments_unavailable", str(exc)) from None
    except payments.InvalidAmount as exc:
        raise _error(422, "invalid_amount", str(exc)) from None
    except (stripe.StripeError, httpx.HTTPError):
        log.exception("a payment provider refused to start a top-up")
        raise _error(502, "provider_error", "The payment provider didn't respond. Try again in a moment.") from None


@router.post("/me/topups/card", status_code=201)
async def start_card_topup(body: CardTopup, request: Request, who: SignedIn = Depends(require_user)):
    topups: stripe_payments.StripeTopups = request.app.state.stripe_topups
    return await _start_topup(request, who, lambda s, account_id: topups.start(s, account_id, body.amount_usd))


@router.post("/me/topups/usdt", status_code=201)
async def start_usdt_topup(body: UsdtTopup, request: Request, who: SignedIn = Depends(require_user)):
    provider: nowpayments.NowPayments = request.app.state.nowpayments
    # Behind a proxy the URL the gateway sees can be internal; set KUNO_PUBLIC_API_URL there.
    base = gw(request).settings.public_api_url or str(request.base_url)
    ipn_url = f"{base.rstrip('/')}/v1/webhooks/nowpayments"
    return await _start_topup(request, who, lambda s, account_id: provider.start(s, account_id, body.amount_usd, body.network, ipn_url))


# ------------------------------------------------------------------ provider webhooks


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Authenticated by Stripe's signature. Anything else is refused before it touches money."""
    state = gw(request)
    topups: stripe_payments.StripeTopups = request.app.state.stripe_topups
    raw, signature = await request.body(), request.headers.get("stripe-signature")

    def apply() -> str:
        with state.session() as s, s.begin():
            return topups.handle_webhook(s, raw, signature)

    try:
        outcome = await asyncio.to_thread(apply)
    except stripe_payments.InvalidWebhook:
        raise _error(400, "invalid_signature", "The Stripe signature doesn't verify.") from None
    except payments.PaymentsUnavailable as exc:
        raise _error(503, "payments_unavailable", str(exc)) from None
    return {"received": True, "outcome": outcome}


@router.post("/webhooks/nowpayments")
async def nowpayments_webhook(request: Request):
    """Authenticated by NOWPayments' IPN signature; credit additionally waits on their API."""
    state = gw(request)
    provider: nowpayments.NowPayments = request.app.state.nowpayments
    raw, signature = await request.body(), request.headers.get("x-nowpayments-sig")

    def apply() -> str:
        with state.session() as s, s.begin():
            return provider.handle_ipn(s, raw, signature)

    try:
        outcome = await asyncio.to_thread(apply)
    except nowpayments.InvalidWebhook:
        raise _error(400, "invalid_signature", "The NOWPayments signature doesn't verify.") from None
    except payments.PaymentsUnavailable as exc:
        raise _error(503, "payments_unavailable", str(exc)) from None
    except httpx.HTTPError:
        # A 5xx makes NOWPayments retry the notification later.
        log.exception("couldn't confirm a NOWPayments payment")
        raise _error(502, "provider_error", "Couldn't confirm the payment with NOWPayments yet.") from None
    return {"received": True, "outcome": outcome}
