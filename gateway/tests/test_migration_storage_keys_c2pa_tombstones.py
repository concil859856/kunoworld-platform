"""Migration 0014: storage key tables, the C2PA issuance log and deletion tombstones; downgrade removes them."""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

TABLES = {"storage_keks", "storage_data_keys", "c2pa_issuances", "deletion_tombstones"}


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _version(engine) -> str:
    with engine.connect() as conn:
        return conn.execute(text("select version_num from alembic_version")).scalar_one()


def test_0014_adds_the_tables_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0013")
    assert not TABLES & set(inspect(engine).get_table_names())

    upgrade_database(engine, "0014")
    assert _version(engine) == "0014"
    insp = inspect(engine)
    assert TABLES <= set(insp.get_table_names())
    indexes = {i["name"]: (tuple(i["column_names"]), bool(i["unique"])) for i in insp.get_indexes("storage_keks")}
    assert indexes["uq_storage_keks_ref"] == (("provider", "key_id", "provider_version"), True)
    assert {i["name"] for i in insp.get_indexes("c2pa_issuances")} >= {"ix_c2pa_issuances_enclave_issued", "ix_c2pa_issuances_issued_at"}
    assert {i["name"] for i in insp.get_indexes("deletion_tombstones")} >= {"ix_deletion_tombstones_kind_ref", "ix_deletion_tombstones_exported_at"}
    assert insp.get_pk_constraint("c2pa_issuances")["constrained_columns"] == ["cert_sha256"]

    with engine.begin() as conn:
        conn.execute(text(
            "insert into storage_keks (version, provider, key_id, provider_version, status, created_at) "
            "values (1, 'local', 'k', '1', 'active', 1.0)"
        ))
        conn.execute(text(
            "insert into storage_data_keys (id, kek_version, wrapped_key, label, created_at) values ('d1', 1, 'w', 'standard/video/j', 1.0)"
        ))
        conn.execute(text(
            "insert into c2pa_issuances (cert_sha256, serial, enclave_id, evidence_digest, image_digest, profiles, not_before, "
            "not_after, issued_at, issuer_sha256, source) values ('c', 's', 'e', 'ev', 'im', '[]', 1, 2, 1.5, 'i', 'gateway')"
        ))
        conn.execute(text(
            "insert into deletion_tombstones (id, kind, ref, account_id, created_at) values ('t1', 'blob', 'b', 'a', 1.0)"
        ))
        duplicate = "insert into storage_keks (version, provider, key_id, provider_version, status, created_at) values (2, 'local', 'k', '1', 'previous', 2.0)"
    try:
        with engine.begin() as conn:
            conn.execute(text(duplicate))
        raise AssertionError("the same KEK version was registered twice")
    except Exception as exc:  # IntegrityError
        assert "UNIQUE" in str(exc) or "unique" in str(exc)

    _downgrade(engine, "0013")
    assert _version(engine) == "0013"
    assert not TABLES & set(inspect(engine).get_table_names())

    upgrade_database(engine)
    assert TABLES <= set(inspect(engine).get_table_names())
    with engine.connect() as conn:
        assert conn.execute(text("select count(*) from deletion_tombstones")).scalar_one() == 0
