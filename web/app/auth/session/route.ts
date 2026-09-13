import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SIGNED_IN_HINT, cookieOptions, fromThisSite, gateway, safeNext } from "@/lib/gateway.server";

interface Verified {
  session_token: string;
  expires_at: number;
}

/**
 * Finishes signing in. It is a POST from the confirmation page rather than the link itself, so an
 * email scanner that opens the link can't spend it before the person does.
 */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return new NextResponse("Forbidden", { status: 403 });
  const form = await request.formData();
  const token = form.get("token");
  const next = safeNext(form.get("next"));

  const result = typeof token === "string" ? await gateway<Verified>("/v1/auth/verify", { method: "POST", body: { token } }) : null;
  if (!result || !result.ok) {
    return NextResponse.redirect(new URL(`/signin?error=invalid_link&next=${encodeURIComponent(next)}`, request.url), 303);
  }

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, result.data.session_token, { ...cookieOptions(result.data.expires_at), httpOnly: true });
  response.cookies.set(SIGNED_IN_HINT, "1", { ...cookieOptions(result.data.expires_at), httpOnly: false });
  return response;
}
