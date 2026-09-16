/**
 * Browser-side access to the KunoWorld API through @kunoworld/sdk.
 * Import only from client components: the SDK does its cryptography with WebCrypto.
 *
 * The page never holds a gateway credential. Every call goes to this site's /api/kuno proxy,
 * whose server adds the signed-in session. Private jobs are still encrypted here, in the browser,
 * so the proxy only relays ciphertext.
 */

import { KunoClient, type Provenance } from "@kunoworld/sdk";

import { DEV_COUNTRY, OWNER_PUBLIC_KEY, PINNED_MANIFEST, PROXY_BASE } from "./config";

/** Where an older studio kept an API key in this browser. */
const LEGACY_KEY_STORAGE = "kuno.apiKey.v1";

/** Removes an API key an earlier version of the studio saved here. Keys belong to developers' own programs. */
export function forgetLegacyApiKey(): void {
  try {
    window.localStorage.removeItem(LEGACY_KEY_STORAGE);
  } catch {
    /* storage blocked: nothing was saved either */
  }
}

export function makeClient(): KunoClient {
  return KunoClient.forProxy(PROXY_BASE, { country: DEV_COUNTRY, manifest: PINNED_MANIFEST, ownerPublicKey: OWNER_PUBLIC_KEY });
}

/** Public certificate lookup by SHA-256, for /verify?sha256=… links that carry no file. */
export async function lookupDigest(digest: string): Promise<Provenance> {
  return makeClient().provenanceByDigest(digest);
}

/** Short, non-reversible label (used to keep a library per account). */
export function keyFingerprint(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export const isMac = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
