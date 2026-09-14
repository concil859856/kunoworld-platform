# Standard mode, account safety and moderation: the gateway API contract

This is the contract the gateway, the website and both SDKs build against. Modes and miner tiers are
defined in `subnet/PRIVACY_MODES.md`. Error bodies use the gateway's usual
`{"detail": {"code", "message", ...}}` shape.

## Standard jobs

Credentials: the job API's usual ones (API key or studio token; `require_account`).

| Method and path | Body / query | Response |
|---|---|---|
| `POST /v1/standard/uploads?role=<InputRole>` | raw bytes, `content-type` = the file's MIME type | `201 {upload_id, sha256, size, mime}`. Uploads are scanned; a match returns `422 upload_blocked` with a generic message. Unused uploads expire after 24 h. |
| `POST /v1/standard/videos` | `{job_id?, params: GenerationParams, prompt, negative_prompt?, seed?, options?, inputs: [{upload_id, index, role, time_s?, strength?, hint?, start_s?, end_s?}], webhook_url?}` | `201 JobStatus` with `privacy: "standard"`. The gateway validates params, picks a fresh enclave of any tier, sets an explicit seed when none is given, seals the payload and inputs to that enclave, and charges like `/v1/videos`. |
| `GET /v1/videos/{job_id}` | | `JobStatus`, now including `privacy` for every job |
| `GET /v1/standard/videos?limit=50` | | `[{job_id, status, profile_id, params, prompt, created_at, finished_at, has_video, error_code}]`, newest first, this account's standard jobs |
| `GET /v1/standard/videos/{job_id}/video` | | `video/mp4`, owner only; `404 not_ready` until succeeded; `410 expired` after retention |
| `GET /v1/standard/videos/{job_id}/thumbnail` | | `image/jpeg` of a frame, owner only |
| `DELETE /v1/standard/videos/{job_id}` | | `204`; the owner deletes the stored video, prompt and inputs (the billing record stays) |

Web-session equivalents for the site live under `/v1/me/standard/...` with the same shapes, or the site
calls the job API with a studio token; either is acceptable.

Retention: `KUNO_STANDARD_RETENTION_DAYS` (default 30) for videos, prompts and inputs.

## Private mode eligibility and account restrictions

| Method and path | Response |
|---|---|
| `GET /v1/me/eligibility` (web session), `GET /v1/account/eligibility` (API key / studio token) | `{private_mode: {eligible, reasons: [str]}, restricted_until: float \| null, strikes_24h, strikes_7d}` |

- Creating a private job (`POST /v1/videos`) or routing one (`GET /v1/route?privacy=private|standard`,
  private is the default) from an ineligible account returns `403 private_mode_not_eligible` with `reasons`.
  **[Changed in implementation]** routing is `GET`, not `POST` (it always was); see "Implementation notes".
- A restricted account gets `403 account_restricted` with `restricted_until` in both modes.
- Private eligibility (defaults, configurable): at least one credited top-up (card, USDT, TAO or alpha)
  or an operator credit; no active restriction; fewer than 2 strikes in 30 days. Seeded dev and
  validator accounts are exempt. Private jobs have their own, tighter per-minute limit
  (`KUNO_PRIVATE_JOBS_PER_MINUTE`, default 10).
- Private jobs are only accepted for, and routed to, confidential-tier enclaves
  (`kuno_protocol.tiers.tier_serves`): `409 enclave_unavailable` otherwise.

Strikes: every job that fails with `safety_blocked`, in either mode, is one strike on its account.
Defaults: 3 strikes in 24 h restrict the account for 1 h; 5 in 7 days restrict it for 7 days;
10 in 30 days restrict it until an operator reviews it. Strikes never reveal content: the gateway only
ever sees the failure code.

## Reports

| Method and path | Body | Response |
|---|---|---|
| `POST /v1/reports` (no credential needed; rate-limited per IP) | `{content_digest? \| job_id? \| url?, reason, details?, output_key?, contact_email?}` | `202 {report_id}` |

`reason` is one of `csam`, `sexual_minor`, `nonconsensual_intimate`, `violent_extremism`, `harassment`,
`copyright`, `other`. `output_key` (base64url) lets a recipient hand over the key of a private video so
that one video can be reviewed. Reports of `csam` and `sexual_minor` are prioritised.

## Validators

| Method and path | Response |
|---|---|
| `GET /validator/v1/standard-jobs/{job_id}` (`require_validator`) | `{job_id, privacy: "standard", params, prompt, negative_prompt, seed, options, inputs: [{index, role, sha256, size, mime}], receipt}`; `404` for private or unknown jobs |

