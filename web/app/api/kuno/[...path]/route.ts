import type { NextRequest } from "next/server";

import { API_BASE } from "@/lib/config";
import { SESSION_COOKIE, fromThisSite } from "@/lib/gateway.server";

/*
 * The studio's way to the gateway. The browser's SDK talks to this same-origin path with no key;
 * this handler adds the signed-in session (kept in an HttpOnly cookie) as the bearer credential
 * and streams bodies both ways, so large uploads and downloads never sit in memory here.
 *
 * Private jobs are encrypted in the browser before they get here: what passes through is
 * ciphertext, and this server never has the key to open it.
 *
 * Only the paths the studio uses are forwarded, and never a client-supplied Authorization header.
 */

const ID = "[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}";

interface Rule {
  method: "GET" | "POST" | "PUT" | "DELETE";
  pattern: RegExp;
  /** Public endpoints go without the session. */
  session: boolean;
}

const rule = (method: Rule["method"], path: string, session = true): Rule => ({ method, pattern: new RegExp(`^${path}$`), session });

const RULES: Rule[] = [
  rule("GET", "v1/models", false),
  rule("GET", "v1/manifest", false),
  rule("GET", "v1/manifest/signed", false),
  rule("GET", "v1/provenance/[0-9a-f]{64}", false),
  rule("GET", "v1/route"),
  rule("POST", "v1/quote"),
  rule("GET", "v1/account/eligibility"),
  rule("POST", "v1/blobs"),
  rule("GET", `v1/blobs/${ID}`),
  rule("POST", "v1/videos"),
  rule("GET", "v1/videos"),
  rule("GET", `v1/videos/${ID}`),
  rule("POST", `v1/videos/${ID}/cancel`),
  rule("DELETE", `v1/videos/${ID}`),
  rule("POST", "v1/standard/uploads"),
  rule("POST", "v1/standard/videos"),
  rule("GET", "v1/standard/videos"),
  rule("GET", `v1/standard/videos/${ID}/(video|thumbnail)`),
  rule("DELETE", `v1/standard/videos/${ID}`),
  // Key sync. Everything sent is wrapped in the browser first (lib/keyvault.ts): the proxy relays ciphertext.
  rule("GET", "v1/me/keyvault"),
  rule("POST", "v1/me/keyvault"),
  rule("DELETE", "v1/me/keyvault"),
  rule("POST", "v1/me/keyvault/unlockers"),
  rule("DELETE", `v1/me/keyvault/unlockers/${ID}`),
  rule("PUT", `v1/me/keyvault/job-keys/${ID}`),
  rule("DELETE", `v1/me/keyvault/job-keys/${ID}`),
  rule("POST", "v1/me/keyvault/rotate"),
  // Elements. Sealed in the browser under keys derived from key sync (lib/useElements.ts): the proxy relays ciphertext.
  rule("GET", "v1/elements"),
  rule("GET", "v1/elements/[0-9a-f]{32}"),
  rule("PUT", "v1/elements/[0-9a-f]{32}"),
  rule("DELETE", "v1/elements/[0-9a-f]{32}"),
  rule("GET", "v1/elements/[0-9a-f]{32}/files/[0-9]{1,2}"),
  // Share links: the owner's own, and the public link anyone opens (no session, and never the private key).
  rule("POST", `v1/me/videos/${ID}/shares`),
  rule("GET", "v1/me/shares"),
  rule("DELETE", `v1/me/shares/${ID}`),
  rule("POST", `v1/videos/${ID}/shares`),
  rule("GET", "v1/account/shares"),
  rule("DELETE", `v1/account/shares/${ID}`),
  rule("GET", "v1/shares/[A-Za-z0-9_-]{43}", false),
  rule("GET", "v1/shares/[A-Za-z0-9_-]{43}/video", false),
];

/** Request headers worth passing on. Authorization and Cookie are never among them. The gateway rate-limits public
 * share links per visitor IP, which Cloudflare puts in cf-connecting-ip. Range and If-Range (with Content-Range and
 * Accept-Ranges back, and the 206 status) let a <video> seek: iOS Safari won't play or seek without them. */
const FORWARD_REQUEST = ["accept", "content-type", "content-length", "x-kuno-country", "cf-connecting-ip", "range", "if-range"];
const FORWARD_RESPONSE = [
  "content-type", "content-length", "content-disposition", "etag", "last-modified", "x-robots-tag", "content-range", "accept-ranges",
];

/** Errors in the gateway's own shape, so the SDK reads them like any other. */
function problem(status: number, code: string, message: string): Response {
  return Response.json({ detail: { code, message } }, { status, headers: { "cache-control": "no-store" } });
}

async function forward(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  if (!fromThisSite(request)) return problem(403, "forbidden", "Use the KunoWorld studio on this site.");

  const segments = (await ctx.params).path ?? [];
  const path = segments.join("/");
  const match = RULES.find((r) => r.method === request.method && r.pattern.test(path));
  if (!match) return problem(404, "not_found", "This path isn't available through the studio.");

  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  if (match.session) {
    const session = request.cookies.get(SESSION_COOKIE)?.value;
    if (!session) return problem(401, "signed_out", "Sign in to make videos.");
    headers.set("authorization", `Bearer ${session}`);
  }

  const target = `${API_BASE}/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const hasBody = request.method !== "GET" && request.method !== "DELETE" && request.body !== null;
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Streams the upload instead of buffering it. Node's fetch requires this with a stream body.
      ...(hasBody ? { duplex: "half" } : {}),
      signal: request.signal,
      cache: "no-store",
      redirect: "manual",
    } as RequestInit);
  } catch {
    if (request.signal.aborted) return problem(499, "aborted", "The request was canceled.");
    return problem(503, "network", "KunoWorld's gateway is unreachable right now.");
  }

  const out = new Headers({ "cache-control": "no-store" });
  for (const name of FORWARD_RESPONSE) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  const empty = upstream.status === 204 || upstream.status === 304;
  return new Response(empty ? null : upstream.body, { status: upstream.status, headers: out });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const DELETE = forward;
