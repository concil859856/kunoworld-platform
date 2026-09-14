"""Operator roles, and the storage decisions that came with them.

* `operator_roles`: operators sign in by email and hold `moderator` or `admin`; the shared admin token is break-glass.
* Stored videos stay until their owner deletes them: blobs that belong to a job, and live standard content, no
  longer expire. Blobs already hidden (expired, for example under a preservation hold) keep their expiry.
* Sampled review is gone: open `sample` queue items are closed.
* Studio tokens are gone: live ones are revoked.
"""

from __future__ import annotations

import time

import sqlalchemy as sa
from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None

# db.NEVER_EXPIRES, copied: a migration must not change when the application does.
NEVER = 253402300799.0
OLD_BLOB_RETENTION_S = 7 * 86400
OLD_STANDARD_RETENTION_S = 30 * 86400


def upgrade() -> None:
    op.create_table(
        "operator_roles",
        sa.Column("id", sa.String(32), primary_key=True),
        sa.Column("user_id", sa.String(32), nullable=False),
        sa.Column("role", sa.String(16), nullable=False),
        sa.Column("granted_by", sa.String(320), nullable=False),
        sa.Column("granted_at", sa.Float(), nullable=False),
        sa.Column("revoked_at", sa.Float(), nullable=True),
    )
    op.create_index("ix_operator_roles_user_id", "operator_roles", ["user_id"])

    now = time.time()
    op.execute(
        sa.text("update blobs set expires_at = :never where job_id is not null and expires_at > :now").bindparams(never=NEVER, now=now)
    )
    op.execute(sa.text("update standard_jobs set expires_at = :never where deleted_at is null").bindparams(never=NEVER))
    op.execute(
        sa.text(
            "update moderation_items set status = 'resolved', resolved_at = :now, resolved_by = 'system', "
            "resolution = 'dismiss', resolution_note = 'sampled review was discontinued' "
            "where kind = 'sample' and status = 'open'"
        ).bindparams(now=now)
    )
    op.execute(
        sa.text("update sessions set revoked_at = :now where kind = 'studio' and revoked_at is null").bindparams(now=now)
    )


def downgrade() -> None:
    op.drop_table("operator_roles")
    # The old retention periods come back for what 0010 kept indefinitely. Closed sample items and revoked studio
    # tokens stay closed and revoked.
    op.execute(
        sa.text("update blobs set expires_at = created_at + :ttl where expires_at = :never").bindparams(ttl=OLD_BLOB_RETENTION_S, never=NEVER)
    )
    op.execute(
        sa.text("update standard_jobs set expires_at = created_at + :ttl where expires_at = :never").bindparams(
            ttl=OLD_STANDARD_RETENTION_S, never=NEVER
        )
    )
