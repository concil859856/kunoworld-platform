# Standard mode, storage, access and account safety: the gateway API contract

This is the contract the gateway, the website and both SDKs build against. Modes and miner tiers are defined in
`subnet/PRIVACY_MODES.md`; the operator guide is `MODERATION.md`. Error bodies use the gateway's usual
`{"detail": {"code", "message", ...}}` shape.

## The rules in one place

- **Where videos live.** In production every stored object (uploads, sealed job inputs, outputs, Standard videos and
  thumbnails) is in Cloudflare R2, through the gateway's S3 backend. A production gateway (`KUNO_ENV=production` or
  `KUNO_ATTESTATION=production`) refuses to start with the local blob backend. A Standard video is encrypted at rest
  by the gateway (`KUNO_STANDARD_STORAGE_KEY`) before it reaches R2. A Private video is ciphertext that only the
  customer's key opens; the platform never has that key. R2 also encrypts every object at rest (AES-256).
- **How long they stay.** Until the owner deletes them. Nothing a job stores expires, in either mode: no retention
  period for videos, thumbnails, prompts, inputs or sealed blobs. Only uploads that never became part of a job
  expire, after 24 hours.
- **Who can open them.** Only the owner. An operator may open content only for an open report of `csam` or
  `sexual_minor`, or under an active preservation hold for a child-safety report, a blocked upload or a legal
  request. Every such view is written to the audit log. Every other report gives operators metadata only.
- **How people sign in.** Customers sign in by email link; the website's server keeps the web session and forwards
  it to the gateway for everything, including the job API. The browser never holds a token. API keys are for
  developers' programs. Operators are ordinary users who sign in the same way and hold a `moderator` or `admin` role.
- **What is banned.** Sexual and NSFW content, in both modes. The gateway checks every Standard prompt before
  sealing it; Private prompts are checked inside the enclave, because the gateway can't read them.
- **Prices.** Every price the gateway returns is a **placeholder**, to be set later. `GET /v1/models` says so with
  `pricing_placeholder: true`.

## Credentials

| Credential | Who holds it | Accepted on |
|---|---|---|
| Web session (`kws_...`) | the website's server, from an HttpOnly cookie; forwarded as `Authorization: Bearer` | the job API (`require_account`) and account management (`/v1/me/*`, `require_user`) |
| API key (`kw_live_...`) | a developer's program | the job API only. It can't manage keys, payments, wallets or eligibility pages (`/v1/me/*` answers `401`) |
| Operator session | a web session of a user holding a role | `/admin/v1/*` and `PUT /turbo/v1/spec` (`require_operator`) |

- `POST /v1/me/studio-token` answers `410 gone`. Studio tokens (`kwt_...`) are never accepted; migration 0010 revoked any that existed.
- `GET /v1/me` returns `{user, account, roles: [...]}`; `roles` is `[]`, `["moderator"]` or `["admin"]` (or both).

## Standard jobs

Credentials: API key or web session. Every route also exists under `/v1/me/standard/...` with the same shapes,
accepting only the web session.

| Method and path | Body / query | Response |
|---|---|---|
| `POST /v1/standard/uploads?role=<InputRole>` | raw bytes | `201 {upload_id, sha256, size, mime}`. Scanned before storage. An upload that no job uses expires after 24 h. |
| `POST /v1/standard/videos` | `{job_id?, params: GenerationParams, prompt, negative_prompt?, seed?, options?, inputs: [{upload_id, index, role, time_s?, strength?, hint?, start_s?, end_s?}], webhook_url?}` | `201 JobStatus` with `privacy: "standard"`. The gateway checks the prompt, picks an enclave of any tier, sets an explicit seed when none is given, seals the payload and inputs to that enclave and charges like `/v1/videos`. |
| `GET /v1/videos/{job_id}` | | `JobStatus`, including `privacy` for every job |
| `GET /v1/standard/videos?limit=50` | | `[{job_id, status, profile_id, params, prompt, created_at, finished_at, has_video, error_code, expires_at: null, deleted}]`, newest first |
| `GET /v1/standard/videos/{job_id}/video` | | `video/mp4`, owner only; `404 not_ready` until succeeded; `410 deleted` or `410 removed` |
| `GET /v1/standard/videos/{job_id}/thumbnail` | | `image/jpeg`, owner only |
| `DELETE /v1/standard/videos/{job_id}` | | `204`, an alias of `DELETE /v1/videos/{job_id}` |

