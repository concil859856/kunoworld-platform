/** Public configuration. Everything here is safe to ship to the browser. */

export const API_BASE = (process.env.NEXT_PUBLIC_KUNO_API || "http://localhost:8080").replace(/\/+$/, "");

/** Development only: sent as x-kuno-country (the gateway ignores it unless KUNO_ALLOW_COUNTRY_OVERRIDE=1). */
export const DEV_COUNTRY = process.env.NEXT_PUBLIC_KUNO_DEV_COUNTRY?.trim() || undefined;

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

/** How long the relay keeps sealed blobs (gateway blob_retention_s). */
export const RELAY_RETENTION_DAYS = 7;
