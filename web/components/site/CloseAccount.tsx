"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

/** `GET /v1/me/close`: what closing does, and whether this session may close the account now. */
export interface ClosurePreview {
  email: string;
  account_id: string;
  reauth_required: boolean;
  reauth_expires_at: number | null;
  reauth_window_s: number;
  balance_usd: number;
  balance_policy: string;
  deletes: string[];
  records_kept: string[];
  retention_policy: string;
}

interface Closed {
  balance_usd: number;
  balance_policy: string;
  records_kept: string[];
  retention_policy: string;
}

const time = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

const usd = (value: number) => `$${value.toFixed(2)}`;

/**
 * "Close your account": explains what goes and what stays, then asks for two things before closing: a sign-in from
 * the last 10 minutes (a link emailed to the account's own address) and the address typed out.
 */
export function CloseAccount({ preview, initiallyOpen = false }: { preview: ClosurePreview | null; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [needsReauth, setNeedsReauth] = useState(preview?.reauth_required ?? true);
  const [reauthSent, setReauthSent] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closed, setClosed] = useState<Closed | null>(null);

  if (!preview) {
    return (
      <div className={`${styles.panel} ${styles.wide}`} id="close-account" data-testid="close-account">
        <h3 className={styles.panelTitle}>Close your account</h3>
        <p className={styles.fine}>Closing an account isn&apos;t available right now. Try again later.</p>
      </div>
    );
  }
  const email = preview.email;
  const matches = typed.trim().toLowerCase() === email.toLowerCase();

  async function sendReauth() {
    setBusy(true);
    setError("");
    const response = await fetch("/auth/reauth", { method: "POST", cache: "no-store" }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { code?: string; message?: string } | null;
    setBusy(false);
    if (!response?.ok) {
      setError(accountError(body, "Couldn't send the link. Try again."));
      return;
    }
    setReauthSent(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches) return;
    setBusy(true);
    setError("");
    const response = await fetch("/auth/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm_email: typed }),
      cache: "no-store",
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as (Closed & { code?: string; message?: string }) | null;
    setBusy(false);
    if (response?.ok && body) {
      setClosed(body);
      return;
    }
    if (body?.code === "reauth_required") {
      setNeedsReauth(true);
      setReauthSent(false);
    }
    setError(accountError(body, "Couldn't close the account. Try again."));
  }

  return (
    <div className={`${styles.panel} ${styles.wide}`} id="close-account" data-testid="close-account">
      <h3 className={styles.panelTitle}>Close your account</h3>
      {closed ? (
        <div role="status" className={styles.stack}>
          <p>
            <strong>Your account is closed.</strong>
          </p>
          <p className={styles.fine}>
            Your videos and uploads are deleted, and you&apos;re signed out on every device. We emailed a confirmation to{" "}
            {email}.
          </p>
          <p className={styles.fine}>
            Your balance of {usd(closed.balance_usd)}: {closed.balance_policy}. Kept: {closed.records_kept.join(", ")}:{" "}
            {closed.retention_policy}.
          </p>
          <div className={styles.actions}>
            <Link className="ocean-button button-dark" href="/">
              Back to KunoWorld
            </Link>
          </div>
        </div>
      ) : !open ? (
        <>
          <p className={styles.fine}>
            Closing deletes your videos and signs you out everywhere. It can&apos;t be undone.
          </p>
          <div className={styles.actions}>
            <button type="button" className="text-link" onClick={() => setOpen(true)}>
              Close my account…
            </button>
          </div>
        </>
      ) : (
        <div className={styles.stack}>
          <p>Closing your account is permanent. It deletes:</p>
          <ul className={styles.list} aria-label="What closing deletes">
            {preview.deletes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={styles.fine}>
            Videos still rendering are canceled and refunded first. Content under a legal preservation hold is kept until
            the hold ends, as the Privacy Policy explains. Download a copy of your data first if you want one: exports are
            deleted with the account.
          </p>
          <p className={styles.fine}>
            Kept: {preview.records_kept.join(", ")}: {preview.retention_policy}.
          </p>
          <p className={styles.fine}>
            Your balance of {usd(preview.balance_usd)} isn&apos;t refunded automatically: {preview.balance_policy}.
          </p>
          <p className={styles.fine}>Signing in again with {email} later creates a new, empty account.</p>

          {needsReauth ? (
            <div className={styles.stack}>
              <p>
                <strong>First, confirm it&apos;s you.</strong> Closing needs a sign-in from the last 10 minutes. We&apos;ll
                email a link to {email}. Open it on this device and you&apos;ll come back here to finish.
              </p>
              <div className={styles.actions}>
                <button type="button" className="ocean-button button-dark" disabled={busy} onClick={() => void sendReauth()}>
                  {reauthSent ? "Send the link again" : "Email me a confirmation link"}
                </button>
                <button type="button" className="text-link" onClick={() => setOpen(false)}>
                  Keep my account
                </button>
              </div>
              {reauthSent && (
                <p role="status" className={styles.success}>
                  We sent a link to {email}. Open it on this device, then close the account within 10 minutes.
                </p>
              )}
            </div>
          ) : (
            <form className={styles.stack} aria-label="Close your account" onSubmit={(event) => void submit(event)}>
              <p className={styles.success}>
                You confirmed it&apos;s you
                {preview.reauth_expires_at !== null ? `. Close the account before ${time(preview.reauth_expires_at)}` : ""}.
              </p>
              <label className={styles.field}>
                <span>Type {email} to confirm</span>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="email"
                  maxLength={320}
                />
              </label>
              <div className={styles.actions}>
                <button type="submit" className="ocean-button button-dark" disabled={busy || !matches}>
                  {busy ? "Closing…" : "Close my account permanently"}
                </button>
                <button type="button" className="text-link" onClick={() => setOpen(false)}>
                  Keep my account
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
