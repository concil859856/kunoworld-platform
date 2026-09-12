"""Owner controls. The model switch must be signed with the owner key; the admin
token alone cannot change it."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from kuno_protocol.switch import SignedSwitch

from .auth import gw, require_admin

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
