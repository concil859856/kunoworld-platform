"""Gateway runtime state and the job/enclave bookkeeping shared by the routers."""

from __future__ import annotations

import json
import os
import secrets
import threading
import time
from pathlib import Path

from fastapi import Request
from kuno_protocol.canonical import b64d
from kuno_protocol.policy import policy_from_env
from kuno_protocol.profiles import ModelProfile, load_profiles
from kuno_protocol.receipts import Receipt
from kuno_protocol.regions import normalize_country
from kuno_protocol.schemas import (
    GenerationParams,
    JobState,
    JobStatus,
    MinerChallenge,
    MinerJob,
)
from kuno_protocol.switch import SignedSwitch, SwitchConfig
from kuno_protocol.turbo import is_candidate_profile_list
from sqlalchemy import create_engine, delete, select, text
from sqlalchemy.orm import Session, sessionmaker

from . import identity, ledger, webhooks
from .blobstore_s3 import select_blob_store
from .db import (
    Account,
    Challenge,
    Enclave,
    HardwareBinding,
    Job,
    LoginToken,
    Nonce,
    Setting,
    UserSession,
)
from .mailer import Mailer, OutboxMailer, ResendMailer
from .migrations import upgrade_database
from .ratelimit import DatabaseRateLimiter, RateLimiter
from .settings import Settings, read_env_file

NONCE_TTL_S = 300
CHALLENGE_TTL_S = 300


class HardwareInUse(Exception):
    """A verified hardware identity is held by a fresh enclave of a different miner hotkey."""

    def __init__(self, holders: list[tuple[str, str, str | None]]):
        self.holders = holders  # (kind, enclave_id, miner_hotkey)
        kinds = " and ".join(sorted({kind.replace("_", " ") for kind, _, _ in holders}))
        super().__init__(
            f"This {kinds} hardware is attested for an active enclave of another miner hotkey. One machine serves one "
            "hotkey: it is released when that enclave retires, stops polling, or its attestation lapses."
        )

