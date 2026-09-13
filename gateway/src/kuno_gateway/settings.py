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
    # Workers long-poll every pull_wait_s, so silence well past that means they are gone.
    enclave_heartbeat_s: int = 60
    # A queued job whose worker has gone quiet is released early instead of waiting out queue_timeout_s.
    queued_grace_s: int = 45
    pull_wait_s: float = 20.0
    queue_timeout_s: int = 600
    blob_retention_s: int = 7 * 86400
    janitor_interval_s: float = 5.0
    # Where sign-in links point: the website, whose server finishes signing in.
    site_url: str = "http://localhost:3000"
    email_from: str = "KunoWorld <signin@kunoworld.com>"
    # Without a provider key, sign-in email goes to data_dir/outbox instead of being sent.
    resend_api_key: str | None = None
    signup_credit_usd: float = 0.0
    login_token_ttl_s: int = 15 * 60
    web_session_ttl_s: int = 30 * 86400
    studio_token_ttl_s: int = 3600
    # Per-account limits on the job API. Validators are exempt.
    jobs_per_minute: int = 30
    max_active_jobs: int = 10
    uploads_per_minute: int = 240
    # Everything but blob uploads is JSON and small; refuse anything larger before reading it.
    max_json_body_bytes: int = 1024 * 1024
    # "memory" for one gateway process; "database" when several share one database.
    rate_limit_backend: str = "memory"
    # Dev and tests only: lets webhooks reach localhost and private networks, and use http.
    allow_private_webhooks: bool = False
    webhook_max_attempts: int = 8
    webhook_interval_s: float = 2.0

    @property
    def blob_dir(self) -> Path:
        return self.data_dir / "blobs"

    @property
    def outbox_dir(self) -> Path:
        return self.data_dir / "outbox"

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
            site_url=env.get("KUNO_SITE_URL", "http://localhost:3000"),
            email_from=env.get("KUNO_EMAIL_FROM", "KunoWorld <signin@kunoworld.com>"),
            resend_api_key=env.get("KUNO_RESEND_API_KEY") or None,
            signup_credit_usd=float(env.get("KUNO_SIGNUP_CREDIT_USD", "0")),
            jobs_per_minute=int(env.get("KUNO_JOBS_PER_MINUTE", "30")),
            max_active_jobs=int(env.get("KUNO_MAX_ACTIVE_JOBS", "10")),
            uploads_per_minute=int(env.get("KUNO_UPLOADS_PER_MINUTE", "240")),
            max_json_body_bytes=int(env.get("KUNO_MAX_JSON_BODY_BYTES", str(1024 * 1024))),
            rate_limit_backend=env.get("KUNO_RATE_LIMIT_BACKEND", "memory"),
            allow_private_webhooks=env.get("KUNO_ALLOW_PRIVATE_WEBHOOKS", "0") == "1",
        )
