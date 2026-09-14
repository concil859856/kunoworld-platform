"use server";

import { refresh } from "next/cache";

import { SAFE_ID, type ActionResult } from "@/lib/admin-types";
import { adminApi, currentOperator } from "@/lib/operator.server";

/*
 * CyberTipline report actions. Moderators prepare and validate drafts; only an admin confirms a submission or cancels
 * a report. Each action checks the role again (a server action is reachable by a direct POST), and the gateway checks
 * it a third time and writes the audit log. Nothing here submits by itself.
 */

const text = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string): ActionResult => ({ ok: false, message });

async function send(level: "moderator" | "admin", path: string, body: unknown, success: (data: unknown) => string): Promise<ActionResult> {
  const operator = await currentOperator();
  if (!operator || (level === "admin" && !operator.isAdmin)) return fail("Your role doesn't allow this.");
  const result = await adminApi<unknown>(operator, path, { method: "POST", body });
  refresh();
  if (!result.ok) return fail(`${result.error.message || "The gateway refused this."} (${result.error.code})`);
  return { ok: true, message: success(result.data) };
}

export async function prepareCybertip(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const itemId = text(form, "item_id");
  if (!SAFE_ID.test(itemId)) return fail("That item id isn't valid.");
  const body: Record<string, unknown> = { item_id: itemId };
  const incident = text(form, "incident_type");
  if (incident) body.incident_type = incident;
  const classification = text(form, "industry_classification");
  if (classification) {
    if (!["A1", "A2", "B1", "B2"].includes(classification)) return fail("Choose A1, A2, B1 or B2, or leave it unclassified.");
    body.industry_classification = classification;
  }
  const info = text(form, "additional_info");
  if (info.length > 4000) return fail("Keep the note under 4000 characters.");
  if (info) body.additional_info = info;
  return send("moderator", "/cybertip/reports", body, () => "Draft prepared. Validate it, then ask an admin to review and confirm it.");
}

export async function dryRunCybertip(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "report_id");
  if (!SAFE_ID.test(id)) return fail("That report id isn't valid.");
  return send("moderator", `/cybertip/reports/${id}/dry-run`, {}, () => "The report passes validation. Nothing was sent.");
}

export async function submitCybertip(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "report_id");
  const note = text(form, "note");
  if (!SAFE_ID.test(id)) return fail("That report id isn't valid.");
  if (text(form, "reviewed") !== "on") return fail("Confirm that you reviewed the draft, its files and the reporter details.");
  if (!note) return fail("Write a note: it goes in the audit log.");
  return send("admin", `/cybertip/reports/${id}/submit`, { confirm: true, note }, (data) => {
    const report = data as { status?: string; ncmec_report_id?: string | null };
    if (report.status === "submitted") return `Submitted to NCMEC. Report id ${report.ncmec_report_id ?? "—"}.`;
    return "Confirmed and validated. Nothing was sent: CyberTipline reporting is disabled on this gateway.";
  });
}

export async function cancelCybertip(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "report_id");
  const note = text(form, "note");
  if (!SAFE_ID.test(id)) return fail("That report id isn't valid.");
  if (!note) return fail("Write a note: it goes in the audit log.");
  return send("admin", `/cybertip/reports/${id}/cancel`, { note }, () => "Report canceled.");
}
