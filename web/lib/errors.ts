/** Maps KunoError codes (and a few browser failures) to plain-language copy. */

import { KunoError } from "@kunoworld/sdk";

import { API_BASE, RELAY_RETENTION_DAYS } from "./config";

/** submit: before the job exists (nothing charged). render: after submission (failures are refunded). open: fetching a finished film. */
export type Phase = "submit" | "render" | "open" | "lookup";

export interface FriendlyError {
  code: string;
  title: string;
  detail: string;
  /** What happened to the money, when that's knowable. */
  charge: "none" | "refunded" | "kept" | null;
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
  signed_out: { title: "You've been signed out", detail: "Sign in again to continue." },
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
          detail: "The film's key lives only in this browser, so it can't be recovered from our side. If you generated it in another browser, open it there.",
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
    title: "That API key wasn't accepted",
    detail: "Connect with a valid key. Self-serve accounts are coming; for now keys are issued by hand.",
  },
  invalid_params: { title: "The settings don't fit this stock", detail: "" },
  invalid_inputs: { title: "An input couldn't be attached", detail: "" },
  bad_inputs: { title: "An input didn't arrive intact", detail: "" },
  unsupported_media: { title: "Unsupported file type", detail: "Use PNG, JPEG or WebP images, MP4, MOV or WebM video, and WAV, MP3, OGG or FLAC audio." },
  too_large: { title: "That file is too large", detail: "Uploads are limited to 512 MB after encryption." },
  prompt_too_long: { title: "The prompt is too long", detail: "" },
  unsupported_option: { title: "That option isn't available on this stock", detail: "" },
  expired: {
    title: "This sealed copy has expired",
    detail: `The relay keeps encrypted films for ${RELAY_RETENTION_DAYS} days, then deletes them. Download films you want to keep.`,
  },
  not_found: (phase) =>
    phase === "lookup"
      ? { title: "No KunoWorld certificate matches this file", detail: "" }
      : { title: "Not found", detail: "This job isn't on the account connected in this browser." },
  queue_timeout: { title: "No stage picked this up in time", detail: "Submit again." },
  internal_error: { title: "The render failed inside the stage", detail: "The stage reported an internal error." },
  timeout: { title: "Still rendering after 30 minutes", detail: "We stopped waiting. Reopen the studio later — the key for this film is still in this browser." },
  job_canceled: { title: "Canceled", detail: "You canceled this take." },
  canceled: { title: "Canceled", detail: "You canceled this take." },
  aborted: { title: "Stopped waiting", detail: "" },
  network: {
    title: "Can't reach KunoWorld",
    detail: `Your browser couldn't reach ${API_BASE}.`,
  },
};

function splitJobError(message: string): { code: string | null; message: string } {
  const match = /^([a-z_]+):\s*(.*)$/s.exec(message);
  return match ? { code: match[1], message: match[2] } : { code: null, message };
}

export function friendlyError(err: unknown, phase: Phase): FriendlyError {
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
  const copy = typeof entry === "function" ? entry(phase) : entry;
  const title = copy?.title ?? "Something went wrong";
  const detail = copy?.detail || message || "";
  const charge: FriendlyError["charge"] =
    phase === "submit" ? "none" : phase === "render" ? "refunded" : phase === "open" ? "kept" : null;
  return { code, title, detail: copy?.detail ? detail : message, charge };
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
