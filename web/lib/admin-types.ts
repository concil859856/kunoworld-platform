/** Shapes of the gateway's operator API (/admin/v1), and the rules the console shows around them. */

import { REPORT_REASONS } from "./report";

/** What a console form's server action answers. */
export interface ActionResult {
  ok: boolean;
  message: string;
}

export interface AdminReport {
  report_id: string;
  status: "open" | "resolved";
  reason: string;
  priority: number;
  job_id: string | null;
  content_digest: string | null;
  url: string | null;
  details: string | null;
  contact_email: string | null;
  has_output_key: boolean;
  account_id: string | null;
  created_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
  resolution: string | null;
  resolution_note: string | null;
}

export interface AdminHold {
  hold_id: string;
  status: "active" | "released" | "expired";
  reason: string;
  job_id: string | null;
  upload_id: string | null;
  account_id: string | null;
  report_id: string | null;
  has_output_key: boolean;
  created_by: string;
  created_at: number;
  expires_at: number;
  released_at: number | null;
  released_by: string | null;
  note: string | null;
  release_note: string | null;
  preserved?: Record<string, number | boolean>;
}

export interface AdminJob {
  job_id: string;
  privacy: "private" | "standard";
  account_id: string | null;
  profile_id: string;
  status: string;
  error_code: string | null;
  created_at: number;
  content_digest: string | null;
  held: boolean;
  /** Standard only, and only in item detail when the content is reviewable (that view is logged). */
  prompt?: string | null;
  negative_prompt?: string | null;
  has_prompt?: boolean;
  /** A video exists that this operator may open. */
  has_video: boolean;
  deleted?: string | null;
  holds?: AdminHold[];
}

export interface AdminItem {
  item_id: string;
  kind: string;
  status: "open" | "resolved";
  priority: number;
  account_id: string | null;
  created_at: number;
  detail: Record<string, unknown> | null;
  report: AdminReport | null;
  /** Whether an operator may open this item's content now. The gateway's rule; the console never re-derives it. */
  content_reviewable: boolean;
  /** The basis for opening it, e.g. "report:csam" or "hold:legal_request"; null when it can't be opened. */
  content_access: string | null;
  job: AdminJob | null;
  resolution: string | null;
  holds: AdminHold[];
}

export interface AccountSafety {
  account_id: string;
  private_mode?: { eligible: boolean; reasons: string[] };
  restricted_until: number | null;
  strikes_24h?: number;
  strikes_7d?: number;
  strikes_30d?: number;
  restrictions?: Array<{
    kind: string;
    until: number | null;
    reason: string | null;
    source: string;
    created_by: string | null;
    created_at: number;
    lifted_at: number | null;
    lifted_by: string | null;
  }>;
}

export interface AuditEntry {
  id: string;
  operator: string;
  action: string;
  target_kind: string;
  target_id: string;
  reason: string | null;
  detail: unknown;
  created_at: number;
}

/** Reports whose content an operator may open while the report is open (with the key, for a private video). */
export const REVIEWABLE_REPORT_REASONS = ["csam", "sexual_minor"];

/** Whether the gateway lets an operator open this item's content now. Missing means no. */
export function contentReviewable(item: Pick<AdminItem, "content_reviewable">): boolean {
  return item.content_reviewable === true;
}

/** "report:csam" → "an open report of child sexual abuse material"; "hold:legal_request" → "a legal hold". */
export function accessLabel(access: string | null): string {
  if (!access) return "none";
  const [kind, reason = ""] = access.split(":");
  if (kind === "report") return `an open report: ${reasonLabel(reason).toLowerCase()}`;
  if (kind === "hold") return `an active hold: ${(HOLD_REASON_LABEL[reason] ?? reason).toLowerCase()}`;
  return access;
}

/** `GET /admin/v1/roles`: one row per active role. */
export interface RoleRow {
  user_id: string;
  email: string;
  role: "moderator" | "admin";
  granted_by: string | null;
  granted_at: number;
  revoked_at: number | null;
}

/** The gateway's limit on an operator's email (the audit log's operator column). */
export const MAX_OPERATOR_EMAIL = 64;

export function reasonLabel(reason: string): string {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason.replace(/_/g, " ");
}

export const RESOLVE_ACTIONS = [
  { value: "dismiss", label: "Dismiss: no action" },
  { value: "remove_content", label: "Remove the content" },
  { value: "restrict_account", label: "Restrict the account" },
  { value: "ban_account", label: "Ban the account" },
] as const;

export const HOLD_REASONS = [
  { value: "report_csam", label: "Report: child sexual abuse material" },
  { value: "report_sexual_minor", label: "Report: sexual content involving a minor" },
  { value: "legal_request", label: "Legal request" },
  { value: "upload_match", label: "Blocked upload match" },
  { value: "operator", label: "Operator (other)" },
] as const;

export const HOLD_REASON_LABEL: Record<string, string> = Object.fromEntries(HOLD_REASONS.map((r) => [r.value, r.label]));

/** "14 Sept 2026, 18:00 UTC", or a dash. */
export function when(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";
}

/** Ids go into gateway paths; anything else is refused before a request is made. */
export const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
