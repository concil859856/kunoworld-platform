import { NextResponse, type NextRequest } from "next/server";

import { fromThisSite, getMe } from "@/lib/gateway.server";

/**
 * Who is signed in, for the studio: the account its library is kept under. It returns no
 * credential; the session stays in its HttpOnly cookie.
 */
export async function GET(request: NextRequest) {
  const headers = { "cache-control": "no-store" };
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403, headers });
  const me = await getMe();
  if (!me.ok) {
    const signedOut = me.error.status === 401;
    return NextResponse.json({ code: signedOut ? "signed_out" : "unavailable" }, { status: signedOut ? 401 : 502, headers });
  }
  return NextResponse.json({ account_id: me.data.account?.account_id ?? null, email: me.data.user.email }, { headers });
}
