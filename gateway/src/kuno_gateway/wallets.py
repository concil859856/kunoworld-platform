"""Linking a Bittensor coldkey to an account.

TAO and alpha payments all go to one treasury coldkey, so a deposit is attributed by who sent it.
That only works if a coldkey is proven to belong to exactly one account first: the owner signs a
one-time challenge naming the account, the coldkey and an expiry. A plain transfer can't carry a
memo, so there is no other reliable way to tell whose money arrived.
"""

from __future__ import annotations

import secrets
import time
import uuid
from datetime import datetime, timezone

import sr25519
from scalecodec.utils.ss58 import ss58_decode
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import WalletChallenge, WalletLink

CHALLENGE_TTL_S = 10 * 60
BITTENSOR_SS58_FORMAT = 42


class InvalidWallet(ValueError):
    pass


class WalletConflict(Exception):
    """The coldkey is already linked to a different account."""


def public_key(address: str) -> bytes:
    try:
        key = bytes.fromhex(ss58_decode(address.strip(), valid_ss58_format=BITTENSOR_SS58_FORMAT).removeprefix("0x"))
    except Exception:
        raise InvalidWallet("That isn't a Bittensor coldkey address.") from None
    if len(key) != 32:
        raise InvalidWallet("That isn't a Bittensor coldkey address.")
    return key


def challenge_message(account_id: str, address: str, nonce: str, expires_at: float, site: str) -> str:
    expires = datetime.fromtimestamp(expires_at, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    return (
        "KunoWorld: link this Bittensor coldkey to my account.\n\n"
        f"Account: {account_id}\nColdkey: {address}\nNonce: {nonce}\nExpires: {expires}\nSite: {site}"
    )


def verify_signature(address: str, message: str, signature: str) -> bool:
    """Accepts a signature over the message itself (btcli) or over <Bytes>message</Bytes> (browser wallets)."""
    try:
        sig = bytes.fromhex(signature.strip().removeprefix("0x"))
    except ValueError:
        return False
    if len(sig) != 64:
        return False
    key = public_key(address)
    body = message.encode()
    return any(sr25519.verify(sig, candidate, key) for candidate in (body, b"<Bytes>" + body + b"</Bytes>"))


def create_challenge(s: Session, account_id: str, address: str, site: str) -> WalletChallenge:
    address = address.strip()
    public_key(address)
    now = time.time()
    expires_at = now + CHALLENGE_TTL_S
    challenge = WalletChallenge(
        id=uuid.uuid4().hex, account_id=account_id, address=address,
        message=challenge_message(account_id, address, secrets.token_hex(16), expires_at, site), expires_at=expires_at,
    )
    s.add(challenge)
    s.flush()
    return challenge


def redeem(s: Session, account_id: str, challenge_id: str, signature: str) -> WalletLink:
    """Links the coldkey if the challenge is this account's, unexpired, unused, and properly signed."""
    now = time.time()
    challenge = s.get(WalletChallenge, challenge_id, with_for_update=True)
    if challenge is None or challenge.account_id != account_id or challenge.used_at is not None or challenge.expires_at <= now:
        raise InvalidWallet("That link request has expired or was already used. Start again.")
    if not verify_signature(challenge.address, challenge.message, signature):
        raise InvalidWallet("The signature doesn't match that coldkey and message.")
    challenge.used_at = now
    existing = link_for_address(s, challenge.address)
    if existing is not None:
        if existing.account_id != account_id:
            raise WalletConflict("That coldkey is already linked to another KunoWorld account.")
        return existing
    link = WalletLink(id=uuid.uuid4().hex, account_id=account_id, address=challenge.address, created_at=now)
    s.add(link)
    s.flush()
    return link


def link_for_address(s: Session, address: str) -> WalletLink | None:
    return s.scalars(select(WalletLink).where(WalletLink.address == address)).first()


def wallet_json(link: WalletLink) -> dict:
    return {"address": link.address, "linked_at": link.created_at}
