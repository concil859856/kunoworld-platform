from __future__ import annotations

from alembic import context

from kuno_gateway.db import Base

connection = context.config.attributes.get("connection")
if connection is None:
    raise RuntimeError("Run migrations through kuno_gateway.migrations.upgrade_database.")

# Batch mode lets SQLite, which can't ALTER most things in place, apply the same revisions
# as Postgres by copying the table.
context.configure(connection=connection, target_metadata=Base.metadata, render_as_batch=True)

with context.begin_transaction():
    context.run_migrations()
