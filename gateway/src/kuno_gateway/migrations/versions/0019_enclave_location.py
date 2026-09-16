"""enclaves.location: the landmark round trips an enclave measured at registration, and what they showed.

For profiles bound to territory by their licence (MiniMax H3), a worker pings the owner's landmarks from inside its
confidential VM and sends the signed, timed answers (kuno_protocol.location). The gateway stores them with the
registration nonce they're bound to and its verdict per region policy, and publishes them so validators check the proof
themselves. NULL where no profile is territory-bound, the gateway has no landmark list, or the enclave registered
before this revision.

Downgrade drops the column.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.add_column(sa.Column("location", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.drop_column("location")
