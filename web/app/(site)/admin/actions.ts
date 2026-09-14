"use server";

import { refresh } from "next/cache";

import { MAX_OPERATOR_EMAIL, SAFE_ID, type ActionResult } from "@/lib/admin-types";
import { adminApi, currentOperator } from "@/lib/operator.server";

/*
 * The console's mutations. Each one checks the operator's role again (a server action is reachable
 * by a direct POST), then calls the gateway with the operator's own session, which checks the
 * role a third time and writes the audit log.
 */

const text = (form: FormData, name: string): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const fail = (message: string): ActionResult => ({ ok: false, message });

async function call(
  level: "moderator" | "admin",
  method: "POST" | "DELETE",
  path: string,
  body: unknown,
  success: string,
): Promise<ActionResult> {
  const operator = await currentOperator();
  if (!operator || (level === "admin" && !operator.isAdmin)) return fail("Your role doesn't allow this.");
  const result = await adminApi<unknown>(operator, path, { method, body });
  if (!result.ok) return fail(`${result.error.message || "The gateway refused this."} (${result.error.code})`);
  refresh();
  return { ok: true, message: success };
}

/** A number of days from now, as Unix seconds; null for "no end". */
function untilFromDays(value: string): number | null | undefined {
  if (!value) return undefined;
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0 || days > 3650) return null;
  return Math.round(Date.now() / 1000 + days * 86400);
}

function resolveBody(form: FormData): { body: Record<string, unknown> } | { error: string } {
  const action = text(form, "action");
  const note = text(form, "note");
  if (!["dismiss", "remove_content", "restrict_account", "ban_account"].includes(action)) return { error: "Choose an action." };
  if (!note) return { error: "Write a note: it goes in the audit log." };
  const body: Record<string, unknown> = { action, note };
  if (action === "restrict_account") {
    const until = untilFromDays(text(form, "days"));
    if (until === null) return { error: "Restrict for between 1 and 3650 days." };
    if (until !== undefined) body.until = until;
  }
  return { body };
}

export async function resolveReport(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "report_id");
  if (!SAFE_ID.test(id)) return fail("That report id isn't valid.");
  const parsed = resolveBody(form);
  if ("error" in parsed) return fail(parsed.error);
  return call("moderator", "POST", `/reports/${id}/resolve`, parsed.body, "Report resolved.");
}

export async function resolveItem(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "item_id");
  if (!SAFE_ID.test(id)) return fail("That item id isn't valid.");
  const parsed = resolveBody(form);
  if ("error" in parsed) return fail(parsed.error);
  return call("moderator", "POST", `/moderation/items/${id}/resolve`, parsed.body, "Item resolved.");
}

export async function placeHold(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const jobId = text(form, "job_id");
  const uploadId = text(form, "upload_id");
  const reason = text(form, "reason");
  const note = text(form, "note");
  if (Boolean(jobId) === Boolean(uploadId)) return fail("Name exactly one of a job id or an upload id.");
  if ((jobId && !SAFE_ID.test(jobId)) || (uploadId && !SAFE_ID.test(uploadId))) return fail("That id isn't valid.");
  if (!["report_csam", "report_sexual_minor", "upload_match", "legal_request", "operator"].includes(reason)) return fail("Choose a reason.");
  if (!note) return fail("Write a note: it goes in the audit log.");
  const body: Record<string, unknown> = { reason, note, ...(jobId ? { job_id: jobId } : { upload_id: uploadId }) };
  const days = text(form, "days");
  if (days) {
    const n = Number(days);
    if (!Number.isFinite(n) || n <= 0 || n > 3650) return fail("A hold lasts between 1 and 3650 days.");
    body.days = n;
  }
  return call("moderator", "POST", "/holds", body, "Hold placed.");
}

export async function releaseHold(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "hold_id");
  const note = text(form, "note");
  if (!SAFE_ID.test(id)) return fail("That hold id isn't valid.");
  if (!note) return fail("Write a note: it goes in the audit log.");
  return call("admin", "POST", `/holds/${id}/release`, { note }, "Hold released.");
}

export async function restrictAccount(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "account_id");
  const reason = text(form, "reason");
  if (!SAFE_ID.test(id)) return fail("That account id isn't valid.");
  if (!reason) return fail("Write a reason: it goes in the audit log.");
  const indefinite = text(form, "indefinite") === "on";
  const until = indefinite ? null : untilFromDays(text(form, "days"));
  if (!indefinite && (until === null || until === undefined)) return fail("Restrict for between 1 and 3650 days, or until lifted.");
  return call("admin", "POST", `/accounts/${id}/restrict`, { until, reason }, "Account restricted.");
}

export async function unrestrictAccount(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "account_id");
  if (!SAFE_ID.test(id)) return fail("That account id isn't valid.");
  const reason = text(form, "reason");
  return call("admin", "POST", `/accounts/${id}/unrestrict`, reason ? { reason } : {}, "Restrictions lifted.");
}

export async function addCredit(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const id = text(form, "account_id");
  const note = text(form, "note");
  const amount = Number(text(form, "amount_usd"));
  if (!SAFE_ID.test(id)) return fail("That account id isn't valid.");
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 10000) return fail("Enter an amount in dollars (not zero).");
  if (!note) return fail("Write a note: the customer sees it in their activity.");
  const key = text(form, "idempotency_key");
  if (!/^[\w-]{8,100}$/.test(key)) return fail("Reload the page and try again.");
  return call("admin", "POST", `/accounts/${id}/credits`, { amount_usd: amount, idempotency_key: key, note }, "Credit recorded.");
}

export async function changeRole(_state: ActionResult | null, form: FormData): Promise<ActionResult> {
  const email = text(form, "email").toLowerCase();
  const role = text(form, "role");
  const change = text(form, "change");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter an email address.");
  if (email.length > MAX_OPERATOR_EMAIL) return fail(`Operator emails can be at most ${MAX_OPERATOR_EMAIL} characters.`);
  if (role !== "moderator" && role !== "admin") return fail("Choose a role.");
  if (change !== "grant" && change !== "revoke") return fail("Choose grant or revoke.");
  return call(
    "admin",
    change === "grant" ? "POST" : "DELETE",
    "/roles",
    { email, role },
    change === "grant" ? `${email} is now a ${role}.` : `${email} is no longer a ${role}.`,
  );
}
