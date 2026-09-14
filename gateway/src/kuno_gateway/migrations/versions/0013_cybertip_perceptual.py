"""CyberTipline report drafts and submissions.

* `cybertip_reports`: a report a moderator prepared from a moderation item under a child-safety hold, the XML last
  validated, and what NCMEC answered (report id, attempts, errors). An admin confirms before anything is sent.
* `cybertip_report_files`: the files a report names (where the gateway keeps them and their digests, never the bytes)
  and NCMEC's file ids, so a retried submission resumes instead of starting over.

Perceptual hash lists stay in files (`KUNO_PERCEPTUAL_HASH_FILES`); a match's list name, category, distance and list
version are recorded on its moderation item. Holds with the new reason `output_match` fit the existing column.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "cybertip_reports",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("item_id", sa.String(32), nullable=False),
        sa.Column("hold_id", sa.String(32), nullable=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("upload_id", sa.String(32), nullable=True),
        sa.Column("account_id", sa.String(32), nullable=True),
        sa.Column("incident_type", sa.String(96), nullable=False),
        sa.Column("draft", sa.Text(), nullable=False),
        sa.Column("report_xml", sa.Text(), nullable=True),
        sa.Column("validated_at", sa.Float(), nullable=True),
        sa.Column("environment", sa.String(16), nullable=True),
        sa.Column("ncmec_report_id", sa.String(64), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lease_until", sa.Float(), nullable=True),
        sa.Column("last_error_code", sa.String(64), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.Column("confirmed_by", sa.String(64), nullable=True),
        sa.Column("confirmed_at", sa.Float(), nullable=True),
        sa.Column("confirm_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.Float(), nullable=True),
        sa.Column("canceled_by", sa.String(64), nullable=True),
        sa.Column("canceled_at", sa.Float(), nullable=True),
        sa.Column("cancel_note", sa.Text(), nullable=True),
    )
    for column in ("status", "item_id", "job_id", "account_id", "ncmec_report_id", "created_at"):
        op.create_index(f"ix_cybertip_reports_{column}", "cybertip_reports", [column])

    op.create_table(
        "cybertip_report_files",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("report_id", sa.String(32), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(24), nullable=False),
        sa.Column("hold_id", sa.String(32), nullable=True),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("upload_id", sa.String(32), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("md5", sa.String(32), nullable=True),
        sa.Column("size", sa.BigInteger(), nullable=True),
        sa.Column("mime", sa.String(64), nullable=False),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("ncmec_file_id", sa.String(64), nullable=True),
        sa.Column("uploaded_at", sa.Float(), nullable=True),
        sa.Column("details_xml", sa.Text(), nullable=True),
        sa.Column("details_sent_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_cybertip_report_files_report_id", "cybertip_report_files", ["report_id"])


def downgrade() -> None:
    op.drop_table("cybertip_report_files")
    op.drop_table("cybertip_reports")
