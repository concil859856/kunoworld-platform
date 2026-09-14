# Moderation: the operator guide

How KunoWorld operators sign in, handle reports, act on accounts and answer legal requests. The API contract is
`STANDARD_MODE.md`; the modes are defined in `subnet/PRIVACY_MODES.md`.

> **Legal review needed.** Statements in this guide about legal obligations are general descriptions, not legal
> advice, and are flagged **[counsel]**. Have counsel in each jurisdiction you operate in confirm them, and write the
> procedures they call for, before relying on this guide in production.

## The principles

- **Videos live in Cloudflare R2 and stay until their owner deletes them.** A Standard video is encrypted at rest by
  the gateway before it is stored. A Private video is ciphertext that only its owner's key opens. Nothing a job stores
  expires on its own, in either mode.
- **Only the owner opens a video.** Operators see metadata. An operator may open content only for an open report of
  child sexual abuse material (`csam`, `sexual_minor`), or while a preservation hold for such a report, a blocked
  upload or a legal request covers it. Every view is logged under the operator's email.
- **Operators sign in by email** and hold a role. There is no shared operator password or token in normal operation.
- **Sexual and NSFW content is banned in both modes.** The gateway refuses Standard prompts that break the content
  policy; the enclave checks Private prompts.
- **Prices are placeholders** until the owner sets them (`PAYMENTS.md`).

## Operators and sign-in

Operators are ordinary users: they sign in on the website with the email link, and the gateway checks their role on
every request.

| Role | May |
|---|---|
| `moderator` | read reports, the queue and items; open content only where the rules below allow; resolve reports and items with any action (`dismiss`, `remove_content`, `restrict_account`, `ban_account`); place holds; read holds and an account's safety record |
| `admin` | everything a moderator may, plus: restrict and unrestrict accounts directly, release holds, credit accounts, read ledgers, read the audit log, set the model switch, publish the Turbo spec, grant and revoke roles |

**Bootstrapping.** Grant the first admin on the gateway host (or in its container); it is logged as operator `cli`:

```sh
kuno-gateway grant-role --email you@example.com --role admin
kuno-gateway revoke-role --email you@example.com --role admin
```

The person then signs in on the website as usual; `GET /v1/me` shows `roles: ["admin"]`. Further roles are managed
by admins: `POST /admin/v1/roles {"email", "role"}`, `DELETE /admin/v1/roles {"email", "role"}`, `GET /admin/v1/roles`.
Granting a role to an address that has never signed in creates the user; the role applies once they sign in.
Revoking takes effect on the next request. Operator addresses are limited to 64 characters.

**Break-glass.** The shared `KUNO_ADMIN_TOKEN` works only when `KUNO_ALLOW_ADMIN_TOKEN=1` is set, never on a
production gateway (`KUNO_ENV=production` or `KUNO_ATTESTATION=production`), and every use is logged as operator
`break-glass`. It exists for development and for recovering a non-production gateway with no admins. In production,
recover with `grant-role` instead.

## What operators can and cannot see

| | Private jobs | Standard jobs |
|---|---|---|
| Metadata: account, time, model, public params, status, failure code, receipt, content digest, enclave and miner, holds | yes | yes |
| Prompt, negative prompt | never (sealed to the enclave) | only while the item is reviewable (below); each view is logged |
| The video | only while reviewable **and** with a key a `csam`/`sexual_minor` report supplied (or a hold kept) | only while reviewable |
| Blocked upload file | n/a | only under its `upload_match` hold |

Nobody at KunoWorld holds a private job's keys. Enforcement without visibility for private jobs means safety checks
inside attested enclaves (the same content policy the gateway runs, plus classifiers), strikes from `safety_blocked`
failures, stricter account requirements for private mode, signed provenance, and reports that carry a key.

### When content is reviewable

An item's `content_reviewable` is true, and `content_access` names the basis, only when:

1. its report is **open** and its reason is `csam` or `sexual_minor` (`report:csam`, `report:sexual_minor`); or
2. its job or blocked upload has an **active hold** with reason `report_csam`, `report_sexual_minor`, `upload_match` or
   `legal_request` (`hold:<reason>`).

Every other report (`nonconsensual_intimate`, `violent_extremism`, `harassment`, `copyright`, `other`) and every
`operator` hold gives metadata only: the video route answers `403 content_not_reviewable`, and prompts are withheld.
Act on those reports from metadata: the account's history and strikes, the reporter's details, provenance. If a
report of another reason turns out to concern apparent CSAM, or counsel receives a legal request, place the matching
hold (`legal_request`) through the procedure counsel defines; the hold note is the record of why.

