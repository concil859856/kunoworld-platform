"""Standard jobs (STANDARD_MODE.md): plaintext uploads, gateway-sealed jobs, and the owner's stored videos.

The job API routes (`/v1/standard/...`) accept an API key or the web session. The `/v1/me/standard/...` aliases accept
only the web session. Stored videos, prompts and inputs stay until their owner deletes them.
"""

from __future__ import annotations

import asyncio
import json
import logging
import secrets
import time
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from kuno_protocol.canonical import sha256_hex
from kuno_protocol.crypto import DecryptionError
from kuno_protocol.media import ROLE_TYPES, sniff_mime
from kuno_protocol.profiles import InputRole, Mode, ModelProfile, shot_prompt
from kuno_protocol.schemas import JOB_ID_RE, GenerationParams, JobState, JobStatus
from kuno_protocol.sealed_payload import PayloadTooLarge
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator
from pydantic_core import PydanticCustomError
from sqlalchemy import select

from . import byte_ranges, holds, identity, moderation, standard_jobs
from .api_public import admit_job, check_job_rate, validate_request
from .auth import SignedIn, gw, require_account, require_user
from .db import NEVER_EXPIRES, Account, Blob, Enclave, Job
from .db_moderation import StandardJob, StandardUpload
from .state import job_status
from .upload_scan import ScanUnavailable, Unscannable, build_scanner
from .vault import StorageKeyMissing, Vault, vault

log = logging.getLogger("kuno.standard")

router = APIRouter(prefix="/v1", tags=["standard"])

STANDARD = standard_jobs.STANDARD


def _error(status: int, code: str, message: str, **extra) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message, **extra})


async def require_me_account(request: Request, who: SignedIn = Depends(require_user)) -> Account:
    with gw(request).session() as s:
        account = identity.account_for_user(s, who.user.id)
    if account is None:
        raise _error(409, "no_account", "This user has no account yet. Sign in again.")
    return account


CONTENT_POLICY_MESSAGE = "This prompt isn't allowed. Sexual and NSFW content is not permitted."


def check_content_policy(state, account: Account, prompt: str, negative_prompt: str | None, shots: list[str] | None = None) -> None:
    """`kuno_protocol.content_policy.check_prompt`; a violation is `422 content_policy` and one `content_policy` strike.

    For a storyboard, `prompt` is the scene and `shots` its shot prompts. Each shot prompt is checked on its own and as the
    model sees it (`shot_prompt(scene, shot)`, what the enclave checks): the policy weighs words by their neighbours, so a
    scene and a shot can break it together while passing apart. Any violation is the same single refusal and strike."""
    from kuno_protocol.content_policy import ContentPolicyViolation, check_prompt

    try:
        check_prompt(prompt, negative_prompt)
        for shot in shots or ():
            check_prompt(shot, negative_prompt)
            check_prompt(shot_prompt(prompt, shot), negative_prompt)
    except ContentPolicyViolation:
        with state.session() as s, s.begin():
            moderation.record_strike(s, state.settings, account.id, "content_policy")
        # The prompt is never logged.
        log.info("refused a standard prompt under the content policy: account=%s", account.id)
        raise _error(422, "content_policy", CONTENT_POLICY_MESSAGE) from None


def _vault(state) -> Vault:
    try:
        return vault(state)
    except StorageKeyMissing:
        raise _error(503, "standard_unavailable", "Standard mode is not configured on this gateway.") from None


class StandardInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    upload_id: str = Field(max_length=32)
    index: int = Field(ge=0)
    role: InputRole
    time_s: float | None = None
    strength: float | None = None
    hint: str | None = Field(default=None, max_length=64)
    start_s: float | None = None
    end_s: float | None = None


class StandardShot(BaseModel):
    """A storyboard shot's prompt: what happens in it. Paired by position with `params.shots`."""

    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(max_length=20_000)


class StandardJobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: str | None = None
    params: GenerationParams
    # For a storyboard, the scene every shot shares (PROTOCOL.md, "Storyboards"), which may be empty.
    prompt: str = Field(max_length=20_000)
    negative_prompt: str | None = Field(default=None, max_length=20_000)
    seed: int | None = Field(default=None, ge=0, le=2**63 - 1)
    options: dict[str, Any] = Field(default_factory=dict)
    inputs: list[StandardInput] = Field(default_factory=list)
    # Storyboard mode only: one prompt per `params.shots`, in order.
    shots: list[StandardShot] | None = Field(default=None, max_length=64)
    webhook_url: str | None = None

    @field_validator("job_id")
    @classmethod
    def _uuid4(cls, value: str | None) -> str | None:
        if value is not None and not JOB_ID_RE.match(value):
            raise ValueError("job_id must be a lowercase UUIDv4")
        return value

    @field_validator("prompt")
    @classmethod
    def _prompt_unless_storyboard(cls, value: str, info: ValidationInfo) -> str:
        """At least one character, as before storyboards, except for a storyboard's scene: its shots carry the prompts.
        `params` is validated before `prompt`, so it is here when it is valid."""
        params = info.data.get("params")
        if not value and not (isinstance(params, GenerationParams) and params.mode is Mode.STORYBOARD):
            raise PydanticCustomError("string_too_short", "String should have at least 1 character", {"min_length": 1})
        return value


# ------------------------------------------------------------------ uploads


async def _upload(request: Request, account: Account, role: InputRole) -> dict:
    state = gw(request)
    if not account.is_validator and not state.limiter.allow(f"uploads:{account.id}", state.settings.uploads_per_minute, 60):
        raise _error(429, "rate_limited", "Too many uploads in the last minute. Wait a moment and try again.")
    store = _vault(state)
    with state.session() as s:
        moderation.enforce(s, state.settings, account, STANDARD)
    data = await request.body()
    if len(data) > state.settings.max_blob_bytes:
        raise _error(413, "too_large", "The file exceeds the upload limit.")
    mime = sniff_mime(data) if data else None
    if mime is None or mime not in ROLE_TYPES[role]:
        raise _error(422, "unsupported_media", f"That file is not a supported {role.value} type.")
    digest = sha256_hex(data)
    scanner = getattr(request.app.state, "upload_scanner", None) or build_scanner(state.settings)
    try:
        match = await asyncio.to_thread(scanner.scan, data, digest, mime)
    except Unscannable:
        # The file claims a supported type but doesn't decode, so it can't be checked.
        raise _error(422, "unsupported_media", "That file can't be read.") from None
    except ScanUnavailable:
        log.error("upload scanning is unavailable; refusing a standard upload")
        raise _error(503, "scan_unavailable", "Uploads can't be accepted right now. Try again shortly.") from None
    now = time.time()
    if match is not None:
        # Preserved, not discarded: sealed at rest under a hold (holds.py). It gets no standard_uploads row, so it
        # can never be used in a job, and the customer never learns its id.
        upload_id = uuid.uuid4().hex
        sealed = await asyncio.to_thread(store.seal, holds.blocked_upload_label(upload_id), data)
        blob_id, _, _ = await asyncio.to_thread(state.blobs.put, sealed)
        try:
            with state.session() as s, s.begin():
                hold = holds.place(
                    s, state.settings, reason="upload_match", created_by=holds.SYSTEM, account_id=account.id,
                    upload_id=upload_id, blob_id=blob_id, now=now, note=f"blocked upload ({match.matcher} match)",
                )
                moderation.add_item(
                    s, "upload_match", moderation.UPLOAD_MATCH_PRIORITY, account_id=account.id, now=now,
                    detail={"sha256": digest, "size": len(data), "mime": mime, "role": role.value, "matcher": match.matcher,
                            "match_kind": match.kind, "list": match.list_name, "category": match.category,
                            "upload_id": upload_id, "hold_id": hold.id, **match.detail()},
                )
                moderation.record_strike(s, state.settings, account.id, "upload_blocked", now=now)
        except BaseException:
            standard_jobs.discard_blobs(state, [blob_id])
            raise
        # Hashes and list names only; never the file.
        log.warning("blocked a standard upload: account=%s sha256=%s list=%s", account.id, digest, match.list_name)
        raise _error(422, "upload_blocked", "This file can't be used.")
    upload_id = uuid.uuid4().hex
    sealed = await asyncio.to_thread(store.seal, standard_jobs.upload_label(upload_id), data)
    blob_id, _, _ = await asyncio.to_thread(state.blobs.put, sealed)
    with state.session() as s, s.begin():
        s.add(
            StandardUpload(
                id=upload_id, account_id=account.id, role=role.value, mime=mime, sha256=digest, size=len(data),
                blob_id=blob_id, created_at=now, expires_at=now + state.settings.standard_upload_ttl_s,
            )
        )
    return {"upload_id": upload_id, "sha256": digest, "size": len(data), "mime": mime}


@router.post("/standard/uploads", status_code=201)
async def upload(request: Request, role: InputRole, account: Account = Depends(require_account)):
    return await _upload(request, account, role)


