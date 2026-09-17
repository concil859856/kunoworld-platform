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
- **Only the owner opens a video, unless the owner makes a share link for it** (`STANDARD_MODE.md`, "Share links").
  Links give operators nothing, and every link stops working while its video is removed or held. Operators see
  metadata. An operator may open content only for an open report of
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
| `moderator` | read reports, the queue and items; open content only where the rules below allow; resolve reports and items with any action (`dismiss`, `remove_content`, `restrict_account`, `ban_account`); place holds; read holds and an account's safety record; prepare and validate CyberTipline reports |
| `admin` | everything a moderator may, plus: restrict and unrestrict accounts directly, release holds, credit accounts, read ledgers, read the audit log, set the model switch, publish the Turbo spec, grant and revoke roles, confirm and cancel CyberTipline reports |

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
| A finished video refused by output scanning | n/a | only under its `output_match` hold |

Nobody at KunoWorld holds a private job's keys. Enforcement without visibility for private jobs means safety checks
inside attested enclaves (the same content policy the gateway runs, plus classifiers), strikes from `safety_blocked`
failures, stricter account requirements for private mode, signed provenance, and reports that carry a key.

### When content is reviewable

An item's `content_reviewable` is true, and `content_access` names the basis, only when:

1. its report is **open** and its reason is `csam` or `sexual_minor` (`report:csam`, `report:sexual_minor`); or
2. its job or blocked upload has an **active hold** with reason `report_csam`, `report_sexual_minor`, `upload_match`,
   `output_match` or `legal_request` (`hold:<reason>`).

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
- appeals: `appeal.create` and `appeal.withdraw`, `appeal.uphold`, `appeal.overturn`, and an overturn's `strike.void`,
  `account.unrestrict`, `report.overturn` or `job.restore`; `appeal.notify` (`system`) once the customer is emailed;
- account closure: `account.close`, and `role.revoke` for any role the account held. A customer acting on their own
  account is recorded as `owner:<user id>`, never by email;
- **every content view:** `item.view_video`, `item.view_upload`, `item.view_prompt`, each with its `basis`.

Admins read it with `GET /admin/v1/audit-log?target_id=...`. Notes are the "why": write them for the person who
reviews your decision later.

## The queue

`GET /admin/v1/moderation/queue` lists open items, highest priority first, then oldest:

| kind | priority | what it is |
|---|---|---|
| `report` | 100 for `csam`, `sexual_minor`; 60 for `nonconsensual_intimate`, `violent_extremism`; 20 otherwise | a report from anyone (`POST /v1/reports`) |
| `upload_match` | 90 | a Standard upload matched a blocked-hash list; the file was refused, can never be used in a job, and is kept encrypted under an `upload_match` hold |
| `output_match` | 90 | a finished Standard video matched a hash list; the job failed as `safety_blocked`, the video was never stored for its owner, and it is kept encrypted under an `output_match` hold |
| `account_review` | 70 | an account reached the "until an operator reviews it" strike rule |
| `appeal` | 50 | a customer's appeal of a strike, restriction, removal or report resolution; decide it on the Appeals page (`/admin/v1/appeals`), which the generic item resolve refuses to replace (see "Appeals") |

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
- **Refused video** (`output_match` item): the preserved video, while a hold covers its job (logged as `item.view_video`
  with access `held_output`).

Items from hash lists show how the content was identified: exact or perceptual, the list name and category, and for a
perceptual match the Hamming distance and threshold, the PDQ quality, where in a video the matching frame was, and the
list file's version. Never the listed hash, and never the content inline.

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

One strike for every job that fails with `safety_blocked` (either mode, including a Standard video refused by output
scanning), every blocked Standard upload
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

## Appeals

