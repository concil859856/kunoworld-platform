"""Migration 0020: standard_jobs.shots. Standard jobs from before it have none (they aren't storyboards), a storyboard
stored after it keeps its shot prompts, and it downgrades cleanly."""

from __future__ import annotations

import json
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

INSERT_STANDARD_JOB = (
    "insert into standard_jobs (job_id, account_id, prompt, seed, options, inputs, created_at, expires_at) "
    "values (:id, 'acct', :prompt, 7, '{}', '[]', :t, :t)"
)


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _columns(engine) -> dict[str, bool]:
    return {c["name"]: c["nullable"] for c in inspect(engine).get_columns("standard_jobs")}


def test_0020_adds_nullable_shots_that_existing_standard_jobs_leave_empty_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0019")
    assert "shots" not in _columns(engine)
    with engine.begin() as conn:
        conn.execute(text(INSERT_STANDARD_JOB), {"id": "before", "prompt": "a quiet beach", "t": time.time()})

    upgrade_database(engine, "0020")
    assert _columns(engine)["shots"] is True
    shots = [{"prompt": "It leaves the harbor."}, {"prompt": "Night falls."}]
    with engine.begin() as conn:
        conn.execute(text(INSERT_STANDARD_JOB), {"id": "after", "prompt": "", "t": time.time()})
        conn.execute(text("update standard_jobs set shots = :s where job_id = 'after'"), {"s": json.dumps(shots)})
        values = dict(conn.execute(text("select job_id, shots from standard_jobs")).all())
    assert values["before"] is None and json.loads(values["after"]) == shots

    _downgrade(engine, "0019")
    assert "shots" not in _columns(engine)
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from standard_jobs")).scalar_one() == 2

    upgrade_database(engine)
    assert "shots" in _columns(engine)
