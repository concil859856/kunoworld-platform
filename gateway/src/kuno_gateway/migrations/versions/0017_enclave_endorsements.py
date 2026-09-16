"""enclaves.endorsements: what Intel and NVIDIA signed for the enclave's latest verified evidence.

JSON, kuno_protocol.endorsements.Endorsements: the DCAP collateral the TDX quote verified against and NRAS's signed
answers for its GPUs, with the JWKS entries that sign them. Routes serve it next to `evidence`, so a client that can't
reach Intel or NVIDIA (a browser) checks the quote's signature chain and the GPU claims itself instead of trusting the
gateway. NULL where nothing was signed by a third party: simulated and open-tier enclaves, and every enclave
registered before this revision until its next re-attestation.

Downgrade drops the column.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.add_column(sa.Column("endorsements", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.drop_column("endorsements")
