"""Envelope storage keys, the C2PA issuance log, and deletion tombstones for backups.

* `storage_keks`, `storage_data_keys`: every object sealed at rest gets its own data key, wrapped by a key-encryption
  key version (storage_keys.py). Objects sealed before this keep decrypting with `KUNO_STANDARD_STORAGE_KEY` (KEK v0).
* `c2pa_issuances`: the issuance log moves from a JSONL file into the database. The file is imported at start-up
  (idempotently), not here: a migration doesn't know the data directory.
* `deletion_tombstones`: destroyed content, replayed after a database or bucket restore.

Downgrade drops the four tables. Data keys go with them, so only downgrade a database whose storage holds nothing sealed
under envelope encryption (restore the pre-upgrade backup instead).
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "storage_keks",
        sa.Column("version", sa.Integer(), primary_key=True, autoincrement=False),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("key_id", sa.String(512), nullable=False),
        sa.Column("provider_version", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("canary", sa.Text(), nullable=True),
        sa.Column("canary_digest", sa.String(64), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("activated_at", sa.Float(), nullable=True),
        sa.Column("retired_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_storage_keks_status", "storage_keks", ["status"])
    op.create_index("uq_storage_keks_ref", "storage_keks", ["provider", "key_id", "provider_version"], unique=True)

    op.create_table(
        "storage_data_keys",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("kek_version", sa.Integer(), nullable=False),
        sa.Column("wrapped_key", sa.Text(), nullable=False),
        sa.Column("label", sa.String(200), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("rewrapped_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_storage_data_keys_kek_version", "storage_data_keys", ["kek_version"])
    op.create_index("ix_storage_data_keys_label", "storage_data_keys", ["label"])

    op.create_table(
        "c2pa_issuances",
        sa.Column("cert_sha256", sa.String(64), primary_key=True),
        sa.Column("serial", sa.String(40), nullable=False),
        sa.Column("enclave_id", sa.String(64), nullable=False),
        sa.Column("evidence_digest", sa.String(128), nullable=False),
        sa.Column("image_digest", sa.String(128), nullable=False),
        sa.Column("profiles", sa.Text(), nullable=False),
        sa.Column("not_before", sa.Float(), nullable=False),
        sa.Column("not_after", sa.Float(), nullable=False),
        sa.Column("issued_at", sa.Float(), nullable=False),
        sa.Column("issuer_sha256", sa.String(64), nullable=False),
        sa.Column("source", sa.String(16), nullable=False),
    )
    op.create_index("ix_c2pa_issuances_serial", "c2pa_issuances", ["serial"])
    op.create_index("ix_c2pa_issuances_issued_at", "c2pa_issuances", ["issued_at"])
    op.create_index("ix_c2pa_issuances_enclave_issued", "c2pa_issuances", ["enclave_id", "issued_at"])

    op.create_table(
        "deletion_tombstones",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("kind", sa.String(32), nullable=False),
        sa.Column("ref", sa.String(200), nullable=False),
        sa.Column("account_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("exported_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_deletion_tombstones_account_id", "deletion_tombstones", ["account_id"])
    op.create_index("ix_deletion_tombstones_created_at", "deletion_tombstones", ["created_at"])
    op.create_index("ix_deletion_tombstones_exported_at", "deletion_tombstones", ["exported_at"])
    op.create_index("ix_deletion_tombstones_kind_ref", "deletion_tombstones", ["kind", "ref"])


def downgrade() -> None:
    op.drop_table("deletion_tombstones")
    op.drop_table("c2pa_issuances")
    op.drop_table("storage_data_keys")
    op.drop_table("storage_keks")
