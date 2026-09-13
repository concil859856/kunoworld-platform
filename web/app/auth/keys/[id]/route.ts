import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Revokes an API key. Programs using it stop working immediately. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const { id } = await params;
  const result = await gateway<Record<string, unknown>>(`/v1/me/keys/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token: session,
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json(result.data);
}
