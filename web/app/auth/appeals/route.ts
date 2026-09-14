import { NextResponse, type NextRequest } from "next/server";

import { SAFE_ID } from "@/lib/admin-types";
import { SESSION_COOKIE, fromThisSite, gateway } from "@/lib/gateway.server";

const KINDS = ["strike", "restriction", "removal", "report_resolution"];
const MAX_STATEMENT = 2000;

async function session(request: NextRequest): Promise<string | NextResponse> {
  const headers = { "cache-control": "no-store" };
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden" }, { status: 403, headers });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ code: "signed_out", message: "Sign in again." }, { status: 401, headers });
  return token;
}

/** The signed-in account's appeals and their decisions. */
export async function GET(request: NextRequest) {
  const token = await session(request);
  if (typeof token !== "string") return token;
  const result = await gateway<unknown>("/v1/me/appeals", { token });
  const headers = { "cache-control": "no-store" };
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status, headers });
  return NextResponse.json(result.data, { headers });
}

/** Sends an appeal of a strike, a restriction, a removal or a report's resolution on this account. */
export async function POST(request: NextRequest) {
  const token = await session(request);
  if (typeof token !== "string") return token;
  const headers = { "cache-control": "no-store" };
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = typeof body?.subject_kind === "string" ? body.subject_kind : "";
  const subjectId = typeof body?.subject_id === "string" ? body.subject_id : "";
  const statement = typeof body?.statement === "string" ? body.statement.trim() : "";
  if (!KINDS.includes(kind) || !SAFE_ID.test(subjectId)) {
    return NextResponse.json({ code: "invalid_subject", message: "That isn't something on this account to appeal." }, { status: 422, headers });
  }
  if (!statement || statement.length > MAX_STATEMENT) {
    return NextResponse.json(
      { code: "invalid_statement", message: `Say why the decision should change, in at most ${MAX_STATEMENT} characters.` },
      { status: 422, headers },
    );
  }
  const result = await gateway<unknown>("/v1/me/appeals", {
    method: "POST",
    token,
    body: { subject_kind: kind, subject_id: subjectId, statement },
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status, headers });
  return NextResponse.json(result.data, { status: 201, headers });
}