**Content policy.** Before sealing, the gateway runs `kuno_protocol.content_policy.check_prompt(prompt,
negative_prompt)`. A violation answers `422 content_policy` with the message "This prompt isn't allowed. Sexual and
NSFW content is not permitted." It creates no job, charges nothing, stores nothing, and records one strike with
reason `content_policy`. The prompt is never logged.

## Deleting a video (both modes)

`DELETE /v1/videos/{job_id}` (API key or web session; owner only, else `404 not_found`) answers `204`.

- A job still queued or running is canceled and refunded first.
- **Private:** the job's sealed input and output blobs are deleted from storage.
- **Standard:** the video, thumbnail, prompt, negative prompt, options, inputs and sealed blobs are deleted. The video
  then answers `410 deleted`.
- Billing records (the job row, price, ledger entries) and the receipt stay. Deleting twice is harmless.
- Under an active preservation hold (MODERATION.md) the content is hidden exactly as if deleted, but kept until the
  hold ends; then the gateway deletes it.

## Private mode eligibility and account restrictions

| Method and path | Response |
|---|---|
| `GET /v1/me/eligibility` (web session), `GET /v1/account/eligibility` (API key or web session) | `{private_mode: {eligible, reasons: [str]}, restricted_until: float \| null, strikes_24h, strikes_7d}` |

- Creating a private job (`POST /v1/videos`) or routing one (`GET /v1/route?privacy=private|standard`; private is the
  default) from an ineligible account returns `403 private_mode_not_eligible` with `reasons`
  (`no_verified_payment`, `account_restricted`, `too_many_strikes`). Routing stays public; eligibility is checked
  only when the request carries a working credential, and `POST /v1/videos` checks again either way.
- A restricted account gets `403 account_restricted` with `restricted_until` in both modes, on job creation and on
  Standard uploads. A restriction with no end reports `253402300799` (9999-12-31); `null` means not restricted.
- Private eligibility (configurable): a credited top-up (card, USDT, TAO or alpha) or an operator credit; no active
  restriction; fewer than 2 strikes in 30 days. Validators and the seeded dev and validator accounts are exempt.
  Private jobs have a tighter per-minute limit (`KUNO_PRIVATE_JOBS_PER_MINUTE`, default 10; `429 rate_limited`).
- Private jobs are accepted for, and routed to, confidential-tier enclaves only: `409 enclave_unavailable` otherwise.

**Strikes.** One strike for each job that fails with `safety_blocked` (either mode), each blocked Standard upload
(`upload_blocked`) and each refused Standard prompt (`content_policy`). Defaults: 3 strikes in 24 h restrict the
account for 1 h; 5 in 7 days, for 7 days; 10 in 30 days, until an operator reviews it. Strikes carry a code, never
content. Validators and seeded accounts collect strikes but are never restricted automatically.

## Reports

| Method and path | Body | Response |
|---|---|---|
| `POST /v1/reports` (no credential; rate-limited per IP) | `{content_digest? \| job_id? \| url?, reason, details?, output_key?, contact_email?}` | `202 {report_id}`, whether or not the job exists |

- `reason`: `csam`, `sexual_minor`, `nonconsensual_intimate`, `violent_extremism`, `harassment`, `copyright`, `other`.
- `output_key` (32 bytes, base64url) is accepted **only** with `csam` or `sexual_minor`; any other reason answers
  `422 key_not_accepted`. A malformed key answers `422 invalid_output_key`.
- `429 rate_limited` after `KUNO_REPORTS_PER_HOUR_PER_IP` (10) per IP per hour.
- Priorities: `csam`, `sexual_minor` 100; `nonconsensual_intimate`, `violent_extremism` 60; others 20.
- A `csam` or `sexual_minor` report that names a known job places a provisional 30-day hold on it at once.

## Validators

