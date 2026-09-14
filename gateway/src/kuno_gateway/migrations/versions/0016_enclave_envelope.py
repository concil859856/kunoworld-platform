"""enclaves.envelope: the serving envelope a worker advertised at registration.

JSON, kuno_protocol.envelope: profile id -> resolution -> aspect ratio -> fps -> the longest duration_s the enclave's
hardware serves (MINING.md §6, PROTOCOL.md "Miner registration"). Routing sends an enclave only jobs inside it, and a
`capacity_refused` failure inside it is recorded as `internal_error`. NULL is no envelope: the enclave serves its
profiles' full limits, which is what every enclave registered before this revision advertised.

Downgrade drops the column.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.add_column(sa.Column("envelope", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.drop_column("envelope")
