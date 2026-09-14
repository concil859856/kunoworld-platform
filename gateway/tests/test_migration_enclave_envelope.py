"""Migration 0016: enclaves.envelope. Enclaves registered before it have none (their profiles' full limits), a new
registration can store one, and it downgrades cleanly."""

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
    "insert into enclaves (id, miner_hotkey, tee, image_digest, hpke_public_key, signing_public_key, profiles, hardware, "
    "evidence, capacity, inflight, status, verified_at, last_seen) values (:id, '5Miner', 'open', 'sha256:img', 'k', 's', "
    "'[\"ltx-2.5-fast\"]', '{}', '{}', 1, 0, 'active', :t, :t)"
)


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _columns(engine) -> dict[str, bool]:
    return {c["name"]: c["nullable"] for c in inspect(engine).get_columns("enclaves")}


def test_0016_adds_a_nullable_envelope_that_existing_enclaves_leave_empty_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0015")
    assert "envelope" not in _columns(engine)
    with engine.begin() as conn:
        conn.execute(text(INSERT_ENCLAVE), {"id": "before", "t": time.time()})

    upgrade_database(engine, "0016")
    assert _columns(engine)["envelope"] is True
    envelope = {"ltx-2.5-fast": {"1080p": {"16:9": {"24": 8.0}}}}
    with engine.begin() as conn:
        conn.execute(text(INSERT_ENCLAVE), {"id": "after", "t": time.time()})  # an older gateway process mid-deploy
        conn.execute(text("update enclaves set envelope = :e where id = 'after'"), {"e": json.dumps(envelope)})
        values = dict(conn.execute(text("select id, envelope from enclaves")).all())
    assert values["before"] is None and json.loads(values["after"]) == envelope

    _downgrade(engine, "0015")
    assert "envelope" not in _columns(engine)
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from enclaves")).scalar_one() == 2

    upgrade_database(engine)
    assert "envelope" in _columns(engine)
