import { NextResponse, type NextRequest } from "next/server";

import { fromThisSite, gateway } from "@/lib/gateway.server";
import { checkReport } from "@/lib/report";

/**
 * Forwards a report to the gateway's public POST /v1/reports. Reports need no account, but they
 * must come from this site's own form. The gateway rate-limits per IP, so the visitor's address is
 * passed along when a proxy supplied one.
 */
export async function POST(request: NextRequest) {
  if (!fromThisSite(request)) return NextResponse.json({ code: "forbidden", message: "Send reports from the report page." }, { status: 403 });

  const check = checkReport(await request.json().catch(() => null));
  if (!check.ok) return NextResponse.json({ code: "invalid_report", message: check.message, field: check.field }, { status: 422 });

  const forwarded = request.headers.get("x-forwarded-for");
  const result = await gateway<{ report_id: string }>("/v1/reports", {
    method: "POST",
    body: check.report,
    headers: forwarded ? { "x-forwarded-for": forwarded } : undefined,
  });
  if (!result.ok) return NextResponse.json(result.error, { status: result.error.status });
  return NextResponse.json({ report_id: result.data.report_id }, { status: 202, headers: { "cache-control": "no-store" } });
}
