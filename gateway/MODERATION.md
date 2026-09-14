# Moderation: the operator guide

How KunoWorld operators handle reports, review content, act on accounts, and answer legal requests. The API
contract is `STANDARD_MODE.md`; the modes are defined in `subnet/PRIVACY_MODES.md`.

> **Legal review needed.** Statements in this guide about legal obligations are general descriptions, not legal
> advice, and are flagged **[counsel]**. Have counsel in each jurisdiction you operate in confirm them, and
> write the procedures they call for, before relying on this guide in production.

## What operators can and cannot see

| | Private jobs | Standard jobs |
|---|---|---|
| Prompt, negative prompt, options, inputs | never (sealed to the enclave) | yes, until deleted or expired |
| The video | only if a report hands over that video's key, and only until the report is resolved (or while a preservation hold keeps that key) | yes, until deleted or expired (or while a hold keeps it) |
| Metadata: account, time, model, public params, status, failure code, receipt, content digest, enclave and miner | yes | yes |

Nobody at KunoWorld holds a private job's keys. "Enforcement without visibility" for private jobs means: safety
checks inside attested enclaves, strikes from `safety_blocked` failures, stricter account requirements for
private mode, signed provenance, and reports that carry a key.

## Access and the audit log

All routes below need the admin token (`Authorization: Bearer $KUNO_ADMIN_TOKEN`). The token is shared, so
**always send `X-Kuno-Operator: <your name>`**; without it the log records `admin`. Every action (resolving a
report or item, restricting, unrestricting, placing and releasing holds, and every video or upload view) is
written to `operator_audit_log` with the
operator, time, action, target and the note you gave. Read it with `GET /admin/v1/audit-log?target_id=...`.
Notes are the "why": write them for the person who reviews your decision later.

## The queue

`GET /admin/v1/moderation/queue` lists open items, highest priority first, then oldest:

| kind | priority | what it is |
|---|---|---|
| `report` | 100 for `csam`, `sexual_minor`; 60 for `nonconsensual_intimate`, `violent_extremism`; 20 otherwise | a report from anyone (`POST /v1/reports`) |
| `upload_match` | 90 | a Standard upload matched a blocked-hash list; the file was refused, can never be used in a job, and is kept encrypted under an `upload_match` hold |
| `account_review` | 70 | an account reached the "until an operator reviews it" strike rule |
| `sample` | 0 | a random share (`KUNO_MODERATION_SAMPLE_RATE`, default 5%) of newly succeeded Standard videos |

