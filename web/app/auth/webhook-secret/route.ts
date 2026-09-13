import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

interface Secret {
  secret: string;
}

/** Forwards to the gateway with the web session; the session never reaches the page. */
async function forward(request: NextRequest, path: string, method: "GET" | "POST") {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const result = await gateway<Secret>(path, { method, token: session });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json({ secret: result.data.secret }, { headers: { "cache-control": "no-store" } });
}

/** Reveals the secret that signs this account's webhook deliveries. */
export async function GET(request: NextRequest) {
  return forward(request, "/v1/me/webhook-secret", "GET");
}

/** Replaces the secret. Deliveries are signed with the new one from the next attempt on. */
export async function POST(request: NextRequest) {
  return forward(request, "/v1/me/webhook-secret/rotate", "POST");
}
