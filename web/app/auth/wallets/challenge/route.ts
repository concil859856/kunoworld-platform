import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Starts linking a coldkey: the gateway returns a one-time message for that coldkey to sign. */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { address?: unknown } | null;
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  // The gateway's own length check answers in a shape the page can't explain, so check it here.
  if (address.length < 40 || address.length > 64) {
    return NextResponse.json({ code: "invalid_wallet", message: "That isn't a Bittensor coldkey address." }, { status: 422 });
  }

  const result = await gateway<Record<string, unknown>>("/v1/me/wallets/challenge", {
    method: "POST",
    token: session,
    body: { address },
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json(result.data, { status: 201, headers: { "cache-control": "no-store" } });
}
