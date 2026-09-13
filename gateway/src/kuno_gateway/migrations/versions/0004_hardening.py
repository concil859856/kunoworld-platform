"""Hardening: shared nonces and rate-limit counters, webhook deliveries, per-account webhook secrets."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "nonces",
        sa.Column("nonce", sa.String(64), primary_key=True),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_nonces_expires_at", "nonces", ["expires_at"])

    op.create_table(
        "rate_limit_counters",
        sa.Column("key", sa.String(200), primary_key=True),
        sa.Column("window", sa.BigInteger(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_rate_limit_counters_expires_at", "rate_limit_counters", ["expires_at"])

    op.create_table(
        "webhook_deliveries",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("event", sa.String(32), nullable=False),
        sa.Column("payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("next_attempt_at", sa.Float(), nullable=False),
        sa.Column("locked_until", sa.Float(), nullable=True),
        sa.Column("last_status_code", sa.Integer(), nullable=True),
        sa.Column("last_error", sa.String(500), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("delivered_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_webhook_deliveries_account_id", "webhook_deliveries", ["account_id"])
    op.create_index("ix_webhook_deliveries_job_id", "webhook_deliveries", ["job_id"])
    op.create_index("ix_webhook_deliveries_status", "webhook_deliveries", ["status"])
    op.create_index("ix_webhook_deliveries_next_attempt_at", "webhook_deliveries", ["next_attempt_at"])
    op.create_index("uq_webhook_deliveries_job_event", "webhook_deliveries", ["job_id", "event"], unique=True)

    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("webhook_secret", sa.String(64), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("accounts") as batch:
        batch.drop_column("webhook_secret")
    for table in ("webhook_deliveries", "rate_limit_counters", "nonces"):
        op.drop_table(table)
