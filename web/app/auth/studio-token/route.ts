import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

interface StudioToken {
  token: string;
  expires_at: number;
}

interface Me {
  account: { account_id: string } | null;
}

/**
 * Gives the studio a one-hour token for making videos. The web session stays in its HttpOnly
 * cookie; only this short-lived, job-scoped token reaches the page.
 */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out" }, { status: 401 });

  const [minted, me] = await Promise.all([
    gateway<StudioToken>("/v1/me/studio-token", { method: "POST", token: session }),
    gateway<Me>("/v1/me", { token: session }),
  ]);
  if (!minted.ok || !me.ok || !me.data.account) {
    const expired = (!minted.ok && minted.error.status === 401) || (!me.ok && me.error.status === 401);
    return NextResponse.json({ code: expired ? "signed_out" : "unavailable" }, { status: expired ? 401 : 502 });
  }
  return NextResponse.json(
    { token: minted.data.token, expires_at: minted.data.expires_at, account_id: me.data.account.account_id },
    { headers: { "cache-control": "no-store" } },
  );
}
