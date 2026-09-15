from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    pairs = (line.split("=", 1) for line in path.read_text().splitlines() if "=" in line and not line.startswith("#"))
    return {k.strip(): v.strip() for k, v in pairs}


def parse_tsa_urls(env: dict[str, str]) -> list[str]:
    """`KUNO_C2PA_TSA_URLS` (separated by commas or spaces, in order of preference), else `KUNO_C2PA_TSA_URL`.

    Refuses a URL that isn't http(s), and a `KUNO_C2PA_TSA_URL` that the list leaves out, since which one was meant to
    come first is then unclear."""
    listed = [url for url in re.split(r"[\s,]+", env.get("KUNO_C2PA_TSA_URLS") or "") if url]
    single = (env.get("KUNO_C2PA_TSA_URL") or "").strip()
    if listed and single and single not in listed:
        raise ValueError(
            "KUNO_C2PA_TSA_URL is not in KUNO_C2PA_TSA_URLS: list every timestamp authority in KUNO_C2PA_TSA_URLS, in order "
            "of preference, and unset KUNO_C2PA_TSA_URL"
        )
    urls = list(dict.fromkeys(listed or ([single] if single else [])))
    for url in urls:
        if not url.lower().startswith(("http://", "https://")):
            raise ValueError(f"a timestamp authority URL must start with http:// or https://, not {url!r}")
    return urls


