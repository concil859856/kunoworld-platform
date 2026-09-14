"""Key sync (migration 0011). See subnet/PRIVACY_MODES.md, "Key sync", and key_vault.py.

Nothing here opens a video. Every value is wrapped in the customer's browser under a key the platform never receives:
the account master key under an unlocker's key (a recovery code or a passkey), and each private job's key record under
the master key. The gateway checks shapes and sizes; it can't unwrap anything.
"""

from __future__ import annotations

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class KeyVault(Base):
    """One per account: which master key generation the wrapped values belong to."""

    __tablename__ = "key_vaults"

    account_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    # Chosen by the browser that made (or last rotated) the master key; changes on rotation.
    master_key_id: Mapped[str] = mapped_column(String(32))
    # Bumped on every change, so a rotation can refuse to replace a vault another device changed meanwhile.
    version: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)


class KeyVaultUnlocker(Base):
    """The master key, wrapped under a key derived from something only the customer holds."""

    __tablename__ = "key_vault_unlockers"

    # Chosen by the browser, and part of the wrapped value's associated data.
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    account_id: Mapped[str] = mapped_column(String(32), index=True)
    # recovery_code or passkey
    kind: Mapped[str] = mapped_column(String(16))
    label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # JSON. recovery_code: {alg, iterations, salt}; passkey: {credential_id, prf_salt, rp_id, transports}. Public values.
    params: Mapped[str] = mapped_column(Text)
    # base64url of "KVM1" | IV | AES-256-GCM(master key) | tag
    wrapped_master_key: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[float] = mapped_column(Float)


class KeyVaultJobKey(Base):
    """A private job's key record (output key, enclave signing key, content digest, display metadata), wrapped under
    the master key with the account id and job id as associated data."""

    __tablename__ = "key_vault_job_keys"

    account_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    job_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    # base64url of "KVJ1" | IV | AES-256-GCM(record) | tag
    wrapped: Mapped[str] = mapped_column(Text)
    created_at: Mapped[float] = mapped_column(Float)
    updated_at: Mapped[float] = mapped_column(Float)


# ------------------------------------------------------------------ restores
#
# Deleting vault data records a tombstone (key_vault.py). After a database restore, `kuno-gateway reapply-deletions`
# (tombstones.py) replays them with these replayers, so a restore can't bring back an unlocker the customer removed
# (after a recovery code leaked, say), or a key they deleted. They're registered here, where the models load, because
# every gateway process imports the models, that command included.

# "key_vault" names an account: its vault, unlockers and job keys.
TOMBSTONE_VAULT = "key_vault"
TOMBSTONE_UNLOCKER = "key_vault_unlocker"
TOMBSTONE_JOB_KEY = "key_vault_job_key"


def _replay_delete(s, rows: list, dry_run: bool) -> str:
    from . import tombstones

    if not rows:
        return tombstones.ABSENT
    if dry_run:
        return tombstones.WOULD_DELETE
    for row in rows:
        s.delete(row)
    return tombstones.DELETED


def replay_vault(state, s, entry, now: float, dry_run: bool) -> str:
    from sqlalchemy import select

    rows: list = []
    for model in (KeyVaultJobKey, KeyVaultUnlocker, KeyVault):
        rows.extend(s.scalars(select(model).where(model.account_id == entry.ref, model.created_at <= entry.created_at)).all())
    return _replay_delete(s, rows, dry_run)


def replay_unlocker(state, s, entry, now: float, dry_run: bool) -> str:
    row = s.get(KeyVaultUnlocker, entry.ref)
    return _replay_delete(s, [row] if row is not None and row.created_at <= entry.created_at else [], dry_run)


def replay_job_key(state, s, entry, now: float, dry_run: bool) -> str:
    row = s.get(KeyVaultJobKey, (entry.account_id, entry.ref)) if entry.account_id else None
    return _replay_delete(s, [row] if row is not None and row.created_at <= entry.created_at else [], dry_run)


def _register_replayers() -> None:
    import importlib.util

    if importlib.util.find_spec(f"{__package__}.tombstones") is None:
        return
    from . import tombstones

    for kind, replayer in ((TOMBSTONE_VAULT, replay_vault), (TOMBSTONE_UNLOCKER, replay_unlocker), (TOMBSTONE_JOB_KEY, replay_job_key)):
        tombstones.register_replayer(kind, replayer)


_register_replayers()
