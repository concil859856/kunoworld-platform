"""The gateway's database is built and upgraded by migrations, which must match the models."""

from __future__ import annotations

import time

from sqlalchemy import Engine, create_engine, inspect, text

from kuno_gateway.db import Base
from kuno_gateway.migrations import BASELINE, upgrade_database


def _engine(path) -> Engine:
    return create_engine(f"sqlite:///{path}")


def _schema(engine: Engine) -> dict:
    insp = inspect(engine)
    schema = {}
    for table in sorted(t for t in insp.get_table_names() if t != "alembic_version"):
        columns = {c["name"]: (str(c["type"]), c["nullable"]) for c in insp.get_columns(table)}
        primary_key = tuple(insp.get_pk_constraint(table)["constrained_columns"])
        indexes = {(i["name"], tuple(i["column_names"]), bool(i["unique"])) for i in insp.get_indexes(table)}
        schema[table] = (columns, primary_key, indexes)
    return schema


def test_migrations_build_exactly_the_models(tmp_path):
    """A model change without a matching revision fails here, not in production."""
    migrated = _engine(tmp_path / "migrated.db")
    upgrade_database(migrated)
    modelled = _engine(tmp_path / "modelled.db")
    Base.metadata.create_all(modelled)
    assert _schema(migrated) == _schema(modelled)


def test_a_database_from_before_migrations_is_adopted_with_its_rows(tmp_path):
    engine = _engine(tmp_path / "legacy.db")
    # Reproduce a gateway database from before migrations: the baseline schema, no version table.
    upgrade_database(engine, BASELINE)
    with engine.begin() as conn:
        conn.execute(text("drop table alembic_version"))
        conn.execute(
            text(
                "insert into accounts (id, name, api_key_hash, balance_usd, is_validator, created_at) "
                "values ('dev', 'Developer', :h, 42.5, 0, :t)"
            ),
            {"h": "a" * 64, "t": time.time()},
        )

    upgrade_database(engine)

    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from alembic_version")).scalar_one() == 1
        assert conn.execute(text("select name from accounts where id = 'dev'")).scalar_one() == "Developer"
        # The float balance arrives as exact micro-dollars, backed by one opening ledger entry.
        assert conn.execute(text("select balance_micros from accounts where id = 'dev'")).scalar_one() == 42_500_000
        opening = conn.execute(
            text("select amount_micros, idempotency_key from ledger_entries where account_id = 'dev'")
        ).all()
        assert opening == [(42_500_000, "opening:dev")]


def test_upgrading_twice_is_harmless(tmp_path):
    engine = _engine(tmp_path / "twice.db")
    upgrade_database(engine)
    before = _schema(engine)
    upgrade_database(engine)
    assert _schema(engine) == before