Step-audit requests (`POST /validator/v1/audits`) are accepted for any standard job, and for private jobs
only when the requesting validator created them.

## Operators

`require_admin` routes:

- `GET /admin/v1/reports?status=open`
- `POST /admin/v1/reports/{report_id}/resolve` with `{action, note}`, where `action` is one of
  `dismiss`, `remove_content`, `restrict_account`, `ban_account`
- `GET /admin/v1/moderation/queue`: open reports and sampled standard videos
- `GET /admin/v1/moderation/items/{item_id}/video`: standard content, or a private video when a
  report supplied its key
- `POST /admin/v1/accounts/{account_id}/restrict` with `{until, reason}`
- `POST /admin/v1/accounts/{account_id}/unrestrict`
- `POST /admin/v1/holds` with `{job_id | upload_id, reason, days?, note}`, where `reason` is one of
  `report_csam`, `report_sexual_minor`, `upload_match`, `legal_request`, `operator`: `201` hold
- `GET /admin/v1/holds?status=active|released|all` (also `job_id`, `upload_id`, `limit`), `GET /admin/v1/holds/{hold_id}`
- `POST /admin/v1/holds/{hold_id}/release` with `{note}`

Every operator action is logged with who, when and why.

## Implementation notes (gateway, 2026-09-14)

Everything above is implemented. Where the implementation needed a change or had to fill a gap, it is listed
here; items marked **[Changed]** differ from the text above, items marked **[Added]** only extend it.
The operator guide is `MODERATION.md`.

### Routing and private jobs
- **[Changed]** `/v1/route` is `GET` and stays public. It takes `privacy` (`private` default, or `standard`) and
  returns only enclaves whose tier serves that mode. Eligibility and restrictions are checked **only when the
  request carries a working credential** (API key or studio token); an anonymous route can't be checked, and
  `POST /v1/videos` checks again either way. The JS SDK routes without a credential today.
- **[Added]** Private per-minute limit answers `429 rate_limited` (same code as the general job limit).
- **[Added]** `reasons` codes: `no_verified_payment`, `account_restricted`, `too_many_strikes`.
- **[Added]** "Operator credit" means a positive ledger adjustment with source `admin` (`POST
  /admin/v1/accounts/{id}/credits`) or `migration` (pre-ledger opening balances). A signup credit
  (`KUNO_SIGNUP_CREDIT_USD`) does **not** count. Exempt: validator accounts and the seeded `dev`/`validator`
  accounts. `KUNO_PRIVATE_REQUIRES_PAYMENT=0` turns the payment rule off.
- **[Changed]** `restricted_until` for a restriction with no end (10 strikes in 30 days, an operator restriction
  with `until: null`, or a ban) is `253402300799` (9999-12-31), never `null`; `null` always means "not restricted".
- **[Added]** `403 account_restricted` also refuses Standard uploads and Standard job creation.
- **[Added]** Validators and seeded accounts collect strikes but are never restricted automatically.

### Standard jobs
- **[Changed]** Upload MIME types are sniffed from the bytes (`kuno_protocol.media.sniff_mime`); the
  `content-type` header is not trusted. Errors: `422 unsupported_media` (not a type the role accepts),
  `422 upload_blocked`, `503 scan_unavailable` (a matcher couldn't answer; uploads fail closed), `413 too_large`.
  A blocked upload is not stored; it records a moderation item (hash and metadata only) and one strike
  (`upload_blocked`).
- **[Added]** Job creation errors beyond `/v1/videos`'s: `422 invalid_inputs` (indexes must be `0..n-1` in the
  order of `params.input_roles`; each upload unused, unexpired, owned and uploaded for that role),
  `422 prompt_too_long`, `422 unsupported_option` (negative prompt on a model without one), `503 no_capacity`,
  `503 standard_unavailable` (production gateway without `KUNO_STANDARD_STORAGE_KEY`). `seed` is `0..2^63-1`.
- **[Added]** A standard job whose output doesn't verify (receipt signature, output digest, decryption with the
  job's output key, or content digest) fails with `error_code: "bad_output"` and is refunded.
- **[Added]** List entries also carry `expires_at` and `deleted`.
- **[Changed]** Video and thumbnail answer `410` with code `expired`, `deleted` (by the owner) or `removed`
  (by an operator). Thumbnail: `503 thumbnail_unavailable` if ffmpeg can't read the video.
- **[Added]** `DELETE` on a queued or running job cancels it (refunded) before deleting its content.
- `/v1/me/standard/...` equivalents exist for all six routes.

