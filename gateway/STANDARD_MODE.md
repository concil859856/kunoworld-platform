# Standard mode, storage, access and account safety: the gateway API contract

This is the contract the gateway, the website and both SDKs build against. Modes and miner tiers are defined in
`subnet/PRIVACY_MODES.md`; the operator guide is `MODERATION.md`. Error bodies use the gateway's usual
`{"detail": {"code", "message", ...}}` shape.

## The rules in one place

- **Where videos live.** In production every stored object (uploads, sealed job inputs, outputs, Standard videos and
  thumbnails) is in Cloudflare R2, through the gateway's S3 backend. A production gateway (`KUNO_ENV=production` or
  `KUNO_ATTESTATION=production`) refuses to start with the local blob backend. A Standard video is encrypted at rest
  by the gateway, with a data key of its own wrapped by a key management service (`deploy/README.md`, "Storage keys"),
  before it reaches R2. A Private video is ciphertext that only the
  customer's key opens; the platform never has that key. R2 also encrypts every object at rest (AES-256).
- **How long they stay.** Until the owner deletes them. Nothing a job stores expires, in either mode: no retention
  period for videos, thumbnails, prompts, inputs or sealed blobs. Only uploads that never became part of a job
  expire, after 24 hours.
- **Who can open them.** Only the owner, unless the owner creates a share link for that one video
  ([Share links](#share-links)). An operator may open content only for an open report of `csam` or
  `sexual_minor`, or under an active preservation hold for a child-safety report, a blocked upload or a legal
  request. Every such view is written to the audit log. Every other report gives operators metadata only.
- **How people sign in.** Customers sign in by email link; the website's server keeps the web session and forwards
  it to the gateway for everything, including the job API. The browser never holds a token. API keys are for
  developers' programs. Operators are ordinary users who sign in the same way and hold a `moderator` or `admin` role.
- **What is banned.** Sexual and NSFW content, in both modes. The gateway checks every Standard prompt before
  sealing it; Private prompts are checked inside the enclave, because the gateway can't read them.
- **Prices.** Every price the gateway returns is a **placeholder**, to be set later. `GET /v1/models` says so with
  `pricing_placeholder: true`. Standard is priced below Private: a profile's `pricing.standard_usd_per_second` against
  its `pricing.usd_per_second`, which is the Private price. Full MiniMax H3 and H3 Director are sold in Private mode
  only (`standard_usd_per_second: null`, `privacy_modes: ["private"]`), and a Standard job for either is refused with
  `422 privacy_mode_unavailable` before anything is charged. Every job costs at least $0.10. Prices, multipliers and
  refunds: `PAYMENTS.md`.

## Credentials

| Credential | Who holds it | Accepted on |
|---|---|---|
| Web session (`kws_...`) | the website's server, from an HttpOnly cookie; forwarded as `Authorization: Bearer` | the job API (`require_account`) and account management (`/v1/me/*`, `require_user`) |
| API key (`kw_live_...`) | a developer's program | the job API only. It can't manage keys, payments, wallets or eligibility pages (`/v1/me/*` answers `401`) |
| Operator session | a web session of a user holding a role | `/admin/v1/*` and `PUT /turbo/v1/spec` (`require_operator`) |

- `POST /v1/me/studio-token` answers `410 gone`. Studio tokens (`kwt_...`) are never accepted; migration 0010 revoked any that existed.
- `GET /v1/me` returns `{user, account, roles: [...]}`; `roles` is `[]`, `["moderator"]` or `["admin"]` (or both).
- Key sync (`/v1/me/keyvault/...`) and the `/v1/me/...` share-link routes take only the web session. Share links also
  have job-API routes that take an API key.
- Data export, closing the account and appeals (`/v1/me/exports`, `/v1/me/close`, `/v1/me/reauth`, `/v1/me/standing`,
  `/v1/me/appeals`) take only the web session.

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

**Output scanning.** When a Standard job succeeds, the gateway decrypts the video, checks the receipt, and runs the video
through the upload matchers (exact SHA-256, PDQ per sampled frame) before storing anything. MODERATION.md, "Output
scanning", has the details.

- **A match** fails the job with `error_code: "safety_blocked"`, refunds it and records one strike. The owner never
  gets the video (`404 not_ready`); it is kept encrypted under an `output_match` hold for review.
- **Scanning unavailable:** the job fails with `scan_unavailable`, is refunded, and gets no strike.
- **Private jobs** are never scanned.

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
content. Validators and seeded accounts collect strikes but are never restricted automatically. A strike overturned on
appeal is voided (`strikes.voided_at`) and no longer counts toward the rules or private eligibility.

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

## Your data

| Method and path | Response |
|---|---|
| `POST /v1/me/exports` | `202` export. `409 export_in_progress` (with `export`) while one is queued or building; `503 export_unavailable` without at-rest storage |
| `GET /v1/me/exports?limit=20` | `[{export_id, status, created_at, started_at, finished_at, expires_at, deleted_at, size_bytes, sha256, error_code, contents}]`, newest first |
| `GET /v1/me/exports/{export_id}/download` | `application/zip`, the owner's session only (`404` otherwise); `409 not_ready`, `409 export_failed`, `410 expired` |

- `status`: `queued`, `running`, `ready`, `failed`, `expired` (deleted 7 days after it finished), `deleted` (the account
  was closed). One export in progress per account.
- The gateway's background loop builds it into the blob store, sealed at rest with the platform key in 32 MiB parts;
  the download streams the parts in order. `expires_at` is `finished_at` plus 7 days, when the loop deletes the copy.
  Exports are copies: deleting one deletes nothing else.
- The zip: `README.txt`; `account.json` (email, account, balance, ledger, payments, wallets, API key names and
  prefixes, roles, strikes, restrictions, appeals, and reports filed with the account's address as the contact);
  `jobs.json` (every job's metadata, privacy mode, params, receipt, `content`: `stored`, `deleted`, `removed` or `none`,
  and `files`); `standard/<job>/request.json`, `video.mp4`, `thumbnail.jpg` and `inputs/<index>-<role>.<ext>`,
  decrypted as the owner's download is; `private/<job>/output.kunob`, the sealed output (ciphertext; the keys are the
  customer's); `private/keys.json` from `key_vault.export_account` when key sync is installed.
- Never in it: content the owner deleted or moderation removed, even while a hold keeps it; anything about holds;
  secrets (API keys, the webhook secret); operators' identities or notes. `contents` counts `left_out_deleted` and
  `left_out_removed`.

## Closing an account

| Method and path | Body | Response |
|---|---|---|
| `GET /v1/me/close` | | `{email, account_id, reauth_required, reauth_expires_at, reauth_window_s, balance_usd, balance_policy, deletes, records_kept, retention_policy}` |
| `POST /v1/me/reauth` | `{next?}` | `202`: emails the signed-in address a sign-in link (default `next`: `/account?closing=1#close-account`); counts toward that address's sign-in link limit (`429 rate_limited`) |
| `POST /v1/me/close` | `{confirm_email}` | `200 {closed, account_id, closed_at, jobs, jobs_canceled, balance_usd, balance_policy, records_kept, retention_policy}`. `403 reauth_required` unless the session was opened by a sign-in in the last 10 minutes; `422 email_mismatch` |

One transaction, in this order: key sync purged (`key_vault.purge_account`) and share links ended
(`shares.revoke_account`); sessions and API keys revoked, wallets unlinked, pending sign-in links deleted, operator roles
revoked, open appeals withdrawn; every job through the path of `DELETE /v1/videos/{job_id}` (unfinished jobs canceled
and refunded; held content hidden and deleted when its hold ends); unused uploads and exports deleted; the webhook
secret deleted and pending deliveries stopped; the address replaced by `closed-<user_id>@closed.invalid`, a salted hash
of it kept in `account_closures`, and `accounts.closed_at` set. Audit action `account.close` by `owner:<user_id>`; a
tombstone (`tombstones.record`) for each deletion when that module is installed. Kept: the ledger, payments, job records
and receipts, reports, strikes, restrictions and the audit log **[RETENTION OF RECORDS AFTER CLOSURE]**. The balance is
recorded, not refunded **[BALANCE ON CLOSURE POLICY]**. Afterwards the old sessions and keys answer `401`, pending
sign-in links for the address are gone, and the address signs in to a new, empty account.

## Appeals

| Method and path | Body | Response |
|---|---|---|
| `GET /v1/me/standing` | | `{strikes, restrictions, removals, report_resolutions, appeals_sent_today, appeals_per_day, max_statement}`; each subject carries `appeal: {appeal_id, status} \| null` and `appealable`. An operator's restriction reason is withheld (`reason: null`) |
| `POST /v1/me/appeals` | `{subject_kind, subject_id, statement}` | `201` appeal. `404 subject_not_found`, `409 not_appealable` (already voided, ended, dismissed or restored), `409 appeal_open`, `422` (empty or over 2000 characters), `429 rate_limited` (5 a day) |
| `GET /v1/me/appeals` | | `[{appeal_id, subject_kind, subject_id, status, statement, created_at, resolved_at, decision, note, outcome, summary}]` |
| `GET /admin/v1/appeals?status=open\|resolved\|all`, `GET /admin/v1/appeals/{appeal_id}` (moderator) | | the same plus `account_id`, `item_id`, `resolved_by`, `notified_at` and `subject` (metadata; removals carry `content_restorable`) |
| `POST /admin/v1/appeals/{appeal_id}/resolve` (moderator) | `{decision: uphold \| overturn, note}` | the appeal; `409 already_resolved` |

`subject_kind`: `strike`, `restriction` (by id), `removal` (a job id), `report_resolution` (a report id resolved with
`restrict_account`, `ban_account` or `remove_content`). `status`: `open`, `upheld` (the decision stands), `overturned`,
`withdrawn` (the account was closed). Overturning voids a strike, lifts a restriction, or reverses a report
resolution's account action (the restriction or ban it placed, or its removal). A removal is restored only if its
content is still stored, which only a hold makes possible; otherwise `outcome.content_gone` is `true`. Each appeal is a
queue item of kind `appeal` (priority 50) that only this route resolves (`409 appeal_item` on the generic one). The
customer is emailed the decision with the note. Audit actions: `appeal.create` (by `owner:<user_id>`),
`appeal.uphold`, `appeal.overturn`, `strike.void`, `account.unrestrict`, `report.overturn`, `job.restore`,
`appeal.notify`, `appeal.withdraw`.

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
- `GET /admin/v1/cybertip/config`, `GET /admin/v1/cybertip/items/{item_id}`, `GET /admin/v1/cybertip/reports?status=&item_id=&limit=`,
  `GET /admin/v1/cybertip/reports/{report_id}`, `POST /admin/v1/cybertip/reports` with `{item_id, incident_type?,
  industry_classification?, additional_info?}`, `POST /admin/v1/cybertip/reports/{report_id}/dry-run`
- `POST /admin/v1/cybertip/reports/{report_id}/submit` with `{"confirm": true, note}`,
  `POST /admin/v1/cybertip/reports/{report_id}/cancel` with `{note}` (admin)

**CyberTipline reports** (MODERATION.md, "CyberTipline reports"). A moderator prepares a report from an item under a
child-safety hold; only an admin confirms it; the gateway never submits on its own.

- **Report:** `{report_id, status: draft|dry_run|submitting|submitted|failed|canceled, item_id, hold_id, job_id,
  upload_id, account_id, incident_type, draft: {incident, reported, summary, additional_info, industry_classification,
  context}, reporter, files: [{file_id, position, source, sha256, md5, size, mime, file_name, ncmec_file_id,
  uploaded_at, details_sent_at}], viewed_by_esp, report_xml, validated_at, environment, ncmec_report_id, attempts,
  last_error_code, last_error, created_by, created_at, updated_at, confirmed_by, confirmed_at, submitted_at,
  canceled_by, canceled_at, cancel_note}`. `report_xml` is `null` in lists.
- **Item status:** `{item_id, eligible, reason, hold_id, hold_reason, reports}`.
- **Config:** `{environment, submissions_enabled, base_url, credentials_configured, reporter, reporter_placeholders,
  incident_types, industry_classifications}`. Never the credentials.
- **With `KUNO_CYBERTIP_ENV=disabled`** (the default), submit answers `200` with `status: "dry_run"` and sends nothing.
- **Errors:**
  - `404 not_found`;
  - `409 not_under_child_safety_hold`, `report_exists` (with `report_id`), `already_submitted`, `already_canceled`,
    `submission_in_progress`, `content_unavailable`;
  - `422 invalid_report` (with `errors`), `invalid_incident_type`, `invalid_classification`, and `422` for a submit
    body without `"confirm": true`;
  - `502 ncmec_error` (with `ncmec_code`, `retryable`);
  - `503 cybertip_not_configured`, `cybertip_misconfigured`.

**Content access.** Queue items and item detail carry `content_reviewable` (bool) and `content_access` (the basis:
`report:csam`, `report:sexual_minor`, `hold:report_csam`, `hold:report_sexual_minor`, `hold:upload_match`,
`hold:output_match`, `hold:legal_request`, or `null`). An item is reviewable only when:

1. its report is open and its reason is `csam` or `sexual_minor`, or
2. its job (or blocked upload) has an active hold whose reason is `report_csam`, `report_sexual_minor`, `upload_match`,
   `output_match` or `legal_request`. A hold with reason `operator` preserves content but does not open it.

Otherwise `GET .../items/{item_id}/video` answers `403 content_not_reviewable`, and the item's `job` carries metadata
only: `prompt` and `negative_prompt` are `null` (`has_prompt` says whether one exists), and `has_video` is `false`.
When reviewable:

- **Standard job:** the video route serves the stored video (also a hidden one kept by a hold). Item detail includes
  the prompt, logged as `item.view_prompt`.
- **Private job:** the video is served only with a key: the report's `output_key`, or one a hold kept. Without a key:
  `403 private_content`; a key that doesn't open the receipted video: `422 key_mismatch`.
- **Blocked upload:** the preserved file, with its own MIME type (`item.view_upload`).
- **Refused video** (`output_match` item): the video output scanning kept under its hold, while a hold covers the job
  (`item.view_video`, access `held_output`); the item's `job.has_video` says whether it is there.

Items from hash lists carry the match in `detail`:

- `matcher`, `match_kind` (`exact` or `perceptual`), `list`, `category`, `sha256`, `size`, `mime`, `hold_id`;
- for perceptual matches, also `distance`, `threshold`, `quality`, `pdq` (the content's hash), `list_version`, and
  `frame_time_s` for a video.

Queue listings never include prompts. Every content view is logged (`item.view_video`, `item.view_upload`,
`item.view_prompt`) with the operator's email and the basis. Other errors: `410 content_deleted`, `404 no_video`.

Queue item `kind`: `report`, `upload_match`, `output_match`, `account_review`, ordered by priority, then age. There is no
sampled review of new videos.

**Resolving.** `note` is required. `restrict_account` takes `until` (epoch seconds, default 7 days). `ban_account` is
an indefinite restriction of kind `ban`. `remove_content` deletes a Standard job's stored content, or a private job's
sealed blobs, and the owner then gets `410 removed`. Resolving a `csam` or `sexual_minor` report with `remove_content`
or `ban_account` first holds the job for the full preservation period; `dismiss` releases the report's provisional
hold. Resolving an item linked to an open report resolves the report too.

**Holds** `{hold_id, status: active|released|expired, reason, job_id, upload_id, account_id, report_id,
has_output_key, created_by, created_at, expires_at, released_at, released_by, note, release_note, preserved}`.
`reason`: `report_csam`, `report_sexual_minor`, `upload_match`, `legal_request`, `operator`, and `output_match`, which only
the gateway places (output scanning) and `POST /admin/v1/holds` doesn't accept. `days` defaults to
`KUNO_PRESERVATION_DAYS` (365), at most 3650. `preserved` also carries `blocked_output: true` when a hold keeps a refused
video. Errors: `404 not_found`, `409 already_released`, `422` for a body naming
both or neither of `job_id` and `upload_id`. Audit actions `hold.create`, `hold.extend`, `hold.release`, `hold.expire`.

## Key sync (web session only)

Private video keys wrapped in the customer's browser, so their other devices can unwrap them. Design and parameters:
`subnet/PRIVACY_MODES.md`, "Key sync". The gateway stores only wrapped values and can't open them. Every route answers
`401` to an API key. Nothing here is written to the operator audit log.

| Method and path | Body / query | Response |
|---|---|---|
| `GET /v1/me/keyvault` | `cursor?`, `limit?` (200, at most 500) | `{account_id, master_key_id, version, created_at, updated_at, job_key_count, limits, unlockers: [...], job_keys: [{job_id, wrapped, created_at, updated_at}], next_cursor}`, job keys ordered by job id; `404 no_vault` while key sync is off |
| `POST /v1/me/keyvault` | `{master_key_id, unlockers: [unlocker]}` (1-10) | `201` the vault, without job keys; `409 vault_exists` |
| `DELETE /v1/me/keyvault` | | `204`: the vault, its unlockers and every job key are deleted |
| `POST /v1/me/keyvault/unlockers` | `{master_key_id, unlocker}` | `201 {version, unlocker_id}`; `409 too_many_unlockers`, `409 unlocker_exists` |
| `DELETE /v1/me/keyvault/unlockers/{unlocker_id}` | | `200 {version}`; `409 last_unlocker` (one always stays); `404 not_found` |
| `PUT /v1/me/keyvault/job-keys/{job_id}` | `{master_key_id, wrapped}` | `200 {job_id, created, version, updated_at}`; only the account's own private jobs (`404 not_found`, `422 not_private`); `409 vault_full` |
| `DELETE /v1/me/keyvault/job-keys/{job_id}` | | `204` |
| `POST /v1/me/keyvault/rotate` | `{expected_version, master_key_id, unlockers: [unlocker], job_keys: [{job_id, wrapped}]}` | `200` the vault. Every unlocker and job key replaced in one transaction. `job_keys` must name exactly the jobs the vault holds and `expected_version` must be current, else `409 vault_changed` (with `version`, `missing_job_ids`, `unknown_job_ids`); `422 same_master_key`, `422 unlocker_reused` |

- **Unlocker:** `{unlocker_id, kind, label?, params, wrapped_master_key}`. `unlocker_id` and `master_key_id` are 32
  lowercase hex characters the browser chooses. `recovery_code` params are exactly `{alg: "PBKDF2-SHA256", iterations
  (600,000 to 10,000,000), salt (16-64 bytes)}`; `passkey` params are `{credential_id (16-1023 bytes), prf_salt
  (32 bytes), rp_id, transports?}`. `label`: at most 64 printable characters.
- **Wrapped values** are base64url without padding. `wrapped_master_key`: exactly 64 bytes, `"KVM1"` | 12-byte IV |
  AES-256-GCM output (32 + 16). `wrapped`: `"KVJ1"` | IV | ciphertext, at least 96 bytes, at most 4,096 characters.
  Associated data: `KVM1|kuno/keyvault/master-key|<account_id>|<unlocker_id>|<kind>` and
  `KVJ1|kuno/keyvault/job-key|<account_id>|<job_id>`. Anything else answers `422` with `not_wrapped`,
  `invalid_encoding`, `too_large`, `weak_kdf`, `invalid_params`, `invalid_id` or `invalid_label`; unknown fields answer
  `422` too.
- A put or a new unlocker for a `master_key_id` that isn't current answers `409 vault_changed` with the current
  `master_key_id`: the keys were rotated elsewhere.
- Limits: 10 unlockers, 10,000 job keys. A rotation's body may be up to about 42 MB; every other JSON body keeps the
  usual limit.
- `DELETE /v1/videos/{job_id}` also deletes that job's wrapped key.
- Account closure and export call `key_vault.purge_account(s, account_id)` and `key_vault.export_account(s, account_id)`
  (wrapped material only). Deletions record tombstones (`key_vault`, `key_vault_unlocker`, `key_vault_job_key`) that
  `kuno-gateway reapply-deletions` replays after a restore.

## Share links

Only the owner can open a video, unless the owner creates a share link for that one video. Links are off until made,
revocable, and optionally expiring.

| Method and path | Credential | Body / query | Response |
|---|---|---|---|
| `POST /v1/me/videos/{job_id}/shares` | web session | `{expires_at?}`: Unix seconds, 1 minute to 10 years ahead, or null | `201 {share_id, job_id, privacy, profile_id, created_at, expires_at, revoked_at, status, view_count, token, url_path, url}` |
| `GET /v1/me/shares` | web session | `job_id?`, `limit?` (100, at most 500) | owner rows without the token, newest first |
| `DELETE /v1/me/shares/{share_id}` | web session | | `200` the row; `404 not_found`. Revoking twice is harmless |
| `POST /v1/videos/{job_id}/shares`, `GET /v1/account/shares`, `DELETE /v1/account/shares/{share_id}` | API key or web session | the same | the same |
| `GET /v1/shares/{token}` | none | | `{privacy, profile_id, created_at, shared_at, expires_at, content_digest, receipt, signing_public_key}` |
| `GET /v1/shares/{token}/video` | none | | Standard: `video/mp4`, decrypted from at-rest storage like the owner's download. Private: `application/octet-stream`, the sealed output blob |

- `token`: 32 random bytes, base64url. Only its SHA-256 is stored, so it appears in this one response. `url_path` is
  `/s/{token}`; `url` is `KUNO_SITE_URL` + `url_path`. A private video's key is never in a response: the owner's
  browser appends `#k=<base64url output key>`, which browsers never send to a server.
- Making a link: `404 not_found`, `409 not_ready`, `410 deleted` or `410 removed`, `409 share_unavailable` (for example
  under a hold), `403 account_restricted` (with `restricted_until`), `403 account_closed`, `422 invalid_expiry`,
  `409 too_many_shares` (20 working links per video, 1,000 per account).
- `status`: `active`, `revoked`, `expired`, `video_deleted`, `video_removed`, `account_closed`, or `unavailable`, which is
  also what a preservation hold shows.
- Public routes: `404 not_found` for an unknown token. `410 share_unavailable` ("This link no longer works.") once the
  link was revoked or expired, the video was deleted, removed or is held, or the account closed: the same body every
  time. `429 rate_limited` after `KUNO_SHARE_VIEWS_PER_MINUTE_PER_IP` (60) requests a minute from one IP, counted
  under a keyed hash of the address. Each `/video` response counts one view; nothing about viewers is stored. Both
  carry `cache-control: no-store`, `x-robots-tag: noindex, nofollow` and `referrer-policy: no-referrer`.
- `DELETE /v1/videos/{job_id}` ends the video's links (`video_deleted`). Account closure calls
  `shares.revoke_account(s, account_id)`. Ending links records tombstones (`share_link`, `share_links_job`,
  `share_links_account`), so a restore can't make a link work again.

## Implementation notes

- Upload MIME types are sniffed from the bytes; the `content-type` header is not trusted. Upload errors:
  `422 unsupported_media` (also for a file that doesn't decode for scanning), `422 upload_blocked` (the file is kept
  encrypted under an `upload_match` hold and can never be used), `503 scan_unavailable` (uploads fail closed),
  `413 too_large`.
- Standard job failures from output scanning: `safety_blocked` (a hash-list match; the video is held under
  `output_match`), `scan_unavailable` (not kept, refunded); a video that doesn't decode for scanning fails as `bad_output`.
- Standard job creation errors beyond `/v1/videos`'s: `422 content_policy`, `422 invalid_inputs`,
  `422 privacy_mode_unavailable` (a Private-only model), `422 prompt_too_long`, `422 unsupported_option`,
  `503 no_capacity`, `503 standard_unavailable` (storage keys not configured; a production gateway refuses to start
  without a key management service instead). `seed` is `0..2^63-1`.
- A standard job whose output doesn't verify fails with `error_code: "bad_output"` and is refunded.
- Thumbnail: `503 thumbnail_unavailable` if ffmpeg can't read the video.
- `GET /v1/blobs/{blob_id}` answers `404` for a blob that was deleted or hidden.
- Owner list entries of deleted jobs have `prompt: null` and `has_video: false`, even while a hold keeps the content.
- Rows from before migration 0010 may still carry `delete_reason: "expired"` (`410 expired`); nothing sets it now.

## Settings

`KUNO_ENV`, `KUNO_BLOB_BACKEND` (`s3` in production), `KUNO_S3_*` (deploy/README.md), `KUNO_STORAGE_KEK_PROVIDER` and `KUNO_STORAGE_*` (deploy/README.md, "Storage keys"; `KUNO_STANDARD_STORAGE_KEY` is legacy),
`KUNO_STANDARD_UPLOAD_TTL_S` (86400), `KUNO_UPLOAD_TTL_S` (86400, unused private blobs), `KUNO_PRIVATE_JOBS_PER_MINUTE`
(10), `KUNO_PRIVATE_REQUIRES_PAYMENT` (1), `KUNO_PRIVATE_MAX_STRIKES_30D` (2), `KUNO_STRIKE_RULES`
(`3/86400/3600,5/604800/604800,10/2592000/review`), `KUNO_REPORTS_PER_HOUR_PER_IP` (10), `KUNO_BLOCKED_HASHES_FILE`,
`KUNO_FFMPEG`, `KUNO_PRESERVATION_DAYS` (365), `KUNO_ALLOW_ADMIN_TOKEN` (0; ignored in production),
`KUNO_PERCEPTUAL_HASH_FILES`, `KUNO_PDQ_MATCH_DISTANCE` (31), `KUNO_PDQ_MIN_QUALITY` (50),
`KUNO_PERCEPTUAL_FRAME_INTERVAL_S` (1), `KUNO_PERCEPTUAL_MAX_FRAMES` (300), `KUNO_PERCEPTUAL_TIMEOUT_S` (300),
`KUNO_HASH_SHARING_PROGRAMMES` (placeholders), `KUNO_CYBERTIP_ENV` (`disabled`), `KUNO_CYBERTIP_USERNAME`,
`KUNO_CYBERTIP_PASSWORD`, `KUNO_CYBERTIP_BASE_URL` (test only), `KUNO_CYBERTIP_TIMEOUT_S` (60),
`KUNO_CYBERTIP_REPORTING_ENTITY`, `KUNO_CYBERTIP_REPORTER_FIRST_NAME`, `KUNO_CYBERTIP_REPORTER_LAST_NAME`,
`KUNO_CYBERTIP_REPORTER_EMAIL`, `KUNO_CYBERTIP_REPORTER_PHONE`, `KUNO_CYBERTIP_LEGAL_URL` (placeholders until the legal
entity exists), `KUNO_SHARE_VIEWS_PER_MINUTE_PER_IP` (60), `KUNO_SITE_URL` (the origin of share-link `url`s).
Removed: `KUNO_STANDARD_RETENTION_DAYS`, `KUNO_MODERATION_SAMPLE_RATE`.
