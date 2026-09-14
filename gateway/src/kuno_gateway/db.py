from __future__ import annotations

from sqlalchemy import BigInteger, Boolean, Float, Index, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# `expires_at` of anything kept until someone deletes it (9999-12-31T23:59:59Z): job blobs of both modes, and
# standard content. Stored videos never expire on their own; only their owner's deletion (or an operator's
# removal) destroys them, and preservation holds can still delay that.
NEVER_EXPIRES = 253402300799.0


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    # The signed-in user who owns this account; none for the seeded dev and validator accounts.
    owner_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    # Signs this account's webhook deliveries. Created the first time it is needed.
    webhook_secret: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # USD micro-dollars. Always the running total of this account's ledger entries.
    balance_micros: Mapped[int] = mapped_column(BigInteger, default=0)
    is_validator: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[float] = mapped_column(Float)
    # Set when its owner closed the account (account_closure.py, migration 0012). Nothing acts for it again.
    closed_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Stored lowercased: one person, one account, however they type their address.
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)
    last_login_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class ApiKey(Base):
    """A key for programs. Only its hash is stored; the key itself is shown once, at creation."""

    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(100))
    # The first characters, so people can tell their keys apart without seeing them.
    prefix: Mapped[str] = mapped_column(String(16))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)
    last_used_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    revoked_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class LoginToken(Base):
    """A sign-in link. Single use, short-lived, stored only as a hash."""

    __tablename__ = "login_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    used_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class UserSession(Base):
    """A web session, held by the website's server. (Rows of kind "studio" are retired studio tokens, never accepted.)"""

    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[str] = mapped_column(String(32), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    # A session issued from another ends with it. Only retired studio tokens used this.
    parent_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    revoked_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class Nonce(Base):
    """A single-use registration nonce, in the database so any gateway process can redeem it."""

    __tablename__ = "nonces"

    nonce: Mapped[str] = mapped_column(String(64), primary_key=True)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class RateLimitCounter(Base):
    """A fixed-window hit counter, for rate limits shared by several gateway processes."""

    __tablename__ = "rate_limit_counters"

    key: Mapped[str] = mapped_column(String(200), primary_key=True)
    window: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class WebhookDelivery(Base):
    """One job event to post to a customer's webhook, retried until it lands or gives up."""

    __tablename__ = "webhook_deliveries"
    __table_args__ = (Index("uq_webhook_deliveries_job_event", "job_id", "event", unique=True),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    job_id: Mapped[str] = mapped_column(String(36), index=True)
    url: Mapped[str] = mapped_column(Text)
    event: Mapped[str] = mapped_column(String(32))
    payload: Mapped[str] = mapped_column(Text)
    # pending, delivered or failed
    status: Mapped[str] = mapped_column(String(16), index=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    next_attempt_at: Mapped[float] = mapped_column(Float, index=True)
    # Claimed by one gateway process at a time.
    locked_until: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    delivered_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class Payment(Base):
    """A top-up from any payment method, credited to the ledger exactly once.

    provider_ref identifies the payment at its source — a Stripe Checkout session, a NOWPayments
    payment, or a chain event as block_hash:extrinsic:event — and is unique per provider.
    """

    __tablename__ = "payments"
    __table_args__ = (Index("uq_payments_provider_ref", "provider", "provider_ref", unique=True),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    provider: Mapped[str] = mapped_column(String(16))
    provider_ref: Mapped[str] = mapped_column(String(200))
    # created, pending, credited, failed, expired, needs_review
    status: Mapped[str] = mapped_column(String(24), index=True)
    requested_usd_micros: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    amount_usd_micros: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    asset: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # A decimal string in whole units, so nothing is lost to floating point.
    asset_amount: Mapped[str | None] = mapped_column(String(64), nullable=True)
    chain: Mapped[str | None] = mapped_column(String(32), nullable=True)
    tx_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    from_address: Mapped[str | None] = mapped_column(String(128), nullable=True)
    block_number: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    rate_usd: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rate_source: Mapped[str | None] = mapped_column(String(200), nullable=True)
    checkout_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSON: what the provider said, and the inputs to any valuation, for audit.
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)
    credited_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class WalletLink(Base):
    """A Bittensor coldkey proven to belong to an account. One account per coldkey."""

    __tablename__ = "wallet_links"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    address: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)


class WalletChallenge(Base):
    __tablename__ = "wallet_challenges"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    address: Mapped[str] = mapped_column(String(64))
    message: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[float] = mapped_column(Float, index=True)
    used_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class ChainCursor(Base):
    """The last finalized block a chain watcher fully processed."""

    __tablename__ = "chain_cursors"

    chain: Mapped[str] = mapped_column(String(32), primary_key=True)
    block_number: Mapped[int] = mapped_column(BigInteger)
    block_hash: Mapped[str] = mapped_column(String(66))
    updated_at: Mapped[float] = mapped_column(Float)


class LedgerEntry(Base):
    """One movement of money. The ledger is the record; Account.balance_micros is its total."""

    __tablename__ = "ledger_entries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    amount_micros: Mapped[int] = mapped_column(BigInteger)
    kind: Mapped[str] = mapped_column(String(16))
    source: Mapped[str] = mapped_column(String(32))
    # What makes posting safe to retry: a second entry with the same key is refused.
    idempotency_key: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    balance_after_micros: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[float] = mapped_column(Float, index=True)


class Enclave(Base):
    __tablename__ = "enclaves"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    miner_hotkey: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    tee: Mapped[str] = mapped_column(String(8))
    image_digest: Mapped[str] = mapped_column(String(128))
    hpke_public_key: Mapped[str] = mapped_column(String(64))
    signing_public_key: Mapped[str] = mapped_column(String(64))
    profiles: Mapped[str] = mapped_column(Text)
    hardware: Mapped[str] = mapped_column(Text)
    evidence: Mapped[str] = mapped_column(Text)
    capacity: Mapped[int] = mapped_column(Integer, default=1)
    inflight: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(16), default="active", index=True)
    verified_at: Mapped[float] = mapped_column(Float)
    last_seen: Mapped[float] = mapped_column(Float)
    # GPUs the last verified evidence attested; None when the verifier did not count them.
    gpu_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # The serving envelope from the last registration, as JSON (kuno_protocol.envelope): profile -> resolution -> aspect
    # ratio -> fps -> longest duration_s. None: the enclave serves its profiles' full limits. Migration 0016.
    envelope: Mapped[str | None] = mapped_column(Text, nullable=True)


class HardwareBinding(Base):
    """A verified hardware identity (kuno_protocol.hardware token) seen on an enclave.

    One row per (token, enclave): the history of which enclaves and hotkeys a device served.
    A token is *held* by an enclave only while that enclave is fresh (GatewayState.is_fresh),
    so a stale or retired enclave releases its hardware without any row changing.
    """

    __tablename__ = "hardware_bindings"

    token: Mapped[str] = mapped_column(String(64), primary_key=True)
    enclave_id: Mapped[str] = mapped_column(String(32), primary_key=True, index=True)
    kind: Mapped[str] = mapped_column(String(16))
    miner_hotkey: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    first_seen: Mapped[float] = mapped_column(Float)
    last_seen: Mapped[float] = mapped_column(Float)


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    profile_id: Mapped[str] = mapped_column(String(64))
    enclave_id: Mapped[str] = mapped_column(String(32), index=True)
    params: Mapped[str] = mapped_column(Text)
    enc: Mapped[str] = mapped_column(Text)
    ciphertext: Mapped[str] = mapped_column(Text)
    input_blob_ids: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), index=True)
    stage: Mapped[str | None] = mapped_column(String(64), nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    price_usd: Mapped[float] = mapped_column(Float)
    output_blob_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    receipt: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_digest: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)
    started_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    finished_at: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    # private (end to end, confidential miners only) or standard (sealed by the gateway, any miner). Migration 0008.
    privacy: Mapped[str] = mapped_column(String(16), default="private", server_default="private")
    # The USD of real customer money this job earned the network: price x the account's paid share when it was charged
    # (ledger.paid_share). 0 for validator accounts' jobs, and set to 0 when the job is refunded. Migration 0015.
    billable_usd: Mapped[float] = mapped_column(Float, default=0.0, server_default="0")


class Blob(Base):
    __tablename__ = "blobs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_kind: Mapped[str] = mapped_column(String(8))
    owner_id: Mapped[str] = mapped_column(String(36), index=True)
    job_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[float] = mapped_column(Float)
    expires_at: Mapped[float] = mapped_column(Float, index=True)


class Challenge(Base):
    __tablename__ = "challenges"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    enclave_id: Mapped[str] = mapped_column(String(32), index=True)
    requested_by: Mapped[str] = mapped_column(String(32))
    nonce: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(16), index=True)
    evidence: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    answered_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)