@router.post("/me/standard/uploads", status_code=201)
async def my_upload(request: Request, role: InputRole, account: Account = Depends(require_me_account)):
    return await _upload(request, account, role)


# ------------------------------------------------------------------ jobs


def _storyboard_shots(body: StandardJobCreate, profile: ModelProfile) -> list[str] | None:
    """A storyboard's shot prompts, checked against its public params (PROTOCOL.md, "Storyboards"); None for any other
    job, which may not carry `shots`. `validate_params` has already checked `params.shots` against the profile."""
    params = body.params
    if params.mode is not Mode.STORYBOARD:
        if body.shots is not None:
            raise _error(422, "invalid_shots", "Only storyboard jobs take shots.")
        return None
    count = len(params.shots or [])
    if body.shots is None or len(body.shots) != count:
        raise _error(422, "invalid_shots", f"A storyboard needs one shot prompt for each of its {count} shots in params.shots, in order.")
    if body.inputs:
        raise _error(422, "invalid_inputs", "Storyboards take no inputs.")
    shots = [shot.prompt for shot in body.shots]
    limit = profile.limits.max_prompt_chars
    for number, shot in enumerate(shots, start=1):
        if not shot.strip():
            raise _error(422, "invalid_shots", f"Shot {number} needs a prompt.")
        # What the model sees for the shot: the scene, a blank line, then the shot's own prompt.
        if len(shot_prompt(body.prompt, shot)) > limit:
            raise _error(422, "prompt_too_long", f"Shot {number}'s prompt, with the scene before it, is over the {limit}-character limit.")
    return shots


def _is_storyboard(job: Job) -> bool:
    return json.loads(job.params).get("mode") == Mode.STORYBOARD.value