Customers appeal from their account page: a strike, an active restriction, the removal of one of their videos, or the
resolution of a report about their account (`restrict_account`, `ban_account`, `remove_content`). One open appeal per
subject, a statement of at most 2000 characters, and 5 a day per account. Each appeal is a queue item of kind
`appeal` (priority 50), decided on the console's Appeals page or with `POST /admin/v1/appeals/{appeal_id}/resolve
{"decision", "note"}` (moderator).

| decision | effect |
|---|---|
| `uphold` | nothing changes; the customer is told the decision stands |
| `overturn` a strike | the strike is voided (`voided_at`, `voided_by`) and stops counting toward the strike rules and private eligibility. A restriction it helped trigger stays: that is its own appeal, or an admin's unrestrict |
| `overturn` a restriction | that restriction is lifted |
| `overturn` a report resolution | the restriction or ban it placed is lifted, or its removal is undone as below |
| `overturn` a removal | restored only if the content is still stored, which only a preservation hold makes possible: the owner sees the video again and the hold stays as placed. Otherwise the content is gone, and the decision says so |

Decide from the record, never by opening content: an appeal's queue item names no job, so it opens nothing. The note is
emailed to the customer, shown on their account page and kept as the audit log's reason: write it for them. Closing
an account withdraws its open appeals. **[counsel]** Who may review an appeal of their own decision, and how quickly
appeals must be decided.

## Content policy and upload scanning (Standard mode)

**Prompts.** Every Standard job's prompt and negative prompt go through `kuno_protocol.content_policy.check_prompt`
before anything is sealed. A violation answers `422 content_policy` ("This prompt isn't allowed. Sexual and NSFW
content is not permitted."), creates no job, charges nothing and records a `content_policy` strike. The prompt is not
logged. The enclave runs the same check for every job, in both modes, which is the only check a Private prompt gets.

**Uploads.** Every Standard upload is checked before storage by the matchers in `upload_scan.py`: exact SHA-256 first,
then perceptual. A match returns `422 upload_blocked` with a generic message and stores the file encrypted at rest
under an `upload_match` hold, so the customer never gets an upload id to use. It also adds an `upload_match` item and a
strike, and logs the hash and list name only. If a matcher can't answer, uploads are refused (`503 scan_unavailable`).
A file that claims a supported type but doesn't decode is refused as `422 unsupported_media`. Private inputs are
ciphertext and can't be scanned by the gateway; the enclave's safety checks cover them.

**Exact hashes.** `KUNO_BLOCKED_HASHES_FILE`, one lowercase SHA-256 per line with an optional category, `#` comments.
The file is re-read when it changes. Exact hashes only catch byte-identical files.

### Perceptual matching

`pdq.py` and `perceptual.py` implement Meta's PDQ in the gateway, with numpy for the hash and ffmpeg for decoding.

- **Images:** the PDQ hash of the decoded image, shrunk first to fit 512 x 512, as Meta's reference loaders do.
- **Video:**
  - The PDQ hash of one frame every `KUNO_PERCEPTUAL_FRAME_INTERVAL_S` (1 s, the interval Meta's vPDQ README gives as an
    example), up to `KUNO_PERCEPTUAL_MAX_FRAMES` (300).
  - A video matches when any sampled frame matches a listed hash: vPDQ's "matching individual frames against known bad
    images".
  - vPDQ's whole-video percentage rules and TMK+PDQF aren't implemented.
- **What counts as a match:**
  - A Hamming distance of at most `KUNO_PDQ_MATCH_DISTANCE` (31 of 256 bits). Hashes below `KUNO_PDQ_MIN_QUALITY` (50)
    are not matched.
  - Both defaults are Meta's recommended starting points ("Distance Threshold to consider two hashes to be
    similar/matching: <=31", "Quality Threshold where we recommend discarding hashes: <=49"). Meta recommends evaluating
    thresholds on your own data before relying on them.
- **Lists:**
  - `KUNO_PERCEPTUAL_HASH_FILES`, comma-separated files of `<pdq hex> <category> <list name>` lines, with `#` comments.
  - Each file is re-read when it changes, and an unreadable file refuses content.
- **What a match records** on its queue item: the list name and category, the distance and threshold, the content's PDQ
  quality and hash, where in a video the matching frame was, and the list file's version. Never the content or the
  listed hash.
- **Robustness** (tested): resizing, JPEG recompression and crops of up to about 2% stay within the distance. Larger
  crops generally don't, and PDQ doesn't claim rotation or mirror invariance.
