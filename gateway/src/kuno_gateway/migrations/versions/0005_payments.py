"""Payments: top-ups from every method, linked Bittensor coldkeys, and chain watcher cursors."""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "payments",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("provider_ref", sa.String(200), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("requested_usd_micros", sa.BigInteger(), nullable=True),
        sa.Column("amount_usd_micros", sa.BigInteger(), nullable=True),
        sa.Column("asset", sa.String(32), nullable=True),
        sa.Column("asset_amount", sa.String(64), nullable=True),
        sa.Column("chain", sa.String(32), nullable=True),
        sa.Column("tx_hash", sa.String(128), nullable=True),
        sa.Column("from_address", sa.String(128), nullable=True),
        sa.Column("block_number", sa.BigInteger(), nullable=True),
        sa.Column("rate_usd", sa.String(64), nullable=True),
        sa.Column("rate_source", sa.String(200), nullable=True),
        sa.Column("checkout_url", sa.Text(), nullable=True),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
        sa.Column("credited_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_payments_account_id", "payments", ["account_id"])
    op.create_index("ix_payments_status", "payments", ["status"])
    op.create_index("uq_payments_provider_ref", "payments", ["provider", "provider_ref"], unique=True)

    op.create_table(
        "wallet_links",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("address", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_wallet_links_account_id", "wallet_links", ["account_id"])
    op.create_index("ix_wallet_links_address", "wallet_links", ["address"], unique=True)

    op.create_table(
        "wallet_challenges",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("address", sa.String(64), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("used_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_wallet_challenges_account_id", "wallet_challenges", ["account_id"])
    op.create_index("ix_wallet_challenges_expires_at", "wallet_challenges", ["expires_at"])

    op.create_table(
        "chain_cursors",
        sa.Column("chain", sa.String(32), primary_key=True),
        sa.Column("block_number", sa.BigInteger(), nullable=False),
        sa.Column("block_hash", sa.String(66), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    for table in ("chain_cursors", "wallet_challenges", "wallet_links", "payments"):
        op.drop_table(table)