async def _create(body: StandardJobCreate, request: Request, account: Account) -> JobStatus:
    state = gw(request)
    store = _vault(state)
    with state.session() as s:
        moderation.enforce(s, state.settings, account, STANDARD)
    check_job_rate(state, account, STANDARD)
    params = body.params
    profile = await validate_request(state, request, params, body.webhook_url)
    if not profile.offers(STANDARD):
        # Before the content check, so asking for a mode the model isn't sold in is never a strike.
        raise _error(
            422, "privacy_mode_unavailable",
            f"{profile.name} is offered in Private mode only. Use Private mode, or a model that offers Standard.",
            privacy_modes=profile.privacy_modes,
        )
    if len(body.prompt) > profile.limits.max_prompt_chars:
        raise _error(422, "prompt_too_long", f"Prompts are limited to {profile.limits.max_prompt_chars} characters.")
    if body.negative_prompt and not profile.limits.negative_prompt:
        raise _error(422, "unsupported_option", f"{profile.name} does not use negative prompts.")
    # A storyboard's shape is checked before the content check too, so a malformed request is never a strike.
    shots = _storyboard_shots(body, profile)
    # Sexual and NSFW content is banned in both modes. The gateway can read a Standard prompt, so it refuses one here,
    # before anything is sealed; private prompts are checked inside the enclave.
    check_content_policy(state, account, body.prompt, body.negative_prompt, shots)
    refs = sorted(body.inputs, key=lambda i: i.index)
    if (
        [r.index for r in refs] != list(range(len(refs)))
        or [r.role for r in refs] != list(params.input_roles)
        or len({r.upload_id for r in refs}) != len(refs)
    ):
        raise _error(422, "invalid_inputs", "Inputs need indexes 0..n-1, one distinct upload each, in the order of params.input_roles.")
    job_id = body.job_id or str(uuid.uuid4())
    now = time.time()
    with state.session() as s:
        if s.get(Job, job_id) is not None:
            raise _error(409, "duplicate_job", "A job with this id already exists.")
        uploads = []
        for ref in refs:
            up = s.get(StandardUpload, ref.upload_id)
            if (
                up is None or up.account_id != account.id or up.job_id is not None or up.blob_id is None
                or up.expires_at <= now or up.role != ref.role.value
            ):
                raise _error(422, "invalid_inputs", f"Upload {ref.upload_id} is unknown, not yours, expired, already used, or for another role.")
            uploads.append(up)
        from kuno_protocol.envelope import EnvelopeQuery

        from .admission import family_profile_ids, order_for_account
        from .envelopes import no_fit_error

        # Only workers whose serving envelope fits these params (envelopes.py): a consumer card never gets a job it would
        # have to refuse.
        fit = EnvelopeQuery.of(params)
        routable = standard_jobs.enclaves_for(state, s, profile.id, STANDARD, fit=fit)
        if not routable and (available := standard_jobs.enclaves_for(state, s, profile.id, STANDARD)):
            raise no_fit_error(profile, fit, available, storyboard=params.shots is not None)
        # Open-tier miners get customer jobs only after passing validator probes, and validators' jobs reach
        # confidential miners that haven't served this family lately (admission.py).
        candidates = order_for_account(
            s, state.settings, routable, account, profile_ids=family_profile_ids(state.profiles, profile),
        )
    if not candidates:
        raise _error(503, "no_capacity", f"No workers are serving {profile.name} right now. Try again shortly.")
    enclave = candidates[0]
    seed = body.seed if body.seed is not None else secrets.randbelow(2**31)

    def seal():
        inputs = [
            ({**ref.model_dump(exclude={"upload_id", "index"}), "mime": up.mime}, standard_jobs.read_upload(state, up))
            for ref, up in zip(refs, uploads)
        ]
        return standard_jobs.seal_job(
            state, job_id=job_id, enclave_id=enclave.id, hpke_public_key=enclave.hpke_public_key, params=params,
            prompt=body.prompt, negative_prompt=body.negative_prompt, seed=seed, options=body.options, inputs=inputs,
            shots=shots,
        )

    try:
        sealed = await asyncio.to_thread(seal)
    except (KeyError, DecryptionError):
        raise _error(422, "invalid_inputs", "An upload is no longer available. Upload it again.") from None
    except PayloadTooLarge:
        raise _error(422, "request_too_large", "The prompt, options and inputs are too large to seal into one request.") from None
    try:
        with state.session() as s, s.begin():
            current = s.get(Enclave, enclave.id)
            if current is None or not state.is_fresh(current) or not standard_jobs.serves(current, STANDARD):
                raise _error(409, "enclave_unavailable", "The chosen worker went away. Submit again.")
            job = admit_job(
                s, state, account, job_id=job_id, profile=profile, params=params, enclave=current, enc=sealed.enc,
                ciphertext=sealed.ciphertext, input_blob_ids=sealed.blob_ids, webhook_url=body.webhook_url,
                privacy=STANDARD, now=now,
            )
            for ref in refs:
                up = s.get(StandardUpload, ref.upload_id, with_for_update=state.postgres)
                if up is None or up.job_id is not None:
                    raise _error(422, "invalid_inputs", f"Upload {ref.upload_id} was used by another job.")
                up.job_id = job_id
            for blob_id, digest, size in sealed.blobs:
                s.add(
                    Blob(
                        id=blob_id, owner_kind="account", owner_id=account.id, job_id=job_id, size=size, sha256=digest,
                        created_at=now, expires_at=NEVER_EXPIRES,
                    )
                )
            s.add(
                StandardJob(
                    job_id=job_id, account_id=account.id, prompt=body.prompt, negative_prompt=body.negative_prompt,
                    shots=None if shots is None else json.dumps([{"prompt": shot} for shot in shots], separators=(",", ":")),
                    seed=seed, options=json.dumps(body.options, separators=(",", ":")),
                    inputs=json.dumps(
                        [{**ref.model_dump(mode="json"), "sha256": up.sha256, "size": up.size, "mime": up.mime}
                         for ref, up in zip(refs, uploads)],
                        separators=(",", ":"),
                    ),
                    output_key=store.seal_secret(standard_jobs.output_key_label(job_id), sealed.output_key),
                    created_at=now, expires_at=NEVER_EXPIRES,
                )
            )
    except BaseException:
        standard_jobs.discard_blobs(state, sealed.blob_ids)
        raise
    return job_status(job)


@router.post("/standard/videos", status_code=201, response_model=JobStatus)
async def create(body: StandardJobCreate, request: Request, account: Account = Depends(require_account)):
    return await _create(body, request, account)


@router.post("/me/standard/videos", status_code=201, response_model=JobStatus)
async def my_create(body: StandardJobCreate, request: Request, account: Account = Depends(require_me_account)):
    return await _create(body, request, account)


