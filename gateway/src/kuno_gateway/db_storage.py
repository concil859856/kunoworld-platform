"""Storage keys, the C2PA issuance log and deletion tombstones (migration 0014).

* `storage_keks` / `storage_data_keys`: envelope encryption at rest (storage_keys.py). Every sealed object has its own
  data key, wrapped by a key-encryption key (KEK) version; rotation re-wraps the data keys, never the content.
* `c2pa_issuances`: one row per C2PA leaf certificate the gateway issued (c2pa_issuance.py). Replaces the JSONL file.
* `deletion_tombstones`: what was destroyed, so a database or bucket restore can be followed by replaying deletions
  (tombstones.py).
"""

from __future__ import annotations

from sqlalchemy import Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class StorageKek(Base):
    """A key-encryption key version. Version 0 is the legacy `KUNO_STANDARD_STORAGE_KEY`, which wraps nothing: objects
    sealed before envelope encryption are encrypted with it directly."""

    __tablename__ = "storage_keks"
    __table_args__ = (Index("uq_storage_keks_ref", "provider", "key_id", "provider_version", unique=True),)

    version: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False)
    # legacy, local, aws-kms or vault-transit
    provider: Mapped[str] = mapped_column(String(16))
    # local: the key file's id; aws-kms: the key ARN; vault-transit: "<mount>/<key name>"
    key_id: Mapped[str] = mapped_column(String(512))
    # local: the key file version; vault-transit: the transit key version; aws-kms: "" (KMS tracks key material itself)
    provider_version: Mapped[str] = mapped_column(String(64), default="")
    # active (new data keys are wrapped with it), previous (data keys may still reference it), retired (none do)
    status: Mapped[str] = mapped_column(String(16), index=True)
    # A random value wrapped by this KEK, and its SHA-256: start-up checks the KEK still unwraps it.
    # For version 0, a keyed fingerprint of the legacy key instead.
    canary: Mapped[str | None] = mapped_column(Text, nullable=True)
    canary_digest: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[float] = mapped_column(Float)
    activated_at: Mapped[float | None] = mapped_column(Float, nullable=True)
    retired_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class StorageDataKey(Base):
    """One object's data key, wrapped by a KEK version. Deleting the row makes every copy of the object unreadable."""

    __tablename__ = "storage_data_keys"

    # 32 hex characters, as in the sealed object's header; or the reserved ids "legacy-v0" and "keyed-hash".
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    kek_version: Mapped[int] = mapped_column(Integer, index=True)
    # base64url of the provider's wrapped key (KMS CiphertextBlob, Vault "vault:vN:..." text, or a local AEAD box)
    wrapped_key: Mapped[str] = mapped_column(Text)
    # What was sealed ("standard/video/<job>"), so deleting content can delete its keys.
    label: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float)
    rewrapped_at: Mapped[float | None] = mapped_column(Float, nullable=True)


class C2paIssuance(Base):
    """A C2PA signing certificate the gateway issued. Append-only: nothing updates or deletes these rows."""

    __tablename__ = "c2pa_issuances"
    __table_args__ = (Index("ix_c2pa_issuances_enclave_issued", "enclave_id", "issued_at"),)

    cert_sha256: Mapped[str] = mapped_column(String(64), primary_key=True)
    serial: Mapped[str] = mapped_column(String(40), index=True)
    enclave_id: Mapped[str] = mapped_column(String(64))
    evidence_digest: Mapped[str] = mapped_column(String(128))
    image_digest: Mapped[str] = mapped_column(String(128))
    # JSON list of profile ids
    profiles: Mapped[str] = mapped_column(Text)
    not_before: Mapped[float] = mapped_column(Float)
    not_after: Mapped[float] = mapped_column(Float)
    issued_at: Mapped[float] = mapped_column(Float, index=True)
    issuer_sha256: Mapped[str] = mapped_column(String(64))
    # gateway (issued here) or jsonl (imported from the old issuance.jsonl)
    source: Mapped[str] = mapped_column(String(16))


class DeletionTombstone(Base):
    """Something the platform destroyed. Replayed after a restore (`kuno-gateway reapply-deletions`)."""

    __tablename__ = "deletion_tombstones"
    __table_args__ = (Index("ix_deletion_tombstones_kind_ref", "kind", "ref"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # blob, job_blobs, standard_content, standard_upload, data_key, video; other modules add their own kinds
    kind: Mapped[str] = mapped_column(String(32))
    ref: Mapped[str] = mapped_column(String(200))
    account_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    created_at: Mapped[float] = mapped_column(Float, index=True)
    # When the tombstone was copied outside the database, so it survives a database restore.
    exported_at: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
