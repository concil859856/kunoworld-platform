# Deploying KunoWorld

`docker-compose.yml` here runs a production-like stack on one machine: Postgres, MinIO
(S3-compatible blobs), the gateway, the website and one mock-TEE worker. The worker renders
placeholder video and simulates attestation, so the stack is for rehearsing deployment and
operations, not for serving customers.

## Layout and build contexts

The images build from the directory *above* `platform/`, which must hold the other repos
beside it:

```
<ctx>/platform   kunoworld-platform   (this repo)
<ctx>/subnet     kunoworld-subnet     gateway and worker images (kuno-protocol, kuno-worker)
<ctx>/sdk        kunoworld-sdk        web image (@kunoworld/sdk, linked as file:../../sdk/js)
```

The dev workspace (`/video`) already looks like this. Each image has its own context
allowlist next to its Dockerfile (`Dockerfile.dockerignore`, read by BuildKit), so
`node_modules`, `.venv`, `.next` and data directories never enter the context.

| Image | Dockerfile | Needs |
|---|---|---|
| gateway | `platform/gateway/Dockerfile` | platform, subnet |
| mock worker (+ `kuno-devkit`) | `platform/deploy/worker.Dockerfile` | platform, subnet |
| web | `platform/web/Dockerfile` | platform, sdk |

```sh
cd <ctx>
docker build -f platform/gateway/Dockerfile -t kunoworld/gateway .
docker build -f platform/deploy/worker.Dockerfile -t kunoworld/mock-worker .
docker build -f platform/web/Dockerfile --build-arg NEXT_PUBLIC_KUNO_API=https://api.example.com -t kunoworld/web .
```

The Python images use `platform/deploy/workspace/{pyproject.toml,uv.lock}` as the uv workspace
root, not the dev repo's lockfile, so CI can build them with only platform and subnet checked
out. Its `gateway` dependency group adds the runtime extras: psycopg, boto3,
prometheus-client and sentry-sdk. After changing dependencies in `platform/gateway`,
`subnet/protocol` or `subnet/worker`, run `platform/deploy/workspace/relock.sh` and commit
`uv.lock`. CI fails on a stale lock.

The web image needs `output: "standalone"` in `next.config.ts`. Until that is committed,
build with `--build-arg PATCH_STANDALONE=1` (or `WEB_PATCH_STANDALONE=1` in `.env`). This
adds the setting only to the copy inside the build stage. `NEXT_PUBLIC_*` values are
compiled in, so changing the API URL means rebuilding the web image.

## Bring-up

```sh
cd platform/deploy
cp .env.example .env           # replace every CHANGE_ME
docker compose up -d --build
docker compose ps
```

Start-up order is enforced with health checks and one-shot services:

1. `postgres` and `minio` become healthy.
2. `minio-setup` creates the bucket, a least-privilege `kuno-gateway` MinIO user (object
   read/write/delete on that bucket only) and the lifecycle rule. It is safe to re-run.
3. `devkit` writes dev keys, the mock golden manifest, the signed switch and `dev.env` into
   the `kuno-keys` volume. Existing keys are kept on re-runs.
4. `migrate` upgrades the database to the newest migration.
5. `gateway` starts (Postgres + S3), then `worker` attests to it, and `web` starts.

| What | Where |
|---|---|
| Website | http://localhost:13000 |
| Gateway | http://gateway.localhost:18080 (also http://127.0.0.1:18080) |
| Metrics | `curl -H "Authorization: Bearer $KUNO_METRICS_TOKEN" http://127.0.0.1:18080/metrics` |
| MinIO console | http://localhost:19001 (root user from `.env`) |

All ports bind to 127.0.0.1 and are chosen so the stack runs next to the dev servers
(8080/3000/3001). Change them with `GATEWAY_PORT`, `WEB_PORT` and `MINIO_CONSOLE_PORT`.

**Why `gateway.localhost`:** the site calls the gateway from the visitor's browser *and* from
its own server, both at `NEXT_PUBLIC_KUNO_API`. The gateway listens on the same port inside
and outside its container, and has the network alias `gateway.localhost`. The web container
resolves that name through Docker DNS, and browsers resolve `*.localhost` to loopback. Tools
that use the system resolver (curl before 7.85, some `getent` setups) do not, so use
`127.0.0.1:18080` for those. Alternatively, add `127.0.0.1 gateway.localhost` to
`/etc/hosts`.

**Signing in:** without `KUNO_RESEND_API_KEY`, sign-in emails are written to the gateway's
outbox:

```sh
docker compose exec gateway sh -c 'ls -t /var/lib/kuno/data/outbox | head -1 | xargs -I{} cat /var/lib/kuno/data/outbox/{}'
```

