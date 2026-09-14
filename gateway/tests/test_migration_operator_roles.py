"""Migration 0010: the operator_roles table; job blobs and live standard content stop expiring; sample items close;
studio tokens are revoked. Downgrade drops the table and restores the old expiry of what 0010 kept."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.db import NEVER_EXPIRES, Base
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


def test_0010_adds_roles_keeps_stored_videos_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0009")
    assert "operator_roles" not in inspect(engine).get_table_names()
    now = time.time()
    week = 7 * 86400
    with engine.begin() as conn:
        insert_blob = text(
            "insert into blobs (id, owner_kind, owner_id, job_id, size, sha256, created_at, expires_at) "
            "values (:id, 'account', 'a1', :job, 1, 'x', :c, :e)"
        )
        conn.execute(insert_blob, {"id": "live", "job": "j1", "c": now, "e": now + week})
        conn.execute(insert_blob, {"id": "hidden", "job": "j2", "c": now - 10, "e": now - 5})  # hidden under a hold
        conn.execute(insert_blob, {"id": "unused", "job": None, "c": now, "e": now + week})
        conn.execute(
            text(
                "insert into standard_jobs (job_id, account_id, prompt, created_at, expires_at, deleted_at) "
                "values ('j1', 'a1', 'p', :c, :e, null), ('j3', 'a1', null, :c, :c, :c)"
            ),
            {"c": now, "e": now + 30 * 86400},
        )
        conn.execute(
            text(
                "insert into moderation_items (id, kind, status, priority, job_id, created_at) values "
                "('s1', 'sample', 'open', 0, 'j1', :c), ('r1', 'report', 'open', 20, 'j1', :c)"
            ),
            {"c": now},
        )
        conn.execute(
            text(
                "insert into sessions (id, token_hash, user_id, kind, created_at, expires_at) values "
                "('w', 'hw', 'u1', 'web', :c, :e), ('t', 'ht', 'u1', 'studio', :c, :e)"
            ),
            {"c": now, "e": now + 3600},
        )

    upgrade_database(engine)
    assert _version(engine) == "0010"
    columns = {c["name"]: c["nullable"] for c in inspect(engine).get_columns("operator_roles")}
    assert columns == {"id": False, "user_id": False, "role": False, "granted_by": False, "granted_at": False, "revoked_at": True}
    with engine.connect() as conn:
        expiry = dict(conn.execute(text("select id, expires_at from blobs")).all())
        assert expiry["live"] == NEVER_EXPIRES
        assert expiry["hidden"] == now - 5 and expiry["unused"] == now + week
        standard = dict(conn.execute(text("select job_id, expires_at from standard_jobs")).all())
        assert standard == {"j1": NEVER_EXPIRES, "j3": now}
        items = dict(conn.execute(text("select id, status from moderation_items")).all())
        assert items == {"s1": "resolved", "r1": "open"}
        sessions = dict(conn.execute(text("select id, revoked_at from sessions")).all())
        assert sessions["w"] is None and sessions["t"] is not None
        conn.execute(
            text("insert into operator_roles (id, user_id, role, granted_by, granted_at) values ('g', 'u1', 'admin', 'cli', :c)"),
            {"c": now},
        )
        conn.commit()

    _downgrade(engine, "0009")
    assert _version(engine) == "0009"
    assert "operator_roles" not in inspect(engine).get_table_names()
    with engine.connect() as conn:
        assert conn.execute(text("select expires_at from blobs where id = 'live'")).scalar_one() == now + week
        assert conn.execute(text("select expires_at from standard_jobs where job_id = 'j1'")).scalar_one() == now + 30 * 86400

    upgrade_database(engine)
    assert set(inspect(engine).get_table_names()) - {"alembic_version"} == set(Base.metadata.tables)
