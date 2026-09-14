"""Preservation holds: content that removal, deletion and retention must hide but not destroy."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "preservation_holds",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("upload_id", sa.String(32), nullable=True),
        sa.Column("blob_id", sa.String(32), nullable=True),
        sa.Column("account_id", sa.String(32), nullable=True),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("report_id", sa.String(32), nullable=True),
        sa.Column("output_key", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("released_at", sa.Float(), nullable=True),
        sa.Column("released_by", sa.String(64), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("release_note", sa.Text(), nullable=True),
    )
    for column in ("job_id", "upload_id", "account_id", "report_id", "created_at", "expires_at", "released_at"):
        op.create_index(f"ix_preservation_holds_{column}", "preservation_holds", [column])


def downgrade() -> None:
    op.drop_table("preservation_holds")
