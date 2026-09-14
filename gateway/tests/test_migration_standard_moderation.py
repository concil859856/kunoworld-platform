"""Migration 0008: existing jobs become private, and the revision downgrades and re-applies cleanly."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.db import Base
from kuno_gateway.migrations import upgrade_database

NEW_TABLES = {
    "standard_jobs", "standard_uploads", "strikes", "account_restrictions", "reports", "moderation_items", "operator_audit_log",
}


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def test_existing_jobs_are_private_and_0008_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0007")
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text(
                "insert into jobs (id, account_id, profile_id, enclave_id, params, enc, ciphertext, input_blob_ids, status, "
                "progress, price_usd, created_at, updated_at) values ('j1', 'dev', 'ltx-2.5-fast', 'e1', '{}', 'x', 'y', '[]', "
                "'succeeded', 1.0, 1.5, :t, :t)"
            ),
            {"t": now},
        )

    upgrade_database(engine)
    with engine.connect() as conn:
        assert conn.execute(text("select privacy from jobs where id = 'j1'")).scalar_one() == "private"
    assert NEW_TABLES <= set(inspect(engine).get_table_names())

    _downgrade(engine, "0007")
    insp = inspect(engine)
    assert not NEW_TABLES & set(insp.get_table_names())
    assert "privacy" not in {c["name"] for c in insp.get_columns("jobs")}
    with engine.connect() as conn:
        assert conn.execute(text("select price_usd from jobs where id = 'j1'")).scalar_one() == 1.5

    upgrade_database(engine)
    assert set(inspect(engine).get_table_names()) - {"alembic_version"} == set(Base.metadata.tables)
