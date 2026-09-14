"""Private key sync (wrapped keys only the user can unwrap) and share links.

* `key_vaults`, `key_vault_unlockers`, `key_vault_job_keys`: an account's master key wrapped by each unlocker (a recovery
  code or a passkey), and each private job's key record wrapped by the master key. All wrapped in the browser; the
  platform holds no key that opens them (db_vault.py, key_vault.py).
* `video_shares`: owner-created links to one video, stored as a token hash (db_shares.py, shares.py).

No existing rows change. Downgrade drops the four tables, and with them every wrapped key and share link.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "key_vaults",
        sa.Column("account_id", sa.String(32), primary_key=True),
        sa.Column("master_key_id", sa.String(32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    op.create_table(
        "key_vault_unlockers",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("label", sa.String(64), nullable=True),
        sa.Column("params", sa.Text(), nullable=False),
        sa.Column("wrapped_master_key", sa.String(128), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_key_vault_unlockers_account_id", "key_vault_unlockers", ["account_id"])
    op.create_table(
        "key_vault_job_keys",
        sa.Column("account_id", sa.String(32), primary_key=True),
        sa.Column("job_id", sa.String(36), primary_key=True),
        sa.Column("wrapped", sa.Text(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    op.create_table(
        "video_shares",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("job_id", sa.String(36), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("privacy", sa.String(16), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=True),
        sa.Column("revoked_at", sa.Float(), nullable=True),
        sa.Column("ended_reason", sa.String(32), nullable=True),
        sa.Column("view_count", sa.Integer(), nullable=False),
    )
    op.create_index("ix_video_shares_account_id", "video_shares", ["account_id"])
    op.create_index("ix_video_shares_job_id", "video_shares", ["job_id"])
    op.create_index("ix_video_shares_token_hash", "video_shares", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_table("video_shares")
    op.drop_table("key_vault_job_keys")
    op.drop_table("key_vault_unlockers")
    op.drop_table("key_vaults")
