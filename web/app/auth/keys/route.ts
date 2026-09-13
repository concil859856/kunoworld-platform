import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Creates an API key. The response is the only time the key itself is ever shown. */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ code: "invalid_name", message: "Give the key a name." }, { status: 422 });

  const result = await gateway<Record<string, unknown>>("/v1/me/keys", { method: "POST", token: session, body: { name } });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json(result.data, { status: 201, headers: { "cache-control": "no-store" } });
}