class GatewayState:
    def __init__(self, settings: Settings):
        self.settings = settings
        # Production keeps customers' videos on durable object storage (R2), never on a local disk.
        from .blobstore_s3 import require_durable_blob_backend

        require_durable_blob_backend(settings)
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        sqlite = settings.db_url.startswith("sqlite")
        # Postgres can lock rows across processes; SQLite serializes writers already.
        self.postgres = settings.db_url.startswith("postgres")
        self.engine = create_engine(settings.db_url, connect_args={"check_same_thread": False} if sqlite else {})
        upgrade_database(self.engine)
        self.Session = sessionmaker(self.engine, expire_on_commit=False)
        self.blobs = select_blob_store(settings)
        self.profiles: dict[str, ModelProfile] = load_profiles()
        self.owner_public_key = b64d(settings.owner_public_key) if settings.owner_public_key else None
        # Dev accepts the simulated TEE the manifest trusts; KUNO_ATTESTATION=production requires Intel
        # DCAP and NVIDIA verifiers, the owner key and an owner-signed manifest, or refuses to start.
        env = {**read_env_file(settings.data_dir / "dev.env"), **os.environ}
        if settings.owner_public_key:
            env["KUNO_OWNER_PUBLIC_KEY"] = settings.owner_public_key
        self.policy = policy_from_env(env)
        if self.policy.production:
            require_durable_blob_backend(settings, production=True)
        self.manifest = self.policy.load_manifest(env.get("KUNO_SIGNED_MANIFEST") or settings.manifest_path)
        self.quote_verifier = self.policy.quote_verifier
        self.gpu_verifier = self.policy.gpu_verifier
        self.claim_lock = threading.Lock()
        # Serializes hardware binding checks within this process; Postgres adds advisory locks across processes.
        self.hardware_lock = threading.Lock()
        self._switch = self._load_switch()
        self.limiter = DatabaseRateLimiter(self.session) if settings.rate_limit_backend == "database" else RateLimiter()
        self.mailer: Mailer = (
            ResendMailer(settings.resend_api_key, settings.email_from)
            if settings.resend_api_key
            else OutboxMailer(settings.outbox_dir)
        )
        self._seed_accounts()

    # ------------------------------------------------------------ setup

    def session(self) -> Session:
        return self.Session()

    def _load_switch(self) -> SignedSwitch:
        with self.session() as s:
            row = s.get(Setting, "switch")
            if row is not None:
                return SignedSwitch.model_validate_json(row.value)
        path = self.settings.switch_path
        if path and Path(path).exists():
            signed = SignedSwitch.model_validate_json(Path(path).read_text())
            if self.owner_public_key is None or signed.verify(self.owner_public_key):
                return signed
        return SignedSwitch(config=SwitchConfig())

    def _seed_accounts(self) -> None:
        seeds = [
            ("dev", "Developer", self.settings.dev_api_key, False),
            ("validator", "Validator", self.settings.validator_api_key, True),
        ]
        with self.session() as s, s.begin():
            for account_id, name, key, is_validator in seeds:
                if key and s.get(Account, account_id) is None:
                    s.add(
                        Account(
                            id=account_id,
                            name=name,
                            balance_micros=0,
                            is_validator=is_validator,
                            created_at=time.time(),
                        )
                    )
                    s.flush()
                    identity.register_api_key(s, account_id, f"{name} key", key)
                    ledger.post(
                        s, account_id, ledger.to_micros(self.settings.dev_balance_usd), kind=ledger.ADJUSTMENT,
                        source="dev", idempotency_key=f"seed:{account_id}", description="Development balance",
                    )

    # ------------------------------------------------------------ switch

    @property
    def switch(self) -> SignedSwitch:
        return self._switch

    def set_switch(self, signed: SignedSwitch) -> None:
        with self.session() as s, s.begin():
            s.merge(Setting(key="switch", value=signed.model_dump_json()))
        self._switch = signed

    # ------------------------------------------------------------ request helpers

    def country(self, request: Request) -> str | None:
        if self.settings.allow_country_override and request.headers.get("x-kuno-country"):
            return normalize_country(request.headers["x-kuno-country"])
        return normalize_country(request.headers.get("cf-ipcountry"))

    def issue_nonce(self) -> str:
        nonce = secrets.token_hex(32)
        with self.session() as s, s.begin():
            s.add(Nonce(nonce=nonce, expires_at=time.time() + NONCE_TTL_S))
        return nonce

    def consume_nonce(self, nonce: str) -> bool:
        """Single use across every gateway process: only one delete of the row can succeed."""
        with self.session() as s, s.begin():
            result = s.execute(delete(Nonce).where(Nonce.nonce == nonce, Nonce.expires_at > time.time()))
        return result.rowcount == 1

    # ------------------------------------------------------------ enclaves

    def is_fresh(self, enclave: Enclave, now: float | None = None) -> bool:
        now = time.time() if now is None else now
        return (
            enclave.status == "active"
            and now - enclave.verified_at < self.settings.enclave_ttl_s
            and now - enclave.last_seen < self.settings.enclave_heartbeat_s
        )

    def fresh_enclaves(self, s: Session, profile_id: str | None = None, privacy: str | None = None) -> list[Enclave]:
        """Fresh enclaves, least loaded first. `privacy` ("private" or "standard") keeps only enclaves whose tier
        may run that mode (kuno_protocol.tiers.tier_serves); None keeps every tier."""
        now = time.time()
        rows = s.scalars(select(Enclave).where(Enclave.status == "active")).all()
        fresh = [
            e for e in rows
            if self.is_fresh(e, now)
            # Turbo candidates serve only validator benchmarks, never customer routes or capacity counts.
            and (profile_id in json.loads(e.profiles) if profile_id is not None else not is_candidate_profile_list(json.loads(e.profiles)))
            and (privacy is None or enclave_serves(e, privacy))
        ]
        return sorted(fresh, key=lambda e: (e.inflight / max(e.capacity, 1), -e.last_seen))

    def routable_enclaves(self, s: Session, profile_id: str, privacy: str) -> list[Enclave]:
        """Where a job of `profile_id` in `privacy` mode may go: fresh enclaves whose tier serves the mode.
        Private jobs get confidential-tier enclaves only; an unknown mode gets nothing."""
        return self.fresh_enclaves(s, profile_id, privacy=privacy)

    def has_capacity(self, profile: ModelProfile, privacy: str | None = None) -> bool:
        """Takes `privacy` by keyword, so a route resolver can use `functools.partial(state.has_capacity, privacy=...)`."""
        with self.session() as s:
            return bool(self.fresh_enclaves(s, profile.id, privacy=privacy))

    def capacity_counts(self, s: Session, privacy: str | None = None) -> dict[str, int]:
        counts: dict[str, int] = {}
        for enclave in self.fresh_enclaves(s, privacy=privacy):
            for profile_id in json.loads(enclave.profiles):
                counts[profile_id] = counts.get(profile_id, 0) + 1
        return counts

    # ------------------------------------------------------------ hardware registry

    def enclave_hardware(self, s: Session, enclave_ids=None) -> dict[str, list[HardwareBinding]]:
        query = select(HardwareBinding).order_by(HardwareBinding.kind, HardwareBinding.token)
        if enclave_ids is not None:
            query = query.where(HardwareBinding.enclave_id.in_(list(enclave_ids)))
        grouped: dict[str, list[HardwareBinding]] = {}
        for binding in s.scalars(query).all():
            grouped.setdefault(binding.enclave_id, []).append(binding)
        return grouped

    def bind_hardware(self, s: Session, enclave: Enclave, identities, now: float) -> list[str]:
        """Binds verified identities to `enclave` (its hotkey already set) and returns the enclaves it replaced.

        Rules (PROTOCOL.md, "Hardware registry"):
          * an identity held by a fresh enclave of a different hotkey refuses the binding (HardwareInUse);
          * the same hotkey on the same GPU (or on the same platform where either side has no GPU
            identities) replaces the older enclave, which is marked stale: one GPU is in one VM;
          * the same hotkey on one platform with disjoint GPUs keeps both, since one host can run
            several confidential VMs that split its GPUs;
          * enclaves that are not fresh hold nothing, so a stale or retired enclave releases its hardware.
        Call it after every field of `enclave` is set: the queries here flush the session.
        """
        kinds = {identity.token: identity.kind for identity in identities}
        if not kinds:
            return []
        if self.postgres:
            for token in sorted(kinds):  # sorted, so two registrations never wait on each other in opposite order
                s.execute(text("select pg_advisory_xact_lock(hashtext(:token))"), {"token": token})
        rows = s.execute(
            select(HardwareBinding, Enclave)
            .join(Enclave, Enclave.id == HardwareBinding.enclave_id)
            .where(HardwareBinding.token.in_(list(kinds)), HardwareBinding.enclave_id != enclave.id)
        ).all()
        holders: dict[str, tuple[Enclave, set[str]]] = {}
        for binding, other in rows:
            if self.is_fresh(other, now):
                holders.setdefault(other.id, (other, set()))[1].add(binding.token)
        conflicts = [
            (kinds[token], other.id, other.miner_hotkey)
            for other, shared in holders.values()
            if other.miner_hotkey != enclave.miner_hotkey
            for token in sorted(shared)
        ]
        if conflicts:
            raise HardwareInUse(conflicts)

        my_gpus = {token for token, kind in kinds.items() if kind == "gpu"}
        their_hardware = self.enclave_hardware(s, holders) if holders else {}
        replaced = []
        for other, shared in holders.values():
            their_gpus = {b.token for b in their_hardware.get(other.id, []) if b.kind == "gpu"}
            if shared & my_gpus or not my_gpus or not their_gpus:
                other.status = "stale"
                replaced.append(other.id)

        existing = {b.token: b for b in s.scalars(select(HardwareBinding).where(HardwareBinding.enclave_id == enclave.id)).all()}
        for token, kind in kinds.items():
            binding = existing.get(token)
            if binding is None:
                s.add(
                    HardwareBinding(
                        token=token, enclave_id=enclave.id, kind=kind, miner_hotkey=enclave.miner_hotkey,
                        first_seen=now, last_seen=now,
                    )
                )
            else:
                binding.miner_hotkey, binding.last_seen = enclave.miner_hotkey, now
        return sorted(replaced)

    # ------------------------------------------------------------ jobs

    def next_work(self, enclave_id: str) -> MinerJob | MinerChallenge | None:
        """Claims the next challenge or queued job for an enclave. Also records liveness."""
        now = time.time()
        with self.claim_lock, self.session() as s, s.begin():
            enclave = s.get(Enclave, enclave_id, with_for_update=self.postgres)
            if enclave is None:
                return None
            enclave.last_seen = now
            challenge = s.scalars(
                select(Challenge)
                .where(Challenge.enclave_id == enclave_id, Challenge.status == "pending")
                .order_by(Challenge.created_at)
                .limit(1)
            ).first()
            if challenge is not None:
                challenge.status = "sent"
                return MinerChallenge(challenge_id=challenge.id, nonce=challenge.nonce)
            from .api_audits import claim_audits

            # Step audits are small and time-limited, so they go ahead of new jobs but after challenges.
            audits = claim_audits(s, enclave_id, now, limit=1)
            if audits:
                return audits[0]
            if enclave.status != "active" or enclave.inflight >= enclave.capacity:
                return None
            claim = (
                select(Job)
                .where(Job.enclave_id == enclave_id, Job.status == JobState.QUEUED.value)
                .order_by(Job.created_at)
                .limit(1)
            )
            if self.postgres:
                # Two gateway processes never hand the same job out twice.
                claim = claim.with_for_update(skip_locked=True)
            job = s.scalars(claim).first()
            if job is None:
                return None
            job.status = JobState.RUNNING.value
            job.stage = "starting"
            job.started_at = job.updated_at = now
            enclave.inflight += 1
            return MinerJob(
                job_id=job.id,
                params=GenerationParams.model_validate_json(job.params),
                enc=job.enc,
                ciphertext=job.ciphertext,
                input_blob_ids=json.loads(job.input_blob_ids),
            )

    def finish_job(self, s: Session, job: Job, status: JobState, error_code: str | None = None, error: str | None = None) -> None:
        """Moves a job to a terminal state, releasing the enclave slot and refunding failures.

        A standard job's output is verified against its receipt and stored as it succeeds (standard_jobs.ingest_output);
        an output that doesn't verify fails the job instead. Every safety_blocked failure is a strike on the account.
        """
        was_running = job.status == JobState.RUNNING.value
        now = time.time()
        if status is JobState.SUCCEEDED and job.privacy == "standard":
            from .standard_jobs import ingest_output

            problem = ingest_output(self, s, job, now)
            if problem is not None:
                status, error_code, error = JobState.FAILED, "bad_output", f"The worker's output failed verification: {problem}."
        job.status = status.value
        job.updated_at = job.finished_at = now
        job.error_code, job.error = error_code, error
        if status is not JobState.SUCCEEDED and s.get(Account, job.account_id) is not None:
            # Keyed on the job, so a failure reported twice is still refunded once.
            ledger.post(
                s, job.account_id, ledger.to_micros(job.price_usd), kind=ledger.REFUND, source="job",
                idempotency_key=f"refund:{job.id}", job_id=job.id, description=error_code,
            )
        if was_running:
            enclave = s.get(Enclave, job.enclave_id)
            if enclave is not None and enclave.inflight > 0:
                enclave.inflight -= 1
        if status is JobState.FAILED and error_code == "safety_blocked":
            from .moderation import record_strike

            record_strike(s, self.settings, job.account_id, "safety_blocked", job_id=job.id, now=now)
        # Queued in the same transaction, so a terminal job and its webhook can't disagree.
        webhooks.enqueue(s, job, job_status(job).model_dump(mode="json"), now)

    def janitor(self) -> None:
        from .api_audits import expire_audits

        now = time.time()
        expire_audits(self, now)
        with self.session() as s, s.begin():
            for enclave in s.scalars(select(Enclave).where(Enclave.status == "active")).all():
                if not self.is_fresh(enclave, now):
                    enclave.status = "stale"
            stale = {e.id for e in s.scalars(select(Enclave).where(Enclave.status != "active")).all()}
            last_seen = {e.id: e.last_seen for e in s.scalars(select(Enclave)).all()}
            for job in s.scalars(select(Job).where(Job.status == JobState.QUEUED.value)).all():
                quiet_for = now - last_seen.get(job.enclave_id, 0)
                if job.enclave_id in stale or quiet_for > self.settings.queued_grace_s:
                    self.finish_job(s, job, JobState.FAILED, "enclave_unavailable", "The assigned worker went offline before starting. Submit again.")
                elif now - job.created_at > self.settings.queue_timeout_s:
                    self.finish_job(s, job, JobState.FAILED, "queue_timeout", "No worker picked up the job in time. Submit again.")
            for job in s.scalars(select(Job).where(Job.status == JobState.RUNNING.value)).all():
                profile = self.profiles.get(job.profile_id)
                limit = profile.timeout_s if profile else 1800
                if job.enclave_id in stale or now - (job.started_at or now) > limit:
                    self.finish_job(s, job, JobState.FAILED, "timeout", "The worker did not finish in time.")
            for challenge in s.scalars(select(Challenge).where(Challenge.status.in_(["pending", "sent"]))).all():
                if now - challenge.created_at > CHALLENGE_TTL_S:
                    challenge.status = "expired"
            # Expired blobs (unused uploads, and content already hidden) except those a preservation hold keeps; also
            # ends expired holds and finishes the deletions holds deferred (holds.sweep_blobs). Blobs that belong to a
            # job never expire, so stored videos stay until their owner deletes them.
            from .holds import sweep_blobs
            from .standard_jobs import expire_unused_uploads

            sweep_blobs(self, s, now)
            expire_unused_uploads(self, s, now)
            # A day past expiry, sign-in links and sessions have nothing left to protect.
            s.execute(delete(LoginToken).where(LoginToken.expires_at < now - 86400))
            s.execute(delete(UserSession).where(UserSession.expires_at < now - 86400))
            s.execute(delete(Nonce).where(Nonce.expires_at < now))
        self.limiter.prune(identity.AUTH_LIMIT_WINDOW_S)