Each item carries the report (if any), the job (privacy, account, model, prompt for Standard jobs, whether a
video can be viewed, `held`), metadata (hashes, list names; for `upload_match`, the `upload_id` and `hold_id` of
the preserved file) and `holds` (every hold on the item's job or blocked upload). It never carries file contents.

### Reviewing a video

`GET /admin/v1/moderation/items/{item_id}/video`:

- **Standard job**: the stored video, decrypted from at-rest storage; also after removal or deletion while a hold
  keeps it.
- **Private job**: only when the item's report supplied `output_key`, or a hold kept that key after the report
  was resolved. The gateway decrypts that one video and checks it is the receipted one (`422 key_mismatch`
  otherwise). Without a key: `403 private_content`.
- **Blocked upload** (`upload_match` item): the preserved file, with its own MIME type (often an image), while its
  hold is active. Logged as `item.view_upload`.

Views are logged. Download to a controlled review environment only. **[counsel]** If content may be child sexual
abuse material, follow the CSAM procedure below and do not copy, forward or re-upload it.

## Actions

`POST /admin/v1/reports/{report_id}/resolve` or `POST /admin/v1/moderation/items/{item_id}/resolve` with
`{"action", "note", "until"?}`:

| action | effect |
|---|---|
| `dismiss` | closes the report or item; nothing else changes |
| `remove_content` | Standard: hides the job (the owner sees `410 removed`, validators `410`) and deletes the stored video, thumbnail, prompt, inputs and sealed blobs. Private: hides and deletes the job's sealed input and output blobs. Under a hold, content is hidden the same way but not deleted until the hold ends |
| `restrict_account` | the job owner can't start jobs in either mode until `until` (default 7 days) |
| `ban_account` | an indefinite restriction of kind `ban` |

Resolving a `csam` or `sexual_minor` report with `remove_content` or `ban_account` first places a preservation
hold on the reported job (see below). Resolving a report deletes the `output_key` it carried, unless the job
is under a hold, which keeps it. Resolving an item linked to an open report resolves the report too. Billing
records always stay.

Account tools: `POST /admin/v1/accounts/{id}/restrict {until|null, reason}`, `POST /admin/v1/accounts/{id}/unrestrict
{reason?}` (lifts every active restriction, including bans), and `GET /admin/v1/accounts/{id}/safety` (eligibility,
strike counts, restriction history).

## Strikes and automatic restrictions

Every job that fails with `safety_blocked` (either mode) and every blocked Standard upload is one strike. Strikes
record a code and a job id, never content. Default rules (`KUNO_STRIKE_RULES`), checked on every strike:

- 3 strikes in 24 h: restricted for 1 hour;
- 5 in 7 days: restricted for 7 days;
- 10 in 30 days: restricted until an operator lifts it, with an `account_review` item in the queue.

Private mode also needs fewer than 2 strikes in 30 days (`KUNO_PRIVATE_MAX_STRIKES_30D`) and a credited top-up or
operator credit. Validators and the seeded dev/validator accounts collect strikes but are never restricted
automatically (validator canaries deliberately probe the safety checks). Unrestricting an account doesn't erase
its strikes, so it may still be ineligible for private mode.

When reviewing an `account_review`, look at the pattern (bursts right after sign-up, attempts across both modes,
blocked uploads) rather than any content, which for private jobs you cannot see.

## Reports

Anyone can report without an account: `{content_digest | job_id | url, reason, details?, output_key?, contact_email?}`.
A recipient of a private video can include its `output_key` (the SDK's `VideoJob.export()` holds it), which is the
only way a private video can be reviewed. The key is stored encrypted and deleted at resolution, unless a hold
on the job keeps it (re-encrypted for that hold, deleted when the hold ends). Reports are
limited to 10 per IP per hour; the gateway keeps a keyed hash of the IP, not the address.

## Upload scanning (Standard mode)

Every Standard upload (reference images, videos and audio, frames, source clips) is checked before storage by the
matchers in `upload_scan.py`. A match returns `422 upload_blocked` with a generic message, stores the file
encrypted at rest under an `upload_match` hold (it gets no upload id the customer could use), adds an
`upload_match` item and a strike, and logs the hash and list name only. If a matcher can't answer, uploads are refused (`503`).
Private-mode inputs are ciphertext and can't be scanned by the gateway; the enclave's safety checks cover them.

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
  (new dependencies). The algorithms are free; the **hash lists** to match against come through membership or
  vetting programmes (for example NCMEC's hash sharing for registered electronic service providers, StopNCII for
  non-consensual intimate imagery, GIFCT for terrorist content, Tech Coalition programmes), each under its own
  agreement. Sources: [facebook/ThreatExchange](https://github.com/facebook/ThreatExchange),
  [licence](https://github.com/facebook/ThreatExchange/blob/main/LICENSE),
  [PDQ & TMK+PDQF evaluation (arXiv 1912.07745)](https://arxiv.org/abs/1912.07745).
- **Commercial services** (such as Thorn Safer) under their own contracts.

Hash lists of this kind are sensitive: keep them out of the repository and restrict who can read them.

## Retention

| Data | Kept for | Setting |
|---|---|---|
| Standard video, thumbnail, prompt, options, inputs | 30 days from creation, or until the owner deletes them or an operator removes them | `KUNO_STANDARD_RETENTION_DAYS` |
| Unused Standard uploads | 24 hours | `KUNO_STANDARD_UPLOAD_TTL_S` |
| Sealed job blobs (inputs, outputs, both modes) | 7 days | blob retention |
| A report's `output_key` | until the report is resolved, or while a hold on the job keeps it | |
| Anything under an active preservation hold | until the hold is released or expires (default 365 days), then the normal rule above | `KUNO_PRESERVATION_DAYS` |
| Blocked uploads | for their `upload_match` hold (default 365 days), then deleted | `KUNO_PRESERVATION_DAYS` |
| Jobs (metadata, receipts), ledger, strikes, restrictions, reports, queue items, holds, audit log | not deleted automatically | **[counsel]** set a schedule |

Deletion removes the objects from the blob store. Storage-level backups or bucket versioning, if enabled, keep
copies until they age out; configure them to match this table. All Standard content at rest is encrypted with
`KUNO_STANDARD_STORAGE_KEY`; back that key up separately and treat losing it as losing the content.

## Preservation holds

A hold stops the gateway destroying a job's or an upload's stored content. It never makes content visible again:
removal, owner deletion and retention still hide held content (the owner gets `410 removed`, `deleted` or
`expired`, blob downloads answer `404`, the validator feed `410 content_deleted`), but the encrypted data stays
until the hold is released or expires. The janitor (every few seconds) then marks expired holds released, as
`system`, and deletes whatever no other active hold covers, through the normal deletion paths.

**Automatic holds**

- Resolving a `csam` or `sexual_minor` report with `remove_content` or `ban_account` places a hold (`report_csam`
  or `report_sexual_minor`, linked to the report) on the reported job before anything is hidden. `ban_account`
  holds without removing; `dismiss` and `restrict_account` don't hold.
- A Standard upload blocked by the scanner is kept encrypted under an `upload_match` hold, placed by `system`.
- A private job's report key survives resolution when the job is held: it is re-encrypted for the hold, and
  moves to another active hold of the job, or is deleted, when that hold ends.

**Operator endpoints** (admin token and `X-Kuno-Operator`; each call is in the audit log)

| Method and path | Body / query | Effect |
|---|---|---|
| `POST /admin/v1/holds` | `{job_id \| upload_id, reason, days?, note}` | `201` hold. `reason`: `report_csam`, `report_sexual_minor`, `upload_match`, `legal_request`, `operator`. `days` defaults to `KUNO_PRESERVATION_DAYS` (365), at most 3650. `upload_id` is a Standard upload or a blocked upload's id from its item. `404` if the job or stored upload doesn't exist |
| `GET /admin/v1/holds` | `status=active\|released\|all`, `job_id?`, `upload_id?`, `limit?` | holds, newest first |
| `GET /admin/v1/holds/{hold_id}` | | one hold |
| `POST /admin/v1/holds/{hold_id}/release` | `{note}` | ends the hold; `409 already_released` |

A hold's `preserved` field says what the gateway still stores for it (flags and counts, never content): for a
job `sealed_blobs`, and for Standard jobs `video`, `prompt`, `uploads`, `hidden`; for an upload `upload`. Check it
after placing a hold: a hold can only keep what still exists. To extend a hold, place a new one before the old
one expires. Audit actions: `hold.create`, `hold.release`, `hold.expire`, and `item.view_upload`.

**What a hold can and can't preserve**

| | Can keep (if still stored when the hold is placed) | Can't keep |
|---|---|---|
| Standard job | the video, thumbnail, prompt, negative prompt, options, inputs and sealed blobs | content already deleted by its owner, by retention (30 days) or by an earlier removal without a hold |
| Private job | the sealed input and output blobs (ciphertext), and a key a report supplied | anything readable without that key: prompts, inputs and the video are sealed to the enclave and the platform never has their keys; sealed blobs already past the 7-day blob retention |
| Blocked upload | the file, encrypted at rest | files blocked before holds existed (they were never stored) |
| Any | job metadata, receipts, reports and the audit log (never deleted automatically anyway) | copies outside the gateway's database and blob store (backups, bucket versioning, edge logs) |

Keep in mind:

- **A `csam` or `sexual_minor` report holds its job on arrival.** When such a report names a job the gateway
  knows (by job id or content digest), a provisional hold (system, 30 days) is placed at once, so the owner can't
  delete it and retention can't expire it while the report waits. Dismissing the report releases that hold;
  resolving it with `remove_content` or `ban_account` extends it to the full preservation period. Reports of
  other reasons hold nothing by themselves: place an `operator` hold if review will take time. Because anyone
  can file a report, a false report can keep content from being deleted for up to 30 days; the content is not
  hidden until an operator acts. **[counsel]** Confirm the provisional period and this trade-off.
- Held content is the most sensitive data the platform stores. Review it only through the item route (logged),
  only as the procedure allows. **[counsel]** Who may access held content, for what purpose, and how access
  requests from law enforcement are handled.
- Releasing a hold deletes: the next janitor pass removes the content unless another active hold covers it.
  Don't release a hold on apparent CSAM early unless counsel says to.

## Child sexual abuse material **[counsel]**

- In the United States, providers that obtain actual knowledge of apparent CSAM must report it to NCMEC's
  CyberTipline (18 U.S.C. 2258A), and the REPORT Act (2024) extended the required preservation of reported content
  from 90 days to 1 year. Sources: [18 U.S.C. 2258A](https://uscode.house.gov/view.xhtml?req=granuleid%3AUSC-prelim-title18-section2258A&num=0&edition=prelim),
  [Public Law 118-59](https://www.congress.gov/118/plaws/publ59/PLAW-118publ59.pdf). Other jurisdictions have their own duties.
- **Procedure.** Counsel defines it; this is what the gateway supports. A reported job is already under a
  provisional hold from the moment the report arrived. Resolve the report with `remove_content`: the job is held
  (`report_csam`/`report_sexual_minor`, 365 days by default), then hidden. Restrict the account indefinitely with
  `POST /admin/v1/accounts/{id}/restrict {"until": null, ...}` (a report resolves once, so a ban via
  `ban_account` can't be combined with `remove_content` on the same report). Report as the procedure requires,
  and record the reference where it says (for example the resolution note).
- **Blocked uploads** matched against a CSAM list are already held. Resolve their item with `restrict_account`,
  `ban_account` or `dismiss`; the hold is independent of the item.
- **[counsel]** Confirm the preservation period (`KUNO_PRESERVATION_DAYS`), whether and how a hold is extended at
  a request, and what may be viewed or copied. Do not view, copy, forward or re-upload content beyond what the
  procedure allows.

## Legal requests **[counsel]**

Route every request (subpoena, court order, emergency disclosure request, preservation letter) to counsel before
acting. What the platform can technically produce:

| Data | Private mode | Standard mode |
|---|---|---|
| Account: email, sign-in times, API keys (names/prefixes, not keys), linked wallets | yes | yes |
| Payments and ledger | yes | yes |
| Job metadata: times, model, public params, status, failure code, receipt, content digest, enclave and miner hotkey | yes | yes |
| Strikes, restrictions, reports, audit log | yes | yes |
| Prompts, inputs, options | **no**: never held in readable form | yes, within retention and if not deleted |
| The video | **no**, except one video while an open report or a hold keeps its key | yes, within retention and if not deleted, or while held |
| Content after deletion, expiry or removal | only ciphertext (and a report key) a hold kept | only what a hold kept (backups aside) |
| Request IP addresses | not stored by the gateway's database (edge or access logs may hold them, per their own retention) | same |

A **preservation request** can be met for metadata, and for content still stored, with a `legal_request` hold
(`POST /admin/v1/holds`, with `days` as counsel directs; see "What a hold can and can't preserve"). Private content
can't be preserved in readable form because it never is, except a video whose key a report supplied.

Given a video file, `GET /v1/provenance/{sha256}` identifies the job, model and enclave that made it, in either mode.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `KUNO_STANDARD_STORAGE_KEY` | dev: generated `data/standard_storage.key`; production: required | base64url 32-byte key for Standard content at rest |
| `KUNO_STANDARD_RETENTION_DAYS` | 30 | Standard content retention |
| `KUNO_STANDARD_UPLOAD_TTL_S` | 86400 | unused upload lifetime |
| `KUNO_PRIVATE_JOBS_PER_MINUTE` | 10 | private job limit per account |
| `KUNO_PRIVATE_REQUIRES_PAYMENT` | 1 | private mode needs a credited top-up or operator credit |
| `KUNO_PRIVATE_MAX_STRIKES_30D` | 2 | private mode needs fewer strikes than this in 30 days |
| `KUNO_STRIKE_RULES` | `3/86400/3600,5/604800/604800,10/2592000/review` | strikes/window s/restriction s or `review` |
| `KUNO_REPORTS_PER_HOUR_PER_IP` | 10 | report rate limit |
| `KUNO_MODERATION_SAMPLE_RATE` | 0.05 | share of Standard videos queued for review |
| `KUNO_BLOCKED_HASHES_FILE` | unset | SHA-256 blocklist for Standard uploads |
| `KUNO_FFMPEG` | `ffmpeg` on PATH | used for thumbnails |
| `KUNO_PRESERVATION_DAYS` | 365 | default length of a preservation hold **[counsel]** |
