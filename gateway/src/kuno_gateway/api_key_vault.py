"""Key sync routes, `/v1/me/keyvault` (STANDARD_MODE.md, "Key sync"). Web session only.

A vault belongs to the person signed in on the website, whose browser does all wrapping and unwrapping (key_vault.py).
API keys get `401` here, like every `/v1/me` route. Nothing is written to the operator audit log: nothing here is content
anyone can open.
"""

from __future__ import annotations

import time
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError

from . import elements, identity, key_vault
from .auth import SignedIn, gw, require_user
from .db_vault import KeyVault
from .key_vault import VaultError

router = APIRouter(prefix="/v1/me/keyvault", tags=["key-vault"])

NO_STORE = {"cache-control": "no-store"}


def _http(exc: VaultError) -> HTTPException:
    return HTTPException(exc.status, {"code": exc.code, "message": exc.message, **exc.extra})


def _account_id(request: Request, who: SignedIn) -> str:
    with gw(request).session() as s:
        account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise HTTPException(409, {"code": "no_account", "message": "This user has no account yet. Sign in again."})
    return account.id


class UnlockerIn(BaseModel):
    """Shapes only; key_vault.check_unlocker checks the values. Unknown fields are refused, so no key rides along."""

    model_config = ConfigDict(extra="forbid")

    unlocker_id: str
    kind: Literal["recovery_code", "passkey"]
    label: str | None = None
    params: dict[str, Any]
    wrapped_master_key: str

    def checked(self) -> key_vault.Unlocker:
        return key_vault.check_unlocker(self.unlocker_id, self.kind, self.label, self.params, self.wrapped_master_key)


class VaultCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    master_key_id: str
    unlockers: list[UnlockerIn] = Field(min_length=1, max_length=key_vault.MAX_UNLOCKERS)


class UnlockerAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")

    master_key_id: str
    unlocker: UnlockerIn


class JobKeyPut(BaseModel):
    model_config = ConfigDict(extra="forbid")

    master_key_id: str
    wrapped: str


