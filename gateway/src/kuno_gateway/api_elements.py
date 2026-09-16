"""Elements routes, `/v1/elements` (ELEMENTS.md). The job API's credentials: an API key or the web session.

Everything stored is sealed by the customer's browser or program (elements.py). Writes are rate-limited per account;
reads are the owner's only, and an Element of another account answers `404` like one that doesn't exist. Nothing here is
written to the operator audit log: nothing here is content anyone at KunoWorld can open.
"""

from __future__ import annotations

import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError

from . import byte_ranges, elements
from .auth import gw, require_account
from .db import Account
from .db_elements import Element
from .key_vault import VaultError

router = APIRouter(prefix="/v1/elements", tags=["elements"])

NO_STORE = {"cache-control": "no-store"}


def _http(exc: VaultError) -> HTTPException:
    return HTTPException(exc.status, {"code": exc.code, "message": exc.message, **exc.extra}, headers=NO_STORE)


def _not_found() -> HTTPException:
    return HTTPException(404, {"code": "not_found", "message": "No such Element."}, headers=NO_STORE)


def _check_write_rate(request: Request, account: Account) -> None:
    state = gw(request)
    if not state.limiter.allow(f"element-writes:{account.id}", state.settings.element_writes_per_minute, 60):
        raise HTTPException(
            429, {"code": "rate_limited", "message": "Too many changes to Elements in the last minute. Wait a moment and try again."},
        )


class ElementPut(BaseModel):
    """Shapes only; elements.put checks the values. Unknown fields are refused, so nothing readable rides along."""

    model_config = ConfigDict(extra="forbid")

    # The key sync generation the Elements key came from: the vault's current `master_key_id`.
    master_key_id: str
    # None to create; the revision being replaced otherwise.
    expected_revision: int | None = Field(default=None, ge=1)
    wrapped_key: str | None = None
    meta: str
    # Uploads from POST /v1/blobs, in order. Omitted on a replacement that keeps the files.
    file_blob_ids: list[str] | None = Field(default=None, max_length=16)
    # The uploader affirms the Elements rules on every write (elements.RULES).
    affirm_rules: bool = False


@router.get("")
async def list_elements(
    request: Request, response: Response, account: Account = Depends(require_account), cursor: str | None = None,
    limit: int = elements.PAGE_DEFAULT,
):
    """A page of the account's Elements, ordered by id, with `master_key_id` (the vault's current generation, or null
    while key sync is off), `count`, `stored_bytes`, `limits` and `next_cursor`."""
    response.headers.update(NO_STORE)
    with gw(request).session() as s:
        return elements.list_json(s, account.id, cursor, limit)


@router.get("/{element_id}")
async def get_element(element_id: str, request: Request, response: Response, account: Account = Depends(require_account)):
    response.headers.update(NO_STORE)
    with gw(request).session() as s:
        row = s.get(Element, (account.id, element_id))
        if row is None:
            raise _not_found()
        return elements.element_json(row, elements.files_of(s, account.id, element_id))


@router.put("/{element_id}")
async def put_element(element_id: str, body: ElementPut, request: Request, response: Response, account: Account = Depends(require_account)):
    """Creates (`201`) or replaces (`200`) an Element. See elements.put for the rules."""
    _check_write_rate(request, account)
    if not body.affirm_rules:
        raise HTTPException(
            422, {"code": "rules_not_affirmed", "message": f"Confirm the Elements rules first: {elements.RULES}"}, headers=NO_STORE,
        )
    state = gw(request)
    try:
        with state.session() as s, s.begin():
            row, files, created, old_objects = elements.put(
                state, s, account.id, element_id, master_key_id=body.master_key_id,
                expected_revision=body.expected_revision, wrapped_key=body.wrapped_key, meta=body.meta,
                file_blob_ids=body.file_blob_ids, now=time.time(),
            )
            payload = elements.element_json(row, files)
    except VaultError as exc:
        raise _http(exc) from None
    except IntegrityError:
        # The same id written from two devices at once, or one upload named by two writes: the first one won.
        raise HTTPException(
            409, {"code": "element_changed", "message": "This Element was just changed from another device. Load it again, then retry."},
            headers=NO_STORE,
        ) from None
    # Only once the replacement is committed: had it rolled back, the old files would still be the Element's.
    elements.discard_objects(state, old_objects)
    response.status_code = 201 if created else 200
    response.headers.update(NO_STORE)
    return payload


@router.delete("/{element_id}", status_code=204)
async def delete_element(element_id: str, request: Request, account: Account = Depends(require_account)):
    """Deletes the Element, its record and its files. Deleting one that isn't there is harmless."""
    _check_write_rate(request, account)
    state = gw(request)
    with state.session() as s, s.begin():
        objects = elements.delete(s, account.id, element_id, time.time())
    elements.discard_objects(state, objects)
    return Response(status_code=204, headers=NO_STORE)


@router.get("/{element_id}/files/{position}")
async def download_file(element_id: str, position: int, request: Request, account: Account = Depends(require_account)):
    """One sealed file, as stored (the client opens it with the element key). Byte ranges work, as on /v1/blobs."""
    state = gw(request)
    with state.session() as s:
        file = elements.file_for(s, account.id, element_id, position)
    if file is None:
        raise _not_found()
    try:
        body = await asyncio.to_thread(byte_ranges.StoredBlob, state.blobs, file.blob_id)
    except KeyError:
        raise _not_found() from None
    return byte_ranges.serve(
        request, body, media_type="application/octet-stream", headers=NO_STORE, etag=byte_ranges.strong_etag(file.sha256),
    )
