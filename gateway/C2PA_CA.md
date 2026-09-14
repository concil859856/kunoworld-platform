# Operating the C2PA issuing CA

The gateway signs short-lived C2PA certificates for enclave keys it has just attested. For the design, the certificate profile and the path to the C2PA Trust List, see `subnet/PROVENANCE.md` in the subnet repo.

## Set up

On an **offline** machine, as the subnet owner:

```sh
kuno-devkit c2pa-root --out-key root.key --out-cert root.pem
kuno-devkit c2pa-intermediate --root-key root.key --root-cert root.pem \
    --out-key issuing.key --out-chain issuing-chain.pem
```

Handling the output:
- **`root.key`** stays offline, backed up in at least two places.
- **`issuing.key` and `issuing-chain.pem`** go to the gateway.
- **The root's SHA-256 fingerprint** (`openssl x509 -in root.pem -noout -fingerprint -sha256`) gets published through a channel you control, so verifiers can pin it.

Algorithm and validity defaults: ECDSA P-384, root about 20 years, intermediate 1826 days. Override them with `--algorithm` and `--days`. `--algorithm ed25519` is for development only, because the C2PA Trust List does not accept Ed25519 CA certificates.

On a dev network, `kuno-devkit init` does all of this into the data directory and sets the variables below in `dev.env`.

For a dev data directory created before this feature, generate the two files the same way. Then add the two variables to `dev.env` yourself; `init` never rewrites an existing kit.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `KUNO_C2PA_CA_KEY` | unset | the intermediate's private key: PEM, unencrypted PKCS#8, `chmod 600` |
| `KUNO_C2PA_CA_CHAIN` | unset | PEM: the intermediate certificate, then the root |
| `KUNO_C2PA_CERT_VALIDITY_S` | `86400` | leaf lifetime; must be between `enclave_ttl_s` (1800) and 604800 |
| `KUNO_C2PA_TSA_URL` | unset | RFC 3161 timestamp authority handed to workers; **required in production** while the CA is on |
| `KUNO_C2PA_TSA_PROBE` | `off` | `warn` or `require`: send the TSA one timestamp request at start-up |
| `KUNO_C2PA_ISSUANCE_PER_ENCLAVE` | `12` | certificates one enclave may be issued per window; `0` turns the limit off |
| `KUNO_C2PA_ISSUANCE_GLOBAL` | `1000` | certificates all enclaves together may be issued per window; `0` turns it off |
| `KUNO_C2PA_ISSUANCE_WINDOW_S` | `3600` | the window both limits count over |
| `KUNO_C2PA_ISSUANCE_LOG` | `<data dir>/c2pa/issuance.jsonl` | the old JSONL issuance log, imported into the database at start-up |

How the gateway reacts to these settings:
- **Neither `KUNO_C2PA_CA_KEY` nor `KUNO_C2PA_CA_CHAIN` set:** the CA is off. `POST /miner/v1/certificate` and `GET /v1/c2pa/trust` answer 503 `ca_unavailable`.
  - Real-TEE workers with `KUNO_PROVENANCE=c2pa` then refuse to take jobs.
  - Mock-TEE workers fall back to untrusted dev certificates.
- **Misconfigured** (only one of the two set, a key that doesn't match the intermediate, a chain that isn't exactly intermediate + root, an intermediate not signed by that root, validity out of range, unreadable files): the gateway refuses to start.
- **Production without a TSA** (`KUNO_ENV=production` or `KUNO_ATTESTATION=production`, the CA on, `KUNO_C2PA_TSA_URL` unset): the gateway refuses to start. Without a trusted timestamp, readers reject each manifest once its certificate expires, so a video made today would stop validating tomorrow. Real-TEE workers also refuse a certificate that comes without a TSA.
- **Dev without a TSA:** the gateway starts. Test manifests stop validating when their certificates expire.
- **Start-up probe:** off by default, so a TSA outage never stops a gateway from restarting. `warn` logs a failed probe; `require` refuses to start on one.

## Timestamps

### What C2PA requires

- **The request.** The message imprint is a hash of the COSE `Sig_structure` over the claim signature, `certReq` "shall be asserted", and the token goes in the `sigTst2` header [SPEC-2.2 §10.3.2.5]. The worker's C2PA library does this; the gateway only hands out the URL.
- **Trust.** Validators keep TSA trust anchors separate from signer anchors, including the C2PA TSA Trust List [SPEC-2.2 §14.4.2]. A timestamp whose chain doesn't reach one is reported `timeStamp.untrusted` and ignored [SPEC-2.2 §15.8.2]. The TSA certificate must carry the `id-kp-timeStamping` EKU.
- **In practice.** c2pa-rs verifies timestamp trust by default (`verify.verify_timestamp_trust`) [C2PA-RS-SETTINGS]. A timestamp from a TSA that is not on the list is as good as none once the certificate expires.

### Which TSA

