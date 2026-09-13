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
| `KUNO_C2PA_TSA_URL` | unset | RFC 3161 timestamp authority handed to workers; **set it in production** |
| `KUNO_C2PA_ISSUANCE_LOG` | `<data dir>/c2pa/issuance.jsonl` | append-only issuance record |

How the gateway reacts to these settings:
- **Neither `KUNO_C2PA_CA_KEY` nor `KUNO_C2PA_CA_CHAIN` set:** the CA is off. `POST /miner/v1/certificate` and `GET /v1/c2pa/trust` answer 503 `ca_unavailable`.
  - Real-TEE workers with `KUNO_PROVENANCE=c2pa` then refuse to take jobs.
  - Mock-TEE workers fall back to untrusted dev certificates.
- **Misconfigured** (only one of the two set, a key that doesn't match the intermediate, a chain that isn't exactly intermediate + root, an intermediate not signed by that root, validity out of range, unreadable files): the gateway refuses to start.
- **No TSA:** readers reject each manifest once its certificate expires, so a video made today stops validating tomorrow. In production mode (`KUNO_ATTESTATION=production`) the gateway logs a warning at start-up.

## Endpoints

- **`POST /miner/v1/certificate`** (enclave-signed, body `{csr_pem}`).
  - Returns `{certificate_chain_pem, serial, not_before, not_after, tsa_url}`.
  - Issues only to an `active`, freshly attested enclave, for its attested key and enclave id.
  - Errors: 403 `enclave_not_attested`, 422 `invalid_csr` or `key_mismatch`, 503 `ca_unavailable`.
- **`GET /v1/c2pa/trust`** (public).
  - Returns the root as `trust_anchors_pem`, the intermediate as `intermediates_pem`, plus their fingerprints and validity.

## Issuance log

The log gets one JSON object per line, appended under an exclusive `flock` and fsynced. Several gateway processes on one host can share it.

Fields: `serial` (hex), `cert_sha256`, `enclave_id`, `evidence_digest`, `image_digest`, `profiles`, `not_before`, `not_after`, `issued_at` (Unix seconds), `issuer_sha256`.

If the record can't be written, the certificate is not handed out (503).

Operating notes:
- **Several hosts:** gateways on different hosts each write their own file. Collect them centrally.
- **Retention:** keep the log for as long as the videos may be disputed.
- **DB-backed log:** a database-backed issuance table is a follow-up.

## Rotation and incidents

- **Planned intermediate rotation.**
  1. Generate a new intermediate under the same root, offline.
  2. Swap `KUNO_C2PA_CA_KEY` and `KUNO_C2PA_CA_CHAIN` and restart the gateway.

  Each worker picks up the new chain when its current certificate is due, at most one validity period later. Existing videos keep validating, because their manifests carry the old intermediate and the root is unchanged.
- **Revoking an enclave.** Revoke it through the admin API, or remove its image from the golden manifest. It gets no new certificate, and its current one expires within `KUNO_C2PA_CERT_VALIDITY_S`.
- **Suspected issuing-key exposure.**
  1. Stop the gateway's CA: unset both variables.
  2. Rotate the intermediate.
  3. Use the issuance log to find certificates that were not issued by you.

  There is no CRL or OCSP yet, so the old intermediate can only be distrusted by rotating the root.
- **Root compromise.** Create a new hierarchy and publish the new fingerprint. Verifiers must replace their anchor.

## Known gaps

- **CA key custody.** The CA key lives in a file. The C2PA Certificate Policy requires HSM custody (FIPS 140-2 Level 2+) for listed CAs.
- **One root.** `GET /v1/c2pa/trust` serves a single root, so there is no overlap window during a root rotation.
- **No abuse limit.** Certificate requests are not rate-limited beyond enclave authentication. An attested enclave can request repeatedly; each request adds a log line.
