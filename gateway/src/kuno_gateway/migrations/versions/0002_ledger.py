"""Ledger: money as integer micro-dollars, every movement recorded.

Existing balances are carried over as one opening entry per account, so from this revision on
an account's balance always equals the sum of its entries.
"""

from __future__ import annotations

import time
import uuid
from decimal import ROUND_HALF_UP, Decimal

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def _micros(usd: float) -> int:
    # Frozen copy of ledger.to_micros: a revision must not change when application code does.
    return int((Decimal(str(usd)) * 1_000_000).to_integral_value(rounding=ROUND_HALF_UP))


def upgrade() -> None:
    op.create_table(
        "ledger_entries",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("amount_micros", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("idempotency_key", sa.String(200), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("balance_after_micros", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_ledger_entries_account_id", "ledger_entries", ["account_id"])
    op.create_index("ix_ledger_entries_idempotency_key", "ledger_entries", ["idempotency_key"], unique=True)
    op.create_index("ix_ledger_entries_job_id", "ledger_entries", ["job_id"])
    op.create_index("ix_ledger_entries_created_at", "ledger_entries", ["created_at"])

    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("balance_micros", sa.BigInteger(), nullable=True))

    conn = op.get_bind()
    now = time.time()
    for account_id, balance_usd in conn.execute(sa.text("select id, balance_usd from accounts")).all():
        micros = _micros(balance_usd or 0.0)
        conn.execute(sa.text("update accounts set balance_micros = :m where id = :id"), {"m": micros, "id": account_id})
        if micros:
            conn.execute(
                sa.text(
                    "insert into ledger_entries (id, account_id, amount_micros, kind, source, idempotency_key,"
                    " job_id, description, balance_after_micros, created_at)"
                    " values (:id, :account_id, :amount, 'adjustment', 'migration', :key, null, :description, :amount, :now)"
                ),
                {
                    "id": uuid.uuid4().hex,
                    "account_id": account_id,
                    "amount": micros,
                    "key": f"opening:{account_id}",
                    "description": "Balance carried over when the ledger was introduced",
                    "now": now,
                },
            )

    with op.batch_alter_table("accounts") as batch:
        batch.alter_column("balance_micros", existing_type=sa.BigInteger(), nullable=False)
        batch.drop_column("balance_usd")


def downgrade() -> None:
    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("balance_usd", sa.Float(), nullable=True))
    op.execute("update accounts set balance_usd = balance_micros / 1000000.0")
    with op.batch_alter_table("accounts") as batch:
        batch.alter_column("balance_usd", existing_type=sa.Float(), nullable=False)
        batch.drop_column("balance_micros")
    op.drop_table("ledger_entries")
