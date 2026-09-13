"""pytest plugin: run the gateway test suite against Postgres instead of SQLite.

The tests build their settings with `Settings.from_env({...})` and an explicit env dict, so
KUNO_DATABASE_URL in the environment never reaches them. With this plugin loaded and
KUNO_TEST_DATABASE_URL set, every test that doesn't name a database gets a fresh Postgres
schema of its own (via search_path), dropped afterwards.

    KUNO_TEST_DATABASE_URL=postgresql+psycopg://kuno:kuno@localhost:5432/kuno_test \\
      PYTHONPATH=platform/gateway/scripts pytest -p pytest_postgres platform/gateway/tests

Without KUNO_TEST_DATABASE_URL the plugin does nothing. tests/test_migrations.py builds its
own SQLite engines and stays on SQLite; scripts/check_postgres_migrations.sh is its
Postgres counterpart.
"""

from __future__ import annotations

import os
import secrets

import pytest

BASE_URL = os.environ.get("KUNO_TEST_DATABASE_URL")


def pytest_report_header(config):
    if BASE_URL:
        from sqlalchemy.engine import make_url

        return f"gateway database: {make_url(BASE_URL).render_as_string(hide_password=True)} (schema per test)"
    return None


@pytest.fixture(autouse=True)
def _gateway_postgres_schema(monkeypatch):
    if not BASE_URL:
        yield None
        return

    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url

    from kuno_gateway.settings import Settings

    schema = f"kt_{secrets.token_hex(6)}"
    admin = create_engine(BASE_URL, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f'create schema "{schema}"'))
    url = make_url(BASE_URL).update_query_dict({"options": f"-csearch_path={schema}"}).render_as_string(hide_password=False)

    original = Settings.from_env.__func__

    def from_env(cls, env=None):
        settings = original(cls, env)
        if settings.database_url is None:
            settings.database_url = url
        return settings

    monkeypatch.setattr(Settings, "from_env", classmethod(from_env))
    try:
        yield schema
    finally:
        with admin.connect() as conn:
            # Engines the test left open may still hold idle connections; don't wait on them.
            conn.execute(text("set lock_timeout = '5s'"))
            try:
                conn.execute(text(f'drop schema "{schema}" cascade'))
            except Exception:
                pass  # CI databases are throwaway; a leftover schema is harmless
        admin.dispose()
