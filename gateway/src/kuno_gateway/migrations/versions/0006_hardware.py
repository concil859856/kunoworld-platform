"""Hardware registry: verified hardware identities bound to enclaves and hotkeys, and attested GPU counts."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hardware_bindings",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column("enclave_id", sa.String(32), primary_key=True),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("miner_hotkey", sa.String(64), nullable=True),
        sa.Column("first_seen", sa.Float(), nullable=False),
        sa.Column("last_seen", sa.Float(), nullable=False),
    )
    op.create_index("ix_hardware_bindings_enclave_id", "hardware_bindings", ["enclave_id"])
    op.create_index("ix_hardware_bindings_miner_hotkey", "hardware_bindings", ["miner_hotkey"])

    with op.batch_alter_table("enclaves") as batch:
        batch.add_column(sa.Column("gpu_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("enclaves") as batch:
        batch.drop_column("gpu_count")
    op.drop_table("hardware_bindings")