The dev API key, admin token and validator key are in `/var/lib/kuno/data/dev.env` inside
the `kuno-keys` volume. `docker compose logs devkit` prints the dev API key, so treat those
logs as secret.

Stop with `docker compose down`. `docker compose down -v` also deletes the database, the
blobs and the keys.

## Migrations

The gateway upgrades its own database at start-up: `GatewayState` calls
`kuno_gateway.migrations.upgrade_database`, which adopts pre-migration databases and
applies every Alembic revision up to the newest. With one gateway, that's all you need.

Two gateways starting at once can both try the same migration. So the compose stack, like
any multi-replica deploy, runs the one-shot `migrate` service first. At start-up the
gateways then find the database already up to date, and the upgrade does nothing. In
another orchestrator, run the same command as a pre-deploy job:

```sh
python -c "from sqlalchemy import create_engine; from kuno_gateway.migrations import upgrade_database; from kuno_gateway.settings import Settings; upgrade_database(create_engine(Settings.from_env().db_url))"
```

Migrations only move forward. To roll back a release that included a migration, restore
the database backup taken before the deploy, not just the previous image.

`platform/gateway/scripts/check_postgres_migrations.sh` runs the migrations against a
Postgres database and checks that the schema matches the SQLAlchemy models. CI runs it on
every push.

`KUNO_DATABASE_URL` must name the psycopg 3 driver: `postgresql+psycopg://user:pass@host:5432/db`.
URL-encode special characters in the password.

## Backups

**Postgres holds the money.** Accounts, the ledger, jobs, API key hashes and sessions all
live there. Back it up.

```sh
# logical backup (consistent snapshot, compressed custom format)
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > kuno-$(date +%F).dump

# restore into an empty database
docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < kuno-2026-09-13.dump
```

- Run `pg_dump` at least daily and before every deploy that contains a migration. Keep
  dumps off the host, encrypted (for example `age` or `gpg`, then upload to a separate
  bucket or account).
- For point-in-time recovery in production, use managed Postgres PITR, or WAL archiving with
  `pgbackrest` or `wal-g`. `pg_dump` alone loses everything since the last dump.
- Test restores. A backup is only real once a restore has worked and the ledger totals
  match: `select sum(amount_micros) from ledger_entries` against `select sum(balance_micros) from accounts`.

**Blobs are short-lived ciphertext.** Uploads and outputs are encrypted to keys the gateway
never holds, and expire after `blob_retention_s` (7 days). The gateway's janitor deletes
expired objects. A bucket lifecycle rule is the safety net in case the janitor is down:

- MinIO (this stack): `minio-setup` imports an expiry rule for `blobs/` of
  `KUNO_S3_EXPIRE_DAYS` (default 8). Keep that above the retention period. MinIO removes
  abandoned multipart uploads itself.
- AWS S3 or R2: set the equivalent rule, and also abort incomplete multipart uploads:

  ```json
  {"Rules": [
    {"ID": "kuno-expire-blobs", "Status": "Enabled", "Filter": {"Prefix": "blobs/"}, "Expiration": {"Days": 8}},
    {"ID": "kuno-abort-multipart", "Status": "Enabled", "Filter": {"Prefix": ""}, "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1}}
  ]}
  ```

  `aws s3api put-bucket-lifecycle-configuration --bucket <bucket> --lifecycle-configuration file://lifecycle.json`
  (for R2, add `--endpoint-url https://<account>.r2.cloudflarestorage.com`).

Backing up blobs is usually unnecessary: they are ciphertext that customers download within
days, and losing one fails a download, not a balance. If you do want copies, use bucket
replication to a second bucket with the same lifecycle rule. Never make the bucket public:
every read goes through the gateway's access checks.

**Keys:** the owner key, admin token and golden manifest are not in Postgres. In production
they come from your secret manager. In this stack they live in the `kuno-keys` volume, so
back that up too if the stack matters to you.

## Production notes

- Gateway env for S3: `KUNO_BLOB_BACKEND=s3`, `KUNO_S3_BUCKET`, `KUNO_S3_REGION` (`auto` for R2),
  `KUNO_S3_ENDPOINT_URL` (unset for AWS), and `KUNO_S3_ACCESS_KEY_ID`/`KUNO_S3_SECRET_ACCESS_KEY`
  (or the standard AWS credential chain, such as an instance role).
- Observability: `KUNO_LOG_FORMAT=json`, `KUNO_METRICS_TOKEN`, and optionally `SENTRY_DSN`.
  Metrics are per process; the gateway runs as a single uvicorn process.
- Terminate TLS in front of the gateway and the site. The gateway reads the visitor's
  country from `cf-ipcountry`, so behind Cloudflare make sure only Cloudflare can reach
  the origin.
- Use `KUNO_RATE_LIMIT_BACKEND=database` when more than one gateway shares the database.
