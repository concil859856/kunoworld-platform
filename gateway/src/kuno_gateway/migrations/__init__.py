"""Database migrations.

The gateway upgrades its own database at start-up, so there is no separate migrate step to
forget. Every schema change is a revision in `versions/`; `create_all` is never used.
"""

from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import Engine, inspect

# Models that live outside db.py register on Base here, so the metadata always matches head.
from .. import db_audits, db_holds, db_moderation, db_roles  # noqa: F401

# The schema as it stood before migrations existed.
BASELINE = "0001"


def upgrade_database(engine: Engine, target: str = "head") -> None:
    """Brings the database up to `target`, adopting one created before migrations existed."""
    config = Config()
    config.set_main_option("script_location", str(Path(__file__).parent))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        tables = set(inspect(connection).get_table_names())
        # Earlier gateways built these tables directly. They already match the baseline, so
        # record that instead of trying to create them a second time.
        if "alembic_version" not in tables and "accounts" in tables:
            command.stamp(config, BASELINE)
        command.upgrade(config, target)