def job_status(job: Job) -> JobStatus:
    return JobStatus(
        job_id=job.id,
        status=JobState(job.status),
        stage=job.stage,
        progress=job.progress,
        params=GenerationParams.model_validate_json(job.params),
        enclave_id=job.enclave_id,
        price_usd=job.price_usd,
        created_at=job.created_at,
        updated_at=job.updated_at,
        output_blob_id=job.output_blob_id,
        receipt=Receipt.model_validate_json(job.receipt) if job.receipt else None,
        error_code=job.error_code,
        error=job.error,
        privacy=job.privacy or "private",
    )


def enclave_tier(enclave: Enclave) -> str:
    """"confidential" or "open" (kuno_protocol.tiers), from the verified evidence kind stored at registration."""
    from kuno_protocol.tiers import tier_for_tee

    return tier_for_tee(enclave.tee)


def enclave_serves(enclave: Enclave, privacy: str) -> bool:
    """Whether this enclave's tier may run a job in `privacy` mode. Check it for any enclave a client names:
    a private job must never be created for, or handed to, an open-tier enclave."""
    from kuno_protocol.tiers import tier_serves

    return tier_serves(enclave_tier(enclave), privacy)


def enclave_public(enclave: Enclave, hardware: list[HardwareBinding] | None = None) -> dict:
    """`hardware` is self-reported and unverified; `hardware_ids` and `gpu_count` come from verified evidence.
    An open-tier enclave (`tier: "open"`) never has `hardware_ids`: nothing about its hardware is attested."""
    return {
        "enclave_id": enclave.id,
        "miner_hotkey": enclave.miner_hotkey,
        "tee": enclave.tee,
        "tier": enclave_tier(enclave),
        "image_digest": enclave.image_digest,
        "hpke_public_key": enclave.hpke_public_key,
        "signing_public_key": enclave.signing_public_key,
        "profiles": json.loads(enclave.profiles),
        "hardware": json.loads(enclave.hardware),
        "evidence": json.loads(enclave.evidence),
        "capacity": enclave.capacity,
        "inflight": enclave.inflight,
        "status": enclave.status,
        "verified_at": enclave.verified_at,
        "last_seen": enclave.last_seen,
        "gpu_count": enclave.gpu_count,
        "hardware_ids": [
            {"kind": b.kind, "token": b.token, "first_seen": b.first_seen, "last_seen": b.last_seen} for b in hardware or []
        ],
    }
