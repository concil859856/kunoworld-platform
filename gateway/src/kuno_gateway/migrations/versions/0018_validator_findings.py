"""validator_findings: the main validator's signed findings, relayed to auditor validators.

KunoWorld runs one main validator that tests miners (challenges, canaries, step audits) and auditor validators that
send no jobs. Each round the main validator signs a report of the miners it caught, with its weights, using its hotkey
(kuno_protocol.findings). The gateway checks the signature, keeps reports for KUNO_FINDINGS_RETENTION_S (7 days by
default), and serves them to validators, who verify the signature again against the main validator hotkey they trust.

Downgrade drops the table.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "validator_findings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("validator_hotkey", sa.String(64), nullable=False),
        sa.Column("issued_at", sa.Float(), nullable=False),
        sa.Column("received_at", sa.Float(), nullable=False),
        sa.Column("submitted_by", sa.String(32), nullable=False),
        sa.Column("document", sa.Text(), nullable=False),
    )
    op.create_index("ix_validator_findings_validator_hotkey", "validator_findings", ["validator_hotkey"])
    op.create_index("ix_validator_findings_issued_at", "validator_findings", ["issued_at"])


def downgrade() -> None:
    op.drop_index("ix_validator_findings_issued_at", table_name="validator_findings")
    op.drop_index("ix_validator_findings_validator_hotkey", table_name="validator_findings")
    op.drop_table("validator_findings")
