"""jobs.billable_usd: the USD of real customer money a job earned the network.

It is set when a job is charged, as the price times the share of the account's credit that came from real payments
(ledger.paid_share): 0 for validator accounts' jobs, and set to 0 when the job is refunded. Validators read it in the
ledger feed. Jobs charged before this revision get 0: the paid share at their charge time wasn't recorded, and an
unknown amount is never reported as revenue.

Downgrade drops the column.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.add_column(sa.Column("billable_usd", sa.Float(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("jobs") as batch:
        batch.drop_column("billable_usd")
