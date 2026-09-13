"""Verified-mode step audits relayed from validators to enclaves."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audits",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("job_id", sa.String(36), nullable=False),
        sa.Column("enclave_id", sa.String(32), nullable=False),
        sa.Column("requested_by", sa.String(32), nullable=False),
        sa.Column("step", sa.Integer(), nullable=False),
        sa.Column("include_leaves", sa.Boolean(), nullable=False),
        sa.Column("recipient_public_key", sa.String(64), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error", sa.String(500), nullable=True),
        sa.Column("opening_blob_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("sent_at", sa.Float(), nullable=True),
        sa.Column("answered_at", sa.Float(), nullable=True),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_audits_job_id", "audits", ["job_id"])
    op.create_index("ix_audits_enclave_id", "audits", ["enclave_id"])
    op.create_index("ix_audits_requested_by", "audits", ["requested_by"])
    op.create_index("ix_audits_status", "audits", ["status"])
    op.create_index("ix_audits_expires_at", "audits", ["expires_at"])


def downgrade() -> None:
    op.drop_table("audits")
