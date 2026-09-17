"""Serving envelopes at the gateway (kuno_protocol.envelope; MINING.md §6, PROTOCOL.md "Miner registration").

A worker whose card can't fit a profile's largest request advertises, at registration, the longest duration it serves
at each resolution, aspect ratio and fps. The gateway stores it on the enclave (`enclaves.envelope`, migration 0016) and:
  * routes a job only to enclaves whose envelope fits it: standard jobs by their params, `/v1/route` by the fields the
    client sends (an omitted field matches any value);
  * refuses to admit a job for an enclave whose envelope doesn't fit it (409 envelope_exceeded);
  * records a worker's `capacity_refused` for a job inside its envelope as `internal_error`, a miner fault, so refusing
    what it advertised costs the miner; outside the envelope (it shouldn't have been routed there) it stays
    `capacity_refused`, which validators don't count against the miner.
Capacity counts (`has_capacity`, `capacity_counts`, `/v1/models` workers) stay per profile.
"""

from __future__ import annotations

import json
from collections.abc import Iterable
from typing import Any

from fastapi import HTTPException
from kuno_protocol.envelope import CAPACITY_REFUSED, EnvelopeQuery, describe, fits, max_duration, profile_max_duration, serves
from kuno_protocol.profiles import Mode, ModelProfile
from kuno_protocol.schemas import GenerationParams
from pydantic import ValidationError

ENVELOPE_EXCEEDED = "envelope_exceeded"
INTERNAL_ERROR = "internal_error"


def stored(enclave: Any) -> dict | None:
    """The enclave's advertised envelope, or None: it serves its profiles' full limits."""
    raw = getattr(enclave, "envelope", None)
    if not raw:
        return None
    try:
        value = json.loads(raw)
    except ValueError:
        return None
    return value if isinstance(value, dict) else None


def table_for(enclave: Any, profile_id: str) -> dict | None:
    envelope = stored(enclave)
    return None if envelope is None else envelope.get(profile_id)


def envelope_serves(enclave: Any, profile_id: str, query: EnvelopeQuery | None) -> bool:
    """Whether the enclave's envelope has room for some request matching `query` (None or empty matches everything)."""
    return query is None or serves(table_for(enclave, profile_id), query)


def envelope_fits(enclave: Any, params: GenerationParams) -> bool:
    return fits(table_for(enclave, params.profile_id), params)


def longest_served(enclaves: Iterable[Any], profile: ModelProfile, query: EnvelopeQuery) -> float | None:
    """The longest duration any of these enclaves serves at the query's size and frame rate, when it names all three."""
    if query.resolution is None or query.aspect_ratio is None or query.fps is None:
        return None
    if query.aspect_ratio not in profile.limits.sizes.get(query.resolution, {}) or query.fps not in profile.limits.fps:
        return None
    best = None
    for enclave in enclaves:
        table = table_for(enclave, profile.id)
        longest = profile_max_duration(profile, query.fps) if table is None else max_duration(table, query.resolution, query.aspect_ratio, query.fps)
        if longest is not None and (best is None or longest > best):
            best = longest
    return best


def _request_text(query: EnvelopeQuery, storyboard: bool = False, plan: bool = False) -> str:
    parts = [f"{query.duration_s:g} s" if query.duration_s is not None else None, query.resolution, query.aspect_ratio]
    text = " ".join(p for p in parts if p) or "this"
    # A storyboard's query carries its longest shot, which is what a worker has to fit (kuno_protocol.envelope.fits).
    noun = "plan" if plan else "storyboard shot" if storyboard else "video"
    return f"a {text} {noun}" + (f" at {query.fps} fps" if query.fps is not None else "")


def plan_query(params: GenerationParams) -> EnvelopeQuery:
    """What a plan's routing asks of an envelope: its size and frame rate, at any duration. A plan renders nothing
    (`render_duration_s` is 0), so any enclave serving that size and frame rate fits it."""
    return EnvelopeQuery(params.resolution, params.aspect_ratio, params.fps, None)


def no_fit_error(
    profile: ModelProfile, query: EnvelopeQuery, available: Iterable[Any], storyboard: bool = False, plan: bool = False
) -> HTTPException:
    """503 no_capacity when workers serve the profile but none has room for this request. For a storyboard (`storyboard`),
    the query's duration is its longest shot; a plan's (`plan`) has none."""
    longest = longest_served(available, profile, query)
    message = f"No worker serving {profile.name} right now can fit {_request_text(query, storyboard, plan)}."
    if longest is not None and not plan:
        message += f" The longest available at that size and frame rate is {longest:g} s."
    message += " Try another size or frame rate, or try again shortly." if plan else " Try a shorter or smaller video, or try again shortly."
    return HTTPException(503, {"code": "no_capacity", "message": message, "max_duration_s": longest})


def admission_refusal(enclave: Any, profile: ModelProfile, params: GenerationParams) -> HTTPException | None:
    """409 envelope_exceeded when the enclave advertised that its hardware can't fit this job; None when it can."""
    table = table_for(enclave, profile.id)
    if fits(table, params):
        return None
    if params.mode is Mode.PLAN:
        # Nothing renders (render_duration_s is 0), so only a size and frame rate the hardware doesn't serve refuses a plan.
        refused, ask = "write a plan for it", "resolution, aspect_ratio and fps"
    elif params.shots:
        # Shots render one at a time, so the longest one is what didn't fit.
        refused = f"render this storyboard's {params.render_duration_s:g} s shot"
        ask = "resolution, aspect_ratio, fps and duration_s (a storyboard's longest shot)"
    else:
        refused, ask = f"make this {params.duration_s:g} s video", "resolution, aspect_ratio, fps and duration_s"
    return HTTPException(
        409,
        {
            "code": ENVELOPE_EXCEEDED,
            "message": f"That worker's hardware {describe(table, params)}, so it can't {refused}. Ask /v1/route again with {ask}.",
            "max_duration_s": max_duration(table, params.resolution, params.aspect_ratio, params.fps),
        },
    )


def failure_code(enclave: Any, params_json: str, code: str, message: str) -> tuple[str, str]:
    """The code a worker's failure is recorded under. `capacity_refused` for a job inside the envelope the enclave
    advertised (or with no envelope, inside its profile's limits) becomes `internal_error`: otherwise a miner could
    refuse every job without it counting against it. Refunds are the same either way."""
    if code != CAPACITY_REFUSED:
        return code, message
    try:
        params = GenerationParams.model_validate_json(params_json)
    except ValidationError:
        inside = True
    else:
        inside = envelope_fits(enclave, params)
    if not inside:
        return code, message
    return INTERNAL_ERROR, f"The worker refused a job inside the serving envelope it advertised: {message}"[:500]
