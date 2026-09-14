"""Migration 0012: data exports, account closures and the closed marker, appeals (one open per subject) and voided
strikes. Downgrade removes them and keeps every other row."""

from __future__ import annotations

import time
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import IntegrityError

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

NEW_TABLES = {"account_exports", "account_closures", "appeals"}


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _version(engine) -> str:
    with engine.connect() as conn:
        return conn.execute(text("select version_num from alembic_version")).scalar_one()


def _columns(engine, table: str) -> dict[str, bool]:
    return {c["name"]: c["nullable"] for c in inspect(engine).get_columns(table)}


def test_0012_adds_exports_closures_appeals_and_voided_strikes_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0011")
    assert not NEW_TABLES & set(inspect(engine).get_table_names())
    assert "voided_at" not in _columns(engine, "strikes") and "closed_at" not in _columns(engine, "accounts")
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text("insert into accounts (id, name, balance_micros, is_validator, created_at) values ('a1', 'Ada', 5000000, 0, :c)"),
            {"c": now},
        )
        conn.execute(
            text("insert into strikes (id, account_id, job_id, reason, created_at) values ('s1', 'a1', 'j1', 'safety_blocked', :c)"),
            {"c": now},
        )

    upgrade_database(engine, "0012")
    assert _version(engine) == "0012"
    assert NEW_TABLES <= set(inspect(engine).get_table_names())
    assert (_columns(engine, "strikes")["voided_at"], _columns(engine, "strikes")["voided_by"], _columns(engine, "accounts")["closed_at"]) == (
        True, True, True
    )
    assert set(_columns(engine, "appeals")) == {
        "id", "account_id", "user_id", "subject_kind", "subject_id", "statement", "status", "open_key", "item_id", "created_at",
        "resolved_at", "resolved_by", "decision", "note", "outcome", "notified_at",
    }
    assert _columns(engine, "account_closures") == {
        "id": False, "account_id": False, "user_id": False, "closed_at": False, "email_hash": False, "balance_micros": False, "detail": True,
    }
    unique = {i["name"] for table in NEW_TABLES for i in inspect(engine).get_indexes(table) if i["unique"]}
    assert unique == {
        "ix_account_exports_active_account_id", "ix_appeals_open_key", "ix_account_closures_account_id", "ix_account_closures_user_id",
    }
    with engine.connect() as conn:
        assert conn.execute(text("select account_id, voided_at from strikes where id = 's1'")).one() == ("a1", None)
        assert conn.execute(text("select balance_micros, closed_at from accounts where id = 'a1'")).one() == (5000000, None)

    insert_appeal = text(
        "insert into appeals (id, account_id, user_id, subject_kind, subject_id, statement, status, open_key, created_at) "
        "values (:id, 'a1', 'u1', 'strike', 's1', 'x', :status, :key, :c)"
    )
    with engine.begin() as conn:
        conn.execute(insert_appeal, {"id": "p1", "status": "open", "key": "a1:strike:s1", "c": now})
        # Decided appeals release the key, so any number of them can exist beside the open one.
        conn.execute(insert_appeal, {"id": "p2", "status": "upheld", "key": None, "c": now})
        conn.execute(insert_appeal, {"id": "p3", "status": "upheld", "key": None, "c": now})
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(insert_appeal, {"id": "p4", "status": "open", "key": "a1:strike:s1", "c": now})

    _downgrade(engine, "0011")
    assert _version(engine) == "0011"
    assert not NEW_TABLES & set(inspect(engine).get_table_names())
    assert "voided_at" not in _columns(engine, "strikes") and "closed_at" not in _columns(engine, "accounts")
    with engine.connect() as conn:
        assert conn.execute(text("select account_id from strikes where id = 's1'")).scalar_one() == "a1"
        assert conn.execute(text("select name from accounts where id = 'a1'")).scalar_one() == "Ada"

    upgrade_database(engine, "0012")
    assert _version(engine) == "0012"
