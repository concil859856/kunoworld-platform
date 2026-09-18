/** Maps KunoError codes (and a few browser failures) to plain-language copy. */

import { KunoError, type PrivacyMode } from "@kunoworld/sdk";

import { isIndefiniteRestriction, restrictionUntil } from "./privacy-copy";

/** submit: before the job exists (nothing charged). render: after submission (failures are refunded). open: fetching a finished film. */
export type Phase = "submit" | "render" | "open" | "lookup";

export interface FriendlyError {
  code: string;
  title: string;
  detail: string;
  /** What happened to the money, when that's knowable. */
  charge: "none" | "refunded" | "kept" | null;
  /** private_mode_not_eligible: why, as the gateway gave it. */
  reasons?: string[];
  /** account_restricted: Unix seconds, or null when it lasts until a review. */
  restrictedUntil?: number | null;
  /** Where to go to fix it. */
  link?: { href: string; label: string };
}

interface Copy {
  title: string;
  detail: string;
}

const COPY: Record<string, Copy | ((phase: Phase) => Copy)> = {
  insufficient_balance: {
    title: "Not enough balance for this take",
    detail: "Your balance doesn't cover this render, so nothing was sent to a stage or charged. Add credit on your account page.",
  },
  invalid_amount: { title: "That amount can't be charged", detail: "" },
  payments_unavailable: {
    title: "This payment method isn't available",
    detail: "It isn't switched on yet. Nothing was charged; try another method.",
  },
  provider_error: {
    title: "The payment provider didn't answer",
    detail: "Nothing was charged. Try again in a moment.",
  },
  invalid_wallet: {
    title: "That isn't a Bittensor coldkey",
    detail: "Paste the coldkey's address: 48 characters, starting with 5.",
  },
  invalid_signature: { title: "The signature didn't check out", detail: "" },
  wallet_linked_elsewhere: {
    title: "That coldkey belongs to another account",
    detail: "It's already linked to a different KunoWorld account. Unlink it there first.",
  },
  signed_out: { title: "You're not signed in", detail: "Sign in with your email to make, open and delete videos." },
  content_policy: {
    title: "Blocked by the content policy",
    detail: "This request breaks KunoWorld's content policy, so it wasn't made. NSFW content is banned in both modes. Nothing was charged.",
  },
  content_not_reviewable: {
    title: "This content can't be opened",
    detail:
      "Operators can open a video only for a report of child sexual abuse material or sexual content involving a minor, or under a legal hold.",
  },
  key_not_accepted: {
    title: "An output key can't be sent with this report",
    detail: "Output keys are accepted only for reports of child sexual abuse material or sexual content involving a minor. Leave the key empty.",
  },
  gone: { title: "This feature was retired", detail: "Reload the page to use the current version." },
  private_mode_not_eligible: {
    title: "Private mode isn't available on this account yet",
    detail:
      "Nothing was sent or charged. Add credit to unlock Private mode, or make this take in Standard mode, where KunoWorld and the GPU provider can see it.",
  },
  account_restricted: {
    title: "Your account is paused",
    detail:
      "Too many recent takes were blocked by the content policy, so no new videos can be made in either mode for now. Nothing was sent or charged.",
  },
  upload_blocked: {
    title: "This file can't be used",
    detail: "One of your inputs can't be used on KunoWorld. Nothing was charged.",
  },
  not_ready: { title: "This video isn't ready yet", detail: "Try again once the take has finished." },
  scan_unavailable: {
    title: "Uploads can't be checked right now",
    detail: "Standard uploads are scanned before use, and the scanner isn't answering. Nothing was charged; try again in a minute.",
  },
  bad_output: {
    title: "The video didn't match its receipt",
    detail: "The stage returned a video that didn't match its signed receipt, so the take failed and was refunded.",
  },
  standard_unavailable: {
    title: "Standard mode isn't available here",
    detail: "This gateway isn't set up to store standard takes. Nothing was charged; make this take in Private mode.",
  },
  invalid_output_key: {
    title: "That output key isn't valid",
    detail: "An output key is 43 characters of letters, numbers, - and _. Copy it exactly, or leave it out.",
  },
  deleted: { title: "This video was deleted", detail: "It was deleted from your KunoWorld library." },
  removed: {
    title: "This video was removed",
    detail: "KunoWorld removed it after a review under the content policy.",
  },
  rate_limited: {
    title: "Too many takes at once",
    detail: "You've started a lot of videos in the last minute. Wait a moment and try again; nothing was charged.",
  },
  too_many_active_jobs: {
    title: "Several takes are still rendering",
    detail: "Wait for one of them to finish before starting another. Nothing was charged.",
  },
  invalid_webhook_url: {
    title: "That webhook address can't be used",
    detail: "Webhooks must use https and point at a public address.",
  },
  region_restricted: {
    title: "Not licensed in your region yet",
    detail: "MiniMax H3 can't be used where you are yet, and no LTX-2.5 stock can make this kind of shot. Try Frames or Keyframes on LTX-2.5.",
  },
  no_attested_worker: {
    title: "No stage could prove its hardware",
    detail: "Your browser checks each stage's proof of hardware before sending anything. None passed just now, so nothing left your device.",
  },
  no_capacity: {
    title: "Every stage for this stock is busy or offline",
    detail: "Nothing was sent or charged. Try another stock, or try again in a minute.",
  },
  model_disabled: {
    title: "This stock is switched off right now",
    detail: "The network owner has paused this model. Pick another stock.",
  },
  mode_unsupported: { title: "This stock can't make that shot", detail: "Pick a stock that supports this kind of shot." },
  mode_unavailable: { title: "No stock can make that shot right now", detail: "Nothing was sent or charged." },
  enclave_unavailable: (phase) =>
    phase === "submit"
      ? { title: "The stage went away mid-handshake", detail: "The stage your browser chose left the network before accepting the job. Nothing was charged — generate again." }
      : { title: "The stage went offline", detail: "The assigned stage went offline before starting." },
  safety_blocked: {
    title: "Blocked by the content policy",
    detail: "The content check inside the sealed stage stopped this request before rendering. It runs inside the stage, so no person read your prompt.",
  },
  decrypt_failed: (phase) =>
    phase === "open"
      ? {
          title: "This film didn't open with the key in this browser",
          detail:
            "Private videos open only with the key stored on your devices, and KunoWorld can't recover it. If you made it in another browser, open it there, or restore a key backup.",
        }
      : {
          title: "The stage couldn't open your sealed request",
          detail: "The request didn't decrypt inside the stage — it may have been altered in transit.",
        },
  integrity: {
    title: "The film didn't match its certificate",
    detail: "What came back didn't match the stage's signed receipt, so it wasn't shown. Try opening it again.",
  },
  unauthorized: {
    title: "You're not signed in",
    detail: "Your sign-in ended. Sign in with your email again to continue.",
  },
  invalid_params: { title: "The settings don't fit this stock", detail: "" },
  invalid_inputs: { title: "An input couldn't be attached", detail: "" },
  bad_inputs: { title: "An input didn't arrive intact", detail: "" },
  unsupported_media: { title: "Unsupported file type", detail: "Use PNG, JPEG or WebP images, MP4, MOV or WebM video, and WAV, MP3, OGG or FLAC audio." },
  too_large: { title: "That file is too large", detail: "Uploads are limited to 512 MB after encryption." },
  prompt_too_long: { title: "The prompt is too long", detail: "" },
  unsupported_option: { title: "That option isn't available on this stock", detail: "" },
  expired: {
    title: "This video is no longer stored",
    detail: "Its stored copy was deleted earlier. Videos made now are kept until you delete them.",
  },
  not_found: (phase) =>
    phase === "lookup"
      ? { title: "No KunoWorld certificate matches this file", detail: "" }
      : { title: "Not found", detail: "This video isn't on the account you're signed in with, or it was deleted." },
  queue_timeout: { title: "No stage picked this up in time", detail: "Submit again." },
  internal_error: { title: "The render failed inside the stage", detail: "The stage reported an internal error." },
  timeout: { title: "Still rendering after 30 minutes", detail: "We stopped waiting. Reopen the studio later — the key for this film is still in this browser." },
  job_canceled: { title: "Canceled", detail: "You canceled this take." },
  plan_failed: { title: "Couldn't plan this brief", detail: "You weren't charged. Try rephrasing it." },
  plans_unavailable: {
    title: "No worker can write plans right now",
    detail: "Nothing was sent or charged. Try again later, or write the shots yourself.",
  },
  brief_required: { title: "Write a brief first", detail: "Say what the video is for, what happens and how it should feel." },
  invalid_plan: { title: "Fix the shots first", detail: "" },
  canceled: { title: "Canceled", detail: "You canceled this take." },
  aborted: { title: "Stopped waiting", detail: "" },
  network: {
    title: "Can't reach KunoWorld",
    detail: "KunoWorld didn't answer. Check your connection and try again.",
  },
};

