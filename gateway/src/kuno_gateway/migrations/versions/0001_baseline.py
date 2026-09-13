"""Baseline: the schema as it stood before migrations."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("api_key_hash", sa.String(64), nullable=False),
        sa.Column("balance_usd", sa.Float(), nullable=False),
        sa.Column("is_validator", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_accounts_api_key_hash", "accounts", ["api_key_hash"], unique=True)

    op.create_table(
        "enclaves",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("miner_hotkey", sa.String(64), nullable=True),
        sa.Column("tee", sa.String(8), nullable=False),
        sa.Column("image_digest", sa.String(128), nullable=False),
        sa.Column("hpke_public_key", sa.String(64), nullable=False),
        sa.Column("signing_public_key", sa.String(64), nullable=False),
        sa.Column("profiles", sa.Text(), nullable=False),
        sa.Column("hardware", sa.Text(), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("inflight", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("verified_at", sa.Float(), nullable=False),
        sa.Column("last_seen", sa.Float(), nullable=False),
    )
    op.create_index("ix_enclaves_miner_hotkey", "enclaves", ["miner_hotkey"])
    op.create_index("ix_enclaves_status", "enclaves", ["status"])

    op.create_table(
        "jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("profile_id", sa.String(64), nullable=False),
        sa.Column("enclave_id", sa.String(32), nullable=False),
        sa.Column("params", sa.Text(), nullable=False),
        sa.Column("enc", sa.Text(), nullable=False),
        sa.Column("ciphertext", sa.Text(), nullable=False),
        sa.Column("input_blob_ids", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("stage", sa.String(64), nullable=True),
        sa.Column("progress", sa.Float(), nullable=False),
        sa.Column("price_usd", sa.Float(), nullable=False),
        sa.Column("output_blob_id", sa.String(32), nullable=True),
        sa.Column("receipt", sa.Text(), nullable=True),
        sa.Column("content_digest", sa.String(64), nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("webhook_url", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.Column("started_at", sa.Float(), nullable=True),
        sa.Column("finished_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_jobs_account_id", "jobs", ["account_id"])
    op.create_index("ix_jobs_enclave_id", "jobs", ["enclave_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_content_digest", "jobs", ["content_digest"])
    op.create_index("ix_jobs_finished_at", "jobs", ["finished_at"])

    op.create_table(
        "blobs",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("owner_kind", sa.String(8), nullable=False),
        sa.Column("owner_id", sa.String(36), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_blobs_owner_id", "blobs", ["owner_id"])
    op.create_index("ix_blobs_job_id", "blobs", ["job_id"])
    op.create_index("ix_blobs_expires_at", "blobs", ["expires_at"])

    op.create_table(
        "challenges",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("enclave_id", sa.String(32), nullable=False),
        sa.Column("requested_by", sa.String(32), nullable=False),
        sa.Column("nonce", sa.String(128), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("evidence", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("answered_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_challenges_enclave_id", "challenges", ["enclave_id"])
    op.create_index("ix_challenges_status", "challenges", ["status"])

    op.create_table(
        "settings",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("value", sa.Text(), nullable=False),
    )


def downgrade() -> None:
    for table in ("settings", "challenges", "blobs", "jobs", "enclaves", "accounts"):
        op.drop_table(table)
