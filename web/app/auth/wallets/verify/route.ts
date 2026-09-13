import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

/** Finishes linking a coldkey with its sr25519 signature over the challenge message. */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { challenge_id?: unknown; signature?: unknown } | null;
  const challengeId = typeof body?.challenge_id === "string" ? body.challenge_id : "";
  const signature = typeof body?.signature === "string" ? body.signature.trim() : "";
  if (!challengeId) {
    return NextResponse.json({ code: "invalid_signature", message: "That link request has expired. Start again." }, { status: 422 });
  }
  if (!/^(0x)?[0-9a-fA-F]{128}$/.test(signature)) {
    return NextResponse.json(
      { code: "invalid_signature", message: "A signature is 128 hexadecimal characters, with or without 0x in front." },
      { status: 422 },
    );
  }

  const result = await gateway<Record<string, unknown>>("/v1/me/wallets/verify", {
    method: "POST",
    token: session,
    body: { challenge_id: challengeId, signature },
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json(result.data, { status: 201, headers: { "cache-control": "no-store" } });
}
