"""Standard mode, account safety and moderation: jobs.privacy, standard content, strikes, restrictions,
reports, the moderation queue and the operator audit log. Existing jobs are private."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None

_RESOLUTION = (
    ("resolved_at", sa.Float(), True),
    ("resolved_by", sa.String(64), True),
    ("resolution", sa.String(32), True),
    ("resolution_note", sa.Text(), True),
)


def _indexes(table: str, *columns: str) -> None:
    for column in columns:
        op.create_index(f"ix_{table}_{column}", table, [column])


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.add_column(sa.Column("privacy", sa.String(16), nullable=False, server_default="private"))

    op.create_table(
        "standard_jobs",
        sa.Column("job_id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=True),
        sa.Column("negative_prompt", sa.Text(), nullable=True),
        sa.Column("seed", sa.BigInteger(), nullable=True),
        sa.Column("options", sa.Text(), nullable=True),
        sa.Column("inputs", sa.Text(), nullable=True),
        sa.Column("output_key", sa.Text(), nullable=True),
        sa.Column("video_blob_id", sa.String(32), nullable=True),
        sa.Column("video_sha256", sa.String(64), nullable=True),
        sa.Column("video_bytes", sa.BigInteger(), nullable=True),
        sa.Column("thumbnail_blob_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("deleted_at", sa.Float(), nullable=True),
        sa.Column("delete_reason", sa.String(16), nullable=True),
    )
    _indexes("standard_jobs", "account_id", "expires_at")

    op.create_table(
        "standard_uploads",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("role", sa.String(24), nullable=False),
        sa.Column("mime", sa.String(64), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column("blob_id", sa.String(32), nullable=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
    )
    _indexes("standard_uploads", "account_id", "sha256", "job_id", "expires_at")

    op.create_table(
        "strikes",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    _indexes("strikes", "account_id", "created_at")
    op.create_index("uq_strikes_job_reason", "strikes", ["job_id", "reason"], unique=True)

    op.create_table(
        "account_restrictions",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("until", sa.Float(), nullable=True),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source", sa.String(16), nullable=False),
        sa.Column("created_by", sa.String(64), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("lifted_at", sa.Float(), nullable=True),
        sa.Column("lifted_by", sa.String(64), nullable=True),
    )
    _indexes("account_restrictions", "account_id")

    op.create_table(
        "reports",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("reason", sa.String(32), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("content_digest", sa.String(64), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("output_key", sa.Text(), nullable=True),
        sa.Column("contact_email", sa.String(320), nullable=True),
        sa.Column("reporter_ip_hash", sa.String(64), nullable=True),
        sa.Column("account_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        *(sa.Column(name, type_, nullable=nullable) for name, type_, nullable in _RESOLUTION),
    )
    _indexes("reports", "status", "priority", "job_id", "content_digest", "account_id", "created_at")

    op.create_table(
        "moderation_items",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("priority", sa.Integer(), nullable=False),
        sa.Column("report_id", sa.String(32), nullable=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("account_id", sa.String(32), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        *(sa.Column(name, type_, nullable=nullable) for name, type_, nullable in _RESOLUTION),
    )
    _indexes("moderation_items", "kind", "status", "priority", "report_id", "job_id", "account_id", "created_at")

    op.create_table(
        "operator_audit_log",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("operator", sa.String(64), nullable=False),
        sa.Column("action", sa.String(32), nullable=False),
        sa.Column("target_kind", sa.String(16), nullable=False),
        sa.Column("target_id", sa.String(64), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    _indexes("operator_audit_log", "operator", "action", "target_id", "created_at")


def downgrade() -> None:
    for table in (
        "operator_audit_log", "moderation_items", "reports", "account_restrictions", "strikes",
        "standard_uploads", "standard_jobs",
    ):
        op.drop_table(table)
    with op.batch_alter_table("jobs") as batch:
        batch.drop_column("privacy")
