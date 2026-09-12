from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    pairs = (line.split("=", 1) for line in path.read_text().splitlines() if "=" in line and not line.startswith("#"))
    return {k.strip(): v.strip() for k, v in pairs}


@dataclass
class Settings:
    data_dir: Path
    manifest_path: Path
    switch_path: Path | None = None
    owner_public_key: str | None = None
    admin_token: str | None = None
    dev_api_key: str | None = None
    validator_api_key: str | None = None
    database_url: str | None = None
    dev_balance_usd: float = 100.0
    # Dev only: lets tests and local runs pretend to be in another country.
    allow_country_override: bool = False
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:3000"])
    max_blob_bytes: int = 512 * 1024 * 1024
    enclave_ttl_s: int = 1800
    enclave_heartbeat_s: int = 120
    pull_wait_s: float = 20.0
    queue_timeout_s: int = 600
    blob_retention_s: int = 7 * 86400
    janitor_interval_s: float = 5.0

    @property
    def blob_dir(self) -> Path:
        return self.data_dir / "blobs"

    @property
    def db_url(self) -> str:
        return self.database_url or f"sqlite:///{self.data_dir / 'gateway.db'}"

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> Settings:
        env = dict(os.environ if env is None else env)
        data_dir = Path(env.get("KUNO_DATA_DIR", "data"))
        env = {**read_env_file(data_dir / "dev.env"), **env}
        switch = env.get("KUNO_SWITCH")
        return cls(
            data_dir=data_dir,
            manifest_path=Path(env.get("KUNO_MANIFEST", str(data_dir / "manifest.json"))),
            switch_path=Path(switch) if switch else None,
            owner_public_key=env.get("KUNO_OWNER_PUBLIC_KEY"),
            admin_token=env.get("KUNO_ADMIN_TOKEN"),
            dev_api_key=env.get("KUNO_DEV_API_KEY"),
            validator_api_key=env.get("KUNO_VALIDATOR_API_KEY"),
            database_url=env.get("KUNO_DATABASE_URL"),
            allow_country_override=env.get("KUNO_ALLOW_COUNTRY_OVERRIDE", "0") == "1",
            cors_origins=[o for o in env.get("KUNO_CORS_ORIGINS", "http://localhost:3000").split(",") if o],
        )
