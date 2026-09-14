import "server-only";

import { cookies } from "next/headers";

import { API_BASE } from "./config";

/*
 * The website's side of signing in. The gateway issues a web session; this module keeps it in
 * an HttpOnly cookie on the site's own origin and uses it for server-to-server calls. It never
 * reaches the browser's JavaScript: the studio goes through this site's /api/kuno proxy, which
 * adds the session on the server, and operators use the same session for the /admin console.
 */

export const SESSION_COOKIE = "kw_session";
/** Not a secret. It only lets statically rendered pages say "Account" instead of "Sign in". */
export const SIGNED_IN_HINT = "kw_signed_in";

export interface GatewayError {
  status: number;
  code: string;
  message: string;
}

export type GatewayResult<T> = { ok: true; data: T } | { ok: false; error: GatewayError };

export type OperatorRole = "moderator" | "admin";

/** `GET /v1/me`. */
export interface Me {
  user: { user_id: string; email: string; created_at: number; roles?: string[] };
  account: { account_id: string; balance_usd: number } | null;
  /** Operator roles the user holds; absent or empty for everyone else. */
  roles?: string[];
}

export async function sessionToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

/** The signed-in user, or a 401 when there's no session. */
export async function getMe(): Promise<GatewayResult<Me>> {
  const token = await sessionToken();
  if (!token) return { ok: false, error: { status: 401, code: "signed_out", message: "Sign in again." } };
  return gateway<Me>("/v1/me", { token });
}

/** Operator roles only; anything else the gateway lists is ignored. Accepts `roles` at the top or on `user`. */
export function rolesOf(me: Me): OperatorRole[] {
  const raw = me.roles ?? me.user.roles ?? [];
  return raw.filter((role): role is OperatorRole => role === "moderator" || role === "admin");
}

export async function gateway<T>(
  path: string,
  init: { method?: string; token?: string | null; body?: unknown; headers?: Record<string, string> } = {},
): Promise<GatewayResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        ...init.headers,
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...(init.body !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
    });
  } catch {
    return { ok: false, error: { status: 503, code: "network", message: "KunoWorld's gateway is unreachable right now." } };
  }
  if (response.status === 204) return { ok: true, data: undefined as T };
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = (payload as { detail?: { code?: string; message?: string } } | null)?.detail ?? {};
    return {
      ok: false,
      error: { status: response.status, code: detail.code ?? "error", message: detail.message ?? response.statusText },
    };
  }
  return { ok: true, data: payload as T };
}

export function cookieOptions(expiresAt: number) {
  return {
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(expiresAt * 1000),
  };
}

/**
 * State-changing requests must come from this site, so another site's form can't act with the session.
 *
 * Sec-Fetch-Site is set by the browser, can't be forged by page scripts, and doesn't change with
 * referrer policy or proxy rewriting. The fallback, for browsers without it, compares Origin with
 * the host the browser asked for; the URL Next sees can be an internal one behind a proxy.
 */
export function fromThisSite(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return host !== null && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Only a path on this site: anything else would be an open redirect. */
export function safeNext(value: FormDataEntryValue | string | null | undefined, fallback = "/account"): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : fallback;
}