- **Validation:**
  - On the same pixels, the port matches Meta's reference Python implementation bit for bit: 18 images from
    ThreatExchange's `pdq/data`, plus synthetic stand-ins checked into the tests.
  - Through the gateway's ffmpeg decoding, images of quality 80 or more land within 4 bits of Meta's expected hashes.
    Meta's bar for an implementation with a different decoder is 10.
  - Meta's test images are not in this repository, because ThreatExchange states no provenance or licence for them.

Sources: [ThreatExchange PDQ](https://github.com/facebook/ThreatExchange/tree/main/pdq),
[hashing.pdf](https://github.com/facebook/ThreatExchange/blob/main/hashing/hashing.pdf),
[vPDQ](https://github.com/facebook/ThreatExchange/tree/main/vpdq),
[PDQ signal thresholds](https://github.com/facebook/ThreatExchange/blob/main/python-threatexchange/threatexchange/signal_type/pdq/signal.py),
[licence (BSD)](https://github.com/facebook/ThreatExchange/blob/main/LICENSE).

### Output scanning

The gateway decrypts a finished Standard video and checks it against its receipt. Before anything is stored for its
owner, the video goes through the same matchers (`output_scan.py`). On a match:

- The job fails with `error_code: "safety_blocked"` ("This video can't be delivered."). It is refunded, like every failed
  job, and the account gets one strike.
- Nothing readable is stored for the owner: no video, no thumbnail.
- The video is sealed at rest in the blob of an `output_match` hold on the job, placed by `system` for
  `KUNO_PRESERVATION_DAYS`. That hold also keeps the job's prompt and inputs.
- An `output_match` queue item records the match.

If scanning can't answer, the video isn't kept: the job fails with `scan_unavailable`, is refunded, and gets no strike.
A video that doesn't decode fails as `bad_output`. Private jobs are never scanned: the gateway can't decrypt them.
Scanning runs inside the worker's completion request, so a long video makes that request slower.

### Hash lists and membership programmes **[counsel]**

The algorithms are free. The hashes to match against come through programmes with their own agreements. Adapters for
them are interfaces and configuration placeholders only (`perceptual.PROGRAMMES`). Enabling one with
`KUNO_HASH_SHARING_PROGRAMMES` before an adapter exists makes scanning refuse content rather than skip the check. Verify
current terms before joining:

- **NCMEC hash sharing:**
  - Voluntary for electronic service providers: 78 were participating as of 31 December 2025.
  - Credentials "must be requested from and supplied by NCMEC".
  - Hash types include MD5, SHA-1, PhotoDNA, PDQ and TMK+PDQF.
  - We found no published eligibility or agreement terms.
  - Sources: [CyberTipline data](https://www.missingkids.org/gethelpnow/cybertipline/cybertiplinedata),
    [hash sharing API](https://lesp.ncmec.org/csam-hashsharing/).
- **StopNCII.org** (non-consensual intimate imagery, not CSAM):
  - Platforms join as industry partners by agreement with SWGfL.
  - "PDQ/PhotoDNA for photos and MD5 for videos".
  - Sources: [FAQ](https://stopncii.org/faq/),
    [industry partners](https://swgfl.org.uk/magazine/new-industry-partners-join-stopncii-org-to-prevent-the-sharing-of-non-consensual-intimate-images-online/).
- **Tech Coalition Lantern:**
  - "free and open to any tech company or financial institution that meets the eligibility criteria, which includes a
    thorough application process and compliance review prior to joining a formal legal agreement".
  - Signals are for independent review: Lantern "does not facilitate automated enforcement actions".
  - Sources: [Lantern](https://technologycoalition.org/programs/lantern/),
    [eligibility](https://technologycoalition.org/news/expanding-lantern-to-the-financial-sector/).
- **Microsoft PhotoDNA Cloud Service:** free for qualified organizations that pass third-party vetting, and usable solely
  to prevent the spread of child sexual abuse content and support related investigations. It is an HTTPS API, so a
  matcher for it (`upload_scan.Matcher`) must fail closed. Commercial services such as Thorn Safer come under their own
  contracts. Sources: [PhotoDNA Cloud Service](https://www.microsoft.com/en-us/photodna/cloudservice),
  [Terms of use](https://www.microsoft.com/en-us/photodna/termsofuse).

Hash lists are sensitive: keep them out of the repository and restrict who can read them. A list line's category
decides what a match can lead to: only `csam` and `sexual_minor` matches can become CyberTipline reports.

## Storage and deletion

| Data | Where | Kept until |
|---|---|---|
| Standard video, thumbnail, prompt, options, inputs | R2 (media encrypted at rest, a data key per object, wrapped by the storage KEK); prompts in Postgres | the owner deletes the video, or an operator removes it |
| Private job inputs and outputs | R2, as ciphertext only the owner's key opens | the owner deletes the video, or an operator removes it |
| Key sync: wrapped master keys, unlocker parameters, wrapped key records | Postgres, wrapped in the owner's browser; nobody at KunoWorld can open them, and operators have no route to them | the owner removes them, deletes the video, rotates or turns key sync off, or the account is closed |
| Share links: token hash, status, expiry, view count | Postgres | not deleted automatically **[counsel]** set a schedule |
| Uploads no job used (either mode) | R2 | 24 hours (`KUNO_STANDARD_UPLOAD_TTL_S`, `KUNO_UPLOAD_TTL_S`) |
| A report's `output_key` (`csam`/`sexual_minor` only) | Postgres, encrypted | the report is resolved, or while a hold on the job keeps it |
| Anything under an active preservation hold | as above | the hold is released or expires (default 365 days), then the rule above applies |
| Blocked uploads | R2, encrypted | their `upload_match` hold ends (default 365 days), then deleted |
| Standard videos refused by output scanning | R2, encrypted | no hold covers their job any more (the `output_match` hold defaults to 365 days), then deleted |
| CyberTipline drafts and submissions (report XML, file digests, NCMEC ids; never file contents) | Postgres | not deleted automatically **[counsel]** set a schedule |
| Data exports (a zip of one account's data) | R2, sealed at rest in parts | 7 days after the export is ready, or when the account is closed |
| Closed accounts: a salted hash of the address, the balance at closure | Postgres (`account_closures`) | not deleted automatically **[counsel]** [RETENTION OF RECORDS AFTER CLOSURE] |
| Appeals: subject, statement, decision, note | Postgres | not deleted automatically **[counsel]** set a schedule |
| Jobs (metadata, receipts), ledger, strikes, restrictions, reports, queue items, holds, roles, audit log | Postgres | not deleted automatically **[counsel]** set a schedule |

Deletion removes the objects from R2 through the gateway. Never add an expiry lifecycle rule to the bucket: it would
delete videos their owners kept. Bucket versioning or copies outside the gateway, if enabled, keep data after
deletion; don't enable them unless counsel agrees. Each deletion also deletes the content's data keys and records a
tombstone; after restoring the database or the bucket, `kuno-gateway reapply-deletions` deletes again what the restore
brought back, except content an active hold covers (`deploy/README.md`, "Backups and deletions"). Storage keys are
wrapped by a key management service in production; losing that key loses every Standard video (`deploy/README.md`,
"Storage keys").

## Preservation holds

A hold stops the gateway destroying a job's or an upload's stored content. It never makes content visible to its
owner again: owner deletion and removal still hide held content (the owner gets `410 deleted` or `removed`, blob
downloads answer `404`, the validator feed `410 content_deleted`), but the encrypted data stays until the hold is
released or expires. The janitor then marks expired holds released, as `system`, and deletes whatever the owner or an
operator had deleted and no other active hold covers.

A hold with reason `report_csam`, `report_sexual_minor`, `upload_match`, `output_match` or `legal_request` also lets
operators review the held content (logged). An `operator` hold only preserves.

**Automatic holds**

- A `csam` or `sexual_minor` report that names a known job (by job id or content digest) places a provisional hold
  (system, 30 days) at once. Dismissing the report releases it; resolving it with `remove_content` or `ban_account`
  extends it to the full preservation period.
- A Standard upload blocked by the scanner is kept encrypted under an `upload_match` hold, placed by `system`.
- A finished Standard video refused by output scanning is kept encrypted under an `output_match` hold on its job, placed
  by `system`. Only the gateway places this reason; `POST /admin/v1/holds` doesn't accept it.
- Submitting a CyberTipline report extends its holds to at least the full preservation period from submission.
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
`sealed_blobs`, and for Standard jobs `video`, `prompt`, `uploads`, `hidden`, plus `blocked_output` when the hold keeps a
refused video; for an upload `upload`. A hold can only
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
  requires: the gateway supports CyberTipline reports (below). Record any other reference where the procedure says (for
  example the resolution note).
- **Blocked uploads and refused videos** matched against a CSAM list are already held. Resolve their item with
  `restrict_account`, `ban_account` or `dismiss`; the hold is independent of the item.
- **[counsel]** Confirm the preservation period (`KUNO_PRESERVATION_DAYS`), whether and how a hold is extended at a
  request, and what may be viewed or copied. Do not view, copy, forward or re-upload content beyond what the procedure
  allows.

## CyberTipline reports **[counsel]**

The gateway can prepare, validate and submit reports to NCMEC's CyberTipline through its Reporting API (the "ESP
reporting web service"). It never submits on its own: a moderator prepares a report and an admin confirms it. Whether
and when to report, what to include, and the reporter details are for counsel to decide. This section describes NCMEC's
documentation and the gateway; it is not legal advice.

### Workflow

1. **Eligibility.**
   - A report can be prepared only for a queue item under an active child-safety hold: `report_csam` or
     `report_sexual_minor`, or an `upload_match` / `output_match` hold whose list category is `csam` or `sexual_minor`.
   - A legal-request or operator hold alone isn't enough.
   - `GET /admin/v1/cybertip/items/{item_id}` says whether an item qualifies.
2. **Draft** (moderator). `POST /admin/v1/cybertip/reports {item_id, incident_type?, industry_classification?,
   additional_info?}` builds a draft from the item's metadata:
   - the incident type (default "Child Pornography (possession, manufacture, and distribution)", NCMEC's term);
   - the incident time (upload, generation or report time);
   - the account's identifiers (the account id as `espIdentifier`, the owner's email, the service and mode);
   - how the content was identified (list, category, distance);
   - the files the gateway may attach, with their digests.

   No content is opened. An item has at most one report that isn't canceled (`409 report_exists`).
3. **Validation** (moderator or admin). `POST .../reports/{id}/dry-run` builds the report XML and checks it against
   NCMEC's documented structure. It also checks every file is still kept under a hold or key. It stores the XML and
   sends nothing.
4. **Confirmation** (admin only). `POST .../reports/{id}/submit {"confirm": true, note}` validates again and records who
   confirmed. Then:
   - with `KUNO_CYBERTIP_ENV=disabled` (the default), the report is recorded as `dry_run` and nothing is sent;
   - with `test` or `production`, it is submitted (below), and NCMEC's report id, file ids and the outcome are recorded.
5. **Cancel** (admin). `POST .../reports/{id}/cancel {note}` cancels a report that wasn't submitted. A report NCMEC
   opened but never finished is retracted there too.

Every step is in the audit log under the operator's email: `cybertip.prepare`, `cybertip.dry_run`, `cybertip.submit`,
`cybertip.ncmec_report_opened`, `cybertip.file_uploaded`, `cybertip.file_details_sent`, `cybertip.submitted`,
`cybertip.submit_failed`, `cybertip.cancel`, `cybertip.retract`. Statuses: `draft`, `dry_run`, `submitting`,
`submitted`, `failed`, `canceled`. The operator console shows all of this on the item page ("CyberTipline report") and
lists reports under CyberTipline.

### What is sent

- **The report** (`POST /submit`):
  - `incidentSummary`: the incident type, the time in UTC, and what that time is;
  - `reporter/reportingPerson`: first and last name, email and phone, plus an optional `legalURL`, all from settings;
  - `personOrUserReported`: the owner's email, `espIdentifier` (the account id) and `espService`;
  - `additionalInfo`: the reporting entity, how the content was identified, and the moderator's note.
- **Each file** (`POST /upload`, then `POST /fileinfo`): the file as stored, then:
  - `originalFileName` and `uploadedToEspTimestamp`;
  - `fileViewedByEsp`, true only if the audit log shows an operator opened the content;
  - `exifViewedByEsp` false, `publiclyAvailable` false, `fileRelevance` Reported;
  - the `generativeAi` annotation for videos the service generated;
  - the moderator's industry classification, if any;
  - the MD5 as `originalFileHash`, and the SHA-256 and the match in `additionalInfo`.
- **Which files:**
  - a blocked upload or refused video under its hold, or a reported Standard video still stored;
  - a private video only with a key that a report supplied or a hold kept. Without a key it isn't attached, and the
    report says so;
  - prompts are never sent. **[counsel]** Decide whether to include prompts, inputs, other files, IP data (the gateway
    doesn't store IPs) or the account's other videos.
- **Then `POST /finish`.** NCMEC's documentation says a report must be finished after all its contents are uploaded, and
  that its XML notification of receipt serves as the provider's notification under 18 U.S.C. 2258A(h)(1).

### Test and production

- **Environments:**
  - `KUNO_CYBERTIP_ENV=test` sends to NCMEC's test environment, `https://exttest.cybertip.org/ispws`.
  - `production` sends to `https://report.cybertip.org/ispws`.
  - `KUNO_CYBERTIP_BASE_URL` overrides the host for `test` only; production always uses NCMEC's host.
- **Credentials:** both environments use HTTP Basic credentials that "must be requested from and supplied by NCMEC"
  (`KUNO_CYBERTIP_USERNAME`, `KUNO_CYBERTIP_PASSWORD`). The gateway never returns or logs them.
- **Reporter placeholders:** the reporter settings default to `[REPORTING ENTITY]`, `[POINT OF CONTACT]` and
  `[POINT OF CONTACT EMAIL]`, because the legal entity doesn't exist yet. Dry runs and the test environment accept them;
  production validation refuses them.
- **Configuration errors:** missing credentials answer `503 cybertip_not_configured`; an unknown environment answers
  `503 cybertip_misconfigured`.

### Failures and retries

- **Resuming:** each step NCMEC acknowledges is recorded before the next (the report id, then each file id, then each
  file's details). Confirming a `failed` report again resumes: it doesn't open a second report or upload a file twice.
- **Concurrency:** a submission holds a 15-minute lease, so two can't run at once. One cut short by a crash can be
  resumed after the lease ends.
- **Codes handled by name:**
  - "Report already finished" (5102) on a retry counts as finished.
  - "Report does not exist" (5001) clears the report id, so the next attempt starts over. NCMEC deletes an unfinished
    report 24 hours after it was opened or 1 hour after its last change, whichever is later.
- **Errors:** a network error or an error code answers `502 ncmec_error` with NCMEC's code. The report becomes `failed`
  with `last_error_code` `network`, `ncmec_<code>` or `content_unavailable`.
- **Remaining gap:** if the gateway stops after NCMEC accepts a step but before recording it, a retry repeats that step.
  The result is a second, unfinished report (which NCMEC deletes after a day) or a duplicate file on the same report.

### Preservation

A submitted report extends its holds to at least `KUNO_PRESERVATION_DAYS` (365) from submission. 18 U.S.C. 2258A(h)(1)
treats a completed submission as a request to preserve the contents provided in the report for 1 year; the REPORT Act
(Public Law 118-59) changed that period from 90 days. Cornell LII's notes record a later amendment (Public Law 119-60)
adding "all supplemental data included in the report"; this was not checked against the enacted text. **[counsel]**
Confirm the period and what counts as the report's contents. Also decide whether to preserve more (2258A(h)(5)) and how
(2258A(h)(6) calls for consistency with the NIST Cybersecurity Framework). Sources:
[18 U.S.C. 2258A](https://www.law.cornell.edu/uscode/text/18/2258A),
[Public Law 118-59](https://www.govinfo.gov/content/pkg/PLAW-118publ59/html/PLAW-118publ59.htm).

### What isn't verified

NCMEC's XSD (`https://report.cybertip.org/ispws/xsd`) needs credentials. The XML is therefore validated against the
element names, order and enumerations in NCMEC's published documentation, not against the schema. That documentation is
https://report.cybertip.org/ispws/documentation/, appendices B to D, "Last updated 2026-08-26". Not verified:

- element order and cardinality beyond those appendices, and the full enumerations;
- which `hashType` values are accepted (the documentation's examples are MD5 and SHA1; the gateway sends MD5);
- whether `espService` and `legalURL` accept the values sent;
- IP allowlisting, client certificates and rate limits;
- NCMEC's ESP registration process (a 2015 industry guidebook names espteam@ncmec.org).

All of these live in `cybertip.py`'s XML builders and validators and in `HttpCyberTiplineApi`. Nothing has been sent to
NCMEC's test environment; the workflow is tested against a fake server. Before production: obtain test credentials,
submit test reports, and compare the XML against the XSD.

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
| `KUNO_STORAGE_KEK_PROVIDER`, `KUNO_STORAGE_KMS_*`, `KUNO_STORAGE_VAULT_*` | `local` (dev: generated `data/storage_kek.json`); production: `aws-kms` or `vault-transit` | the key-encryption key that wraps each at-rest object's data key (`deploy/README.md`, "Storage keys") |
| `KUNO_STANDARD_STORAGE_KEY` | unset | legacy: decrypts objects sealed before envelope encryption until `kuno-gateway rotate-storage-key` imports it |
| `KUNO_STANDARD_UPLOAD_TTL_S` | 86400 | lifetime of a Standard upload no job used |
| `KUNO_UPLOAD_TTL_S` | 86400 | lifetime of a private ciphertext upload no job used |
| `KUNO_PRIVATE_JOBS_PER_MINUTE` | 10 | private job limit per account |
| `KUNO_PLANS_PER_MINUTE` | 10 | plan job limit per account, both modes, on top of the job limits |
| `KUNO_PRIVATE_REQUIRES_PAYMENT` | 1 | private mode needs a credited top-up or operator credit |
| `KUNO_PRIVATE_MAX_STRIKES_30D` | 2 | private mode needs fewer strikes than this in 30 days |
| `KUNO_STRIKE_RULES` | `3/86400/3600,5/604800/604800,10/2592000/review` | strikes/window s/restriction s or `review` |
| `KUNO_REPORTS_PER_HOUR_PER_IP` | 10 | report rate limit |
| `KUNO_BLOCKED_HASHES_FILE` | unset | SHA-256 blocklist for Standard uploads and outputs |
| `KUNO_PERCEPTUAL_HASH_FILES` | unset | comma-separated PDQ lists (`<pdq hex> <category> <list name>`) for Standard uploads and outputs |
| `KUNO_PDQ_MATCH_DISTANCE` | 31 | largest Hamming distance that counts as a match |
| `KUNO_PDQ_MIN_QUALITY` | 50 | lowest PDQ quality that is matched |
| `KUNO_PERCEPTUAL_FRAME_INTERVAL_S`, `KUNO_PERCEPTUAL_MAX_FRAMES`, `KUNO_PERCEPTUAL_TIMEOUT_S` | 1, 300, 300 | video frame sampling, and the decoding time limit |
| `KUNO_HASH_SHARING_PROGRAMMES` | unset | `ncmec`, `stopncii`, `lantern`: placeholders; enabling one refuses content until an adapter exists |
| `KUNO_CYBERTIP_ENV` | `disabled` | `disabled` (dry runs only), `test` or `production` |
| `KUNO_CYBERTIP_USERNAME`, `KUNO_CYBERTIP_PASSWORD` | unset | the credentials NCMEC issues |
| `KUNO_CYBERTIP_BASE_URL`, `KUNO_CYBERTIP_TIMEOUT_S` | unset, 60 | test-environment host override; seconds per request |
| `KUNO_CYBERTIP_REPORTING_ENTITY`, `KUNO_CYBERTIP_REPORTER_FIRST_NAME`, `KUNO_CYBERTIP_REPORTER_LAST_NAME`, `KUNO_CYBERTIP_REPORTER_EMAIL`, `KUNO_CYBERTIP_REPORTER_PHONE`, `KUNO_CYBERTIP_LEGAL_URL` | placeholders | the reporter NCMEC sees **[counsel]** |
| `KUNO_FFMPEG` | `ffmpeg` on PATH | used for thumbnails |
| `KUNO_PRESERVATION_DAYS` | 365 | default length of a preservation hold **[counsel]** |
| `KUNO_ADMIN_TOKEN`, `KUNO_ALLOW_ADMIN_TOKEN` | unset, 0 | break-glass token; honoured only with `KUNO_ALLOW_ADMIN_TOKEN=1`, never in production |
