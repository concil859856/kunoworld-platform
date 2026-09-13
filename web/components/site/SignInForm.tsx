"use client";

import { useState, type FormEvent } from "react";

import { API_BASE } from "@/lib/config";

import styles from "./Account.module.css";

function safeNext(path: string | undefined): string {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") ? path : "/account";
}

/**
 * Asks the gateway for a sign-in link directly from the browser, so its per-address and per-IP
 * limits see the person asking rather than this site's server.
 */
export function SignInForm({ next, expired }: { next?: string; expired?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/v1/auth/magic-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, next: safeNext(next) }),
      });
      if (response.status === 202) {
        setState("sent");
        return;
      }
      const detail = ((await response.json().catch(() => null)) as { detail?: { message?: string } } | null)?.detail;
      setMessage(detail?.message ?? "Something went wrong. Try again.");
      setState("error");
    } catch {
      setMessage("Couldn't reach KunoWorld. Check your connection and try again.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className={styles.panel} role="status">
        <h2 className={styles.panelTitle}>Check your email</h2>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. Open it on this device; it works once and expires in 15
          minutes.
        </p>
        <button type="button" className="text-link" onClick={() => setState("idle")}>
          Use a different address
        </button>
      </div>
    );
  }

  return (
    <form className={styles.panel} onSubmit={submit}>
      {expired && (
        <p className="notice" role="alert">
          That sign-in link has expired or was already used. Request a new one below.
        </p>
      )}
      <label className={styles.field}>
        <span>Email address</span>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      {state === "error" && (
        <p role="alert" className={styles.error}>
          {message}
        </p>
      )}
      <button type="submit" className="ocean-button button-dark" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p className={styles.fine}>No password to remember. If you don&apos;t have an account yet, the same link creates one.</p>
    </form>
  );
}