| Method and path | Response |
|---|---|
| `GET /validator/v1/standard-jobs/{job_id}` (`require_validator`) | `{job_id, privacy: "standard", params, prompt, negative_prompt, seed, options, inputs: [{index, role, sha256, size, mime}], receipt}`; `404` for private or unknown jobs; `410 content_deleted` once the owner or an operator deleted the content |

Validators never receive a video. Step-audit requests (`POST /validator/v1/audits`) are accepted for any standard
job, and for private jobs only when the requesting validator created them.

## Operators

Operators sign in with the email link like anyone else and hold a role (table `operator_roles`, migration 0010). The
audit log records the signed-in email.

| Role | May |
|---|---|
| `moderator` | read reports, the queue and items (content only as below); resolve reports and items with any action; place holds; read holds and an account's safety record |
| `admin` | everything a moderator may, plus restrict and unrestrict accounts, release holds, credit accounts, read an account's ledger, read the audit log, read and set the model switch, publish the Turbo spec, and grant or revoke roles |

Wrong or missing role: `403 forbidden`; no credential: `401`.

**Roles.** `GET /admin/v1/roles` (active grants), `POST /admin/v1/roles {email, role}` (`201 {user_id, email, role,
granted_by, granted_at, revoked_at, granted}`; the user is created if they never signed in), `DELETE /admin/v1/roles
{email, role}` (`200`, or `404 not_found`). `422 invalid_role`, `invalid_email`, or `email_too_long` (operator emails
are limited to 64 characters). Audit actions `role.grant`, `role.revoke`. The first admin comes from the command line:

```
kuno-gateway grant-role --email you@example.com --role admin
kuno-gateway revoke-role --email you@example.com --role admin
```

(logged as operator `cli`). **Break-glass:** the shared `KUNO_ADMIN_TOKEN` is accepted only when
`KUNO_ALLOW_ADMIN_TOKEN=1`, never in production, and acts as operator `break-glass`. It is off by default.

**Routes** (moderator unless marked admin):

- `GET /admin/v1/reports?status=open|resolved|all`; `POST /admin/v1/reports/{report_id}/resolve` with `{action, note, until?}`,
  `action` one of `dismiss`, `remove_content`, `restrict_account`, `ban_account`
- `GET /admin/v1/moderation/queue?status=open|resolved`, `GET /admin/v1/moderation/items/{item_id}`,
  `GET /admin/v1/moderation/items/{item_id}/video`, `POST /admin/v1/moderation/items/{item_id}/resolve`
- `POST /admin/v1/holds` with `{job_id | upload_id, reason, days?, note}`; `GET /admin/v1/holds`, `GET /admin/v1/holds/{hold_id}`
- `POST /admin/v1/holds/{hold_id}/release` with `{note}` (admin)
- `POST /admin/v1/accounts/{account_id}/restrict` with `{until, reason}`, `POST /admin/v1/accounts/{account_id}/unrestrict` (admin)
- `GET /admin/v1/accounts/{account_id}/safety`
- `POST /admin/v1/accounts/{account_id}/credits`, `GET /admin/v1/accounts/{account_id}`, `GET /admin/v1/audit-log?target_id=`,
  `GET|PUT /admin/v1/switch`, `/admin/v1/roles` (admin)

**Content access.** Queue items and item detail carry `content_reviewable` (bool) and `content_access` (the basis:
`report:csam`, `report:sexual_minor`, `hold:report_csam`, `hold:report_sexual_minor`, `hold:upload_match`,
`hold:legal_request`, or `null`). An item is reviewable only when:

1. its report is open and its reason is `csam` or `sexual_minor`, or
2. its job (or blocked upload) has an active hold whose reason is `report_csam`, `report_sexual_minor`, `upload_match`
   or `legal_request`. A hold with reason `operator` preserves content but does not open it.

Otherwise `GET .../items/{item_id}/video` answers `403 content_not_reviewable`, and the item's `job` carries metadata
only: `prompt` and `negative_prompt` are `null` (`has_prompt` says whether one exists), and `has_video` is `false`.
When reviewable:

