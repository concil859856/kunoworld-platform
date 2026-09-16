/** Public configuration. Everything here is safe to ship to the browser. */

import type { GoldenManifest } from "@kunoworld/sdk";

/** The gateway, as this site's server reaches it. The browser talks to PROXY_BASE instead. */
export const API_BASE = (process.env.NEXT_PUBLIC_KUNO_API || "http://localhost:8080").replace(/\/+$/, "");

/** This site's same-origin proxy to the gateway's job API (app/api/kuno). */
export const PROXY_BASE = "/api/kuno";

/** Development only: sent as x-kuno-country (the gateway ignores it unless KUNO_ALLOW_COUNTRY_OVERRIDE=1). */
export const DEV_COUNTRY = process.env.NEXT_PUBLIC_KUNO_DEV_COUNTRY?.trim() || undefined;

/**
 * A golden manifest pinned at build time (JSON). Without one, the studio trusts the manifest the
 * gateway serves, which is fine for development but not a zero-trust setup.
 */
export const PINNED_MANIFEST: GoldenManifest | undefined = (() => {
  const raw = process.env.NEXT_PUBLIC_KUNO_MANIFEST?.trim();
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw) as GoldenManifest;
    return Array.isArray(value.allowed) ? value : undefined;
  } catch {
    return undefined;
  }
})();

/**
 * The subnet owner's Ed25519 public key (base64). With it, the studio uses the gateway's manifest only once the owner's
 * signature on it verifies in the browser, so neither the gateway nor this site's server can widen what workers pass.
 */
export const OWNER_PUBLIC_KEY: string | undefined = process.env.NEXT_PUBLIC_KUNO_OWNER_PUBLIC_KEY?.trim() || undefined;

export const SITE = {
  name: "KunoWorld",
  domain: "kunoworld.com",
  url: "https://kunoworld.com",
} as const;

export const LINKS = {
  h3License: "https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE",
  ltxLicense: "https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE",
  subnetRepo: "https://github.com/kunoworld/subnet",
  sdkRepo: "https://github.com/kunoworld/sdk",
} as const;
