"""Elements: reusable characters, products, locations, styles and voices, encrypted by the customer (ELEMENTS.md).

* `elements`: one row per Element, keyed by account and a client-chosen id. The element key wrapped under the account's
  Elements key, the sealed record (kind, name, description, consent, file details) and sizes. Nothing readable.
* `element_files`: each Element's sealed files, in order, pointing at objects in the blob store.

No existing rows change. Downgrade drops both tables, and with them every Element's rows; the sealed objects stay in the
blob store, unreferenced ciphertext nobody can open.
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "elements",
        sa.Column("account_id", sa.String(32), primary_key=True),
        sa.Column("element_id", sa.String(32), primary_key=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("master_key_id", sa.String(32), nullable=False),
        sa.Column("wrapped_key", sa.String(128), nullable=False),
        sa.Column("meta", sa.Text(), nullable=False),
        sa.Column("files_bytes", sa.BigInteger(), nullable=False),
        sa.Column("rules_affirmed_at", sa.Float(), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.Column("updated_at", sa.Float(), nullable=False),
    )
    op.create_table(
        "element_files",
        sa.Column("account_id", sa.String(32), primary_key=True),
        sa.Column("element_id", sa.String(32), primary_key=True),
        sa.Column("position", sa.Integer(), primary_key=True),
        sa.Column("blob_id", sa.String(32), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
    )
    op.create_index("ix_element_files_blob_id", "element_files", ["blob_id"], unique=True)


def downgrade() -> None:
    op.drop_table("element_files")
    op.drop_table("elements")
