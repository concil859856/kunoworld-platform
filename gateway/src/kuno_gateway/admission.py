"""Admission for open-tier miners: customer jobs only after passing validator probes.

An open-tier miner has no attestation, so the gateway doesn't route customer standard jobs to it until its
hotkey has finished enough jobs that validators sent it (their standard canaries). Validators' own standard
jobs prefer unadmitted open-tier enclaves, so newcomers get probed quickly. Confidential-tier enclaves are
never held back. Validators run the matching rule on their side (KUNO_OPEN_TIER_PROBES), counting only
probes they checked themselves.
"""

from __future__ import annotations

import os

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from kuno_protocol.schemas import JobState
from kuno_protocol.tiers import OPEN, tier_for_tee

from .db import Account, Enclave, Job

DEFAULT_ADMISSION_JOBS = 5


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


def order_for_account(s: Session, settings, candidates: list[Enclave], account: Account) -> list[Enclave]:
    """Candidate enclaves a standard job from this account may use, in preference order.

    Customers: unadmitted open-tier enclaves are removed. Validators: unadmitted open-tier enclaves come first.
    """
    needed = admission_jobs(settings)
    open_hotkeys = {e.miner_hotkey for e in candidates if tier_for_tee(e.tee) == OPEN and e.miner_hotkey}
    if needed <= 0 or not open_hotkeys:
        return list(candidates)
    passed = probes_passed(s, open_hotkeys)

    def unadmitted(enclave: Enclave) -> bool:
        return tier_for_tee(enclave.tee) == OPEN and passed.get(enclave.miner_hotkey or "", 0) < needed

    if account.is_validator:
        return [e for e in candidates if unadmitted(e)] + [e for e in candidates if not unadmitted(e)]
    return [e for e in candidates if not unadmitted(e)]
