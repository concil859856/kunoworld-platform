"""Exact price quotes (PAYMENTS.md, "Quotes"): `POST /v1/quote` answers what the gateway would hold for a job before the
client seals or uploads anything.

A quote takes only what a client knows before submitting: the model or family, the mode, the privacy mode, the size,
frame rate and duration, and for a storyboard each shot's length and join. Never a prompt or an input. A plan
(`mode: "plan"`) takes its target length as `duration_s` and is priced flat (`pricing.plan_usd`, `standard_plan_usd`),
routed like the job: confidential enclaves that registered `plan/1`. It routes the
request exactly as `GET /v1/route` does (the owner's switch, licence regions, capacity and serving envelopes, and the
account's standing when a credential is sent), fills in the defaults the SDKs fill in, checks the params as admission
does, and prices them with `ModelProfile.price_usd`, the function admission charges with. So the price is the hold, and
every refusal carries the code the job itself would get.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

from fastapi import APIRouter, HTTPException, Request
from kuno_protocol.envelope import EnvelopeQuery
from kuno_protocol.profiles import (
    InputRole,
    Mode,
    ModelProfile,
    ParamError,
    PrivacyModeUnavailable,
    example_roles,
    storyboard_duration_s,
    validate_params,
)
from kuno_protocol.schemas import GenerationParams, PrivacyMode, ShotJoin, ShotSpec
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from . import api_public, ledger, standard_jobs
from .api_auth import _client_ip
from .auth import gw
from .db import Account
from .envelopes import no_fit_error, plan_query

router = APIRouter(prefix="/v1", tags=["public"])

# The key for anonymous quotes' rate limit when the gateway has no at-rest key: per process, so no address is stored.
_PROCESS_SECRET = secrets.token_bytes(32)


def _error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


class QuoteShot(BaseModel):
    """A storyboard shot as a quote sees it: its length and its join. No prompt: a quote never takes one."""

    model_config = ConfigDict(extra="forbid")

    # None: the length a clip gets by default (5 s where the model allows), as in the SDKs.
    duration_s: float | None = None
    # None: `fresh` for the first shot, `continue` after it, as in the SDKs.
    join: ShotJoin | None = None


class QuoteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Either names the model, or leaves it to routing (`family`, else the switch's default family), as /v1/route does.
    profile_id: str | None = None
    family: str | None = None
    # None: `storyboard` with shots, else inferred from `input_roles` as the SDKs infer it from the inputs given.
    mode: Mode | None = None
    privacy: PrivacyMode = "private"
    # A clip's length. A storyboard's comes from its shots, so it takes none. A plan's is its target length, required.
    duration_s: float | None = None
    shots: list[QuoteShot] | None = Field(default=None, max_length=64)
    resolution: str | None = None
    aspect_ratio: str | None = None
    fps: int | None = None
    audio: bool = True
    # The roles of the inputs the job will send, in order. None: what the mode needs (`profiles.example_roles`).
    input_roles: list[InputRole] | None = Field(default=None, max_length=64)


def infer_mode(roles: list[InputRole]) -> Mode:
    """The mode a job with these inputs is: the same rules as the SDKs' `infer_mode`, so a quote without `mode` prices
    what `generate` would send."""
    present = set(roles)
    if InputRole.SOURCE_AUDIO in present:
        return Mode.AUDIO_TO_VIDEO
    if InputRole.SOURCE_VIDEO in present:
        return Mode.VIDEO_EDIT
    if present & {InputRole.REFERENCE_IMAGE, InputRole.REFERENCE_VIDEO, InputRole.REFERENCE_AUDIO}:
        return Mode.REFERENCE_TO_VIDEO
    if InputRole.KEYFRAME in present:
        return Mode.KEYFRAMES
    if {InputRole.FIRST_FRAME, InputRole.LAST_FRAME} <= present:
        return Mode.FIRST_LAST_FRAME
    if InputRole.FIRST_FRAME in present:
        return Mode.IMAGE_TO_VIDEO
    if InputRole.LAST_FRAME in present:
        return Mode.LAST_FRAME
    return Mode.TEXT_TO_VIDEO


def fit_params(
    profile: ModelProfile, body: QuoteRequest, mode: Mode, roles: list[InputRole], fallback_reason: str | None
) -> GenerationParams:
    """The params a client sends for this request: the SDKs' defaults (`kunoworld.client._fit_params`, the JS SDK's
    `fitParams`), and after a fallback, the requested values adapted to the model that serves it. Without a fallback a
    value the model can't take is kept, so validation refuses it instead of quoting something else."""
    lim = profile.limits
    lenient = fallback_reason is not None
    resolution = body.resolution
    if resolution is None or (lenient and resolution not in lim.sizes):
        resolution = next(iter(lim.sizes))
    sizes = lim.sizes.get(resolution, {})
    aspect_ratio = body.aspect_ratio
    if aspect_ratio is None or (lenient and aspect_ratio not in sizes):
        aspect_ratio = "16:9" if "16:9" in sizes else next(iter(sizes), "16:9")
    fps = body.fps
    if fps is None or (lenient and fps not in lim.fps):
        fps = lim.default_fps
    max_duration = min(lim.max_duration_s, lim.max_duration_s_by_fps.get(fps, lim.max_duration_s))

    def fit_duration(requested: float | None) -> float:
        if requested is None:
            return float(min(max(5.0, lim.min_duration_s), max_duration))
        return float(min(max(requested, lim.min_duration_s), max_duration) if lenient else requested)

    specs = None
    if mode is Mode.PLAN:
        # A plan's duration_s is the stitched length to aim for, within its own range rather than a clip's.
        plan, board = lim.plan, lim.storyboard
        duration_s = body.duration_s
        if lenient and plan is not None and board is not None:
            duration_s = min(max(duration_s, plan.min_target_s), board.max_total_s)
    elif body.shots is not None:
        specs = [
            ShotSpec(duration_s=fit_duration(shot.duration_s), join=shot.join or ("fresh" if index == 0 else "continue"))
            for index, shot in enumerate(body.shots)
        ]
        try:
            duration_s = storyboard_duration_s(profile, specs, fps)
        except ParamError as exc:  # the profile has no storyboard limits
            raise _error(422, "invalid_params", str(exc)) from None
    else:
        duration_s = fit_duration(body.duration_s)
    try:
        return GenerationParams(
            profile_id=profile.id, mode=mode, duration_s=float(duration_s), resolution=resolution, aspect_ratio=aspect_ratio,
            fps=fps, audio=body.audio and lim.audio, input_roles=roles, shots=specs,
        )
    except ValidationError as exc:
        raise _error(422, "invalid_params", str(exc)) from None


