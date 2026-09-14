"""Migration 0015: jobs.billable_usd. Jobs from before it report 0, new rows default to 0, and it downgrades cleanly."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

INSERT_JOB = (
    "insert into jobs (id, account_id, profile_id, enclave_id, params, enc, ciphertext, input_blob_ids, status, "
    "progress, price_usd, created_at, updated_at, privacy) values (:id, 'dev', 'ltx-2.5-fast', 'e1', '{}', 'x', 'y', '[]', "
    "'succeeded', 1.0, 1.5, :t, :t, 'private')"
)


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _columns(engine) -> dict[str, bool]:
    return {c["name"]: c["nullable"] for c in inspect(engine).get_columns("jobs")}


def test_0015_adds_billable_usd_as_zero_for_existing_jobs_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0014")
    assert "billable_usd" not in _columns(engine)
    with engine.begin() as conn:
        conn.execute(text(INSERT_JOB), {"id": "before", "t": time.time()})

    upgrade_database(engine, "0015")
    assert _columns(engine)["billable_usd"] is False
    with engine.begin() as conn:
        # A row written without the column (an older gateway process mid-deploy) still gets 0.
        conn.execute(text(INSERT_JOB), {"id": "after", "t": time.time()})
        values = dict(conn.execute(text("select id, billable_usd from jobs")).all())
    assert values == {"before": 0.0, "after": 0.0}

    _downgrade(engine, "0014")
    assert "billable_usd" not in _columns(engine)
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from jobs")).scalar_one() == 2
        assert conn.execute(text("select price_usd from jobs where id = 'before'")).scalar_one() == 1.5

    upgrade_database(engine)
    assert "billable_usd" in _columns(engine)