class RotatedJobKey(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str = Field(max_length=36)
    wrapped: str


class RotatedElementKey(BaseModel):
    model_config = ConfigDict(extra="forbid")

    element_id: str = Field(max_length=32)
    wrapped_key: str


class VaultRotate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_version: int = Field(ge=1)
    master_key_id: str
    unlockers: list[UnlockerIn] = Field(min_length=1, max_length=key_vault.MAX_UNLOCKERS)
    job_keys: list[RotatedJobKey] = Field(default_factory=list, max_length=key_vault.MAX_JOB_KEYS)
    # Every Element's key, re-wrapped under the Elements key of the new master key (ELEMENTS.md).
    element_keys: list[RotatedElementKey] = Field(default_factory=list, max_length=elements.MAX_ELEMENTS)


@router.get("")
async def get_vault(
    request: Request, response: Response, who: SignedIn = Depends(require_user), cursor: str | None = None,
    limit: int = key_vault.PAGE_DEFAULT,
):
    """The vault, its unlockers, and a page of wrapped job keys (`next_cursor` continues). `404 no_vault` when key sync is off."""
    account_id = _account_id(request, who)
    response.headers.update(NO_STORE)
    with gw(request).session() as s:
        vault = s.get(KeyVault, account_id)
        if vault is None:
            raise HTTPException(404, {"code": "no_vault", "message": "Key sync isn't set up for this account."}, headers=NO_STORE)
        return key_vault.vault_json(s, vault, cursor, limit)


@router.post("", status_code=201)
async def create_vault(body: VaultCreate, request: Request, who: SignedIn = Depends(require_user)):
    account_id = _account_id(request, who)
    try:
        unlockers = [u.checked() for u in body.unlockers]
        with gw(request).session() as s, s.begin():
            vault = key_vault.create(s, account_id, body.master_key_id, unlockers, time.time())
            return key_vault.vault_json(s, vault, limit=0)
    except VaultError as exc:
        raise _http(exc) from None
    except IntegrityError:
        # Two devices set up key sync at once; the first one won.
        raise HTTPException(409, {"code": "vault_exists", "message": "Key sync is already set up for this account. Unlock it instead."}) from None


@router.delete("", status_code=204)
async def delete_vault(request: Request, who: SignedIn = Depends(require_user)):
    """Turns key sync off: the vault, its unlockers and every wrapped job key are deleted. Keys on devices stay.

    Refused while the account has Elements: their keys come from the master key, so turning key sync off would leave them
    unopenable everywhere. The customer deletes them first. (Closing the account deletes both.)"""
    account_id = _account_id(request, who)
    with gw(request).session() as s, s.begin():
        held = elements.count(s, account_id)
        if held:
            raise HTTPException(
                409,
                {"code": "elements_exist", "count": held, "message": (
                    f"Your {held} Element{'s are' if held != 1 else ' is'} encrypted with key sync's keys, so turning it off "
                    "would lock them for good. Delete your Elements first."
                )},
            )
        key_vault.purge_account(s, account_id, time.time())
    return Response(status_code=204)


@router.post("/unlockers", status_code=201)
async def add_unlocker(body: UnlockerAdd, request: Request, who: SignedIn = Depends(require_user)):
    account_id = _account_id(request, who)
    try:
        unlocker = body.unlocker.checked()
        with gw(request).session() as s, s.begin():
            vault = key_vault.add_unlocker(s, account_id, body.master_key_id, unlocker, time.time())
            return {"version": vault.version, "unlocker_id": unlocker.unlocker_id}
    except VaultError as exc:
        raise _http(exc) from None
    except IntegrityError:
        raise HTTPException(409, {"code": "unlocker_exists", "message": "That unlocker_id is already in use. Make a new one."}) from None


@router.delete("/unlockers/{unlocker_id}")
async def remove_unlocker(unlocker_id: str, request: Request, who: SignedIn = Depends(require_user)):
    account_id = _account_id(request, who)
    try:
        with gw(request).session() as s, s.begin():
            vault = key_vault.remove_unlocker(s, account_id, unlocker_id, time.time())
            return {"version": vault.version}
    except VaultError as exc:
        raise _http(exc) from None


@router.put("/job-keys/{job_id}")
async def put_job_key(job_id: str, body: JobKeyPut, request: Request, who: SignedIn = Depends(require_user)):
    account_id = _account_id(request, who)
    try:
        with gw(request).session() as s, s.begin():
            vault, row, created = key_vault.put_job_key(s, account_id, job_id, body.master_key_id, body.wrapped, time.time())
            return {"job_id": row.job_id, "created": created, "version": vault.version, "updated_at": row.updated_at}
    except VaultError as exc:
        raise _http(exc) from None
    except IntegrityError:
        raise HTTPException(409, {"code": "vault_changed", "message": "That key was just stored from another device. Retry."}) from None


@router.delete("/job-keys/{job_id}", status_code=204)
async def delete_job_key(job_id: str, request: Request, who: SignedIn = Depends(require_user)):
    account_id = _account_id(request, who)
    with gw(request).session() as s, s.begin():
        key_vault.delete_job_key(s, account_id, job_id, time.time())
    return Response(status_code=204)


@router.post("/rotate")
async def rotate(body: VaultRotate, request: Request, who: SignedIn = Depends(require_user)):
    """A new master key: every unlocker replaced, every job key re-wrapped in the browser, all in one transaction."""
    account_id = _account_id(request, who)
    try:
        unlockers = [u.checked() for u in body.unlockers]
        with gw(request).session() as s, s.begin():
            vault = key_vault.rotate(
                s, account_id, expected_version=body.expected_version, master_key_id=body.master_key_id, unlockers=unlockers,
                job_keys=[(k.job_id, k.wrapped) for k in body.job_keys],
                element_keys=[(k.element_id, k.wrapped_key) for k in body.element_keys], now=time.time(),
            )
            return key_vault.vault_json(s, vault, limit=0)
    except VaultError as exc:
        raise _http(exc) from None
    except IntegrityError:
        raise HTTPException(409, {"code": "vault_changed", "message": "Your keys changed on another device. Load them again, then rotate."}) from None