def breakdown(profile: ModelProfile, params: GenerationParams, privacy: str) -> dict:
    """How `ModelProfile.price_usd` arrived at the price, step by step and in its order, so a client can show it. A plan
    is one flat price (`plan_usd`): no per-second rate, no multipliers, no minimum; the other keys keep their shape."""
    pricing = profile.pricing
    if params.mode is Mode.PLAN:
        flat = pricing.plan_usd if privacy == "private" else pricing.standard_plan_usd
        return {
            "plan_usd": flat,
            "usd_per_second": None,
            "billable_seconds": 0.0,
            "fps_multiplier": 1.0,
            "long_clip_over_s": None,
            "long_clip_multiplier": 1.0,
            "subtotal_usd": flat,
            "min_job_usd": pricing.min_job_usd,
            "minimum_applied": False,
        }
    rates = pricing.usd_per_second if privacy == "private" else pricing.standard_usd_per_second or {}
    rate = rates[params.resolution]
    fps_multiplier = pricing.fps_multipliers.get(params.fps, 1.0)
    # Private only, and on the longest single render: a storyboard's shots render one at a time.
    long_clip = pricing.long_clip if privacy == "private" else None
    long_clip_applied = long_clip is not None and params.render_duration_s > long_clip.over_s
    long_clip_multiplier = long_clip.multiplier if long_clip_applied else 1.0
    subtotal = rate * params.duration_s * fps_multiplier
    if long_clip_applied:
        subtotal *= long_clip_multiplier
    return {
        "usd_per_second": rate,
        "billable_seconds": params.duration_s,
        "fps_multiplier": fps_multiplier,
        "long_clip_over_s": long_clip.over_s if long_clip is not None else None,
        "long_clip_multiplier": long_clip_multiplier,
        "subtotal_usd": round(subtotal, 6),
        "min_job_usd": pricing.min_job_usd,
        "minimum_applied": pricing.min_job_usd > subtotal,
    }


def _rate_key(state, request: Request, account: Account | None) -> str:
    if account is not None:
        return f"quotes:{account.id}"
    from .vault import StorageKeyMissing, vault

    # Anonymous quotes count per network, under a keyed hash, so the limiter never stores an address.
    ip = _client_ip(request)
    try:
        digest = vault(state).keyed_hash(f"quote/{ip}")
    except StorageKeyMissing:
        digest = hmac.new(_PROCESS_SECRET, ip.encode(), hashlib.sha256).hexdigest()
    return f"quotes-ip:{digest[:32]}"