- **Standard job:** the video route serves the stored video (also a hidden one kept by a hold). Item detail includes
  the prompt, logged as `item.view_prompt`.
- **Private job:** the video is served only with a key: the report's `output_key`, or one a hold kept. Without a key:
  `403 private_content`; a key that doesn't open the receipted video: `422 key_mismatch`.
- **Blocked upload:** the preserved file, with its own MIME type (`item.view_upload`).

Queue listings never include prompts. Every content view is logged (`item.view_video`, `item.view_upload`,
`item.view_prompt`) with the operator's email and the basis. Other errors: `410 content_deleted`, `404 no_video`.

Queue item `kind`: `report`, `upload_match`, `account_review`, ordered by priority, then age. There is no sampled
review of new videos.

**Resolving.** `note` is required. `restrict_account` takes `until` (epoch seconds, default 7 days). `ban_account` is
an indefinite restriction of kind `ban`. `remove_content` deletes a Standard job's stored content, or a private job's
sealed blobs, and the owner then gets `410 removed`. Resolving a `csam` or `sexual_minor` report with `remove_content`
or `ban_account` first holds the job for the full preservation period; `dismiss` releases the report's provisional
hold. Resolving an item linked to an open report resolves the report too.

**Holds** `{hold_id, status: active|released|expired, reason, job_id, upload_id, account_id, report_id,
has_output_key, created_by, created_at, expires_at, released_at, released_by, note, release_note, preserved}`.
`reason`: `report_csam`, `report_sexual_minor`, `upload_match`, `legal_request`, `operator`; `days` defaults to
`KUNO_PRESERVATION_DAYS` (365), at most 3650. Errors: `404 not_found`, `409 already_released`, `422` for a body naming
both or neither of `job_id` and `upload_id`. Audit actions `hold.create`, `hold.extend`, `hold.release`, `hold.expire`.

## Implementation notes

- Upload MIME types are sniffed from the bytes; the `content-type` header is not trusted. Upload errors:
  `422 unsupported_media`, `422 upload_blocked` (the file is kept encrypted under an `upload_match` hold and can never
  be used), `503 scan_unavailable` (uploads fail closed), `413 too_large`.
- Standard job creation errors beyond `/v1/videos`'s: `422 content_policy`, `422 invalid_inputs`,
  `422 prompt_too_long`, `422 unsupported_option`, `503 no_capacity`, `503 standard_unavailable` (production without
  `KUNO_STANDARD_STORAGE_KEY`). `seed` is `0..2^63-1`.
- A standard job whose output doesn't verify fails with `error_code: "bad_output"` and is refunded.
- Thumbnail: `503 thumbnail_unavailable` if ffmpeg can't read the video.
- `GET /v1/blobs/{blob_id}` answers `404` for a blob that was deleted or hidden.
- Owner list entries of deleted jobs have `prompt: null` and `has_video: false`, even while a hold keeps the content.
- Rows from before migration 0010 may still carry `delete_reason: "expired"` (`410 expired`); nothing sets it now.

## Settings

`KUNO_ENV`, `KUNO_BLOB_BACKEND` (`s3` in production), `KUNO_S3_*` (deploy/README.md), `KUNO_STANDARD_STORAGE_KEY`,
`KUNO_STANDARD_UPLOAD_TTL_S` (86400), `KUNO_UPLOAD_TTL_S` (86400, unused private blobs), `KUNO_PRIVATE_JOBS_PER_MINUTE`
(10), `KUNO_PRIVATE_REQUIRES_PAYMENT` (1), `KUNO_PRIVATE_MAX_STRIKES_30D` (2), `KUNO_STRIKE_RULES`
(`3/86400/3600,5/604800/604800,10/2592000/review`), `KUNO_REPORTS_PER_HOUR_PER_IP` (10), `KUNO_BLOCKED_HASHES_FILE`,
`KUNO_FFMPEG`, `KUNO_PRESERVATION_DAYS` (365), `KUNO_ALLOW_ADMIN_TOKEN` (0; ignored in production).
Removed: `KUNO_STANDARD_RETENTION_DAYS`, `KUNO_MODERATION_SAMPLE_RATE`.
