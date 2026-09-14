"""Migration 0013: the CyberTipline tables arrive, leave on downgrade, and re-apply cleanly."""

from __future__ import annotations

import time
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

from kuno_gateway import migrations
from kuno_gateway.migrations import upgrade_database

TABLES = {"cybertip_reports", "cybertip_report_files"}


def _downgrade(engine, target: str) -> None:
    config = Config()
    config.set_main_option("script_location", str(Path(migrations.__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, target)


def _version(engine) -> str:
    with engine.connect() as conn:
        return conn.execute(text("select version_num from alembic_version")).scalar_one()


def test_0013_adds_the_cybertip_tables_and_round_trips(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'gw.db'}")
    upgrade_database(engine, "0012")
    assert not TABLES & set(inspect(engine).get_table_names())
    now = time.time()
    with engine.begin() as conn:
        conn.execute(
            text("insert into preservation_holds (id, job_id, reason, created_by, created_at, expires_at) "
                 "values ('h1', 'j1', 'output_match', 'system', :t, :e)"),
            {"t": now, "e": now + 365 * 86400},
        )

    upgrade_database(engine, "0013")
    assert _version(engine) == "0013"
    insp = inspect(engine)
    reports = {c["name"]: c["nullable"] for c in insp.get_columns("cybertip_reports")}
    assert set(reports) == {
        "id", "status", "item_id", "hold_id", "job_id", "upload_id", "account_id", "incident_type", "draft", "report_xml",
        "validated_at", "environment", "ncmec_report_id", "attempts", "lease_until", "last_error_code", "last_error",
        "created_by", "created_at", "updated_at", "confirmed_by", "confirmed_at", "confirm_note", "submitted_at",
        "canceled_by", "canceled_at", "cancel_note",
    }
    assert not reports["status"] and not reports["draft"] and reports["ncmec_report_id"] and reports["report_xml"]
    files = {c["name"] for c in insp.get_columns("cybertip_report_files")}
    assert {"report_id", "source", "sha256", "md5", "ncmec_file_id", "details_sent_at"} <= files
    assert {"ix_cybertip_reports_item_id", "ix_cybertip_reports_ncmec_report_id"} <= {i["name"] for i in insp.get_indexes("cybertip_reports")}
    with engine.begin() as conn:
        conn.execute(
            text("insert into cybertip_reports (id, status, item_id, hold_id, incident_type, draft, created_by, created_at, updated_at) "
                 "values ('c1', 'draft', 'i1', 'h1', 'Child Sex Tourism', '{}', 'mo@example.com', :t, :t)"),
            {"t": now},
        )
        conn.execute(
            text("insert into cybertip_report_files (id, report_id, position, source, sha256, mime, file_name) "
                 "values ('f1', 'c1', 0, 'held_output', :d, 'video/mp4', 'video.mp4')"),
            {"d": "a" * 64},
        )
        assert conn.execute(text("select attempts from cybertip_reports where id = 'c1'")).scalar_one() == 0

    _downgrade(engine, "0012")
    assert _version(engine) == "0012"
    assert not TABLES & set(inspect(engine).get_table_names())
    with engine.connect() as conn:
        # Holds with the new reason are untouched by the downgrade.
        assert conn.execute(text("select reason from preservation_holds where id = 'h1'")).scalar_one() == "output_match"

    upgrade_database(engine)
    assert TABLES <= set(inspect(engine).get_table_names())
