#!/usr/bin/env bash
# Runs the gateway's migrations against a Postgres database and checks that the resulting
# schema is exactly what the SQLAlchemy models describe, as tests/test_migrations.py does
# for SQLite.
#
#   KUNO_DATABASE_URL=postgresql+psycopg://kuno:kuno@localhost:5432/kuno_check \
#     platform/gateway/scripts/check_postgres_migrations.sh
#
# What it does, in the database the URL names:
#   1. upgrade_database() on the current search_path, twice (the second must be a no-op);
#   2. Base.metadata.create_all() into a throwaway schema, reflected with the same helper
#      tests/test_migrations.py uses, and compared; the throwaway schema is then dropped.
# Step 1 is exactly what the gateway does at start-up, so pointing this at a real database
# upgrades it. Use a scratch database unless that's what you want.
#
# The URL must name a driver the environment has, e.g. postgresql+psycopg:// (psycopg 3).
# PYTHON selects the interpreter (default: "uv run python" if uv is on PATH, else python3).
set -euo pipefail

: "${KUNO_DATABASE_URL:?set KUNO_DATABASE_URL to a Postgres URL, e.g. postgresql+psycopg://user:pass@host:5432/db}"
case "$KUNO_DATABASE_URL" in
  postgres*) ;;
  *) echo "KUNO_DATABASE_URL is not a Postgres URL" >&2; exit 2 ;;
esac

GATEWAY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${PYTHON:-}" ]]; then
  if command -v uv >/dev/null 2>&1; then PYTHON="uv run --no-sync python"; else PYTHON=python3; fi
fi

# shellcheck disable=SC2086  # PYTHON may be a command with arguments
exec $PYTHON - "$GATEWAY_DIR/tests" <<'PY'
import os
import secrets
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

sys.path.insert(0, sys.argv[1])
from test_migrations import _schema  # noqa: E402  (the SQLite test's comparison helper)

from kuno_gateway.db import Base  # noqa: E402
from kuno_gateway.migrations import upgrade_database  # noqa: E402

url = os.environ["KUNO_DATABASE_URL"]
safe_url = make_url(url).render_as_string(hide_password=True)
print(f"database: {safe_url}")

migrated = create_engine(url)
upgrade_database(migrated)
first = _schema(migrated)
upgrade_database(migrated)
if _schema(migrated) != first:
    sys.exit("FAIL: running the migrations a second time changed the schema")
with migrated.connect() as conn:
    head = conn.execute(text("select version_num from alembic_version")).scalar_one()
    default_schema = conn.execute(text("select current_schema()")).scalar_one()
print(f"migrated to {head} in schema {default_schema!r}; {len(first)} tables")

scratch = f"kuno_model_check_{secrets.token_hex(4)}"
with migrated.begin() as conn:
    conn.execute(text(f'create schema "{scratch}"'))
try:
    modelled = create_engine(url, connect_args={"options": f"-csearch_path={scratch}"})
    Base.metadata.create_all(modelled)
    expected = _schema(modelled)
    modelled.dispose()
finally:
    with migrated.begin() as conn:
        conn.execute(text(f'drop schema "{scratch}" cascade'))

if first == expected:
    print("OK: the migrated schema matches the models")
    sys.exit(0)

print("FAIL: the migrated schema differs from the models", file=sys.stderr)
for table in sorted(set(first) | set(expected)):
    got, want = first.get(table), expected.get(table)
    if got == want:
        continue
    if got is None or want is None:
        print(f"  table {table}: {'missing from migrations' if got is None else 'not in the models'}", file=sys.stderr)
        continue
    (g_cols, g_pk, g_idx), (w_cols, w_pk, w_idx) = got, want
    for col in sorted(set(g_cols) | set(w_cols)):
        if g_cols.get(col) != w_cols.get(col):
            print(f"  {table}.{col}: migrated={g_cols.get(col)} models={w_cols.get(col)}", file=sys.stderr)
    if g_pk != w_pk:
        print(f"  {table} primary key: migrated={g_pk} models={w_pk}", file=sys.stderr)
    for idx in sorted(g_idx ^ w_idx):
        side = "migrated only" if idx in g_idx else "models only"
        print(f"  {table} index {idx}: {side}", file=sys.stderr)
sys.exit(1)
PY