@router.post("/quote")
async def quote(body: QuoteRequest, request: Request):
    """The exact price the gateway would hold for this job now, the profile that would serve it and the params priced.
    Public; with a credential, the account's standing is checked as routing checks it and its balance is returned."""
    state = gw(request)
    account = await api_public.optional_account(request)
    if not (account is not None and account.is_validator) and not state.limiter.allow(
        _rate_key(state, request, account), state.settings.quotes_per_minute, 60
    ):
        raise _error(429, "rate_limited", "Too many quotes in the last minute. Wait a moment and try again.")

    # The shape checks the SDKs make before routing, with the codes they use.
    if body.shots is not None:
        if body.mode is not None and body.mode is not Mode.STORYBOARD:
            raise _error(422, "invalid_shots", f"Only storyboards take shots, not {body.mode.value}.")
        if body.duration_s is not None:
            raise _error(422, "invalid_params", "A storyboard's length comes from its shots: leave duration_s unset.")
        if body.input_roles:
            raise _error(422, "invalid_inputs", "Storyboards take no inputs.")
        mode, roles = Mode.STORYBOARD, []
    elif body.mode is Mode.STORYBOARD:
        raise _error(422, "invalid_shots", "A storyboard needs its shots: send each shot's duration_s and join.")
    elif body.mode is Mode.PLAN:
        if body.duration_s is None:
            raise _error(422, "invalid_params", "A plan needs its target length: send duration_s.")
        if body.input_roles:
            raise _error(422, "invalid_inputs", "Plans take no inputs.")
        mode, roles = Mode.PLAN, []
    else:
        roles = list(body.input_roles) if body.input_roles is not None else None
        mode = body.mode or infer_mode(roles or [])
        if roles is None:
            roles = example_roles(mode)

    # Routed exactly as /v1/route routes it: fallbacks, regions, capacity, the envelope fields given, and eligibility.
    # A storyboard is routed by its longest shot among those given a length, as the SDKs ask.
    if body.shots is not None:
        route_duration = max((shot.duration_s for shot in body.shots if shot.duration_s is not None), default=None)
    else:
        route_duration = body.duration_s
    route = await api_public.route(
        request, mode=mode, profile_id=body.profile_id, family=body.family, privacy=body.privacy,
        resolution=body.resolution, aspect_ratio=body.aspect_ratio, fps=body.fps, duration_s=route_duration,
    )
    profile = state.profiles[route.profile_id]
    params = fit_params(profile, body, mode, roles, route.fallback_reason)
    try:
        validate_params(profile, params)
    except ParamError as exc:
        raise _error(422, "invalid_params", str(exc)) from None

    # The filled-in params must fit some worker's serving envelope too, as a Standard job's routing and a private client's
    # enclave choice require: otherwise the job would be refused, and a quote for it would be a price nobody can pay.
    tier, feature = standard_jobs.routing_tier(body.privacy, mode), standard_jobs.required_feature(mode)
    fit = plan_query(params) if mode is Mode.PLAN else EnvelopeQuery.of(params)
    with state.session() as s:
        if not standard_jobs.enclaves_for(state, s, profile.id, tier, fit=fit, feature=feature):
            available = standard_jobs.enclaves_for(state, s, profile.id, tier, feature=feature)
            if available:
                raise no_fit_error(profile, fit, available, storyboard=params.shots is not None, plan=mode is Mode.PLAN)
            raise _error(503, "no_capacity", f"No workers are serving {profile.name} right now. Try again shortly.")
        balance = ledger.to_usd(s.get(Account, account.id).balance_micros) if account is not None else None

    try:
        price = profile.price_usd(params, body.privacy)
    except PrivacyModeUnavailable as exc:
        raise _error(422, "privacy_mode_unavailable", f"{exc}. Use Private mode, or a model that offers Standard.") from None
    except ParamError as exc:
        raise _error(422, "invalid_params", str(exc)) from None
    return {
        "price_usd": price,
        "currency": "USD",
        "privacy": body.privacy,
        "profile_id": profile.id,
        "profile_name": profile.name,
        "requested_profile_id": route.requested_profile_id,
        "fallback_reason": route.fallback_reason,
        "params": params.model_dump(mode="json"),
        "breakdown": breakdown(profile, params, body.privacy),
        # The same flag as /v1/models: every price is a placeholder until the owner sets real pricing.
        "placeholder": api_public.PRICING_PLACEHOLDER,
        # Present with a working credential: whether the account could pay the hold right now.
        "balance_usd": balance,
        "balance_covers": None if balance is None else balance >= price,
    }