A dismissed or otherwise resolved report stops opening content unless a hold continues to cover it.

## Access and the audit log

Every operator action is written to `operator_audit_log` with the operator's email (or `cli`, `system`,
`break-glass`), time, action, target and note:

- resolving a report or item, restricting, unrestricting, crediting;
- placing, extending, releasing and expiring holds;
- granting and revoking roles;
- **every content view:** `item.view_video`, `item.view_upload`, `item.view_prompt`, each with its `basis`.

Admins read it with `GET /admin/v1/audit-log?target_id=...`. Notes are the "why": write them for the person who
reviews your decision later.

## The queue

`GET /admin/v1/moderation/queue` lists open items, highest priority first, then oldest:

| kind | priority | what it is |
|---|---|---|
| `report` | 100 for `csam`, `sexual_minor`; 60 for `nonconsensual_intimate`, `violent_extremism`; 20 otherwise | a report from anyone (`POST /v1/reports`) |
| `upload_match` | 90 | a Standard upload matched a blocked-hash list; the file was refused, can never be used in a job, and is kept encrypted under an `upload_match` hold |
| `account_review` | 70 | an account reached the "until an operator reviews it" strike rule |

There is no sampled review: new videos never enter the queue by themselves. Each item carries the report (if any),
the job's metadata (`has_prompt`, `has_video`, `held`), hashes and list names, `holds`, `content_reviewable` and
`content_access`. Queue listings never include prompts or file contents; `GET /admin/v1/moderation/items/{item_id}`
includes a Standard prompt only when the item is reviewable, and logs that view.

### Reviewing content

`GET /admin/v1/moderation/items/{item_id}/video`, only when the item is reviewable:

- **Standard job:** the stored video, decrypted from at-rest storage; also after removal or owner deletion while a
  hold keeps it.
- **Private job:** only with the report's `output_key`, or a key a hold kept after the report was resolved. The gateway
  decrypts that one video and checks it is the receipted one (`422 key_mismatch` otherwise). Without a key:
  `403 private_content`.
- **Blocked upload** (`upload_match` item): the preserved file, with its own MIME type, while its hold is active.

Download to a controlled review environment only. **[counsel]** If content may be child sexual abuse material,
follow the CSAM procedure below and do not copy, forward or re-upload it.

## Actions

`POST /admin/v1/reports/{report_id}/resolve` or `POST /admin/v1/moderation/items/{item_id}/resolve` with
`{"action", "note", "until"?}` (moderator):

| action | effect |
|---|---|
| `dismiss` | closes the report or item; releases the provisional hold a `csam`/`sexual_minor` report placed; nothing else changes |
| `remove_content` | Standard: hides the job (the owner sees `410 removed`, validators `410`) and deletes the stored video, thumbnail, prompt, inputs and sealed blobs. Private: deletes the job's sealed input and output blobs. Under a hold, content is hidden the same way but not deleted until the hold ends |
| `restrict_account` | the job owner can't start jobs in either mode until `until` (default 7 days) |
| `ban_account` | an indefinite restriction of kind `ban` |

Resolving a `csam` or `sexual_minor` report with `remove_content` or `ban_account` first extends its hold to the full
preservation period. Resolving a report deletes the `output_key` it carried, unless a hold on the job keeps it.
Resolving an item linked to an open report resolves the report too. Billing records always stay.

Account tools: `POST /admin/v1/accounts/{id}/restrict {until|null, reason}` and `POST /admin/v1/accounts/{id}/unrestrict
{reason?}` (admin; unrestrict lifts every active restriction, including bans), `GET /admin/v1/accounts/{id}/safety`
(moderator: eligibility, strike counts, restriction history).

## Strikes and automatic restrictions

One strike for every job that fails with `safety_blocked` (either mode), every blocked Standard upload
(`upload_blocked`) and every Standard prompt the gateway refuses under the content policy (`content_policy`). Strikes
record a code and, where there is one, a job id, never content. Default rules (`KUNO_STRIKE_RULES`), checked on every
strike:

- 3 strikes in 24 h: restricted for 1 hour;
- 5 in 7 days: restricted for 7 days;
- 10 in 30 days: restricted until an operator lifts it, with an `account_review` item in the queue.

Private mode also needs fewer than 2 strikes in 30 days (`KUNO_PRIVATE_MAX_STRIKES_30D`) and a credited top-up or
operator credit. Validators and the seeded dev/validator accounts collect strikes but are never restricted
automatically. Unrestricting an account doesn't erase its strikes, so it may still be ineligible for private mode.