def _list(request: Request, account: Account, limit: int) -> list[dict]:
    with gw(request).session() as s:
        rows = s.execute(
            select(Job, StandardJob)
            .join(StandardJob, StandardJob.job_id == Job.id)
            .where(Job.account_id == account.id, Job.privacy == STANDARD)
            .order_by(Job.created_at.desc())
            .limit(min(max(limit, 1), 200))
        ).all()
    return [
        {
            "job_id": job.id,
            "status": job.status,
            "profile_id": job.profile_id,
            "params": json.loads(job.params),
            # Content a hold preserves after deletion stays hidden from its owner.
            "prompt": row.prompt if row.deleted_at is None else None,
            # A storyboard's shot prompts, the same way; the key is there only for storyboards.
            **({"shots": standard_jobs.shots_json(row) if row.deleted_at is None else None} if _is_storyboard(job) else {}),
            "created_at": job.created_at,
            "finished_at": job.finished_at,
            "has_video": row.video_blob_id is not None and row.deleted_at is None,
            "error_code": job.error_code,
            # Stored videos don't expire; kept for clients that read it.
            "expires_at": None,
            "deleted": row.deleted_at is not None,
        }
        for job, row in rows
    ]


@router.get("/standard/videos")
async def list_videos(request: Request, account: Account = Depends(require_account), limit: int = 50):
    return _list(request, account, limit)


@router.get("/me/standard/videos")
async def my_list_videos(request: Request, account: Account = Depends(require_me_account), limit: int = 50):
    return _list(request, account, limit)


def _owned(s, account: Account, job_id: str) -> tuple[Job, StandardJob]:
    job = s.get(Job, job_id)
    row = s.get(StandardJob, job_id)
    if job is None or row is None or job.account_id != account.id:
        raise _error(404, "not_found", "No such standard video.")
    return job, row


def _available(job: Job, row: StandardJob) -> None:
    if row.deleted_at is not None:
        code = row.delete_reason or "deleted"
        raise _error(410, code, {"expired": "This video expired under an earlier storage policy.",
                                 "removed": "This video was removed."}.get(code, "This video was deleted."))
    if job.status != JobState.SUCCEEDED.value or row.video_blob_id is None:
        raise _error(404, "not_ready", "The video isn't ready.")


async def _video(request: Request, account: Account, job_id: str) -> Response:
    """The stored video. Answers byte ranges (byte_ranges.py), decrypting only the chunks a range covers."""
    state = gw(request)
    _vault(state)
    with state.session() as s:
        job, row = _owned(s, account, job_id)
    _available(job, row)
    try:
        body = await asyncio.to_thread(byte_ranges.standard_video, state, row)
    except KeyError:
        raise _error(410, "expired", "This video is no longer stored.") from None
    return byte_ranges.serve(
        request, body, media_type="video/mp4", headers={"content-disposition": f'inline; filename="{job_id}.mp4"'},
        etag=byte_ranges.strong_etag(row.video_sha256),
    )


@router.get("/standard/videos/{job_id}/video")
async def video(job_id: str, request: Request, account: Account = Depends(require_account)):
    return await _video(request, account, job_id)


@router.get("/me/standard/videos/{job_id}/video")
async def my_video(job_id: str, request: Request, account: Account = Depends(require_me_account)):
    return await _video(request, account, job_id)


async def _thumbnail(request: Request, account: Account, job_id: str) -> Response:
    state = gw(request)
    _vault(state)
    with state.session() as s:
        job, row = _owned(s, account, job_id)
    _available(job, row)
    try:
        data = await asyncio.to_thread(standard_jobs.thumbnail, state, job_id)
    except KeyError:
        raise _error(410, "expired", "This video is no longer stored.") from None
    except standard_jobs.ThumbnailUnavailable:
        raise _error(503, "thumbnail_unavailable", "A preview can't be made right now.") from None
    return Response(content=data, media_type="image/jpeg")


@router.get("/standard/videos/{job_id}/thumbnail")
async def thumbnail(job_id: str, request: Request, account: Account = Depends(require_account)):
    return await _thumbnail(request, account, job_id)


@router.get("/me/standard/videos/{job_id}/thumbnail")
async def my_thumbnail(job_id: str, request: Request, account: Account = Depends(require_me_account)):
    return await _thumbnail(request, account, job_id)


def _delete(request: Request, account: Account, job_id: str) -> Response:
    state = gw(request)
    now = time.time()
    with state.session() as s, s.begin():
        job, _ = _owned(s, account, job_id)
        standard_jobs.delete_for_owner(state, s, job, now)
    return Response(status_code=204)


@router.delete("/standard/videos/{job_id}", status_code=204)
async def delete(job_id: str, request: Request, account: Account = Depends(require_account)):
    return _delete(request, account, job_id)


@router.delete("/me/standard/videos/{job_id}", status_code=204)
async def my_delete(job_id: str, request: Request, account: Account = Depends(require_me_account)):
    return _delete(request, account, job_id)
