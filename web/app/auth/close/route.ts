import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SIGNED_IN_HINT, fromThisSite, gateway } from "@/lib/gateway.server";

/**
 * Closes the signed-in account. The gateway needs the typed address and a sign-in from the last 10 minutes
 * (403 reauth_required otherwise). Once it's closed, the gateway has revoked every session, so the cookies go too.
 */
export async function POST(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403, headers });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401, headers });

  const body = (await request.json().catch(() => null)) as { confirm_email?: unknown } | null;
  const confirmEmail = typeof body?.confirm_email === "string" ? body.confirm_email.slice(0, 320) : "";
  if (!confirmEmail.trim()) {
    return NextResponse.json(
      { code: "email_mismatch", message: "Type this account's email address to confirm." },
      { status: 422, headers },
    );
  }

  const result = await gateway<Record<string, unknown>>("/v1/me/close", {
    method: "POST",
    token: session,
    body: { confirm_email: confirmEmail },
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status, headers });
  const response = NextResponse.json(result.data, { headers });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(SIGNED_IN_HINT);
  return response;
}
