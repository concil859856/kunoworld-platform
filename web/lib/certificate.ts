/**
 * Certificate checks that run in the viewer's browser, on top of the gateway's own
 * signature check: the receipt signature, the stage id/key binding, the file hash,
 * and the stage's hardware evidence against the published golden manifest.
 */

import { b64d, enclaveIdFor, verifyEvidence, verifyReceipt, type GoldenManifest, type Provenance } from "@kunoworld/sdk";

export interface HardwareCheck {
  ok: boolean;
  simulated: boolean;
  reasons: string[];
}

export interface CertificateChecks {
  /** The file's SHA-256 equals the receipt's content hash (null when checked by hash alone). */
  hashMatches: boolean | null;
  /** The receipt verifies against the stage's signing key, checked here. */
  signature: boolean;
  /** The stage id is derived from the keys in its hardware evidence. */
  stageKeys: boolean;
  /** Evidence vs the golden manifest, evaluated at the time it was recorded. Null if the manifest was unreachable. */
  hardware: HardwareCheck | null;
}

export function checkCertificate(prov: Provenance, fileDigest: string | null, manifest: GoldenManifest | null): CertificateChecks {
  const evidence = prov.enclave.evidence;
  let signature = false;
  let stageKeys = false;
  try {
    signature =
      verifyReceipt(prov.receipt, b64d(evidence.signing_public_key)) && prov.receipt.body.enclave_id === prov.enclave.enclave_id;
  } catch {
    signature = false;
  }
  try {
    stageKeys = enclaveIdFor(b64d(evidence.hpke_public_key), b64d(evidence.signing_public_key)) === prov.enclave.enclave_id;
  } catch {
    stageKeys = false;
  }
  let hardware: HardwareCheck | null = null;
  if (manifest) {
    const verdict = verifyEvidence(evidence, manifest, { now: evidence.created_at });
    hardware = { ok: verdict.ok, simulated: evidence.tee === "mock", reasons: verdict.reasons };
  }
  return {
    hashMatches: fileDigest ? fileDigest.toLowerCase() === prov.receipt.body.content_digest : null,
    signature,
    stageKeys,
    hardware,
  };
}

export function teeLabel(tee: string): string {
  if (tee === "tdx") return "Intel TDX + NVIDIA confidential computing";
  if (tee === "mock") return "Simulated enclave (development build, not real hardware)";
  return tee;
}

export function hardwareLabel(hardware: Record<string, string | number> | undefined): string {
  if (!hardware) return "—";
  const entries = Object.entries(hardware);
  return entries.length ? entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(" · ") : "—";
}
