"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

export type AppealStatus = "open" | "upheld" | "overturned" | "withdrawn";
export type SubjectKind = "strike" | "restriction" | "removal" | "report_resolution";

export interface AppealRef {
  appeal_id: string;
  status: AppealStatus;
}

/** `GET /v1/me/appeals`. */
export interface AppealRow {
  appeal_id: string;
  subject_kind: SubjectKind;
  subject_id: string;
  status: AppealStatus;
  statement: string;
  created_at: number;
  resolved_at: number | null;
  decision: "uphold" | "overturn" | null;
  note: string | null;
  summary: string[];
}

/** Something on the account a customer can appeal, already worded by the server. */
export interface Notice {
  kind: SubjectKind;
  subjectId: string;
  noun: string;
  title: string;
  detail: string;
  appeal: AppealRef | null;
  appealable: boolean;
}

const STATUS: Record<AppealStatus, string> = {
  open: "Waiting for review",
  upheld: "Decision stands",
  overturned: "Decision overturned",
  withdrawn: "Withdrawn",
};

const FALLBACK: Record<SubjectKind, string> = {
  strike: "A strike",
  restriction: "A restriction",
  removal: "A removed video",
  report_resolution: "A decision on a report",
};

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

const bare = { listStyle: "none", margin: 0, padding: 0 } as const;

function AppealForm({ notice, maxStatement, onSent }: { notice: Notice; maxStatement: number; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [statement, setStatement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const response = await fetch("/auth/appeals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject_kind: notice.kind, subject_id: notice.subjectId, statement }),
      cache: "no-store",
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { code?: string; message?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(accountError(body, "Couldn't send the appeal. Try again."));
      return;
    }
    setOpen(false);
    setStatement("");
    onSent();
  }

  if (!open) {
    return (
      <div className={styles.actions}>
        <button type="button" className="text-link" onClick={() => setOpen(true)}>
          Appeal this {notice.noun}
        </button>
      </div>
    );
  }
  return (
    <form className={styles.stack} aria-label={`Appeal: ${notice.title}`} onSubmit={(event) => void submit(event)}>
      <label className={styles.field}>
        <span>Why should this decision change?</span>
        <textarea
          rows={4}
          maxLength={maxStatement}
          required
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
      </label>
      <p className={styles.fine}>
        {statement.length} of {maxStatement} characters. A moderator reads this and it&apos;s kept with the decision.
      </p>
      <div className={styles.actions}>
        <button type="submit" className="ocean-button button-dark" disabled={busy || !statement.trim()}>
          {busy ? "Sending…" : "Send appeal"}
        </button>
        <button type="button" className="text-link" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}

export function AppealsPanel({
  notices,
  appeals,
  titles,
  maxStatement,
  sentToday,
  perDay,
}: {
  notices: Notice[];
  appeals: AppealRow[];
  titles: Record<string, string>;
  maxStatement: number;
  sentToday: number;
  perDay: number;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);

  return (
    <div className={styles.stack}>
      {sent && (
        <p role="status" className={styles.success}>
          Appeal sent. A moderator will review it, and we&apos;ll email you the decision.
        </p>
      )}
      {notices.length === 0 ? (
        <p className={styles.fine}>Nothing to appeal: this account has no active restrictions, recent strikes or removals.</p>
      ) : (
        <ul className={styles.stack} style={bare} aria-label="Decisions you can appeal">
          {notices.map((notice) => (
            <li
              key={`${notice.kind}:${notice.subjectId}`}
              className={`${styles.panel} ${styles.wide}`}
              data-subject-kind={notice.kind}
              data-subject-id={notice.subjectId}
            >
              <strong>{notice.title}</strong>
              <p className={styles.fine}>{notice.detail}</p>
              {notice.appeal && <p className={styles.fine}>Your appeal: {STATUS[notice.appeal.status]}.</p>}
              {notice.appealable &&
                (sentToday < perDay ? (
                  <AppealForm
                    notice={notice}
                    maxStatement={maxStatement}
                    onSent={() => {
                      setSent(true);
                      router.refresh();
                    }}
                  />
                ) : (
                  <p className={styles.fine}>You&apos;ve sent {perDay} appeals today. You can send another tomorrow.</p>
                ))}
            </li>
          ))}
        </ul>
      )}

      <h3 className={styles.panelTitle}>Your appeals</h3>
      {appeals.length === 0 ? (
        <p className={styles.fine}>You haven&apos;t sent any appeals.</p>
      ) : (
        <ul className={styles.stack} style={bare} aria-label="Your appeals">
          {appeals.map((appeal) => (
            <li
              key={appeal.appeal_id}
              className={`${styles.panel} ${styles.wide}`}
              data-appeal={appeal.appeal_id}
              data-status={appeal.status}
            >
              <strong>{titles[`${appeal.subject_kind}:${appeal.subject_id}`] ?? FALLBACK[appeal.subject_kind]}</strong>
              <p className={styles.fine}>
                {STATUS[appeal.status]}. Sent {when(appeal.created_at)}
                {appeal.resolved_at !== null ? `, decided ${when(appeal.resolved_at)}` : ""}.
              </p>
              <p className={styles.fine} style={{ overflowWrap: "anywhere" }}>
                Your statement: {appeal.statement}
              </p>
              {appeal.summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {appeal.note && (
                <p className={styles.fine} style={{ overflowWrap: "anywhere" }}>
                  Note from the reviewer: {appeal.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
