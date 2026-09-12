from __future__ import annotations

import hmac
import time

from fastapi import HTTPException, Request
from sqlalchemy import select

from kuno_protocol.canonical import b64d
from kuno_protocol.crypto import request_signature_message, verify_signature

from .db import Account, Enclave
from .state import GatewayState, hash_api_key

MAX_CLOCK_SKEW_S = 120


def gw(request: Request) -> GatewayState:
    return request.app.state.gw


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, {"code": "unauthorized", "message": "Send your API key as 'Authorization: Bearer <key>'."})
    return header[7:].strip()


async def require_account(request: Request) -> Account:
    key_hash = hash_api_key(_bearer(request))
    with gw(request).session() as s:
        account = s.scalars(select(Account).where(Account.api_key_hash == key_hash)).first()
    if account is None:
        raise HTTPException(401, {"code": "unauthorized", "message": "Unknown API key."})
    return account


async def require_validator(request: Request) -> Account:
    account = await require_account(request)
    if not account.is_validator:
        raise HTTPException(403, {"code": "forbidden", "message": "This endpoint is for registered validators."})
    return account


async def require_admin(request: Request) -> None:
    expected = gw(request).settings.admin_token
    if not expected or not hmac.compare_digest(_bearer(request), expected):
        raise HTTPException(403, {"code": "forbidden", "message": "Admin token required."})


async def verify_enclave_signature(request: Request, signing_public_key: bytes) -> bytes:
    """Checks the X-Kuno-Signature header; returns the raw body."""
    body = await request.body()
    timestamp = request.headers.get("x-kuno-timestamp", "")
    signature = request.headers.get("x-kuno-signature", "")
    try:
        skew = abs(time.time() - int(timestamp))
        sig = b64d(signature)
    except ValueError:
        raise HTTPException(401, {"code": "bad_signature", "message": "Missing or malformed enclave signature."}) from None
    if skew > MAX_CLOCK_SKEW_S:
        raise HTTPException(401, {"code": "clock_skew", "message": "Request timestamp is too far from server time."})
    path = request.url.path + (f"?{request.url.query}" if request.url.query else "")
    if not verify_signature(signing_public_key, sig, request_signature_message(request.method, path, timestamp, body)):
        raise HTTPException(401, {"code": "bad_signature", "message": "Enclave signature does not verify."})
    return body


async def require_enclave(request: Request) -> tuple[Enclave, bytes]:
    enclave_id = request.headers.get("x-kuno-enclave", "")
    with gw(request).session() as s:
        enclave = s.get(Enclave, enclave_id)
    if enclave is None:
        raise HTTPException(401, {"code": "unknown_enclave", "message": "Register the enclave with fresh attestation first."})
    if enclave.status == "revoked":
        raise HTTPException(403, {"code": "revoked", "message": "This enclave has been revoked."})
    body = await verify_enclave_signature(request, b64d(enclave.signing_public_key))
    return enclave, body
