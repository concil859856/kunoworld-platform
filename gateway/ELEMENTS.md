# Elements: encrypted characters, products, locations, styles and voices

An Element is something a customer reuses across videos: a character, a product, a location, a style or a voice. It has
1 to 4 pictures (or one voice clip), a name, a short description the prompt can use ("Mara: a woman in her 60s with
short silver hair and a green raincoat"), and, for a real person, a consent record. This page is the contract the
gateway, the website and the SDKs build against. The code is `elements.py`, `api_elements.py` and `db_elements.py`
(migration 0021); the client half is `sdk/js/src/elements.ts`.

## What KunoWorld can see

**Nothing about what an Element is.** Its kind, name, description, consent record, pictures and voice are encrypted in
the customer's browser or program, with keys KunoWorld never receives, before anything is sent. KunoWorld stores the
ciphertext on Cloudflare R2 (the files) and in its database (the rest) until the customer deletes it.

What the gateway does see:

- that an account has Elements, and how many;
- each Element's random id, its revision number, and when it was made and last changed;
- how many files each has, and each file's size after padding (a PADMÉ size bucket) and the padded size of its record
  (4, 8 or 16 KiB);
- when a file is downloaded. Downloading an Element just before a job starts suggests that job uses it. The studio
  downloads an Element's files only when they are shown or used, and keeps them in the page while it is open.

**Using an Element in a job adds no new trust.** The browser opens the Element's files, and they become ordinary job
inputs: sealed to the enclave for a Private job, exactly like a file chosen from disk, or uploaded readable for a
Standard job, where KunoWorld and the GPU provider can see them, as with any Standard input. The description is added
to the prompt as text the customer can edit before submitting. Nothing about a job says it used an Element.

**Why the kind is encrypted too.** Nothing on the server needs it. Limits are the same for every kind (a voice is one
file, pictures are up to four; the gateway checks only the count), and listing or filtering by kind happens in the
browser after the records are opened, which is cheap at 200 Elements. Left readable, the kind would say, for example,
that an account keeps characters and voices, which suggests real people.

## The rules

No public figures and no one under 18. A real person must be the uploader, or must have given the uploader permission;
the consent record says who, the date they agreed, and to what. Sexual content is banned, as everywhere on KunoWorld.

Every write carries `affirm_rules: true`, the uploader's confirmation of these rules, and the gateway refuses a write
without it (`422 rules_not_affirmed`). The gateway records when it was last affirmed (`rules_affirmed_at`). Because
every write carries it, whatever the Element shows, it says nothing about the Element. The consent record itself is
encrypted with the rest of the Element.

KunoWorld can't check any of this, because it can't see Elements. The job pipeline still applies to anything made from
one: the content policy on every prompt, the in-enclave checks on Private jobs, the gateway's upload scan on Standard
inputs, strikes, reports and provenance (`subnet/PRIVACY_MODES.md`, "How the ban is enforced without looking"). When a
person withdraws consent, the customer marks it on the Element (`withdrawnAt`, inside the record); the studio and the
SDK then refuse to use it in new videos. Deleting the Element removes it for good.

## Keys

Elements reuse key sync (`key_vault.py`; `subnet/PRIVACY_MODES.md`, "Key sync"), so they open on every device the
customer unlocks and nowhere else.

- **Elements key.** HKDF-SHA256 of the account's key sync master key, with salt `kuno/elements/v1` and info
  `elements-key|<account_id>`, 32 bytes. It opens Elements only: HKDF can't be reversed, so it opens neither the master
  key nor any video key. A program that uses Elements through the SDK is given this key as text
  (`kwek1.<account_id>.<master_key_id>.<base64url key>`) from the studio's Elements page, not the master key.
- **Element key.** 32 random bytes per Element, made again whenever its files are uploaded. `wrapped_key` is base64url,
  without padding, of `"KVE1"` | 12-byte IV | AES-256-GCM ciphertext of the element key | 16-byte tag: exactly 64
  bytes. Encrypted under the Elements key with associated data `KVE1|kuno/elements/element-key|<account_id>|<element_id>`,
  so a wrapped key can't be moved to another account or Element.
- **Record (`meta`).** JSON `{v: 1, elementId, kind, name, description, consent, files: [{mime, size, sha256, name?,
  width?, height?, durationS?}]}`, framed and padded like a sealed request (`0x02` | length | JSON | zeros, to a power of
  two from 4 KiB, here at most 16 KiB), then sealed with the element key as a `kuno_protocol.blobs` version 2 blob under
  the label `element/<element_id>/meta`. `consent` is `null` or `{subject, relationship: "self" | "permission",
  grantedOn: "YYYY-MM-DD", use, affirmedAt, withdrawnAt?}`. Each file's `sha256` is of its plaintext, and clients check
  it when they open the file.
- **Files.** Each sealed with the element key as a version 2 blob under `element/<element_id>/file/<position>`,
  positions from 0 in the order given. The label binds a file to its Element and position.

**The master key generation.** Every write names the vault's current `master_key_id`. The gateway refuses a write when
key sync is off (`409 no_vault`) or the keys were rotated since the client derived its Elements key (`409 vault_changed`,
with the current `master_key_id`). Writes lock the vault's row and bump its `version`, like a synced video key.

**Rotation.** `POST /v1/me/keyvault/rotate` takes `element_keys: [{element_id, wrapped_key}]` next to `job_keys`: every
Element's same element key, wrapped under the Elements key of the new master key. It must name exactly the Elements the
account holds (`409 vault_changed` with `missing_element_ids` and `unknown_element_ids`), and `expected_version` must be
current, so an Element written on another device while the rotation was being prepared makes it fail rather than be
overwritten with a stale key. Records and files don't change. The old Elements key stops working for writes, and a
program must be given the new one.

**Turning key sync off** (`DELETE /v1/me/keyvault`) is refused while the account has Elements (`409 elements_exist`, with
`count`): without the master key nobody could open them again. The customer deletes them first. Closing the account
deletes both.

## Routes

The job API's credentials: an API key or the web session (the website's proxy forwards the session). Only the owner's
Elements are ever listed or served; another account's id answers `404`, like one that doesn't exist. Responses carry
`cache-control: no-store`. Nothing here is written to the operator audit log, because nothing here is content anyone
at KunoWorld can open.