@dataclass
class Settings:
    data_dir: Path
    manifest_path: Path
    switch_path: Path | None = None
    owner_public_key: str | None = None
    # Break-glass only: honoured when allow_admin_token is set, never in production, logged as operator "break-glass".
    # Operators sign in by email and hold roles (roles.py).
    admin_token: str | None = None
    allow_admin_token: bool = False
    # KUNO_ENV: "production" marks a production gateway even before KUNO_ATTESTATION=production is set.
    environment: str | None = None
    # KUNO_ATTESTATION: "dev" (default) or "production".
    attestation: str = "dev"
    dev_api_key: str | None = None
    validator_api_key: str | None = None
    database_url: str | None = None
    dev_balance_usd: float = 100.0
    # Dev only: lets tests and local runs pretend to be in another country.
    allow_country_override: bool = False
    # Refuse to register an enclave offering a profile whose model licence bars the country it runs in
    # (MiniMax H3's Excluded Territories). Off only for local runs that cannot set a country.
    enforce_miner_region: bool = True
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:3000"])
    max_blob_bytes: int = 512 * 1024 * 1024
    enclave_ttl_s: int = 1800
    # Workers long-poll every pull_wait_s, so silence well past that means they are gone.
    enclave_heartbeat_s: int = 60
    # A queued job whose worker has gone quiet is released early instead of waiting out queue_timeout_s.
    queued_grace_s: int = 45
    pull_wait_s: float = 20.0
    queue_timeout_s: int = 600
    # A ciphertext blob uploaded for a private job that never uses it expires after this. Blobs that belong to a job
    # (inputs and outputs, both modes) never expire: they stay until the owner deletes the video.
    upload_ttl_s: int = 86400
    janitor_interval_s: float = 5.0
    # Where sign-in links point: the website, whose server finishes signing in.
    site_url: str = "http://localhost:3000"
    email_from: str = "KunoWorld <signin@kunoworld.com>"
    # Without a provider key, sign-in email goes to data_dir/outbox instead of being sent.
    resend_api_key: str | None = None
    signup_credit_usd: float = 0.0
    login_token_ttl_s: int = 15 * 60
    web_session_ttl_s: int = 30 * 86400
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
    # Top-ups. Each payment method stays off until it is configured. Stripe keeps 8.9% of a $5 top-up and 5.9% of $10.
    topup_min_usd: float = 10.0
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
    # Extra credit on TAO and alpha deposits, as a share of the credited USD (after the alpha haircut). Its own entry.
    chain_credit_bonus: float = 0.05
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
    # C2PA issuing CA (see C2PA_CA.md). Unset: the gateway issues no certificates.
    c2pa_ca_key: Path | None = None
    # PEM: the issuing intermediate, then the root.
    c2pa_ca_chain: Path | None = None
    c2pa_cert_validity_s: int = 86400
    # RFC 3161 timestamp authorities handed to workers, so manifests outlive their short certificates. c2pa_tsa_urls
    # lists them in order of preference (KUNO_C2PA_TSA_URLS; workers fail over down it); c2pa_tsa_url is the first, which
    # workers that read a single URL use. tsa.configured_urls combines the two.
    c2pa_tsa_url: str | None = None
    c2pa_tsa_urls: list[str] = field(default_factory=list)
    c2pa_issuance_log_path: Path | None = None
    # The JSONL log above is only imported now; issuances are recorded in the database and limited per enclave and
    # overall, per window (c2pa_issuance.py, C2PA_CA.md). 0 turns a limit off.
    c2pa_issuance_per_enclave: int = 12
    c2pa_issuance_global: int = 1000
    c2pa_issuance_window_s: int = 3600
    # "off", "warn" or "require": send KUNO_C2PA_TSA_URL one RFC 3161 request at start-up (tsa.py).
    c2pa_tsa_probe: str = "off"
    # Envelope encryption at rest (storage_keys.py; deploy/README.md, "Storage keys"): "local", "aws-kms" or
    # "vault-transit". Unset means local: data_dir/storage_kek.json, created on dev networks. Production refuses a local
    # key file unless storage_kek_allow_local is set.
    storage_kek_provider: str | None = None
    storage_kek_allow_local: bool = False
    storage_local_kek_file: Path | None = None
    storage_kms_key_id: str | None = None
    storage_kms_region: str | None = None
    storage_kms_endpoint_url: str | None = None
    storage_vault_addr: str | None = None
    storage_vault_token: str | None = field(default=None, repr=False)
    storage_vault_token_file: Path | None = None
    storage_vault_namespace: str | None = None
    storage_vault_mount: str = "transit"
    storage_vault_key: str | None = None
    storage_vault_ca_cert: Path | None = None
    # Where deletion tombstones are copied so they survive a database restore (tombstones.py): "auto" (follows the blob
    # backend), "local" (data_dir/tombstones unless tombstone_export_dir), "s3" or "off".
    tombstone_export: str = "auto"
    tombstone_export_dir: Path | None = None
    tombstone_export_bucket: str | None = None
    tombstone_export_prefix: str = "tombstones/"
    # Standard mode and account safety (STANDARD_MODE.md, MODERATION.md).
    # Legacy: base64url of 32 random bytes that encrypted Standard content directly before envelope encryption (KEK v0).
    # Still read so those objects decrypt, until `kuno-gateway rotate-storage-key` has imported it. Never generated now.
    standard_storage_key: str | None = None
    # Unused standard uploads expire; uploads a job used stay with the job until the owner deletes it.
    standard_upload_ttl_s: int = 86400
    private_jobs_per_minute: int = 10
    # Private mode needs a credited top-up or an operator credit, and fewer than this many strikes in 30 days.
    private_requires_payment: bool = True
    private_max_strikes_30d: int = 2
    # (strikes, window seconds, restriction seconds or None for "until an operator reviews it"), checked on each strike.
    strike_rules: list[tuple[int, int, int | None]] = field(
        default_factory=lambda: [(3, 86400, 3600), (5, 7 * 86400, 7 * 86400), (10, 30 * 86400, None)]
    )
    reports_per_hour_per_ip: int = 10
    # Sign-in links per client address and per email address, per identity.AUTH_LIMIT_WINDOW_S. Local test runs raise them.
    signin_links_per_ip: int = 20
    signin_links_per_email: int = 5
    # Public share-link routes (shares.py), per IP, per minute: the link's details and its video count alike.
    share_views_per_minute_per_ip: int = 60
    # One lowercase SHA-256 per line, optionally followed by a category; "#" starts a comment.
    blocked_hashes_file: Path | None = None
    ffmpeg_path: str | None = None
    # How long a preservation hold keeps content by default (MODERATION.md, "Preservation holds").
    preservation_days: float = 365.0
    # Perceptual matching of Standard uploads and outputs (perceptual.py): files of "<pdq hex> <category> <list name>".
    perceptual_hash_files: list[Path] = field(default_factory=list)
    # PDQ README: a match is a Hamming distance of 31 or less; hashes below quality 50 are too unreliable to match on.
    pdq_match_distance: int = 31
    pdq_min_quality: int = 50
    # Video: one frame per interval, at most this many, decoded within the timeout.
    perceptual_frame_interval_s: float = 1.0
    perceptual_max_frames: int = 300
    perceptual_timeout_s: float = 300.0
    # Membership programmes' hash lists (perceptual.PROGRAMMES). Placeholders only: enabling one refuses content.
    hash_sharing_programmes: list[str] = field(default_factory=list)
    # CyberTipline reports (cybertip.py): "disabled" (dry runs only), "test" or "production".
    cybertip_env: str = "disabled"
    cybertip_username: str | None = None
    cybertip_password: str | None = None
    # Honoured only with cybertip_env "test": where test submissions go instead of NCMEC's test host.
    cybertip_base_url: str | None = None
    cybertip_timeout_s: float = 60.0
    # Placeholders until the legal entity exists. A production submission refuses them.
    cybertip_reporting_entity: str = "[REPORTING ENTITY]"
    cybertip_reporter_first_name: str = "[POINT OF CONTACT]"
    cybertip_reporter_last_name: str = "[POINT OF CONTACT]"
    cybertip_reporter_email: str = "[POINT OF CONTACT EMAIL]"
    cybertip_reporter_phone: str | None = None
    cybertip_legal_url: str | None = None

    @property
    def production(self) -> bool:
        """KUNO_ENV=production or KUNO_ATTESTATION=production."""
        return (self.environment or "").strip().lower() == "production" or self.attestation.strip().lower() == "production"

    @property
    def break_glass_enabled(self) -> bool:
        """The shared admin token works only when explicitly allowed, and never in production."""
        return bool(self.admin_token) and self.allow_admin_token and not self.production

    @property
    def c2pa_issuance_log(self) -> Path:
        return self.c2pa_issuance_log_path or self.data_dir / "c2pa" / "issuance.jsonl"

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
            allow_admin_token=env.get("KUNO_ALLOW_ADMIN_TOKEN", "0") == "1",
            environment=env.get("KUNO_ENV") or None,
            attestation=env.get("KUNO_ATTESTATION", "dev") or "dev",
            dev_api_key=env.get("KUNO_DEV_API_KEY"),
            validator_api_key=env.get("KUNO_VALIDATOR_API_KEY"),
            database_url=env.get("KUNO_DATABASE_URL"),
            allow_country_override=env.get("KUNO_ALLOW_COUNTRY_OVERRIDE", "0") == "1",
            enforce_miner_region=env.get("KUNO_ENFORCE_MINER_REGION", "1") == "1",
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
            upload_ttl_s=int(env.get("KUNO_UPLOAD_TTL_S", "86400")),
            topup_min_usd=float(env.get("KUNO_TOPUP_MIN_USD", "10")),
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
            chain_credit_bonus=float(env.get("KUNO_CHAIN_CREDIT_BONUS", "0.05")),
            price_max_divergence=float(env.get("KUNO_PRICE_MAX_DIVERGENCE", "0.02")),
            public_api_url=env.get("KUNO_PUBLIC_API_URL") or None,
            blob_backend=env.get("KUNO_BLOB_BACKEND", "local"),
            log_format=env.get("KUNO_LOG_FORMAT") or None,
            log_level=env.get("KUNO_LOG_LEVEL") or None,
            metrics_token=env.get("KUNO_METRICS_TOKEN") or None,
            sentry_dsn=env.get("SENTRY_DSN") or None,
            sentry_environment=env.get("SENTRY_ENVIRONMENT") or None,
            c2pa_ca_key=Path(env["KUNO_C2PA_CA_KEY"]) if env.get("KUNO_C2PA_CA_KEY") else None,
            c2pa_ca_chain=Path(env["KUNO_C2PA_CA_CHAIN"]) if env.get("KUNO_C2PA_CA_CHAIN") else None,
            c2pa_cert_validity_s=int(env.get("KUNO_C2PA_CERT_VALIDITY_S", "86400")),
            c2pa_tsa_url=next(iter(parse_tsa_urls(env)), None),
            c2pa_tsa_urls=parse_tsa_urls(env),
            c2pa_issuance_log_path=Path(env["KUNO_C2PA_ISSUANCE_LOG"]) if env.get("KUNO_C2PA_ISSUANCE_LOG") else None,
            c2pa_issuance_per_enclave=int(env.get("KUNO_C2PA_ISSUANCE_PER_ENCLAVE", "12")),
            c2pa_issuance_global=int(env.get("KUNO_C2PA_ISSUANCE_GLOBAL", "1000")),
            c2pa_issuance_window_s=int(env.get("KUNO_C2PA_ISSUANCE_WINDOW_S", "3600")),
            c2pa_tsa_probe=(env.get("KUNO_C2PA_TSA_PROBE") or "off").strip().lower(),
            storage_kek_provider=(env.get("KUNO_STORAGE_KEK_PROVIDER") or "").strip().lower() or None,
            storage_kek_allow_local=env.get("KUNO_STORAGE_KEK_ALLOW_LOCAL", "0") == "1",
            storage_local_kek_file=Path(env["KUNO_STORAGE_LOCAL_KEK_FILE"]) if env.get("KUNO_STORAGE_LOCAL_KEK_FILE") else None,
            storage_kms_key_id=env.get("KUNO_STORAGE_KMS_KEY_ID") or None,
            storage_kms_region=env.get("KUNO_STORAGE_KMS_REGION") or None,
            storage_kms_endpoint_url=env.get("KUNO_STORAGE_KMS_ENDPOINT_URL") or None,
            storage_vault_addr=env.get("KUNO_STORAGE_VAULT_ADDR") or None,
            storage_vault_token=env.get("KUNO_STORAGE_VAULT_TOKEN") or None,
            storage_vault_token_file=Path(env["KUNO_STORAGE_VAULT_TOKEN_FILE"]) if env.get("KUNO_STORAGE_VAULT_TOKEN_FILE") else None,
            storage_vault_namespace=env.get("KUNO_STORAGE_VAULT_NAMESPACE") or None,
            storage_vault_mount=env.get("KUNO_STORAGE_VAULT_MOUNT") or "transit",
            storage_vault_key=env.get("KUNO_STORAGE_VAULT_KEY") or None,
            storage_vault_ca_cert=Path(env["KUNO_STORAGE_VAULT_CACERT"]) if env.get("KUNO_STORAGE_VAULT_CACERT") else None,
            tombstone_export=(env.get("KUNO_TOMBSTONE_EXPORT") or "auto").strip().lower(),
            tombstone_export_dir=Path(env["KUNO_TOMBSTONE_EXPORT_DIR"]) if env.get("KUNO_TOMBSTONE_EXPORT_DIR") else None,
            tombstone_export_bucket=env.get("KUNO_TOMBSTONE_BUCKET") or None,
            tombstone_export_prefix=env.get("KUNO_TOMBSTONE_PREFIX") or "tombstones/",
            standard_storage_key=env.get("KUNO_STANDARD_STORAGE_KEY") or None,
            standard_upload_ttl_s=int(env.get("KUNO_STANDARD_UPLOAD_TTL_S", "86400")),
            private_jobs_per_minute=int(env.get("KUNO_PRIVATE_JOBS_PER_MINUTE", "10")),
            private_requires_payment=env.get("KUNO_PRIVATE_REQUIRES_PAYMENT", "1") == "1",
            private_max_strikes_30d=int(env.get("KUNO_PRIVATE_MAX_STRIKES_30D", "2")),
            strike_rules=parse_strike_rules(env["KUNO_STRIKE_RULES"]) if env.get("KUNO_STRIKE_RULES") else
            [(3, 86400, 3600), (5, 7 * 86400, 7 * 86400), (10, 30 * 86400, None)],
            reports_per_hour_per_ip=int(env.get("KUNO_REPORTS_PER_HOUR_PER_IP", "10")),
            signin_links_per_ip=int(env.get("KUNO_SIGNIN_LINKS_PER_IP", "20")),
            signin_links_per_email=int(env.get("KUNO_SIGNIN_LINKS_PER_EMAIL", "5")),
            share_views_per_minute_per_ip=int(env.get("KUNO_SHARE_VIEWS_PER_MINUTE_PER_IP", "60")),
            blocked_hashes_file=Path(env["KUNO_BLOCKED_HASHES_FILE"]) if env.get("KUNO_BLOCKED_HASHES_FILE") else None,
            ffmpeg_path=env.get("KUNO_FFMPEG") or None,
            preservation_days=float(env.get("KUNO_PRESERVATION_DAYS", "365")),
            perceptual_hash_files=[Path(p.strip()) for p in env.get("KUNO_PERCEPTUAL_HASH_FILES", "").split(",") if p.strip()],
            pdq_match_distance=int(env.get("KUNO_PDQ_MATCH_DISTANCE", "31")),
            pdq_min_quality=int(env.get("KUNO_PDQ_MIN_QUALITY", "50")),
            perceptual_frame_interval_s=float(env.get("KUNO_PERCEPTUAL_FRAME_INTERVAL_S", "1")),
            perceptual_max_frames=int(env.get("KUNO_PERCEPTUAL_MAX_FRAMES", "300")),
            perceptual_timeout_s=float(env.get("KUNO_PERCEPTUAL_TIMEOUT_S", "300")),
            hash_sharing_programmes=[p.strip().lower() for p in env.get("KUNO_HASH_SHARING_PROGRAMMES", "").split(",") if p.strip()],
            cybertip_env=(env.get("KUNO_CYBERTIP_ENV") or "disabled").strip().lower(),
            cybertip_username=env.get("KUNO_CYBERTIP_USERNAME") or None,
            cybertip_password=env.get("KUNO_CYBERTIP_PASSWORD") or None,
            cybertip_base_url=env.get("KUNO_CYBERTIP_BASE_URL") or None,
            cybertip_timeout_s=float(env.get("KUNO_CYBERTIP_TIMEOUT_S", "60")),
            cybertip_reporting_entity=env.get("KUNO_CYBERTIP_REPORTING_ENTITY") or "[REPORTING ENTITY]",
            cybertip_reporter_first_name=env.get("KUNO_CYBERTIP_REPORTER_FIRST_NAME") or "[POINT OF CONTACT]",
            cybertip_reporter_last_name=env.get("KUNO_CYBERTIP_REPORTER_LAST_NAME") or "[POINT OF CONTACT]",
            cybertip_reporter_email=env.get("KUNO_CYBERTIP_REPORTER_EMAIL") or "[POINT OF CONTACT EMAIL]",
            cybertip_reporter_phone=env.get("KUNO_CYBERTIP_REPORTER_PHONE") or None,
            cybertip_legal_url=env.get("KUNO_CYBERTIP_LEGAL_URL") or None,
        )


def parse_strike_rules(text: str) -> list[tuple[int, int, int | None]]:
    """"3/86400/3600,5/604800/604800,10/2592000/review": strikes/window seconds/restriction seconds or "review"."""
    rules = []
    for part in text.split(","):
        if not part.strip():
            continue
        count, window, length = (p.strip() for p in part.split("/"))
        rules.append((int(count), int(window), None if length == "review" else int(length)))
    return rules
