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

The dev API key and validator key are in `/var/lib/kuno/data/dev.env` inside the `kuno-keys`
volume. `docker compose logs devkit` prints the dev API key, so treat those logs as secret.

**Operators:** operators sign in on the website by email, like customers, and hold a role
(`moderator` or `admin`, see `platform/gateway/MODERATION.md`). Grant the first admin once the
gateway is up; after that, admins manage roles through `/admin/v1/roles`:

```sh
docker compose exec gateway kuno-gateway grant-role --email you@example.com --role admin
```

The devkit also writes a `KUNO_ADMIN_TOKEN`. It is break-glass only: ignored unless
`KUNO_ALLOW_ADMIN_TOKEN=1`, never honoured on a production gateway, and logged as operator
`break-glass`. Leave it off.

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

**Blobs are customers' videos, and they stay until the owner deletes them.** Stored objects are
uploads, sealed job inputs and outputs, and Standard videos and thumbnails. Standard media is
encrypted at rest by the gateway, each object with its own data key (see "Storage keys" below); Private
media is ciphertext only the customer's key opens. Nothing a job stores expires. Only uploads that no job used expire after
24 hours, and the gateway's janitor deletes those. Deleting a video (`DELETE /v1/videos/{job_id}`)
deletes its objects; preservation holds can delay that.

- **Never add an expiry lifecycle rule** to the bucket: it would delete videos their owners kept.
  This stack's `minio-setup` removes any expiry rule an older version installed.