Probed on 2026-09-14 with `kuno-gateway check-tsa --trust-list C2PA-TSA-TRUST-LIST.pem`, against the list issued 2026-08-05 (22 certificates) [TRUST-LISTS]. Every TSA below granted the request; what differs is trust.

| URL | Chain ends at | On the C2PA TSA Trust List |
|---|---|---|
| `http://ts-c2pa.ssl.com/ecc` | SSL.com C2PA ECC Root CA 2025 | **yes** |
| `http://ts-c2pa.ssl.com/rsa` | SSL.com C2PA RSA Root CA 2025 | **yes** |
| `http://timestamp.digicert.com` | DigiCert's public code-signing TSA hierarchy | no |
| `http://timestamp.sectigo.com` | USERTrust RSA (Sectigo public time stamping) | no |
| `http://timestamp.globalsign.com/tsa/r6advanced1` | GlobalSign Timestamping Root R45 | no (research probe) |
| `http://timestamp.entrust.net/TSS/RFC3161sha2TS` | Sectigo R46 | no (research probe) |
| `https://freetsa.org/tsr` | self-signed Free TSA root | no (research probe) |

Roots and TSA intermediates on the list come from Google, DigiCert (C2PA-specific TSA intermediates), SSL.com, Snowball, Encypher, TrustAsia, Trufo, Irdeto, vivo, Tauth, Huawei, Huanyu Trust and Castlabs. Sectigo, GlobalSign, Entrust, Microsoft and FreeTSA are not on it.

Recommended:
- **Production:** `KUNO_C2PA_TSA_URL=http://ts-c2pa.ssl.com/ecc`. ECDSA keeps tokens small; `/rsa` is the fallback on the same list. SSL.com's free tier is 10,000 timestamps a year [SSLCOM-TSA]. Workers timestamp every signed video, so budget for a paid plan at launch volume; how the quota is counted (per account or per source IP) is not confirmed.
- **Second source:** DigiCert has C2PA TSA intermediates on the list, but its C2PA timestamping endpoint URL was not found. Ask DigiCert before relying on it.
- **Don't** use the familiar code-signing TSAs (`timestamp.digicert.com`, Sectigo, GlobalSign, Entrust, FreeTSA) for C2PA: their timestamps validate as `untrusted`.
- **Re-check** after every trust-list update, since membership changes: `kuno-gateway check-tsa --trust-list <C2PA-TSA-TRUST-LIST.pem>`.
- **Terms.** Sectigo asks scripts to wait at least 15 seconds between signings [SECTIGO-TSA]; DigiCert publishes no rate limit [DIGICERT-TSA].
- **Transport.** Plain HTTP is normal for RFC 3161: the token is signed, and the TSA sees a hash and the time, never content. Workers need outbound access to the TSA host.

### Checking a TSA

```sh
kuno-gateway check-tsa                                   # KUNO_C2PA_TSA_URL
kuno-gateway check-tsa --url http://ts-c2pa.ssl.com/ecc --trust-list C2PA-TSA-TRUST-LIST.pem
```

The probe (`tsa.py`):
1. Sends a minimal DER `TimeStampReq` (RFC 3161 §2.4.1) [RFC3161]: version 1, a SHA-256 imprint of a random value with the AlgorithmIdentifier parameters omitted (RFC 5754 §2) [RFC5754], a nonce and `certReq` TRUE. It is sent as `application/timestamp-query` (§3.4).
2. Checks the `PKIStatus` is granted (0) or grantedWithMods (1), and that the token's TSTInfo echoes the imprint and nonce.
3. Reports genTime skew, the TSA certificate (warning when none carries `id-kp-timeStamping`), where its chain ends and, with `--trust-list`, whether it reaches an anchor.

It exits 0 when the TSA passes, 1 when it fails, and 2 when no URL is configured. It does not verify the token's CMS signature: that, and trust, are the reader's job.

## Endpoints

- **`POST /miner/v1/certificate`** (enclave-signed, body `{csr_pem}`).
  - Returns `{certificate_chain_pem, serial, not_before, not_after, tsa_url}`.
  - Issues only to an `active`, freshly attested enclave, for its attested key and enclave id, within the issuance limits.
  - Errors: 403 `enclave_not_attested`, 422 `invalid_csr` or `key_mismatch`, 429 `rate_limited` (with `Retry-After`), 503 `ca_unavailable`.
- **`GET /v1/c2pa/trust`** (public).
  - Returns the root as `trust_anchors_pem`, the intermediate as `intermediates_pem`, plus their fingerprints and validity.
- **`GET /admin/v1/c2pa/issuances`** (operator session with the `admin` role).
  - Query: `enclave_id`, `since`, `until` (Unix seconds), `before` (for paging), `limit` (1–500, default 100).
  - Returns `issuances` newest first, `next_before` (pass it as `before` for the next page), `limits` (`window_s`, `per_enclave_limit`, `global_limit`, `global_in_window`, and `enclave_in_window` when filtering by enclave) and `ca_configured`.

## Issuance log

