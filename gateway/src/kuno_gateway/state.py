"""Gateway runtime state and the job/enclave bookkeeping shared by the routers."""

from __future__ import annotations

import hashlib
import json
import secrets
import threading
import time
from pathlib import Path

from fastapi import Request
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from kuno_protocol.attestation import GoldenManifest
from kuno_protocol.canonical import b64d
from kuno_protocol.profiles import ModelProfile, load_profiles
from kuno_protocol.regions import normalize_country
from kuno_protocol.schemas import GenerationParams, JobState, JobStatus, MinerChallenge, MinerJob
from kuno_protocol.receipts import Receipt
from kuno_protocol.switch import SignedSwitch, SwitchConfig

from .blobstore import BlobStore
from .db import Account, Blob, Challenge, Enclave, Job, Setting
from .migrations import upgrade_database
from .settings import Settings

NONCE_TTL_S = 300
CHALLENGE_TTL_S = 300


def hash_api_key(api_key: str) -> str:
    return hashlib.sha256(api_key.encode()).hexdigest()


class GatewayState:
    def __init__(self, settings: Settings):
        self.settings = settings
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        sqlite = settings.db_url.startswith("sqlite")
        self.engine = create_engine(settings.db_url, connect_args={"check_same_thread": False} if sqlite else {})
        upgrade_database(self.engine)
        self.Session = sessionmaker(self.engine, expire_on_commit=False)
        self.blobs = BlobStore(settings.blob_dir)
        self.profiles: dict[str, ModelProfile] = load_profiles()
        self.manifest = GoldenManifest.model_validate_json(Path(settings.manifest_path).read_text())
        self.owner_public_key = b64d(settings.owner_public_key) if settings.owner_public_key else None
        # Production: dcap-qvl / Intel QVL and NVIDIA NVAT adapters. None means TDX evidence is rejected.
        self.quote_verifier = None
        self.gpu_verifier = None
        self.claim_lock = threading.Lock()
        self._nonces: dict[str, float] = {}
        self._nonce_lock = threading.Lock()
        self._switch = self._load_switch()
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
                            api_key_hash=hash_api_key(key),
                            balance_usd=self.settings.dev_balance_usd,
                            is_validator=is_validator,
                            created_at=time.time(),
                        )
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
        with self._nonce_lock:
            now = time.time()
            self._nonces = {n: exp for n, exp in self._nonces.items() if exp > now}
            self._nonces[nonce] = now + NONCE_TTL_S
        return nonce

    def consume_nonce(self, nonce: str) -> bool:
        with self._nonce_lock:
            expires = self._nonces.pop(nonce, None)
        return expires is not None and expires > time.time()

    # ------------------------------------------------------------ enclaves

    def is_fresh(self, enclave: Enclave, now: float | None = None) -> bool:
        now = time.time() if now is None else now
        return (
            enclave.status == "active"
            and now - enclave.verified_at < self.settings.enclave_ttl_s
            and now - enclave.last_seen < self.settings.enclave_heartbeat_s
        )

    def fresh_enclaves(self, s: Session, profile_id: str | None = None) -> list[Enclave]:
        now = time.time()
        rows = s.scalars(select(Enclave).where(Enclave.status == "active")).all()
        fresh = [e for e in rows if self.is_fresh(e, now) and (profile_id is None or profile_id in json.loads(e.profiles))]
        return sorted(fresh, key=lambda e: (e.inflight / max(e.capacity, 1), -e.last_seen))

    def has_capacity(self, profile: ModelProfile) -> bool:
        with self.session() as s:
            return bool(self.fresh_enclaves(s, profile.id))

    def capacity_counts(self, s: Session) -> dict[str, int]:
        counts: dict[str, int] = {}
        for enclave in self.fresh_enclaves(s):
            for profile_id in json.loads(enclave.profiles):
                counts[profile_id] = counts.get(profile_id, 0) + 1
        return counts

    # ------------------------------------------------------------ jobs

    def next_work(self, enclave_id: str) -> MinerJob | MinerChallenge | None:
        """Claims the next challenge or queued job for an enclave. Also records liveness."""
        now = time.time()
        with self.claim_lock, self.session() as s, s.begin():
            enclave = s.get(Enclave, enclave_id)
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
            if enclave.status != "active" or enclave.inflight >= enclave.capacity:
                return None
            job = s.scalars(
                select(Job)
                .where(Job.enclave_id == enclave_id, Job.status == JobState.QUEUED.value)
                .order_by(Job.created_at)
                .limit(1)
            ).first()
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
        """Moves a job to a terminal state, releasing the enclave slot and refunding failures."""
        was_running = job.status == JobState.RUNNING.value
        now = time.time()
        job.status = status.value
        job.updated_at = job.finished_at = now
        job.error_code, job.error = error_code, error
        if status is not JobState.SUCCEEDED:
            account = s.get(Account, job.account_id)
            if account is not None:
                account.balance_usd += job.price_usd
        if was_running:
            enclave = s.get(Enclave, job.enclave_id)
            if enclave is not None and enclave.inflight > 0:
                enclave.inflight -= 1

    def janitor(self) -> None:
        now = time.time()
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
            for blob in s.scalars(select(Blob).where(Blob.expires_at < now)).all():
                self.blobs.delete(blob.id)
                s.delete(blob)


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
    )


def enclave_public(enclave: Enclave) -> dict:
    return {
        "enclave_id": enclave.id,
        "miner_hotkey": enclave.miner_hotkey,
        "tee": enclave.tee,
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
    }
