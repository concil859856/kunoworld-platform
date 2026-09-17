"""Admission for open-tier miners: customer jobs only after passing validator probes.

An open-tier miner has no attestation, so the gateway doesn't route customer standard jobs to it until its
hotkey has finished enough jobs that validators sent it (their standard canaries). Validators' own standard
jobs prefer unadmitted open-tier enclaves, so newcomers get probed quickly. Confidential-tier enclaves are
never held back. Validators run the matching rule on their side (KUNO_OPEN_TIER_PROBES), counting only
probes they checked themselves.

Coverage for capacity pay: a validator pays a confidential GPU's ready time only if its hotkey finished a job of
that family in the scoring window (VALIDATING.md, "Capacity pay"). With little traffic, least-loaded routing could
leave a ready miner without one all day, so validators' jobs next prefer confidential miners that haven't served
the family in the window. Customers' routing is unchanged.
"""

from __future__ import annotations

import os
import time
from collections.abc import Iterable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from kuno_protocol.profiles import ModelProfile
from kuno_protocol.schemas import JobState
from kuno_protocol.tiers import OPEN, tier_for_tee

from .db import Account, Enclave, Job

DEFAULT_ADMISSION_JOBS = 5
# The validators' default scoring window, which capacity pay's job requirement looks back over.
COVERAGE_WINDOW_S = 86400.0


def admission_jobs(settings) -> int:
    configured = getattr(settings, "open_tier_admission_jobs", None)
    if configured is not None:
        return int(configured)
    return int(os.environ.get("KUNO_OPEN_TIER_ADMISSION_JOBS", DEFAULT_ADMISSION_JOBS))


def probes_passed(s: Session, hotkeys: set[str]) -> dict[str, int]:
    """Succeeded jobs created by validator accounts, per miner hotkey."""
    if not hotkeys:
        return {}
    rows = s.execute(
        select(Enclave.miner_hotkey, func.count(Job.id))
        .join(Job, Job.enclave_id == Enclave.id)
        .join(Account, Account.id == Job.account_id)
        .where(Enclave.miner_hotkey.in_(hotkeys), Account.is_validator.is_(True), Job.status == JobState.SUCCEEDED.value)
        .group_by(Enclave.miner_hotkey)
    ).all()
    return {hotkey: count for hotkey, count in rows}


def family_profile_ids(profiles: dict[str, ModelProfile], profile: ModelProfile) -> list[str]:
    return [p.id for p in profiles.values() if p.family == profile.family]


def served_recently(s: Session, hotkeys: set[str], profile_ids: Iterable[str], since: float) -> set[str]:
    """Hotkeys whose confidential-tier enclaves finished a job of any of `profile_ids` since `since`, whoever sent it.
    Plans don't count: they render nothing, and validators' capacity gate doesn't count them either."""
    profile_ids = list(profile_ids)
    if not hotkeys or not profile_ids:
        return set()
    rows = s.execute(
        select(Enclave.miner_hotkey)
        .join(Job, Job.enclave_id == Enclave.id)
        .where(
            Enclave.miner_hotkey.in_(hotkeys), Enclave.tee != "open", Job.profile_id.in_(profile_ids),
            Job.status == JobState.SUCCEEDED.value, Job.finished_at >= since,
            # Params are stored as `GenerationParams.model_dump_json()`, compact, so a plan's always contain this.
            Job.params.not_like('%"mode":"plan"%'),
        )
        .distinct()
    ).all()
    return {hotkey for (hotkey,) in rows}


def order_for_account(
    s: Session, settings, candidates: list[Enclave], account: Account,
    profile_ids: Iterable[str] | None = None, now: float | None = None,
) -> list[Enclave]:
    """Candidate enclaves a job from this account may use, in preference order; candidates arrive least loaded first.

    Customers: unadmitted open-tier enclaves are removed. Validators: unadmitted open-tier enclaves come first, then,
    when `profile_ids` names the job's family, confidential enclaves whose hotkey hasn't served it in the window.
    """
    candidates = list(candidates)
    needed = admission_jobs(settings)
    open_hotkeys = {e.miner_hotkey for e in candidates if tier_for_tee(e.tee) == OPEN and e.miner_hotkey}
    passed = probes_passed(s, open_hotkeys) if needed > 0 and open_hotkeys else {}

    def unadmitted(enclave: Enclave) -> bool:
        return needed > 0 and tier_for_tee(enclave.tee) == OPEN and passed.get(enclave.miner_hotkey or "", 0) < needed

    if not account.is_validator:
        return [e for e in candidates if not unadmitted(e)]
    admitted = [e for e in candidates if not unadmitted(e)]
    if profile_ids is not None:
        since = (time.time() if now is None else now) - COVERAGE_WINDOW_S
        confidential = {e.miner_hotkey for e in admitted if tier_for_tee(e.tee) != OPEN and e.miner_hotkey}
        served = served_recently(s, confidential, profile_ids, since)

        def uncovered(enclave: Enclave) -> bool:
            return tier_for_tee(enclave.tee) != OPEN and bool(enclave.miner_hotkey) and enclave.miner_hotkey not in served

        admitted = [e for e in admitted if uncovered(e)] + [e for e in admitted if not uncovered(e)]
    return [e for e in candidates if unadmitted(e)] + admitted
