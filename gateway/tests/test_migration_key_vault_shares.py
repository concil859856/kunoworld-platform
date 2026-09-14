"""Migration 0011: the key sync and share-link tables, exactly as modelled; nothing else changes; down and up again."""

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

TABLES = {"key_vaults", "key_vault_unlockers", "key_vault_job_keys", "video_shares"}


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _version(engine) -> str:
    with engine.connect() as conn:
        return conn.execute(text("select version_num from alembic_version")).scalar_one()


def test_0011_adds_key_sync_and_share_tables_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0010")
    assert not TABLES & set(inspect(engine).get_table_names())
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text("insert into blobs (id, owner_kind, owner_id, job_id, size, sha256, created_at, expires_at) "
                 "values ('b1', 'account', 'a1', 'j1', 1, 'x', :c, :c)"),
            {"c": now},
        )

    upgrade_database(engine, "0011")
    assert _version(engine) == "0011"
    insp = inspect(engine)
    assert TABLES <= set(insp.get_table_names())
    nullable = lambda table: {c["name"]: c["nullable"] for c in insp.get_columns(table)}  # noqa: E731
    assert nullable("key_vaults") == {"account_id": False, "master_key_id": False, "version": False, "created_at": False, "updated_at": False}
    assert nullable("key_vault_unlockers") == {
        "id": False, "account_id": False, "kind": False, "label": True, "params": False, "wrapped_master_key": False, "created_at": False,
    }
    assert nullable("key_vault_job_keys") == {"account_id": False, "job_id": False, "wrapped": False, "created_at": False, "updated_at": False}
    assert nullable("video_shares") == {
        "id": False, "account_id": False, "job_id": False, "token_hash": False, "privacy": False, "created_at": False,
        "expires_at": True, "revoked_at": True, "ended_reason": True, "view_count": False,
    }
    assert insp.get_pk_constraint("key_vault_job_keys")["constrained_columns"] == ["account_id", "job_id"]
    indexes = {(i["name"], tuple(i["column_names"]), bool(i["unique"])) for i in insp.get_indexes("video_shares")}
    assert indexes == {
        ("ix_video_shares_account_id", ("account_id",), False),
        ("ix_video_shares_job_id", ("job_id",), False),
        ("ix_video_shares_token_hash", ("token_hash",), True),
    }

    with engine.begin() as conn:
        conn.execute(text("insert into key_vaults values ('a1', :m, 1, :c, :c)"), {"m": "0" * 32, "c": now})
        conn.execute(
            text("insert into key_vault_unlockers (id, account_id, kind, label, params, wrapped_master_key, created_at) "
                 "values (:i, 'a1', 'recovery_code', null, '{}', 'w', :c)"),
            {"i": "1" * 32, "c": now},
        )
        conn.execute(text("insert into key_vault_job_keys values ('a1', 'j1', 'w', :c, :c)"), {"c": now})
        conn.execute(
            text("insert into video_shares (id, account_id, job_id, token_hash, privacy, created_at, view_count) "
                 "values ('s1', 'a1', 'j1', :h, 'standard', :c, 0)"),
            {"h": "f" * 64, "c": now},
        )
    # One token hash, one link.
    with pytest.raises(IntegrityError), engine.begin() as conn:
        conn.execute(
            text("insert into video_shares (id, account_id, job_id, token_hash, privacy, created_at, view_count) "
                 "values ('s2', 'a1', 'j1', :h, 'standard', :c, 0)"),
            {"h": "f" * 64, "c": now},
        )

    _downgrade(engine, "0010")
    assert _version(engine) == "0010"
    assert not TABLES & set(inspect(engine).get_table_names())
    with engine.connect() as conn:
        assert conn.execute(text("select expires_at from blobs where id = 'b1'")).scalar_one() == now

    upgrade_database(engine, "0011")
    with engine.connect() as conn:
        assert all(conn.execute(text(f"select count(*) from {table}")).scalar_one() == 0 for table in TABLES)
