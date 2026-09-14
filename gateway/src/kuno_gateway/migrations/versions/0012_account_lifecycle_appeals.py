"""Account closure, data export and appeals.

* `account_exports`: a copy of an account's data, built in the background into the blob store and deleted a week after
  it is ready. `active_account_id` is unique, so an account has at most one export queued or building.
* `account_closures`: accounts their owners closed, with a salted hash of the address (the users row keeps only a
  placeholder) and the unused balance, which is recorded and not refunded.
* `accounts.closed_at`: the account is closed; nothing may act for it again.
* `appeals`: a customer's appeal of a strike, restriction, removal or report resolution, and its decision.
  `open_key` is unique, so a subject has at most one open appeal.
* `strikes.voided_at`, `strikes.voided_by`: a strike overturned on appeal. Voided strikes don't count.

Downgrading drops the voided marks (overturned strikes count again), the closed marker, closures, exports and appeals.
It doesn't delete export blobs: run it only after the builder's pass has expired them.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "account_exports",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("active_account_id", sa.String(32), nullable=True),
        sa.Column("part_blob_ids", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("sha256", sa.String(64), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("started_at", sa.Float(), nullable=True),
        sa.Column("finished_at", sa.Float(), nullable=True),
        sa.Column("expires_at", sa.Float(), nullable=True),
        sa.Column("deleted_at", sa.Float(), nullable=True),
        sa.Column("locked_until", sa.Float(), nullable=True),
    )
    for column in ("account_id", "status", "created_at", "expires_at"):
        op.create_index(f"ix_account_exports_{column}", "account_exports", [column])
    op.create_index("ix_account_exports_active_account_id", "account_exports", ["active_account_id"], unique=True)

    op.create_table(
        "appeals",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("user_id", sa.String(32), nullable=False),
        sa.Column("subject_kind", sa.String(24), nullable=False),
        sa.Column("subject_id", sa.String(64), nullable=False),
        sa.Column("statement", sa.Text(), nullable=False),
        sa.Column("status", sa.String(16), nullable=False),
        sa.Column("open_key", sa.String(160), nullable=True),
        sa.Column("item_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("resolved_at", sa.Float(), nullable=True),
        sa.Column("resolved_by", sa.String(64), nullable=True),
        sa.Column("decision", sa.String(16), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("outcome", sa.Text(), nullable=True),
        sa.Column("notified_at", sa.Float(), nullable=True),
    )
    for column in ("account_id", "status", "item_id", "created_at"):
        op.create_index(f"ix_appeals_{column}", "appeals", [column])
    op.create_index("ix_appeals_open_key", "appeals", ["open_key"], unique=True)

    op.create_table(
        "account_closures",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("user_id", sa.String(32), nullable=False),
        sa.Column("closed_at", sa.Float(), nullable=False),
        sa.Column("email_hash", sa.String(160), nullable=False),
        sa.Column("balance_micros", sa.BigInteger(), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
    )
    op.create_index("ix_account_closures_account_id", "account_closures", ["account_id"], unique=True)
    op.create_index("ix_account_closures_user_id", "account_closures", ["user_id"], unique=True)
    op.create_index("ix_account_closures_closed_at", "account_closures", ["closed_at"])

    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("closed_at", sa.Float(), nullable=True))
    with op.batch_alter_table("strikes") as batch:
        batch.add_column(sa.Column("voided_at", sa.Float(), nullable=True))
        batch.add_column(sa.Column("voided_by", sa.String(64), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("strikes") as batch:
        batch.drop_column("voided_by")
        batch.drop_column("voided_at")
    with op.batch_alter_table("accounts") as batch:
        batch.drop_column("closed_at")
    for table in ("account_closures", "appeals", "account_exports"):
        op.drop_table(table)