### Reports
- **[Added]** `422 invalid_output_key` unless `output_key` is 32 bytes of base64url. `429 rate_limited`
  after `KUNO_REPORTS_PER_HOUR_PER_IP` (default 10) per IP per hour. The answer is `202` whether or not the
  named job exists. Priorities: `csam`, `sexual_minor` 100; `nonconsensual_intimate`, `violent_extremism` 60;
  others 20.

### Validators
- **[Added]** `GET /validator/v1/standard-jobs/{job_id}` answers `410 content_deleted` once the owner,
  retention or an operator deleted the content.
- **[Pending, not in this change]** Step audits of any standard job by any validator: `POST
  /validator/v1/audits` lives in `api_audits.py`, owned by the miner-tier work, and still only accepts a
  validator's own jobs.

### Operators
- **[Added]** Operators name themselves with `X-Kuno-Operator: <name>` (default `admin`); the audit log records it.
- **[Added]** Resolve bodies accept `until` (epoch seconds) for `restrict_account` (default 7 days); `note` is
  required. `ban_account` is an indefinite restriction of kind `ban`. `remove_content` deletes a standard job's
  stored content, or a private job's sealed blobs.
- **[Added]** `GET /admin/v1/reports?status=open|resolved|all`, `GET /admin/v1/moderation/items/{item_id}`,
  `POST /admin/v1/moderation/items/{item_id}/resolve` (same body; resolves the linked report too),
  `GET /admin/v1/accounts/{account_id}/safety`, `GET /admin/v1/audit-log?target_id=`.
- **[Added]** Queue item `kind`: `report`, `sample`, `upload_match`, `account_review`; ordered by priority, then age.
- **[Added]** Item video errors: `403 private_content` (private job, no report key), `422 key_mismatch`,
  `410 content_deleted`. Every successful view is logged as `item.view_video`.
- **[Added]** Unrestrict takes an optional `{reason}`.
- **[Added] Preservation holds** (MODERATION.md, "Preservation holds"). A hold `{hold_id, status: active|released|expired,
  reason, job_id, upload_id, account_id, report_id, has_output_key, created_by, created_at, expires_at, released_at,
  released_by, note, release_note, preserved}` keeps a job's or upload's stored content from being deleted until it is
  released or expires (`days` default `KUNO_PRESERVATION_DAYS`, 365; at most 3650). Errors: `404 not_found` (job,
  stored upload or hold), `409 already_released`, `422` for a body naming both or neither of `job_id` and `upload_id`.
  Audit actions `hold.create`, `hold.release`, `hold.expire` (operator `system`).
- **[Changed]** `remove_content`, owner `DELETE`, retention and the blob sweep hide held content as before (`410
  removed|deleted|expired`, validator feed `410 content_deleted`, `GET /v1/blobs/{id}` `404`) but don't delete it;
  the janitor deletes it once no active hold covers it. Resolving a `csam` or `sexual_minor` report with
  `remove_content` or `ban_account` first places a `report_csam`/`report_sexual_minor` hold on the job; a resolving
  report's `output_key` for a held private job moves to the hold instead of being deleted.
- **[Changed]** A blocked upload is stored encrypted under an `upload_match` hold (still `422 upload_blocked`, still
  unusable in jobs); its item's `detail` adds `upload_id` and `hold_id`. `GET /admin/v1/moderation/items/{item_id}/video`
  serves that file (its own MIME type) while held, logged as `item.view_upload`; for held jobs it serves hidden
  Standard videos and private videos whose key a hold kept.
- **[Added]** Queue items and item detail add `holds` (holds on the item's job or blocked upload); `job` adds `held`.
- **[Changed]** `GET /v1/blobs/{blob_id}` answers `404` for a blob past its `expires_at`, even before the sweep deletes it.
- **[Added]** Owner list entries of deleted jobs have `prompt: null` and `has_video: false` even while a hold keeps the content.

### Settings
`KUNO_STANDARD_STORAGE_KEY`, `KUNO_STANDARD_RETENTION_DAYS` (30), `KUNO_STANDARD_UPLOAD_TTL_S` (86400),
`KUNO_PRIVATE_JOBS_PER_MINUTE` (10), `KUNO_PRIVATE_REQUIRES_PAYMENT` (1), `KUNO_PRIVATE_MAX_STRIKES_30D` (2),
`KUNO_STRIKE_RULES` (`3/86400/3600,5/604800/604800,10/2592000/review`), `KUNO_REPORTS_PER_HOUR_PER_IP` (10),
`KUNO_MODERATION_SAMPLE_RATE` (0.05), `KUNO_BLOCKED_HASHES_FILE`, `KUNO_FFMPEG`, `KUNO_PRESERVATION_DAYS` (365).
