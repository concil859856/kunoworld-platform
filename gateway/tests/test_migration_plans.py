"""Migration 0022: enclaves.features and standard_jobs.plan. Rows from before it have neither (no enclave listed features,
no job was a plan), rows written after it keep them, and it downgrades cleanly."""

from __future__ import annotations

import json
import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

INSERT_ENCLAVE = (
    "insert into enclaves (id, tee, image_digest, hpke_public_key, signing_public_key, profiles, hardware, evidence, capacity, "
    "inflight, status, verified_at, last_seen) values (:id, 'mock', 'sha256:x', 'h', 's', '[]', '{}', '{}', 1, 0, 'active', :t, :t)"
)
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


def _columns(engine, table: str) -> dict[str, bool]:
    return {c["name"]: c["nullable"] for c in inspect(engine).get_columns(table)}


def test_0022_adds_nullable_features_and_plan_that_existing_rows_leave_empty_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0021")
    assert "features" not in _columns(engine, "enclaves") and "plan" not in _columns(engine, "standard_jobs")
    now = time.time()
    with engine.begin() as conn:
        conn.execute(text(INSERT_ENCLAVE), {"id": "before", "t": now})
        conn.execute(text(INSERT_STANDARD_JOB), {"id": "before", "prompt": "a quiet beach", "t": now})

    upgrade_database(engine, "0022")
    assert _columns(engine, "enclaves")["features"] is True and _columns(engine, "standard_jobs")["plan"] is True
    plan = json.dumps({"v": 1, "title": "A plan"})
    with engine.begin() as conn:
        conn.execute(text(INSERT_ENCLAVE), {"id": "after", "t": now})
        conn.execute(text("update enclaves set features = '[\"plan/1\"]' where id = 'after'"))
        conn.execute(text(INSERT_STANDARD_JOB), {"id": "after", "prompt": "a lighthouse keeper", "t": now})
        conn.execute(text("update standard_jobs set plan = :p where job_id = 'after'"), {"p": plan})
        features = dict(conn.execute(text("select id, features from enclaves")).all())
        plans = dict(conn.execute(text("select job_id, plan from standard_jobs")).all())
    assert features == {"before": None, "after": '["plan/1"]'} and plans == {"before": None, "after": plan}

    _downgrade(engine, "0021")
    assert "features" not in _columns(engine, "enclaves") and "plan" not in _columns(engine, "standard_jobs")
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from enclaves")).scalar_one() == 2
        assert conn.execute(text("select count(*) from standard_jobs")).scalar_one() == 2

    upgrade_database(engine)
    assert "features" in _columns(engine, "enclaves") and "plan" in _columns(engine, "standard_jobs")
