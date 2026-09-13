"use client";

import { useState } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

const MASKED = "whsec_" + "•".repeat(24);

/** The secret is fetched only when asked for, so it's never in the page's HTML. */
export function WebhookSecret() {
  const [secret, setSecret] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [error, setError] = useState("");

  async function load(method: "GET" | "POST"): Promise<string | null> {
    const response = await fetch("/auth/webhook-secret", { method, cache: "no-store" }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as { secret?: string; code?: string; message?: string } | null;
    if (!response?.ok || !body?.secret) {
      setError(accountError(body, method === "POST" ? "Couldn't rotate the secret. Try again." : "Couldn't load the secret. Try again."));
      return null;
    }
    setSecret(body.secret);
    return body.secret;
  }

  async function toggle() {
    if (shown) {
      setShown(false);
      return;
    }
    setBusy(true);
    setError("");
    const value = secret ?? (await load("GET"));
    setBusy(false);
    if (value) setShown(true);
  }

  async function copy() {
    setBusy(true);
    setError("");
    const value = secret ?? (await load("GET"));
    setBusy(false);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setError("Your browser didn't allow copying. Reveal the secret and copy it by hand.");
    }
  }

  async function rotate() {
    if (!window.confirm("Rotate the webhook secret? New deliveries are signed with the new secret straight away, so update your server's check.")) {
      return;
    }
    setBusy(true);
    setError("");
    setCopied(false);
    const value = await load("POST");
    setBusy(false);
    if (!value) return;
    setShown(true);
    setRotated(true);
  }

  return (
    <div className={styles.stack}>
      <code className={`${styles.mono} ${styles.secret}`} aria-label="Webhook signing secret">
        {shown && secret ? secret : MASKED}
      </code>
      <div className={styles.actions}>
        <button type="button" className="text-link" disabled={busy} onClick={() => void toggle()}>
          {shown ? "Hide secret" : "Reveal secret"}
        </button>
        <button type="button" className="text-link" disabled={busy} onClick={() => void copy()}>
          {copied ? "Copied" : "Copy secret"}
        </button>
        <button type="button" className="text-link" disabled={busy} onClick={() => void rotate()}>
          Rotate secret
        </button>
      </div>

      {rotated && (
        <p role="status" className={styles.success}>
          New secret in use. Update your server with it; the old one no longer verifies.
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
