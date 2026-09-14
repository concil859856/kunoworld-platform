import type { NextRequest } from "next/server";

import { SAFE_ID } from "@/lib/admin-types";
import { API_BASE } from "@/lib/config";
import { SESSION_COOKIE, fromThisSite } from "@/lib/gateway.server";

/**
 * Streams the account's export zip from the gateway with the signed-in session, so a large copy never sits in memory
 * here. The gateway checks that the export is this account's and still stored.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const headers = { "cache-control": "no-store" };
  const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status, headers });

  if (!fromThisSite(request)) return refuse(403, "forbidden", "Download your data from your account page.");
  const { id } = await ctx.params;
  if (!SAFE_ID.test(id)) return refuse(404, "not_found", "No such export.");
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return refuse(401, "signed_out", "Sign in again.");

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/v1/me/exports/${encodeURIComponent(id)}/download`, {
      headers: { authorization: `Bearer ${session}` },
      cache: "no-store",
      signal: request.signal,
    });
  } catch {
    return refuse(503, "network", "KunoWorld's gateway is unreachable right now.");
  }
  if (!upstream.ok) {
    const body = (await upstream.json().catch(() => null)) as { detail?: { code?: string; message?: string } } | null;
    return refuse(upstream.status, body?.detail?.code ?? "error", body?.detail?.message ?? upstream.statusText);
  }
  const out = new Headers(headers);
  for (const name of ["content-type", "content-length", "content-disposition"]) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers: out });
}
