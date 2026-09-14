import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Where the confirmation link lands: back on the account page, with the closure form open. */
const NEXT = "/account?closing=1#close-account";

/**
 * Emails the signed-in user a fresh sign-in link, only to the account's own address. The session that link opens can
 * close the account for 10 minutes.
 */
export async function POST(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403, headers });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401, headers });

  const result = await gateway<{ sent: boolean }>("/v1/me/reauth", { method: "POST", token: session, body: { next: NEXT } });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status, headers });
  return NextResponse.json({ sent: true }, { status: 202, headers });
}
