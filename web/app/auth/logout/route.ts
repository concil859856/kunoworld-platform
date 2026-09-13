import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SIGNED_IN_HINT, fromThisSite, gateway } from "@/lib/gateway.server";

/** Signs out on the gateway too, which also ends every studio token the session issued. */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return new NextResponse("Forbidden", { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await gateway("/v1/auth/logout", { method: "POST", token });

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(SIGNED_IN_HINT);
  return response;
}
