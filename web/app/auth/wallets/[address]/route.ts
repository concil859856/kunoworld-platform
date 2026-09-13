import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Unlinks a coldkey. Deposits from it are no longer credited to this account. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const { address } = await params;
  const result = await gateway<undefined>(`/v1/me/wallets/${encodeURIComponent(address)}`, {
    method: "DELETE",
    token: session,
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return new NextResponse(null, { status: 204 });
}
