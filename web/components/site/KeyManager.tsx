"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import styles from "./Account.module.css";

export interface KeyRow {
  key_id: string;
  name: string;
  prefix: string;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
}

const when = (ts: number | null) =>
  ts === null
    ? "Never"
    : new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

export function KeyManager({ initialKeys }: { initialKeys: KeyRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setCopied(false);
    const response = await fetch("/auth/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const body = (await response.json().catch(() => null)) as { key?: string; name?: string; message?: string } | null;
    setBusy(false);
    if (!response.ok || !body?.key) {
      setError(body?.message ?? "Couldn't create the key.");
      return;
    }
    setCreated({ key: body.key, name: body.name ?? name });
    setName("");
    router.refresh();
  }

  async function revoke(row: KeyRow) {
    if (!window.confirm(`Revoke “${row.name}”? Anything using it stops working immediately.`)) return;
    setError("");
    const response = await fetch(`/auth/keys/${encodeURIComponent(row.key_id)}`, { method: "DELETE" });
    if (!response.ok) {
      setError("Couldn't revoke the key. Try again.");
      return;
    }
    if (created && row.prefix === created.key.slice(0, 12)) setCreated(null);
    router.refresh();
  }

  return (
    <div className={styles.stack}>
      <form className={styles.inline} onSubmit={create}>
        <label className={styles.field}>
          <span>Key name</span>
          <input value={name} maxLength={100} required placeholder="e.g. render farm" onChange={(e) => setName(e.target.value)} />
        </label>
        <button type="submit" className="ocean-button button-dark" disabled={busy}>
          {busy ? "Creating…" : "Create key"}
        </button>
      </form>

      {created && (
        <div className={styles.reveal} role="status">
          <p>
            <strong>{created.name}</strong> — copy it now. This is the only time the key is shown; we store only a hash of
            it.
          </p>
          <code className={styles.mono}>{created.key}</code>
          <button
            type="button"
            className="text-link"
            onClick={() => void navigator.clipboard?.writeText(created.key).then(() => setCopied(true))}
          >
            {copied ? "Copied" : "Copy key"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {initialKeys.length === 0 ? (
        <p className={styles.fine}>No keys yet. Create one to use the API or the SDKs from your own programs.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Key</th>
                <th scope="col">Created</th>
                <th scope="col">Last used</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {initialKeys.map((row) => (
                <tr key={row.key_id}>
                  <td>{row.name}</td>
                  <td className={styles.mono}>{row.prefix}…</td>
                  <td>{when(row.created_at)}</td>
                  <td>{when(row.last_used_at)}</td>
                  <td>{row.revoked_at ? "Revoked" : "Active"}</td>
                  <td>
                    {!row.revoked_at && (
                      <button type="button" className="text-link" onClick={() => void revoke(row)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
