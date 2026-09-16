/**
 * The website's calls for key sync and share links. They go through this site's /api/kuno proxy, whose server adds the
 * signed-in session; the page holds no credential. Both route families are session-only on the gateway
 * (`/v1/me/keyvault`, `/v1/me/shares`).
 */

import { PROXY_BASE } from "./config";
import type { Unlocker, Vault } from "./keyvault";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function call<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${PROXY_BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "network", "KunoWorld can't be reached right now.");
  }
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as { detail?: unknown } | null;
  if (!response.ok) {
    const detail = payload && typeof payload.detail === "object" && payload.detail !== null ? (payload.detail as Record<string, unknown>) : {};
    const { code, message, ...rest } = detail;
    throw new ApiError(
      response.status,
      typeof code === "string" ? code : "error",
      typeof message === "string" ? message : response.statusText || "Something went wrong.",
      rest,
    );
  }
  return payload as T;
}

/** Only the fields the gateway accepts: it refuses anything else, so nothing extra can ride along. */
const unlockerBody = ({ unlocker_id, kind, label, params, wrapped_master_key }: Unlocker) => ({
  unlocker_id,
  kind,
  label,
  params,
  wrapped_master_key,
});

export const vaultApi = {
  /** The vault with every wrapped job key, or null when key sync is off. */
  async load(): Promise<Vault | null> {
    let first: Vault;
    try {
      first = await call<Vault>("GET", "/v1/me/keyvault?limit=500");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && err.code === "no_vault") return null;
      throw err;
    }
    const jobKeys = [...first.job_keys];
    let cursor = first.next_cursor;
    while (cursor) {
      const page = await call<Vault>("GET", `/v1/me/keyvault?limit=500&cursor=${encodeURIComponent(cursor)}`);
      jobKeys.push(...page.job_keys);
      cursor = page.next_cursor;
    }
    return { ...first, job_keys: jobKeys, next_cursor: null };
  },

  /** The vault and its unlockers without job keys, or null when key sync is off. */
  async summary(): Promise<Vault | null> {
    try {
      return await call<Vault>("GET", "/v1/me/keyvault?limit=0");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404 && err.code === "no_vault") return null;
      throw err;
    }
  },

  create: (masterKeyId: string, unlockers: Unlocker[]) =>
    call<Vault>("POST", "/v1/me/keyvault", { master_key_id: masterKeyId, unlockers: unlockers.map(unlockerBody) }),

  addUnlocker: (masterKeyId: string, unlocker: Unlocker) =>
    call<{ version: number; unlocker_id: string }>("POST", "/v1/me/keyvault/unlockers", {
      master_key_id: masterKeyId,
      unlocker: unlockerBody(unlocker),
    }),

  removeUnlocker: (unlockerId: string) => call<{ version: number }>("DELETE", `/v1/me/keyvault/unlockers/${encodeURIComponent(unlockerId)}`),

  putJobKey: (jobId: string, masterKeyId: string, wrapped: string) =>
    call<{ job_id: string; created: boolean; version: number; updated_at: number }>("PUT", `/v1/me/keyvault/job-keys/${encodeURIComponent(jobId)}`, {
      master_key_id: masterKeyId,
      wrapped,
    }),

  rotate: (
    expectedVersion: number,
    masterKeyId: string,
    unlockers: Unlocker[],
    jobKeys: Array<{ job_id: string; wrapped: string }>,
    elementKeys: Array<{ element_id: string; wrapped_key: string }> = [],
  ) =>
    call<Vault>("POST", "/v1/me/keyvault/rotate", {
      expected_version: expectedVersion,
      master_key_id: masterKeyId,
      unlockers: unlockers.map(unlockerBody),
      job_keys: jobKeys,
      // Sent only when there are Elements, so a gateway from before them still accepts the body.
      ...(elementKeys.length ? { element_keys: elementKeys } : {}),
    }),

  turnOff: () => call<void>("DELETE", "/v1/me/keyvault"),
};

/** A share link as the owner sees it. `token`, `url_path` and `url` come back only when it's made. */
export interface ShareLink {
  share_id: string;
  job_id: string;
  privacy: "private" | "standard";
  profile_id: string | null;
  created_at: number;
  expires_at: number | null;
  revoked_at: number | null;
  status: "active" | "revoked" | "expired" | "video_deleted" | "video_removed" | "account_closed" | "unavailable";
  view_count: number;
  token?: string;
  url_path?: string;
  url?: string;
}

export const sharesApi = {
  create: (jobId: string, expiresAt: number | null) =>
    call<ShareLink>("POST", `/v1/me/videos/${encodeURIComponent(jobId)}/shares`, { expires_at: expiresAt }),
  list: (jobId?: string) => call<ShareLink[]>("GET", `/v1/me/shares?limit=200${jobId ? `&job_id=${encodeURIComponent(jobId)}` : ""}`),
  revoke: (shareId: string) => call<ShareLink>("DELETE", `/v1/me/shares/${encodeURIComponent(shareId)}`),
};

/**
 * The link to hand out. A private video's key goes after `#`, which browsers never send to any server, so KunoWorld
 * still can't open the video; anyone holding the whole link can.
 */
export function shareUrl(link: Pick<ShareLink, "privacy" | "url_path">, outputKey?: string): string {
  const base = `${window.location.origin}${link.url_path ?? ""}`;
  return link.privacy === "private" && outputKey ? `${base}#k=${outputKey}` : base;
}