- On R2, incomplete multipart uploads are aborted automatically after 7 days by default. To shorten
  that, add only an abort rule, in the R2 dashboard (bucket, Settings, Object lifecycle rules) or with:

  ```json
  {"Rules": [
    {"ID": "kuno-abort-multipart", "Status": "Enabled", "Filter": {"Prefix": ""}, "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 1}}
  ]}
  ```

  `aws s3api put-bucket-lifecycle-configuration --bucket <bucket> --lifecycle-configuration file://lifecycle.json --endpoint-url https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

Blob loss now loses a customer's video, so decide deliberately whether to keep a second copy
(for example R2 bucket replication or a periodic copy to a separate account). A copy must honour
deletions: an owner's deleted video must not survive in it beyond what counsel accepts
(`platform/gateway/MODERATION.md`, "Storage and deletion"). Never make the bucket public: every read
goes through the gateway's access checks, which let only the owner open a video.

**Keys:** the owner key and golden manifest are not in Postgres. In production they come from your
secret manager. In this stack they live in the `kuno-keys` volume, along with the dev storage key file,
so back that up too if the stack matters to you. Storage keys have their own section below.

## Storage keys

Everything the gateway can read and stores is sealed with envelope encryption (`platform/gateway/src/kuno_gateway/storage_keys.py`, `vault.py`): Standard uploads, videos and thumbnails, output keys it holds for a job, a report or a hold, and blocked uploads.

- **Data keys.** Each object gets its own random 256-bit data key, and its content is encrypted with it (the protocol's chunked ChaCha20-Poly1305 format, bound to a label such as `standard/video/<job>`). Only the data key's wrapped form is stored, in Postgres (`storage_data_keys`).
- **KEK.** A key-encryption key wraps the data keys. In production it lives in AWS KMS or HashiCorp Vault Transit, and the gateway never holds its material.
- **Sealed format.** `KUNOE1`, a version byte, the 16-byte data key id, then the encrypted content.
- **Legacy objects.** Objects sealed before this are a bare `KUNOB1` blob under `KUNO_STANDARD_STORAGE_KEY` (legacy KEK v0). They keep decrypting.
- **Deletion.** Deleting content deletes its data keys in the same transaction. A copy of the object in a bucket backup can no longer be decrypted, and a restored database copy of the key is caught by the deletion replay below.

| Variable | Meaning |
|---|---|
| `KUNO_STORAGE_KEK_PROVIDER` | `aws-kms` or `vault-transit` in production; `local` (the default) creates `<data dir>/storage_kek.json` on dev networks |
| `KUNO_STORAGE_KMS_KEY_ID` | ARN (or alias) of a symmetric KMS key; `KUNO_STORAGE_KMS_REGION`, `KUNO_STORAGE_KMS_ENDPOINT_URL` optional. Credentials come from the standard AWS chain |
| `KUNO_STORAGE_VAULT_ADDR`, `KUNO_STORAGE_VAULT_KEY` | Vault address and Transit key name; `KUNO_STORAGE_VAULT_MOUNT` (default `transit`), `KUNO_STORAGE_VAULT_NAMESPACE`, `KUNO_STORAGE_VAULT_CACERT` optional |
| `KUNO_STORAGE_VAULT_TOKEN_FILE` or `KUNO_STORAGE_VAULT_TOKEN` | the file is re-read on every call, so Vault Agent can renew the token in place |
| `KUNO_STORAGE_KEK_ALLOW_LOCAL=1` | production override: accept a local key file. It must already exist; production never creates one. Only for rehearsal stacks or single hosts whose disk encryption and key backups you control |
| `KUNO_STANDARD_STORAGE_KEY` | legacy: still read so old objects decrypt, until `rotate-storage-key` has imported it |

**Start-up.** Every gateway checks its KEK before serving:
1. It wraps and unwraps a fresh canary.
2. It unwraps the canary stored when that KEK version was registered, and refuses to start if that fails: a replaced key file, or a different KMS key behind an alias. A missing local key file with data keys still wrapped by it is refused too, rather than replaced.
3. It reports older KEK versions that data keys still reference but that no longer unwrap.

A production gateway refuses to start without `aws-kms` or `vault-transit` unless `KUNO_STORAGE_KEK_ALLOW_LOCAL=1` is set.

### Choosing a key service

Cloudflare offers no customer key management service. R2 encrypts at rest with Cloudflare-managed keys, and offers SSE-C, where the client sends its own key with every request ([R2 SSE-C](https://developers.cloudflare.com/r2/examples/ssec/)). That would put the raw key in every request instead of keeping it in a KMS. The gateway therefore does its own envelope encryption, against one of these:

- **AWS KMS (recommended default).**
  - How the gateway uses it:
    - [GenerateDataKey](https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html) with `KeySpec=AES_256`, and an `EncryptionContext` naming the data key (`kuno:purpose`, `kuno:data-key`).
    - [Decrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html) with `KeyId` pinned to the key ARN, which AWS recommends.
    - [ReEncrypt](https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html) during rotation, so plaintext data keys never leave KMS.
  - **Gateway role:** `kms:GenerateDataKey`, `kms:Decrypt` and `kms:Encrypt` (used for the canary and the legacy import) on that key.
  - **Operator running rotation:** also `kms:ReEncryptFrom` on the old key and `kms:ReEncryptTo` on the new one.
- **HashiCorp Vault Transit** ([API](https://developer.hashicorp.com/vault/api-docs/secret/transit)).
  - **Endpoints:** `datakey/plaintext/:name`, `decrypt/:name` and `encrypt/:name`; rotation also uses `rewrap/:name` and `keys/:name/rotate`. Wraps pin the Transit key version.
  - **Gateway policy:** `update` on `transit/datakey/plaintext/<key>`, `transit/encrypt/<key>` and `transit/decrypt/<key>`; `read` on `transit/keys/<key>`.
  - **Rotation policy:** adds `transit/rewrap/<key>` and `transit/keys/<key>/rotate`.
  - **OpenBao:** documents a Transit API modelled on Vault's, but it was not verified here.
- **Not built, same shape.** Each would be one `KekProvider` class.
  - [Google Cloud KMS](https://docs.cloud.google.com/kms/docs/envelope-encryption) has no GenerateDataKey: generate locally, then `Encrypt` (inputs up to 64 KiB).
  - [Azure Key Vault](https://learn.microsoft.com/en-us/rest/api/keyvault/keys/wrap-key/wrap-key) offers `wrapkey` with `A256KW` or `RSA-OAEP-256`.

### Rotation

`kuno-gateway rotate-storage-key` re-wraps data keys under the configured KEK. It never re-encrypts content.

1. **Choose the new KEK.**
   - **Different key:** point the configuration at it, for example a new `KUNO_STORAGE_KMS_KEY_ID`, and restart gateways so new data keys use it.
   - **Same key, new material:** pass `--provider-rotate`. On a local key file this adds a version; on Vault Transit it calls `keys/:name/rotate`.
   - **AWS KMS's own rotation** (`EnableKeyRotation`, 90–2560 days, or `RotateKeyOnDemand`) keeps the same key ARN and keeps old material decrypting, so it needs no re-wrap ([rotation](https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html)).
2. **Run it.** `kuno-gateway rotate-storage-key --dry-run` first shows data keys per KEK version. Each batch (`--batch-size`, default 500) commits on its own, so an interrupted run, or one stopped by `--max-batches`, loses nothing: run it again to continue. Exit 1 means some keys couldn't be re-wrapped because their old KEK is unreachable.
3. **Retirement.** KEK versions nothing references any more are marked `retired`. The first run also imports `KUNO_STANDARD_STORAGE_KEY` as a wrapped data key and retires KEK v0; remove it from the environment and the secret manager afterwards.
4. **Keep retired key material** until every database backup taken before the rotation has aged out ([BACKUP RETENTION PERIOD]). A restore brings back data keys wrapped with it. Only then:
   - delete old versions from the key file;
   - raise Vault's `min_decryption_version` and trim;
   - or schedule the old KMS key's deletion.

### Key backup and recovery

Losing the KEK loses every Standard video. The wrapped data keys live in Postgres, so database backups are key backups too.

- **AWS KMS.** Key material can't be exported, so protection means never losing access to the key.
  - **Key policy.**
    - Allow the gateway role only the three operations above, ideally limited by the encryption context: condition `kms:EncryptionContext:kuno:purpose` equal to `storage-data-key` or `storage-canary` ([condition keys](https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html)).
    - Deny `kms:ScheduleKeyDeletion` and `kms:DisableKey` to everyone but a break-glass role. AWS's own example denies both while `kms:TrailingDaysWithoutKeyUsage` is at most 365 ([AWS Security Blog, 2026-06-02](https://aws.amazon.com/blogs/security/identify-unused-aws-kms-keys-and-prevent-accidental-key-deletions/), [permissions](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys-adding-permission.html)).
    - Restrict `kms:PutKeyPolicy` as well, or anyone holding it can remove the deny.
    - An Organizations SCP with the same deny is common advice; it was not checked against AWS documentation here.
  - **Built-in deletion protection** ([deleting keys](https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html)).
    - `ScheduleKeyDeletion` waits 7–30 days (default 30), and `CancelKeyDeletion` reverses it.
    - A cancelled key comes back `Disabled` and needs `EnableKey`.
    - Alert on `ScheduleKeyDeletion` and `DisableKey` events in CloudTrail.
  - **Multi-Region keys.** A multi-Region replica shares the key material under a different ARN. Data keys pin the registered ARN, so failing over to a replica means registering it as the new KEK and running rotation. That step is manual.
- **Vault Transit.**
  - Keep `deletion_allowed` at its default, `false`.
  - Back up Vault's storage (for example Raft snapshots), which is where Transit keys live.
  - `transit/backup/:name` needs `allow_plaintext_backup`, and that can never be turned off again. Use it only for an offline, encrypted escrow copy your policy demands.
  - Raise `min_decryption_version` or trim only after [BACKUP RETENTION PERIOD].
- **Local key file.** Back up `storage_kek.json` separately from database backups, in a different place with different credentials. Anyone holding both can read Standard content.
- **Break-glass access.**
  - Use a separate IAM role (KMS) or Vault policy with `Decrypt` on the key.
  - Require two people to use it: MFA-protected role assumption, or Vault control groups.
  - Its purpose is to run a restored gateway when the normal gateway identity is lost, not to read content: only a gateway serves content, and only to its owner.
  - Every use lands in CloudTrail or in Vault's audit device; review each one.
- **Recovery drill.**
  1. Restore a database backup into a scratch environment.
  2. Start a gateway against it with the production KEK configuration.
  3. Check that the start-up log reports no unavailable KEK versions.
  4. Open a test video.

## Backups and deletions

An owner's deletion must survive backups: a restore must not bring back a video its owner deleted.

- **Tombstones.**
  - **Recorded:** every path that destroys content writes a tombstone (`deletion_tombstones`) in the same transaction as the deletion. That covers the owner's delete, operator removal, upload expiry, the blob sweep, and deletions a preservation hold deferred. The key vault, share and account-closure modules record their own kinds with the same `tombstones.record`.
  - **Exported:** every janitor pass copies committed tombstones out of the database. They go to `tombstones/` in the blob bucket (`KUNO_TOMBSTONE_EXPORT=auto`), or to `<data dir>/tombstones` with the local backend.
  - **A separate bucket (recommended):** set `KUNO_TOMBSTONE_BUCKET`, and consider an R2 bucket lock on that bucket only ([bucket locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/)), so a restore or a mistake can't erase the record of what was deleted.
- **Postgres.** Use point-in-time recovery: managed Postgres PITR, or WAL archiving with `pgbackrest` or `wal-g` ([continuous archiving](https://www.postgresql.org/docs/current/continuous-archiving.html)). Keep backups for [BACKUP RETENTION PERIOD], a period agreed with counsel (`platform/gateway/MODERATION.md`, "Storage and deletion"). A deleted video can live on in a backup for that long, but no restore puts it back in service.
- **R2.** R2 does not implement object versioning (`GetBucketVersioning`, `PutBucketVersioning` and `ListObjectVersions` are listed as not implemented in [S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)), so `DeleteObject` removes the object.
  - **On a store that does version objects** (AWS S3, MinIO): leave versioning off, or add a lifecycle rule that expires noncurrent versions as soon as the store allows (`NoncurrentVersionExpiration`, one day on S3) and removes expired delete markers.
  - **Never add an expiry rule or a bucket lock to the blob bucket:** the first deletes kept videos, the second blocks owners' deletions.
- **Copies and replicas must propagate deletes.**
  - **Bucket copies:** a second copy must delete what the primary deletes. Use `rclone sync` (not `rclone copy`), or replication that replicates deletes.
  - **Database:** streaming replicas propagate deletes by construction. Logical dumps don't, so treat them as backups under [BACKUP RETENTION PERIOD].
- **Replay deletions after any restore** of the database, the bucket or both, before the gateway serves customers again:

  ```sh
  kuno-gateway reapply-deletions --since <time the restored backup was taken> --dry-run
  kuno-gateway reapply-deletions --since <time the restored backup was taken>
  ```

  - **What it does:**
    - Reads tombstones from the database and from the export (`--source db|export|both`, default both).
    - Puts tombstones the restored database lost back into it.
    - Deletes again whatever came back: objects, blob rows, Standard content, uploads and data keys.
  - **Idempotent:** a second run reports nothing deleted.
  - **`--since`:** use the time of the restored copy (the recovery target time for PITR). When unsure, choose an earlier time: replay only deletes what a tombstone names.
  - **Held content is the exception.** Anything an active preservation hold covers in the restored database is reported as `held` and left alone for an operator to decide (`platform/gateway/MODERATION.md`, "Preservation holds").
  - **Unhandled kinds:** tombstones of a kind no module registered a replayer for are counted as `unhandled`.
  - **The gap:** a tombstone committed but not yet exported when the database itself is lost is lost with it. The export runs every janitor pass (seconds).

## Production notes

- **Production mode:** set `KUNO_ENV=production` (and `KUNO_ATTESTATION=production` once the real
  verifiers are configured). A production gateway refuses to start with the local blob backend and
  never honours the break-glass admin token.
- **Storage keys:** a production gateway refuses to start without `KUNO_STORAGE_KEK_PROVIDER=aws-kms`
  or `vault-transit` ("Storage keys" above), and on any gateway a KEK that fails its canary stops start-up.
- **C2PA timestamps:** with the C2PA CA on, a production gateway refuses to start without
  `KUNO_C2PA_TSA_URL`. Use a TSA on the C2PA TSA Trust List (`platform/gateway/C2PA_CA.md`, "Timestamps").
- **After restoring the database or the bucket:** run `kuno-gateway reapply-deletions` ("Backups and
  deletions" above) before serving customers.
- **Blob storage is Cloudflare R2**, through the S3 backend:

  ```
  KUNO_BLOB_BACKEND=s3
  KUNO_S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
  KUNO_S3_REGION=auto
  KUNO_S3_BUCKET=kuno-blobs
  KUNO_S3_ACCESS_KEY_ID=...        # an R2 API token with Object Read & Write, scoped to this bucket
  KUNO_S3_SECRET_ACCESS_KEY=...
  ```

  Leave `KUNO_S3_ADDRESSING_STYLE` at `auto` (R2 accepts both path-style and virtual-hosted
  requests) and `KUNO_S3_CREATE_BUCKET` unset; create the bucket in the dashboard. R2 compatibility
  of what the backend uses:
  - `PutObject`, `GetObject`, `DeleteObject`, `HeadBucket`, `CreateBucket` and multipart upload
    (`CreateMultipartUpload`, `UploadPart`, `CompleteMultipartUpload`, `AbortMultipartUpload`) are
    all supported ([S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)).
  - The region is `auto`; `us-east-1` and an empty region alias to it (same page).
  - Multipart parts must all be the same size except the last, at least 5 MiB, and at most 10,000
    parts ([multipart objects](https://developers.cloudflare.com/r2/objects/multipart-objects/)).
    The backend uploads fixed 8 MiB parts.
  - The compatibility table lists `x-amz-checksum-*` and `x-amz-sdk-checksum-algorithm` as
    unsupported on `PutObject` and `CreateMultipartUpload`. boto3 1.36 and later send CRC checksums
    by default, so the backend sets `request_checksum_calculation` and
    `response_checksum_validation` to `when_required`.
  - The table doesn't list user metadata (`x-amz-meta-*`), so the backend stores none; the
    database keeps each blob's digest.
  - R2 encrypts every object at rest with AES-256 ([data security](https://developers.cloudflare.com/r2/reference/data-security/)).
  - boto3 configuration: [R2 boto3 example](https://developers.cloudflare.com/r2/examples/aws/boto3/).
- Observability: `KUNO_LOG_FORMAT=json`, `KUNO_METRICS_TOKEN`, and optionally `SENTRY_DSN`.
  Metrics are per process; the gateway runs as a single uvicorn process.
- Terminate TLS in front of the gateway and the site. The gateway reads the visitor's
  country from `cf-ipcountry`, so behind Cloudflare make sure only Cloudflare can reach
  the origin.
- Use `KUNO_RATE_LIMIT_BACKEND=database` when more than one gateway shares the database.
- Operators: grant the first admin with `kuno-gateway grant-role --email ... --role admin` against
  the production database; don't set `KUNO_ADMIN_TOKEN` at all.
- Prices are placeholders until the owner sets them (`platform/gateway/PAYMENTS.md`).
