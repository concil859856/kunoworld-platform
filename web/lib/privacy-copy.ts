/**
 * Words for the two privacy modes, shared by the studio, the account page and the report page.
 * No hooks here, so server components can import it too.
 */

import type { PrivacyMode } from "@kunoworld/sdk";

export const PRIVACY_COPY: Record<PrivacyMode, { label: string; sentence: string; short: string }> = {
  private: {
    label: "Private",
    sentence: "Encrypted in your browser for a confidential GPU; nobody at KunoWorld can see this video or your prompt.",
    short: "Encrypted by the SDK",
  },
  standard: {
    label: "Standard",
    sentence: "KunoWorld and the GPU provider can see this video and your prompt.",
    short: "Readable by KunoWorld",
  },
};

/** The gateway's default KUNO_STANDARD_RETENTION_DAYS. */
export const STANDARD_RETENTION_DAYS = 30;

export function privacyOf(value: string | null | undefined): PrivacyMode {
  return value === "standard" ? "standard" : "private";
}

/**
 * One line for a reason private mode isn't available. The contract only says reasons are strings,
 * so known themes get plain copy, sentences pass through, and codes are made readable.
 */
const REASONS: Record<string, string> = {
  no_verified_payment:
    "Add credit once, by card, USDT, TAO or alpha. Private mode needs an account with a verified payment.",
  account_restricted: "This account is restricted right now.",
  too_many_strikes: "Too many takes on this account were blocked by the content policy in the last 30 days.",
};

export function eligibilityReason(reason: string): string {
  if (REASONS[reason]) return REASONS[reason];
  const r = reason.toLowerCase();
  if (/payment|top.?up|credit|paid|deposit/.test(r)) {
    return "Add credit once, by card, USDT, TAO or alpha. Private mode needs an account with a verified payment.";
  }
  if (/strike/.test(r)) return "Too many takes on this account were blocked by the content policy in the last 30 days.";
  if (/restrict|suspend|ban/.test(r)) return "This account is restricted right now.";
  if (/\s/.test(reason.trim())) return reason.trim();
  const words = reason.replace(/[_-]+/g, " ").trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}.` : "Private mode isn't available on this account.";
}

/** The gateway marks a restriction that lasts until an operator reviews it with a date in year 9999. */
export function isIndefiniteRestriction(until: number): boolean {
  return new Date(until * 1000).getUTCFullYear() >= 9999;
}

/** "until 14 Sept 2026, 18:00 UTC", or "until an operator reviews it". */
export function restrictionUntil(until: number): string {
  return isIndefiniteRestriction(until) ? "until an operator reviews it" : `until ${formatUntil(until)}`;
}

export function formatUntil(ts: number): string {
  return (
    new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) +
    " UTC"
  );
}
