"""Migration 0009: the preservation_holds table arrives, leaves on downgrade, and re-applies cleanly."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.db import Base
from kuno_gateway.migrations import upgrade_database


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _version(engine) -> str:
    with engine.connect() as conn:
        return conn.execute(text("select version_num from alembic_version")).scalar_one()


def test_0009_adds_preservation_holds_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0008")
    assert "preservation_holds" not in inspect(engine).get_table_names()
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text("insert into reports (id, status, reason, priority, created_at) values ('r1', 'open', 'csam', 100, :t)"), {"t": now}
        )

    upgrade_database(engine)
    assert _version(engine) == "0009"
    insp = inspect(engine)
    columns = {c["name"]: c["nullable"] for c in insp.get_columns("preservation_holds")}
    assert set(columns) == {
        "id", "job_id", "upload_id", "blob_id", "account_id", "reason", "report_id", "output_key", "created_by", "created_at",
        "expires_at", "released_at", "released_by", "note", "release_note",
    }
    assert not columns["reason"] and not columns["expires_at"] and columns["released_at"] and columns["report_id"]
    with engine.begin() as conn:
        conn.execute(
            text(
                "insert into preservation_holds (id, job_id, reason, report_id, created_by, created_at, expires_at) "
                "values ('h1', 'j1', 'report_csam', 'r1', 'carol', :t, :e)"
            ),
            {"t": now, "e": now + 365 * 86400},
        )

    _downgrade(engine, "0008")
    assert _version(engine) == "0008"
    assert "preservation_holds" not in inspect(engine).get_table_names()
    with engine.connect() as conn:
        assert conn.execute(text("select reason from reports where id = 'r1'")).scalar_one() == "csam"

    upgrade_database(engine)
    assert set(inspect(engine).get_table_names()) - {"alembic_version"} == set(Base.metadata.tables)
