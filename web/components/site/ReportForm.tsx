"use client";

import { useId, useState, type FormEvent } from "react";

import styles from "@/components/site/Account.module.css";
import { REPORT_REASONS, checkReport, type ReportField } from "@/lib/report";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; reportId: string }
  | { kind: "error"; message: string; field?: ReportField };

export interface ReportInitial {
  jobId?: string;
  digest?: string;
  url?: string;
}

/** Sends a report through this site's /report/submit handler, which forwards it to the gateway. */
export function ReportForm({ initial }: { initial: ReportInitial }) {
  const ids = useId();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const check = checkReport(Object.fromEntries(form.entries()));
    if (!check.ok) {
      setState({ kind: "error", message: check.message, field: check.field });
      return;
    }
    setState({ kind: "sending" });
    try {
      const response = await fetch("/report/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(check.report),
      });
      const body = (await response.json().catch(() => null)) as { report_id?: string; code?: string; message?: string } | null;
      if (response.ok && body?.report_id) {
        setState({ kind: "sent", reportId: body.report_id });
        return;
      }
      const message =
        response.status === 429
          ? "Too many reports from this network just now. Wait a few minutes and send it again."
          : `The report didn't go through${body?.message ? `: ${body.message}` : "."} Try again in a moment.`;
      setState({ kind: "error", message });
    } catch {
      setState({ kind: "error", message: "Couldn't reach KunoWorld. Check your connection and send it again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div className={styles.reveal} role="status">
        <p>
          <strong>Report received.</strong> Thank you. Reports about children are looked at first.
        </p>
        <p className={styles.fine}>
          Reference: <code className={styles.mono}>{state.reportId}</code>
        </p>
      </div>
    );
  }

  const invalid = (field: ReportField) => (state.kind === "error" && state.field === field ? true : undefined);
  const hint = (name: string) => `${ids}-${name}-hint`;

  return (
    <form className={styles.stack} onSubmit={submit} noValidate>
      <fieldset className={styles.fieldset}>
        <legend className={styles.label}>Which video</legend>
        <p className={styles.fine} id={hint("which")}>
          Fill in at least one. The content digest and job ID are on the video&apos;s certificate; a link to a{" "}
          <a className="text-link" href="/verify">
            verify
          </a>{" "}
          page carries the digest.
        </p>
        <label className={styles.field}>
          <span>Content digest (SHA-256)</span>
          <input
            name="content_digest"
            defaultValue={initial.digest}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={hint("which")}
            aria-invalid={invalid("content_digest")}
          />
        </label>
        <label className={styles.field}>
          <span>Job ID</span>
          <input name="job_id" defaultValue={initial.jobId} autoComplete="off" spellCheck={false} aria-invalid={invalid("job_id")} />
        </label>
        <label className={styles.field}>
          <span>Link to the video</span>
          <input name="url" type="url" defaultValue={initial.url} placeholder="https://" aria-invalid={invalid("url")} />
        </label>
      </fieldset>

      <label className={styles.field}>
        <span>Reason</span>
        <select name="reason" defaultValue="" required aria-invalid={invalid("reason")}>
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Details (optional)</span>
        <textarea name="details" rows={4} maxLength={4000} aria-invalid={invalid("details")} />
      </label>

      <label className={styles.field}>
        <span>Output key (optional)</span>
        <input
          name="output_key"
          autoComplete="off"
          spellCheck={false}
          aria-describedby={hint("key")}
          aria-invalid={invalid("output_key")}
        />
      </label>
      <p className={styles.fine} id={hint("key")}>
        Only for a <strong>private</strong> video that was shared with you together with its key, for example in a
        KunoWorld film-key file. Private videos are encrypted and nobody at KunoWorld can open them, so this key is the
        only way a reviewer can see that one video. It opens nothing else. Leave it empty for standard videos, or if you
        don&apos;t have it.
      </p>

      <label className={styles.field}>
        <span>Your email (optional)</span>
        <input name="contact_email" type="email" autoComplete="email" aria-describedby={hint("email")} aria-invalid={invalid("contact_email")} />
      </label>
      <p className={styles.fine} id={hint("email")}>
        Only used if we need to ask you about this report.
      </p>

      {state.kind === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <div className={styles.actions}>
        <button type="submit" className="ocean-button button-dark" disabled={state.kind === "sending"}>
          {state.kind === "sending" ? "Sending…" : "Send report"}
        </button>
      </div>
    </form>
  );
}
