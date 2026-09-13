"""Revision 0006 adds the hardware registry on top of a populated 0005 database and removes it again."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import kuno_gateway.migrations as migrations
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


def test_upgrade_to_0006_keeps_enclaves_and_downgrade_removes_the_registry(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gateway.db'}")
    upgrade_database(engine, "0005")
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text(
                "insert into enclaves (id, miner_hotkey, tee, image_digest, hpke_public_key, signing_public_key, profiles, "
                "hardware, evidence, capacity, inflight, status, verified_at, last_seen) values "
                "('e1', '5Miner', 'mock', 'sha256:x', 'h', 's', '[]', '{}', '{}', 1, 0, 'active', :t, :t)"
            ),
            {"t": now},
        )

    upgrade_database(engine, "0006")  # pinned: later revisions build on this one
    assert _version(engine) == "0006"
    insp = inspect(engine)
    assert "gpu_count" in {c["name"] for c in insp.get_columns("enclaves")}
    assert insp.get_pk_constraint("hardware_bindings")["constrained_columns"] == ["token", "enclave_id"]
    with engine.begin() as conn:
        assert conn.execute(text("select miner_hotkey, gpu_count from enclaves where id = 'e1'")).one() == ("5Miner", None)
        conn.execute(
            text(
                "insert into hardware_bindings (token, enclave_id, kind, miner_hotkey, first_seen, last_seen) "
                "values ('hw1:abc', 'e1', 'gpu', '5Miner', :t, :t)"
            ),
            {"t": now},
        )

    _downgrade(engine, "0005")
    assert _version(engine) == "0005"
    insp = inspect(engine)
    assert "hardware_bindings" not in insp.get_table_names()
    assert "gpu_count" not in {c["name"] for c in insp.get_columns("enclaves")}
    with engine.connect() as conn:
        assert conn.execute(text("select miner_hotkey from enclaves where id = 'e1'")).scalar_one() == "5Miner"

    upgrade_database(engine, "0006")
    assert _version(engine) == "0006"
    upgrade_database(engine)  # and on to head
