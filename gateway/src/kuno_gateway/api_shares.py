"""Share link routes (STANDARD_MODE.md, "Share links"; shares.py).

* Owner, web session: `POST /v1/me/videos/{job_id}/shares`, `GET /v1/me/shares`, `DELETE /v1/me/shares/{share_id}`.
* Owner, API key or web session (the job API, for the SDKs): `POST /v1/videos/{job_id}/shares`, `GET /v1/account/shares`,
  `DELETE /v1/account/shares/{share_id}`. Same shapes.
* Public, no credential, rate-limited per IP: `GET /v1/shares/{token}` and `GET /v1/shares/{token}/video`.
"""

from __future__ import annotations

import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict

from . import identity, shares, standard_jobs
from .api_auth import _client_ip
from .auth import SignedIn, gw, require_account, require_user
from .db import Account, Enclave, Job
from .db_moderation import StandardJob
from .shares import ShareError
from .vault import StorageKeyMissing, vault

router = APIRouter(prefix="/v1", tags=["shares"])

NO_STORE = {"cache-control": "no-store"}
PUBLIC_HEADERS = {"cache-control": "no-store", "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer"}


def _http(exc: ShareError) -> HTTPException:
    return HTTPException(exc.status, {"code": exc.code, "message": exc.message, **exc.extra})


async def _me_account(request: Request, who: SignedIn = Depends(require_user)) -> Account:
    with gw(request).session() as s:
        account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise HTTPException(409, {"code": "no_account", "message": "This user has no account yet. Sign in again."})
    return account


class ShareCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Unix seconds; null or absent: the link works until revoked.
    expires_at: float | None = None


# ------------------------------------------------------------------ owner


def _create(request: Request, account: Account, job_id: str, body: ShareCreate | None) -> JSONResponse:
    state = gw(request)
    now = time.time()
    try:
        with state.session() as s, s.begin():
            share, token = shares.create(s, account.id, job_id, body.expires_at if body else None, now)
            path = shares.url_path(token)
            payload = {
                **shares.owner_json(s, share, now),
                # Shown only now. A private video's key isn't here: the owner's browser adds it as the fragment #k=...
                "token": token,
                "url_path": path,
                "url": state.settings.site_url.rstrip("/") + path,
            }
    except ShareError as exc:
        raise _http(exc) from None
    return JSONResponse(payload, status_code=201, headers=NO_STORE)


def _list(request: Request, account: Account, job_id: str | None, limit: int) -> JSONResponse:
    with gw(request).session() as s:
        rows = shares.list_for_account(s, account.id, time.time(), job_id=job_id, limit=limit)
    return JSONResponse(rows, headers=NO_STORE)


def _revoke(request: Request, account: Account, share_id: str) -> dict:
    now = time.time()
    try:
        with gw(request).session() as s, s.begin():
            share = shares.revoke(s, account.id, share_id, now)
            return shares.owner_json(s, share, now)
    except ShareError as exc:
        raise _http(exc) from None


@router.post("/me/videos/{job_id}/shares", status_code=201)
async def my_create_share(job_id: str, request: Request, body: ShareCreate | None = None, account: Account = Depends(_me_account)):
    return _create(request, account, job_id, body)


@router.get("/me/shares")
async def my_list_shares(request: Request, job_id: str | None = None, limit: int = 100, account: Account = Depends(_me_account)):
    return _list(request, account, job_id, limit)


@router.delete("/me/shares/{share_id}")
async def my_revoke_share(share_id: str, request: Request, account: Account = Depends(_me_account)):
    return _revoke(request, account, share_id)


@router.post("/videos/{job_id}/shares", status_code=201)
async def create_share(job_id: str, request: Request, body: ShareCreate | None = None, account: Account = Depends(require_account)):
    return _create(request, account, job_id, body)


@router.get("/account/shares")
async def list_shares(request: Request, job_id: str | None = None, limit: int = 100, account: Account = Depends(require_account)):
    return _list(request, account, job_id, limit)


@router.delete("/account/shares/{share_id}")
async def revoke_share(share_id: str, request: Request, account: Account = Depends(require_account)):
    return _revoke(request, account, share_id)


# ------------------------------------------------------------------ public


def _limit(request: Request) -> None:
    state = gw(request)
    per_minute = getattr(state.settings, "share_views_per_minute_per_ip", 60)
    if not state.limiter.allow(shares.rate_key(state, _client_ip(request)), per_minute, 60):
        raise HTTPException(429, {"code": "rate_limited", "message": "Too many requests from this network. Try again in a minute."}, headers=PUBLIC_HEADERS)


def _not_found() -> HTTPException:
    return HTTPException(404, {"code": "not_found", "message": "This link isn't valid."}, headers=PUBLIC_HEADERS)


def _gone() -> HTTPException:
    # One answer for revoked, expired, deleted, removed, held and closed: a link never reveals which.
    return HTTPException(410, {"code": "share_unavailable", "message": shares.PUBLIC_GONE_MESSAGE}, headers=PUBLIC_HEADERS)


def _active_share(request: Request, token: str):
    """(share, job, enclave, standard row) for a working link, else 404 or 410."""
    now = time.time()
    with gw(request).session() as s:
        share = shares.find(s, token)
        if share is None:
            raise _not_found()
        job = s.get(Job, share.job_id)
        if shares.status(s, share, now, job) != shares.ACTIVE:
            raise _gone()
        enclave = s.get(Enclave, job.enclave_id)
        row = s.get(StandardJob, job.id) if share.privacy == "standard" else None
    return share, job, enclave, row


@router.get("/shares/{token}")
async def view_share(token: str, request: Request):
    _limit(request)
    share, job, enclave, _ = _active_share(request, token)
    return JSONResponse(shares.public_json(share, job, enclave), headers=PUBLIC_HEADERS)


@router.get("/shares/{token}/video")
async def share_video(token: str, request: Request):
    """Standard: the video, decrypted from at-rest storage. Private: the sealed output blob, which only the key in the
    link's fragment opens."""
    _limit(request)
    state = gw(request)
    share, job, _, row = _active_share(request, token)
    try:
        if share.privacy == "standard":
            try:
                vault(state)
            except StorageKeyMissing:
                raise HTTPException(503, {"code": "standard_unavailable", "message": "Standard mode is not configured on this gateway."}, headers=PUBLIC_HEADERS) from None
            data = await asyncio.to_thread(standard_jobs.load_video, state, row)
            media_type, filename = "video/mp4", "kunoworld-shared.mp4"
        else:
            data = await asyncio.to_thread(state.blobs.get, job.output_blob_id)
            media_type, filename = "application/octet-stream", "kunoworld-shared.sealed"
    except KeyError:
        raise _gone() from None
    with state.session() as s, s.begin():
        shares.record_view(s, share.id)
    return Response(
        content=data, media_type=media_type,
        headers={**PUBLIC_HEADERS, "content-disposition": f'inline; filename="{filename}"'},
    )
