"use client";

import { useEffect, useState } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

/** `GET /v1/me/exports`. */
export interface ExportRow {
  export_id: string;
  status: "queued" | "running" | "ready" | "failed" | "expired" | "deleted";
  created_at: number;
  finished_at: number | null;
  expires_at: number | null;
  deleted_at: number | null;
  size_bytes: number | null;
  error_code: string | null;
}

const STATUS: Record<ExportRow["status"], string> = {
  queued: "Waiting to start",
  running: "Preparing",
  ready: "Ready",
  failed: "Couldn't be prepared",
  expired: "Deleted",
  deleted: "Deleted",
};

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

function size(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

const inProgress = (rows: ExportRow[] | null) => Boolean(rows?.some((r) => r.status === "queued" || r.status === "running"));

/** "Download a copy": request an export, watch it get ready, download it before it's deleted a week later. */
export function DataExport({ initialExports }: { initialExports: ExportRow[] | null }) {
  const [rows, setRows] = useState<ExportRow[] | null>(initialExports);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preparing = inProgress(rows);

  useEffect(() => {
    if (!preparing) return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      const response = await fetch("/auth/exports", { cache: "no-store" }).catch(() => null);
      const body = response?.ok ? ((await response.json().catch(() => null)) as ExportRow[] | null) : null;
      if (!stopped && Array.isArray(body)) setRows(body);
    }, 2500);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [preparing]);

  async function requestCopy() {
    setBusy(true);
    setError("");
    const response = await fetch("/auth/exports", { method: "POST", cache: "no-store" }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as (ExportRow & { code?: string; message?: string }) | null;
    setBusy(false);
    if (!response?.ok || !body?.export_id) {
      setError(accountError(body, "Couldn't start the export. Try again."));
      return;
    }
    setRows((current) => [body, ...(current ?? []).filter((row) => row.export_id !== body.export_id)]);
  }

  return (
    <div className={`${styles.panel} ${styles.wide}`} data-testid="data-export">
      <h3 className={styles.panelTitle}>Download a copy of your data</h3>
      <p className={styles.fine}>
        A zip of your account: your details, balance, every charge and payment, your jobs with their receipts, your
        strikes and appeals, your Standard prompts, videos and uploads, and your Private videos as the encrypted files
        KunoWorld stores. Private videos stay encrypted: only the keys on your devices open them. Content you deleted,
        or that was removed after a review, isn&apos;t included.
      </p>
      <p className={styles.fine}>
        An export is a copy. It&apos;s deleted automatically 7 days after it&apos;s ready, and deleting it changes nothing
        else.
      </p>
      {rows === null ? (
        <p className={styles.fine}>Exports aren&apos;t available right now.</p>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className="ocean-button button-dark"
            disabled={busy || preparing}
            onClick={() => void requestCopy()}
          >
            {preparing ? "Preparing your copy…" : busy ? "Starting…" : "Request a copy of my data"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {rows && rows.length > 0 && (
        <ul className={styles.list} aria-label="Your exports" aria-live="polite">
          {rows.map((row) => (
            <li key={row.export_id} data-export={row.export_id} data-status={row.status}>
              <strong>{STATUS[row.status]}</strong>, requested {when(row.created_at)}
              {row.status === "ready" && row.expires_at !== null && (
                <>
                  {" "}
                  ({size(row.size_bytes)}). Deleted automatically on {when(row.expires_at)}.{" "}
                  <a
                    className="text-link"
                    href={`/auth/exports/${encodeURIComponent(row.export_id)}/download`}
                    download
                  >
                    Download zip
                  </a>
                </>
              )}
              {row.status === "failed" && ". Request a new one."}
              {(row.status === "expired" || row.status === "deleted") && row.deleted_at !== null && (
                <>. Deleted on {when(row.deleted_at)}.</>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