| Method and path | Body / query | Response |
|---|---|---|
| `GET /v1/elements` | `cursor?`, `limit?` (100, at most 200) | `{account_id, master_key_id, count, stored_bytes, limits, elements: [element], next_cursor}`, ordered by `element_id`; `master_key_id` is null while key sync is off |
| `GET /v1/elements/{element_id}` | | `element`; `404 not_found` |
| `PUT /v1/elements/{element_id}` | `{master_key_id, expected_revision, wrapped_key?, meta, file_blob_ids?, affirm_rules}` | `201` (made) or `200` (replaced) `element` |
| `DELETE /v1/elements/{element_id}` | | `204`, also when there was no such Element |
| `GET /v1/elements/{element_id}/files/{position}` | | the sealed file as stored, `application/octet-stream`, `ETag: "<sha256 of the ciphertext>"`, byte ranges as on `/v1/blobs` |

`element` is `{element_id, revision, master_key_id, wrapped_key, meta, files: [{position, size, sha256}], files_bytes,
created_at, updated_at}`, with sizes and digests of the ciphertext.

**Writing.** The files are uploaded first, sealed, through `POST /v1/blobs`, like a private job's inputs. The `PUT` names
them in order and claims them: each must be the account's own unused upload, unexpired, at most 16 MiB, and a
`KUNOB1` version 2 blob. Claiming removes the upload's `blobs` row, so the object is served only by the route above and
the sweep of unused uploads leaves it alone.

