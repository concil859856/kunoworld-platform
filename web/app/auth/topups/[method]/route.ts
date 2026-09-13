import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

const NETWORKS = new Set(["tron", "ethereum"]);

/**
 * Starts a card (Stripe) or USDT (NOWPayments) top-up. The response carries the provider's checkout
 * page; credit arrives later, from the provider's webhook to the gateway, never from this request.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ method: string }> }) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403 });
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401 });

  const { method } = await params;
  if (method !== "card" && method !== "usdt") return NextResponse.json({ code: "not_found" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { amount_usd?: unknown; network?: unknown } | null;
  const amount = typeof body?.amount_usd === "number" ? body.amount_usd : NaN;
  // Whole cents only. The gateway applies its own minimum and maximum.
  if (!(amount > 0) || Math.abs(Math.round(amount * 100) - amount * 100) > 1e-6) {
    return NextResponse.json({ code: "invalid_amount", message: "Enter an amount in dollars and cents." }, { status: 422 });
  }
  const payload: { amount_usd: number; network?: string } = { amount_usd: amount };
  if (method === "usdt") {
    if (typeof body?.network !== "string" || !NETWORKS.has(body.network)) {
      return NextResponse.json({ code: "invalid_network", message: "Choose TRON or Ethereum." }, { status: 422 });
    }
    payload.network = body.network;
  }

  const result = await gateway<Record<string, unknown>>(`/v1/me/topups/${method}`, { method: "POST", token: session, body: payload });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json(result.data, { status: 201, headers: { "cache-control": "no-store" } });
}
