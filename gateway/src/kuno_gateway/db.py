from __future__ import annotations

from sqlalchemy import Boolean, Float, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    balance_usd: Mapped[float] = mapped_column(Float, default=0.0)
    is_validator: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[float] = mapped_column(Float)


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
