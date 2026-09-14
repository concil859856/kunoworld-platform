/**
 * Words for the two privacy modes, shared by the studio, the account page, the report page and
 * the operator console. No hooks here, so server components can import it too.
 */

import type { PrivacyMode } from "@kunoworld/sdk";

export const PRIVACY_COPY: Record<PrivacyMode, { label: string; sentence: string; short: string }> = {
  private: {
    label: "Private",
    sentence:
      "Encrypted in your browser for a confidential GPU; nobody at KunoWorld can see this video or your prompt. It opens only with the key kept on your devices.",
    short: "Encrypted by the SDK",
  },
  standard: {
    label: "Standard",
    sentence:
      "KunoWorld and the GPU provider can see this video and your prompt. Only your account can open it in KunoWorld.",
    short: "Readable by KunoWorld",
  },
};

/** The one sentence about private keys, used wherever keys are backed up or restored. */
export const KEY_BACKUP_SENTENCE =
  "Private videos can only be opened with keys stored on your devices — back them up, or a lost key means a lost video.";

/** The one rule about who can open a video. */
export const SHARE_SENTENCE = "Only you can open your videos, unless you create a share link for one.";

/** Shown wherever a private video's share link is made or copied. */
export const PRIVATE_SHARE_WARNING =
  "Anyone with this link can watch this video. Its key is part of the link, after the #: KunoWorld still can't see the video, but anyone the link reaches can.";

export const STANDARD_SHARE_WARNING = "Anyone with this link can watch this video until you revoke the link or it expires.";

export const STORAGE_SENTENCE =
  "In both modes, videos are stored on KunoWorld's storage (Cloudflare R2) until you delete them. Nothing expires on its own.";

export const OPERATOR_ACCESS_SENTENCE =
  "KunoWorld operators open a video only when it's reported as child sexual abuse material or is under a legal hold, and every view is logged.";

export const NSFW_SENTENCE = "NSFW content is banned in both modes.";

export const PRICE_PLACEHOLDER_SENTENCE = "Prices are placeholders until launch pricing is set.";

export const SIGN_IN_SENTENCE =
  "You use KunoWorld with your email sign-in. API keys are only for developers calling the API from their own programs.";

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
