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
    # Top-ups. Each payment method stays off until it is configured.
    topup_min_usd: float = 5.0
    topup_max_usd: float = 5000.0
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    nowpayments_api_key: str | None = None
    nowpayments_ipn_secret: str | None = None
    nowpayments_sandbox: bool = False
    # Network fees on TRON make very small USDT payments mostly fee.
    nowpayments_min_usd: float = 20.0
    tao_treasury_address: str | None = None
    subtensor_url: str = "wss://entrypoint-finney.opentensor.ai:443"
    tao_min_deposit: float = 0.05
    # Subnets whose alpha is accepted. Empty means alpha payments are off.
    alpha_netuids: list[int] = field(default_factory=list)
    alpha_haircut: float = 0.10
    alpha_max_usd_per_deposit: float = 500.0
    price_max_divergence: float = 0.02
    # The gateway's public URL, for callbacks providers make to it. Defaults to the request's own URL.
    public_api_url: str | None = None
    # "local" keeps blobs under data_dir; "s3" uses the KUNO_S3_* bucket.
    blob_backend: str = "local"
    log_format: str | None = None
    log_level: str | None = None
    # Without a token /metrics is off.
    metrics_token: str | None = None
    sentry_dsn: str | None = None
    sentry_environment: str | None = None

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
            topup_min_usd=float(env.get("KUNO_TOPUP_MIN_USD", "5")),
            topup_max_usd=float(env.get("KUNO_TOPUP_MAX_USD", "5000")),
            stripe_secret_key=env.get("KUNO_STRIPE_SECRET_KEY") or None,
            stripe_webhook_secret=env.get("KUNO_STRIPE_WEBHOOK_SECRET") or None,
            nowpayments_api_key=env.get("KUNO_NOWPAYMENTS_API_KEY") or None,
            nowpayments_ipn_secret=env.get("KUNO_NOWPAYMENTS_IPN_SECRET") or None,
            nowpayments_sandbox=env.get("KUNO_NOWPAYMENTS_SANDBOX", "0") == "1",
            nowpayments_min_usd=float(env.get("KUNO_NOWPAYMENTS_MIN_USD", "20")),
            tao_treasury_address=env.get("KUNO_TAO_TREASURY") or None,
            subtensor_url=env.get("KUNO_SUBTENSOR_URL", "wss://entrypoint-finney.opentensor.ai:443"),
            tao_min_deposit=float(env.get("KUNO_TAO_MIN_DEPOSIT", "0.05")),
            alpha_netuids=[int(n) for n in env.get("KUNO_ALPHA_NETUIDS", "").split(",") if n.strip()],
            alpha_haircut=float(env.get("KUNO_ALPHA_HAIRCUT", "0.10")),
            alpha_max_usd_per_deposit=float(env.get("KUNO_ALPHA_MAX_USD", "500")),
            price_max_divergence=float(env.get("KUNO_PRICE_MAX_DIVERGENCE", "0.02")),
            public_api_url=env.get("KUNO_PUBLIC_API_URL") or None,
            blob_backend=env.get("KUNO_BLOB_BACKEND", "local"),
            log_format=env.get("KUNO_LOG_FORMAT") or None,
            log_level=env.get("KUNO_LOG_LEVEL") or None,
            metrics_token=env.get("KUNO_METRICS_TOKEN") or None,
            sentry_dsn=env.get("SENTRY_DSN") or None,
            sentry_environment=env.get("SENTRY_ENVIRONMENT") or None,
        )
