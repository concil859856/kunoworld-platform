import type { NextRequest } from "next/server";

import { SAFE_ID } from "@/lib/admin-types";
import { API_BASE } from "@/lib/config";
import { SESSION_COOKIE, fromThisSite } from "@/lib/gateway.server";

/**
 * Streams a moderation item's content to the console with the operator's session. The gateway
 * checks the role, refuses content it may not show (403 content_not_reviewable) and logs the view.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const headers = { "cache-control": "no-store" };
  const refuse = (status: number, code: string, message: string) => Response.json({ code, message }, { status, headers });

  if (!fromThisSite(request)) return refuse(403, "forbidden", "Open content from the operator console.");
  const { id } = await ctx.params;
  if (!SAFE_ID.test(id)) return refuse(404, "not_found", "No such item.");
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return refuse(404, "not_found", "No such item.");

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE}/admin/v1/moderation/items/${encodeURIComponent(id)}/video`, {
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
  return new Response(upstream.body, {
    status: 200,
    headers: {
      ...headers,
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": "inline",
    },
  });
}
