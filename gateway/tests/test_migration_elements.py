"""Migration 0021: the Elements tables. Created empty next to existing data, keyed per account, one object per file, and
dropped cleanly on downgrade."""

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

INSERT_ELEMENT = (
    "insert into elements (account_id, element_id, revision, master_key_id, wrapped_key, meta, files_bytes, "
    "rules_affirmed_at, created_at, updated_at) values (:account, :element, 1, :mk, 'KVE1', 'KUNOB1', 10, :t, :t, :t)"
)
INSERT_FILE = (
    "insert into element_files (account_id, element_id, position, blob_id, size, sha256, created_at) "
    "values (:account, :element, :position, :blob, 10, :digest, :t)"
)


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def test_0021_adds_the_elements_tables_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0020")
    assert not {"elements", "element_files"} & set(inspect(engine).get_table_names())

    upgrade_database(engine, "0021")
    insp = inspect(engine)
    assert insp.get_pk_constraint("elements")["constrained_columns"] == ["account_id", "element_id"]
    assert insp.get_pk_constraint("element_files")["constrained_columns"] == ["account_id", "element_id", "position"]
    now, element = time.time(), "e" * 32
    with engine.begin() as conn:
        # The same client-chosen id on two accounts is two Elements.
        for account in ("a" * 32, "b" * 32):
            conn.execute(text(INSERT_ELEMENT), {"account": account, "element": element, "mk": "m" * 32, "t": now})
        conn.execute(text(INSERT_FILE), {"account": "a" * 32, "element": element, "position": 0, "blob": "1" * 32, "digest": "d" * 64, "t": now})
    # One stored object belongs to one file.
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(text(INSERT_FILE), {"account": "b" * 32, "element": element, "position": 0, "blob": "1" * 32, "digest": "d" * 64, "t": now})

    _downgrade(engine, "0020")
    assert not {"elements", "element_files"} & set(inspect(engine).get_table_names())
    upgrade_database(engine)
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from elements")).scalar_one() == 0