When reviewing an `account_review`, look at the pattern (bursts right after sign-up, refused prompts, attempts across
both modes, blocked uploads) rather than any content.

## Reports

Anyone can report without an account: `{content_digest | job_id | url, reason, details?, output_key?, contact_email?}`.
A recipient of a private video can include its `output_key` (the SDK's `VideoJob.export()` holds it) **only** with a
`csam` or `sexual_minor` report; any other reason is refused with `422 key_not_accepted`, so no key is ever stored for
content operators may not open. The key is stored encrypted and deleted at resolution, unless a hold on the job keeps
it (re-encrypted for that hold, deleted when the hold ends). Reports are limited to 10 per IP per hour; the gateway
keeps a keyed hash of the IP, not the address.

## Content policy and upload scanning (Standard mode)

**Prompts.** Every Standard job's prompt and negative prompt go through `kuno_protocol.content_policy.check_prompt`
before anything is sealed. A violation answers `422 content_policy` ("This prompt isn't allowed. Sexual and NSFW
content is not permitted."), creates no job, charges nothing and records a `content_policy` strike. The prompt is not
logged. The enclave runs the same check for every job, in both modes, which is the only check a Private prompt gets.

**Uploads.** Every Standard upload is checked before storage by the matchers in `upload_scan.py`. A match returns
`422 upload_blocked` with a generic message, stores the file encrypted at rest under an `upload_match` hold (it gets
no upload id the customer could use), adds an `upload_match` item and a strike, and logs the hash and list name only.
If a matcher can't answer, uploads are refused (`503`). Private inputs are ciphertext and can't be scanned by the
gateway; the enclave's safety checks cover them.

**Today:** `KUNO_BLOCKED_HASHES_FILE`, one lowercase SHA-256 per line with an optional category, `#` comments. The
file is re-read when it changes. Exact hashes only catch byte-identical files.

**Adding perceptual matching.** Implement a `Matcher` (`match(data, sha256, mime) -> Match | None`) and add it in
`build_scanner`. Options and their constraints (verify current terms before integrating) **[counsel]**:

- **Microsoft PhotoDNA Cloud Service**: free for qualified organizations that pass third-party vetting, and usable
  solely to prevent the spread of child sexual abuse content and support related investigations, at Microsoft's
  discretion. It is an HTTPS API, so the matcher is remote and must fail closed.
  Sources: [PhotoDNA Cloud Service](https://www.microsoft.com/en-us/photodna/cloudservice),
  [Terms of use](https://www.microsoft.com/en-us/photodna/termsofuse), [FAQ](https://www.microsoft.com/en-us/photodna/faq).
- **Meta PDQ (images) and TMK+PDQF (video)**: perceptual hashes open-sourced by Meta in 2019 in the ThreatExchange
  repository (BSD licence), with a Python package (`threatexchange`). Computing them needs image/video decoding
  (new dependencies). The algorithms are free; the **hash lists** to match against come through membership or vetting
  programmes (for example NCMEC's hash sharing for registered electronic service providers, StopNCII for
  non-consensual intimate imagery, GIFCT for terrorist content, Tech Coalition programmes), each under its own
  agreement. Sources: [facebook/ThreatExchange](https://github.com/facebook/ThreatExchange),
  [licence](https://github.com/facebook/ThreatExchange/blob/main/LICENSE),
  [PDQ & TMK+PDQF evaluation (arXiv 1912.07745)](https://arxiv.org/abs/1912.07745).
- **Commercial services** (such as Thorn Safer) under their own contracts.

Hash lists of this kind are sensitive: keep them out of the repository and restrict who can read them.

## Storage and deletion

| Data | Where | Kept until |
|---|---|---|
| Standard video, thumbnail, prompt, options, inputs | R2 (media encrypted at rest with `KUNO_STANDARD_STORAGE_KEY`); prompts in Postgres | the owner deletes the video, or an operator removes it |
| Private job inputs and outputs | R2, as ciphertext only the owner's key opens | the owner deletes the video, or an operator removes it |
| Uploads no job used (either mode) | R2 | 24 hours (`KUNO_STANDARD_UPLOAD_TTL_S`, `KUNO_UPLOAD_TTL_S`) |
| A report's `output_key` (`csam`/`sexual_minor` only) | Postgres, encrypted | the report is resolved, or while a hold on the job keeps it |
| Anything under an active preservation hold | as above | the hold is released or expires (default 365 days), then the rule above applies |
| Blocked uploads | R2, encrypted | their `upload_match` hold ends (default 365 days), then deleted |
| Jobs (metadata, receipts), ledger, strikes, restrictions, reports, queue items, holds, roles, audit log | Postgres | not deleted automatically **[counsel]** set a schedule |

Deletion removes the objects from R2 through the gateway. Never add an expiry lifecycle rule to the bucket: it would
delete videos their owners kept. Bucket versioning or copies outside the gateway, if enabled, keep data after
deletion; don't enable them unless counsel agrees. Back up `KUNO_STANDARD_STORAGE_KEY` separately; losing it loses
every Standard video.

## Preservation holds

A hold stops the gateway destroying a job's or an upload's stored content. It never makes content visible to its
owner again: owner deletion and removal still hide held content (the owner gets `410 deleted` or `removed`, blob
downloads answer `404`, the validator feed `410 content_deleted`), but the encrypted data stays until the hold is
released or expires. The janitor then marks expired holds released, as `system`, and deletes whatever the owner or an
operator had deleted and no other active hold covers.

A hold with reason `report_csam`, `report_sexual_minor`, `upload_match` or `legal_request` also lets operators review
the held content (logged). An `operator` hold only preserves.

**Automatic holds**

- A `csam` or `sexual_minor` report that names a known job (by job id or content digest) places a provisional hold
  (system, 30 days) at once. Dismissing the report releases it; resolving it with `remove_content` or `ban_account`
  extends it to the full preservation period.
- A Standard upload blocked by the scanner is kept encrypted under an `upload_match` hold, placed by `system`.
- A private job's report key survives resolution when the job is held: it is re-encrypted for the hold, and moves to
  another active hold of the job, or is deleted, when that hold ends.

**Operator endpoints** (each call is in the audit log)

| Method and path | Role | Body / query | Effect |
|---|---|---|---|
| `POST /admin/v1/holds` | moderator | `{job_id \| upload_id, reason, days?, note}` | `201` hold. `reason`: `report_csam`, `report_sexual_minor`, `upload_match`, `legal_request`, `operator`. `days` defaults to `KUNO_PRESERVATION_DAYS` (365), at most 3650. `404` if the job or stored upload doesn't exist |
| `GET /admin/v1/holds` | moderator | `status=active\|released\|all`, `job_id?`, `upload_id?`, `limit?` | holds, newest first |
| `GET /admin/v1/holds/{hold_id}` | moderator | | one hold |
| `POST /admin/v1/holds/{hold_id}/release` | admin | `{note}` | ends the hold; `409 already_released` |

A hold's `preserved` field says what the gateway still stores for it (flags and counts, never content): for a job
`sealed_blobs`, and for Standard jobs `video`, `prompt`, `uploads`, `hidden`; for an upload `upload`. A hold can only
keep what still exists: content its owner already deleted without a hold is gone. To extend a hold, place a new one
before the old one expires.

| | Can keep (if still stored when the hold is placed) | Can't keep |
|---|---|---|
| Standard job | the video, thumbnail, prompt, negative prompt, options, inputs and sealed blobs | content its owner or an operator already deleted without a hold |
| Private job | the sealed input and output blobs (ciphertext), and a key a `csam`/`sexual_minor` report supplied | anything readable without that key: prompts, inputs and the video are sealed to the enclave |
| Blocked upload | the file, encrypted at rest | files blocked before holds existed |
| Any | job metadata, receipts, reports and the audit log (never deleted automatically anyway) | copies outside the gateway's database and blob store |

Keep in mind:

- Because anyone can file a report, a false `csam` report keeps content from being deleted for up to 30 days, and lets
  operators open it while the report is open; the content is not hidden from its owner until an operator acts.
  **[counsel]** Confirm the provisional period and this trade-off.
- Held content is the most sensitive data the platform stores. Review it only through the item route (logged), only as
  the procedure allows. **[counsel]** Who may access held content, for what purpose, and how law-enforcement requests
  are handled.
- Releasing a hold deletes what was already deleted or removed: the next janitor pass removes it unless another active
  hold covers it. Content its owner never deleted simply stays with its owner. Don't release a hold on apparent CSAM
  early unless counsel says to.

## Child sexual abuse material **[counsel]**

- In the United States, providers that obtain actual knowledge of apparent CSAM must report it to NCMEC's CyberTipline
  (18 U.S.C. 2258A), and the REPORT Act (2024) extended the required preservation of reported content from 90 days to
  1 year. Sources: [18 U.S.C. 2258A](https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title18-section2258A&num=0&edition=prelim),
  [Public Law 118-59](https://www.congress.gov/118/plaws/publ59/PLAW-118publ59.pdf). Other jurisdictions have their own duties.
- **Procedure.** Counsel defines it; this is what the gateway supports. A reported job is already under a provisional
  hold from the moment the report arrived, and reviewable while the report is open. Resolve the report with
  `remove_content`: the job is held (`report_csam`/`report_sexual_minor`, 365 days by default), then hidden. An admin
  restricts the account indefinitely with `POST /admin/v1/accounts/{id}/restrict {"until": null, ...}` (a report
  resolves once, so `ban_account` can't be combined with `remove_content` on the same report). Report as the procedure
  requires, and record the reference where it says (for example the resolution note).
- **Blocked uploads** matched against a CSAM list are already held. Resolve their item with `restrict_account`,
  `ban_account` or `dismiss`; the hold is independent of the item.
- **[counsel]** Confirm the preservation period (`KUNO_PRESERVATION_DAYS`), whether and how a hold is extended at a
  request, and what may be viewed or copied. Do not view, copy, forward or re-upload content beyond what the procedure
  allows.

## Legal requests **[counsel]**

Route every request (subpoena, court order, emergency disclosure request, preservation letter) to counsel before
acting. What the platform can technically produce:

| Data | Private mode | Standard mode |
|---|---|---|
| Account: email, sign-in times, API keys (names/prefixes, not keys), linked wallets | yes | yes |
| Payments and ledger | yes | yes |
| Job metadata: times, model, public params, status, failure code, receipt, content digest, enclave and miner hotkey | yes | yes |
| Strikes, restrictions, reports, roles, audit log | yes | yes |
| Prompts, inputs, options | **no**: never held in readable form | yes, unless the owner deleted them (or while a hold keeps them) |
| The video | **no**, except one video whose key a `csam`/`sexual_minor` report supplied | yes, unless the owner deleted it (or while a hold keeps it) |
| Content after owner deletion or removal | only ciphertext (and a report key) a hold kept | only what a hold kept |
| Request IP addresses | not stored by the gateway's database (edge or access logs may hold them, per their own retention) | same |

A **preservation request** is met with a `legal_request` hold (`POST /admin/v1/holds`, `days` as counsel directs).
That hold also lets operators review the held Standard content, and a private video only if a key exists; each view is
logged. Private content can't be produced in readable form because the platform never has it.

Given a video file, `GET /v1/provenance/{sha256}` identifies the job, model and enclave that made it, in either mode.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `KUNO_ENV` | unset | `production` marks a production gateway (so does `KUNO_ATTESTATION=production`): local blob storage and break-glass are refused |
| `KUNO_BLOB_BACKEND`, `KUNO_S3_*` | `local` | `s3` with R2 in production (`deploy/README.md`) |
| `KUNO_STANDARD_STORAGE_KEY` | dev: generated `data/standard_storage.key`; production: required | base64url 32-byte key for Standard content at rest |
| `KUNO_STANDARD_UPLOAD_TTL_S` | 86400 | lifetime of a Standard upload no job used |
| `KUNO_UPLOAD_TTL_S` | 86400 | lifetime of a private ciphertext upload no job used |
| `KUNO_PRIVATE_JOBS_PER_MINUTE` | 10 | private job limit per account |
| `KUNO_PRIVATE_REQUIRES_PAYMENT` | 1 | private mode needs a credited top-up or operator credit |
| `KUNO_PRIVATE_MAX_STRIKES_30D` | 2 | private mode needs fewer strikes than this in 30 days |
| `KUNO_STRIKE_RULES` | `3/86400/3600,5/604800/604800,10/2592000/review` | strikes/window s/restriction s or `review` |
| `KUNO_REPORTS_PER_HOUR_PER_IP` | 10 | report rate limit |
| `KUNO_BLOCKED_HASHES_FILE` | unset | SHA-256 blocklist for Standard uploads |
| `KUNO_FFMPEG` | `ffmpeg` on PATH | used for thumbnails |
| `KUNO_PRESERVATION_DAYS` | 365 | default length of a preservation hold **[counsel]** |
| `KUNO_ADMIN_TOKEN`, `KUNO_ALLOW_ADMIN_TOKEN` | unset, 0 | break-glass token; honoured only with `KUNO_ALLOW_ADMIN_TOKEN=1`, never in production |