Every certificate is a row in the database table `c2pa_issuances` (migration 0014). It is written in the same transaction that checks the limits, and the certificate is returned only after that transaction commits. If the row can't be written, the answer is 503 and no certificate.

Fields: `serial` (hex), `cert_sha256`, `enclave_id`, `evidence_digest`, `image_digest`, `profiles`, `not_before`, `not_after`, `issued_at` (Unix seconds), `issuer_sha256`, and `source`: `gateway`, or `jsonl` for imported rows. Nothing updates or deletes these rows.

Operating notes:
- **Several gateways** share the log through the database. On Postgres, issuance takes an advisory lock, so the limits hold across processes.
- **The old JSONL file** is imported at every start-up, keyed on `cert_sha256`, so nothing is imported twice. Torn or malformed lines are skipped and counted. The gateway leaves the file in place and never writes to it again. To import files collected from other hosts, run `kuno-gateway import-c2pa-log --path <file>` (exit 1 if lines were skipped).
- **Retention:** keep the rows for as long as videos may be disputed. Database backups carry them.

## Issuance limits

Defaults, and why:
- **Per enclave: 12 per hour.** A worker needs about one certificate per validity period (24 hours by default), plus one after each restart or re-attestation. Twelve an hour is far above that, so only a misbehaving or compromised enclave reaches it.
- **Global: 1000 per hour.** This bounds what an attestation bypass, or a stolen enclave identity, can mint in an hour, while a fleet-wide restart of about a thousand enclaves still fits in one window. Raise it as the network grows.

Refused requests are neither logged nor counted. A refused worker gets 429 with `Retry-After`, keeps any certificate that is still valid, and tries again at its next renewal.

## Rotation and incidents

- **Planned intermediate rotation.**
  1. Generate a new intermediate under the same root, offline.
  2. Swap `KUNO_C2PA_CA_KEY` and `KUNO_C2PA_CA_CHAIN` and restart the gateway.

  Each worker picks up the new chain when its current certificate is due, at most one validity period later. Existing videos keep validating, because their manifests carry the old intermediate and the root is unchanged.
- **Revoking an enclave.** Revoke it through the admin API, or remove its image from the golden manifest. It gets no new certificate, and its current one expires within `KUNO_C2PA_CERT_VALIDITY_S`.
- **Suspected issuing-key exposure.**
  1. Stop the gateway's CA: unset both variables.
  2. Rotate the intermediate.
  3. Use the issuance log (`GET /admin/v1/c2pa/issuances`, or the `c2pa_issuances` table) to find certificates that were not issued by you.

  There is no CRL or OCSP yet, so the old intermediate can only be distrusted by rotating the root.
- **Root compromise.** Create a new hierarchy and publish the new fingerprint. Verifiers must replace their anchor.
- **TSA outage or delisting.** Workers keep signing only while a TSA answers. Switch `KUNO_C2PA_TSA_URL` to the other listed endpoint and restart the gateway. Workers pick up the new URL with their next certificate.

## Known gaps

- **CA key custody.** The CA key lives in a file. The C2PA Certificate Policy requires HSM custody (FIPS 140-2 Level 2+) for listed CAs.
- **One root.** `GET /v1/c2pa/trust` serves a single root, so there is no overlap window during a root rotation.
- **One TSA URL.** The gateway hands out a single URL, with no automatic failover to a second TSA.
- **Probe depth.** `check-tsa` proves liveness, protocol and chain placement, not the token's signature.

## Sources

- **[SPEC-2.2]** C2PA Technical Specification 2.2, §10.3.2.5, §14.4.2, §15.8.2. https://spec.c2pa.org/specifications/specifications/2.2/specs/_attachments/C2PA_Specification.pdf
- **[TRUST-LISTS]** C2PA Trust List and TSA Trust List (`C2PA-TSA-TRUST-LIST.pem`). https://github.com/c2pa-org/conformance-public/tree/main/trust-list
- **[C2PA-RS-SETTINGS]** c2pa-rs settings (`verify.verify_timestamp_trust`, `trust`). https://github.com/contentauth/c2pa-rs/blob/main/docs/context-settings.md
- **[RFC3161]** Time-Stamp Protocol. https://www.rfc-editor.org/rfc/rfc3161
- **[RFC5754]** SHA-2 algorithm identifiers (parameters absent or NULL). https://www.rfc-editor.org/rfc/rfc5754
- **[RFC5816]** ESSCertIDv2 update for RFC 3161. https://www.rfc-editor.org/rfc/rfc5816
- **[SSLCOM-TSA]** SSL.com C2PA timestamping. https://www.ssl.com/products/content-authenticity/timestamping/
- **[SECTIGO-TSA]** Sectigo time-stamp servers. https://www.sectigo.com/knowledge-base/detail/Time-Stamp-Server-Stamping-Protocols-for-Digital-Signatures-Code-Signing
- **[DIGICERT-TSA]** DigiCert RFC 3161 TSA. https://knowledge.digicert.com/general-information/rfc3161-compliant-time-stamp-authority-server
