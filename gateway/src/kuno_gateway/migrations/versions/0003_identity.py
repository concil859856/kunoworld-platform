"""Identity: users, several API keys per account, sign-in links and sessions.

Each account's single key moves into api_keys unchanged, so every existing key keeps working.
"""

from __future__ import annotations

import hashlib
import uuid

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("last_login_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "api_keys",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("account_id", sa.String(32), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("prefix", sa.String(16), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("last_used_at", sa.Float(), nullable=True),
        sa.Column("revoked_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_api_keys_account_id", "api_keys", ["account_id"])
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"], unique=True)

    op.create_table(
        "login_tokens",
        sa.Column("token_hash", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("used_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_login_tokens_email", "login_tokens", ["email"])
    op.create_index("ix_login_tokens_expires_at", "login_tokens", ["expires_at"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("user_id", sa.String(32), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("parent_id", sa.String(32), nullable=True),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("expires_at", sa.Float(), nullable=False),
        sa.Column("revoked_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_sessions_token_hash", "sessions", ["token_hash"], unique=True)
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_parent_id", "sessions", ["parent_id"])
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"])

    conn = op.get_bind()
    for account_id, name, key_hash, created_at in conn.execute(
        sa.text("select id, name, api_key_hash, created_at from accounts")
    ).all():
        conn.execute(
            sa.text(
                "insert into api_keys (id, account_id, name, prefix, key_hash, created_at)"
                " values (:id, :account_id, :name, 'legacy', :key_hash, :created_at)"
            ),
            {"id": uuid.uuid4().hex, "account_id": account_id, "name": f"{name} key", "key_hash": key_hash, "created_at": created_at},
        )

    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("owner_user_id", sa.String(32), nullable=True))
        batch.create_index("ix_accounts_owner_user_id", ["owner_user_id"])
        batch.drop_index("ix_accounts_api_key_hash")
        batch.drop_column("api_key_hash")


def downgrade() -> None:
    with op.batch_alter_table("accounts") as batch:
        batch.add_column(sa.Column("api_key_hash", sa.String(64), nullable=True))
    conn = op.get_bind()
    for (account_id,) in conn.execute(sa.text("select id from accounts")).all():
        key_hash = conn.execute(
            sa.text("select key_hash from api_keys where account_id = :a and revoked_at is null order by created_at limit 1"),
            {"a": account_id},
        ).scalar()
        # An account left with no live key gets an unguessable placeholder, so the column can be required.
        conn.execute(
            sa.text("update accounts set api_key_hash = :h where id = :a"),
            {"h": key_hash or hashlib.sha256(uuid.uuid4().bytes).hexdigest(), "a": account_id},
        )
    with op.batch_alter_table("accounts") as batch:
        batch.alter_column("api_key_hash", existing_type=sa.String(64), nullable=False)
        batch.create_index("ix_accounts_api_key_hash", ["api_key_hash"], unique=True)
        batch.drop_index("ix_accounts_owner_user_id")
        batch.drop_column("owner_user_id")
    for table in ("sessions", "login_tokens", "api_keys", "users"):
        op.drop_table(table)
