/**
 * Browser-side access to the KunoWorld API through @kunoworld/sdk.
 * Import only from client components: the SDK does its cryptography with WebCrypto.
 */

import { KunoClient, type Provenance } from "@kunoworld/sdk";
import { useSyncExternalStore } from "react";

import { API_BASE, DEV_COUNTRY } from "./config";

const KEY_STORAGE = "kuno.apiKey.v1";
const KEY_EVENT = "kuno:apikey";

function readKey(): string | null {
  try {
    return window.localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function setApiKey(key: string | null): void {
  try {
    if (key) window.localStorage.setItem(KEY_STORAGE, key);
    else window.localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* storage blocked: the key lives for this page only */
  }
  window.dispatchEvent(new Event(KEY_EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(KEY_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(KEY_EVENT, onChange);
  };
}

/** The API key saved in this browser, or null. Always null during server rendering. */
export function useApiKey(): string | null {
  return useSyncExternalStore(subscribe, readKey, () => null);
}

export function makeClient(apiKey?: string | null): KunoClient {
  return new KunoClient({ apiKey: apiKey ?? undefined, baseUrl: API_BASE, country: DEV_COUNTRY });
}

/** Public certificate lookup by SHA-256, for /verify?sha256=… links that carry no file. */
export async function lookupDigest(digest: string): Promise<Provenance> {
  return makeClient().provenanceByDigest(digest);
}

/** Short, non-reversible label for an API key (used to keep libraries per key). */
export function keyFingerprint(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function maskKey(key: string): string {
  return key.length > 10 ? `${key.slice(0, 9)}…${key.slice(-4)}` : "••••";
}

export const isMac = (): boolean =>
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