function splitJobError(message: string): { code: string | null; message: string } {
  const match = /^([a-z_]+):\s*(.*)$/s.exec(message);
  return match ? { code: match[1], message: match[2] } : { code: null, message };
}

/** Copy that depends on who could read the take. */
function privacyCopy(code: string, privacy: PrivacyMode): Copy | null {
  if (code === "safety_blocked") {
    return privacy === "standard"
      ? {
          title: "Blocked by the content policy",
          detail: "The content check stopped this request before rendering. Blocked takes count as strikes on your account, unless the blocked text was written by our model for you.",
        }
      : {
          title: "Blocked by the content policy",
          detail:
            "The content check inside the sealed stage stopped this request before rendering. It runs inside the stage, so no person read your prompt. Blocked takes count as strikes on your account, unless the blocked text was written by our model for you (an enhanced prompt or a plan).",
        };
  }
  return null;
}

export function friendlyError(err: unknown, phase: Phase, privacy: PrivacyMode = "private"): FriendlyError {
  let code = "error";
  let message = err instanceof Error ? err.message : String(err);
  if (err instanceof KunoError) {
    code = err.code;
    if (code === "job_failed") {
      // Failed jobs surface as "job_failed" with the worker's code as a message prefix.
      const parsed = splitJobError(err.message);
      code = parsed.code ?? "internal_error";
      message = parsed.message;
    }
  } else if (err instanceof Error && err.name === "DecryptionError") {
    code = "decrypt_failed";
  } else if (err instanceof TypeError) {
    code = "network";
  }
  const entry = COPY[code];
  const copy = privacyCopy(code, privacy) ?? (typeof entry === "function" ? entry(phase) : entry);
  const title = copy?.title ?? "Something went wrong";
  const charge: FriendlyError["charge"] =
    phase === "submit" ? "none" : phase === "render" ? "refunded" : phase === "open" ? "kept" : null;
  const friendly: FriendlyError = { code, title, detail: copy?.detail || message || "", charge };

  if (code === "signed_out" || code === "unauthorized") {
    friendly.link = { href: "/signin?next=/studio", label: "Sign in" };
  }
  if (err instanceof KunoError && code === "private_mode_not_eligible") {
    friendly.reasons = err.reasons;
    friendly.link = { href: "/account#add-credit", label: "Add credit" };
  }
  if (err instanceof KunoError && code === "account_restricted") {
    friendly.restrictedUntil = err.restrictedUntil;
    const until = err.restrictedUntil;
    friendly.detail +=
      until === null || isIndefiniteRestriction(until)
        ? " It stays paused until an operator reviews the account."
        : ` You can make videos again after ${restrictionUntil(until).replace(/^until /, "")}.`;
    friendly.link = { href: "/account#private-mode", label: "See your account" };
  }
  return friendly;
}

/** One line for a failed request on the account page, from a route handler's { code, message } body. */
export function accountError(body: { code?: string; message?: string } | null, fallback: string): string {
  // Account requests carry the web session, so a 401 means it ended, not that an API key was wrong.
  const code = body?.code === "unauthorized" ? "signed_out" : body?.code;
  const entry = code ? COPY[code] : undefined;
  const copy = typeof entry === "function" ? entry("submit") : entry;
  if (!copy) return body?.message || fallback;
  return `${copy.title}. ${copy.detail || body?.message || ""}`.trim();
}
