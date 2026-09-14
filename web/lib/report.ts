/** Report reasons and the checks a report must pass, shared by the form and its route handler. */

import type { ReportReason, ReportRequest } from "@kunoworld/sdk";

export const REPORT_REASONS: ReadonlyArray<{ value: ReportReason; label: string }> = [
  { value: "csam", label: "Child sexual abuse material" },
  { value: "sexual_minor", label: "Sexual content involving a minor" },
  { value: "nonconsensual_intimate", label: "Intimate imagery shared without consent" },
  { value: "violent_extremism", label: "Violent extremism" },
  { value: "harassment", label: "Harassment or threats" },
  { value: "copyright", label: "Copyright or other rights" },
  { value: "other", label: "Something else" },
];

/** The only reasons a private video's output key may be sent with (the gateway refuses others: key_not_accepted). */
export const KEY_REASONS: ReadonlyArray<ReportReason> = ["csam", "sexual_minor"];

export type ReportField = keyof ReportRequest;

export type ReportCheck = { ok: true; report: ReportRequest } | { ok: false; field: ReportField; message: string };

const LIMITS = { job_id: 200, url: 2000, details: 4000, output_key: 200, contact_email: 254 } as const;

/** Trims, normalizes and validates a report. A /verify?sha256=… link also fills the digest. */
export function checkReport(input: unknown): ReportCheck {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const text = (key: ReportField) => (typeof raw[key] === "string" ? (raw[key] as string).trim() : "");
  const fail = (field: ReportField, message: string): ReportCheck => ({ ok: false, field, message });

  let digest = text("content_digest").toLowerCase();
  const jobId = text("job_id");
  const url = text("url");
  const reason = text("reason");
  const details = text("details");
  const outputKey = text("output_key");
  const email = text("contact_email");

  if (digest && !/^[0-9a-f]{64}$/.test(digest)) {
    return fail("content_digest", "A content digest is the video's SHA-256: 64 characters, 0–9 and a–f.");
  }
  if (url) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return fail("url", "Paste the whole link, starting with https://.");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return fail("url", "Paste the whole link, starting with https://.");
    if (url.length > LIMITS.url) return fail("url", "That link is too long.");
    const linked = parsed.searchParams.get("sha256");
    if (!digest && linked && /^[0-9a-fA-F]{64}$/.test(linked)) digest = linked.toLowerCase();
  }
  if (jobId && (jobId.length > LIMITS.job_id || !/^[\w.:-]+$/.test(jobId))) {
    return fail("job_id", "A job ID is letters, numbers and dashes, like the one on the take's certificate.");
  }
  if (!digest && !jobId && !url) return fail("content_digest", "Tell us which video: a content digest, a job ID or a link.");
  if (!REPORT_REASONS.some((r) => r.value === reason)) return fail("reason", "Choose a reason.");
  if (details.length > LIMITS.details) return fail("details", `Keep the details under ${LIMITS.details.toLocaleString("en-US")} characters.`);
  // An output key is 32 bytes of base64url: 43 characters, perhaps with one "=" of padding.
  if (outputKey && !KEY_REASONS.includes(reason as ReportReason)) {
    return fail(
      "output_key",
      "An output key can be sent only with a report of child sexual abuse material or sexual content involving a minor. Leave it empty.",
    );
  }
  if (outputKey && (outputKey.length > LIMITS.output_key || !/^[A-Za-z0-9_-]{43}=?$/.test(outputKey))) {
    return fail("output_key", "That doesn't look like a KunoWorld output key. Copy it exactly, or leave it empty.");
  }
  if (email && (email.length > LIMITS.contact_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return fail("contact_email", "Check the email address, or leave it empty.");
  }

  const report: ReportRequest = { reason: reason as ReportReason };
  if (digest) report.content_digest = digest;
  if (jobId) report.job_id = jobId;
  if (url) report.url = url;
  if (details) report.details = details;
  if (outputKey) report.output_key = outputKey;
  if (email) report.contact_email = email;
  return { ok: true, report };
}
