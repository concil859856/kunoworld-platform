import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** The signed-in account's data exports: list them, or ask for a new copy. The session never reaches the page. */
async function forward(request: NextRequest, method: "GET" | "POST") {
  const headers = { "cache-control": "no-store" };
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403, headers });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401, headers });

  const result = await gateway<unknown>("/v1/me/exports", { method, token: session });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status, headers });
  return NextResponse.json(result.data, { status: method === "POST" ? 202 : 200, headers });
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

/** Queues a copy of the account's data. The gateway builds it in the background. */
export async function POST(request: NextRequest) {
  return forward(request, "POST");
}