- `element_id`: 32 lowercase hex characters chosen by the client, scoped to the account.
- `expected_revision: null` makes an Element: it needs `wrapped_key` and 1 to 4 `file_blob_ids` (`409 element_exists`,
  with `revision`, if the id is taken). A number replaces the Element at that revision (`404 not_found`;
  `409 element_changed`, with the current `revision`, when another device changed it meanwhile).
- A replacement without `file_blob_ids` keeps the files, and so the element key: it must not send `wrapped_key`
  (`422 wrapped_key_unexpected`). One with `file_blob_ids` replaces every file and must send the key they were sealed
  under (`422 wrapped_key_required`). The old objects are deleted once the replacement commits.
- `meta` must decode to a version 2 blob of 4,386 to 17,442 bytes, the sealed sizes of a 4 KiB and a 16 KiB padded
  record, so an unpadded record is refused.
- Anything else answers `422`: `invalid_id`, `invalid_encoding`, `not_wrapped` (a `wrapped_key` that isn't a 64-byte
  `KVE1` value, such as a bare key), `not_sealed` (a record or file that isn't a padded blob), `invalid_files` (0 or
  more than 4 files, one named twice, or an upload that is unknown, another account's, already used or expired),
  `rules_not_affirmed`; and fields the route doesn't define. `413 too_large` for a file over 16 MiB.

**Limits.** 200 Elements (`409 elements_full`) and 2 GiB of sealed files (`409 storage_full`) per account; 4 files per
Element, each at most 16 MiB sealed (the SDK stops at 15 MiB before sealing); 60 writes (creates, replacements and
deletions) a minute per account, `KUNO_ELEMENT_WRITES_PER_MINUTE` (`429 rate_limited`). Reads aren't limited beyond the
credential. The SDK and the studio also keep names to 80 characters, descriptions to 1,000 and voice clips to 30
seconds; the gateway can't see those.

## Deletion, export, closure and restores

- **Deleting** an Element deletes its rows, and then its objects from R2, and records tombstones: `element` (the Element)
  and `blob` (each object). A replacement that uploads new files records a `blob` tombstone for each old object.
- **Data export** (`POST /v1/me/exports`) includes `elements/elements.json`, every Element as stored (wrapped key, sealed
  record, file list), and each sealed file as `elements/<element_id>/<position>.kunob`. It's all ciphertext; the
  customer's key sync keys open it. `contents` counts `elements` and `element_files`.
- **Closing the account** deletes every Element, its rows and objects, with the same tombstones, alongside the account's
  unused uploads (`elements_deleted` in the closure's record).
- **After a restore,** `kuno-gateway reapply-deletions` replays the tombstones: `element` removes an Element's rows (and
  any of its objects still stored) that are no newer than the deletion, and `blob` removes objects a bucket restore
  brought back. An Element replaced after the backup was taken can come back at its older revision with its older files
  gone; its record then lists files that no longer open, the studio reports it as not opening, and the customer can
  delete it.
- **Preservation holds** cover jobs, uploads and blobs, not Elements: a hold can't keep an Element its owner deletes.
  **[ELEMENTS UNDER A PRESERVATION HOLD]**: a question for counsel. Nobody at KunoWorld could open a held Element
  anyway.

## Which models use an Element

The description works with every model. The files, only where a model takes that kind of input
(`kuno_protocol.profiles`):

| Element | LTX-2.5 Fast, Pro | LTX-2.5 4K | MiniMax H3 Director (`h3-reference`) | Storyboards |
|---|---|---|---|---|
| Pictures (character, product, location, style) | first frame, last frame, keyframe | first frame, keyframe | reference image (up to 9) | description only: shots take no inputs |
| Voice | description only | description only | reference audio (up to 3) | description only |

MiniMax H3 is licensed only in some regions (`available_in_region` on `GET /v1/models`). Where it isn't, a voice is kept
for later and only its description can be used. MiniMax H3 and H3 Turbo take first and last frames too, where licensed.
