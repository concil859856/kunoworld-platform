"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";

import { API_BASE } from "@/lib/config";
import { friendlyError } from "@/lib/errors";
import { makeClient, maskKey, setApiKey, useApiKey } from "@/lib/kuno";

import styles from "./ConnectDialog.module.css";

const OPEN_EVENT = "kuno:open-connect";

/** Opens the Connect dialog from anywhere (the header owns the single instance). */
export function openConnect(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type Status = { kind: "idle" } | { kind: "checking" } | { kind: "error"; message: string; offline: boolean };

export function ConnectButton() {
  const apiKey = useApiKey();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const titleId = useId();
  const isLocal = /localhost|127\.0\.0\.1/.test(API_BASE);

  const open = useCallback(() => {
    setDraft("");
    setReveal(false);
    setStatus({ kind: "idle" });
    dialog.current?.showModal();
    window.setTimeout(() => input.current?.focus(), 0);
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, [open]);

  async function connect(event: FormEvent) {
    event.preventDefault();
    const key = draft.trim();
    if (!key) return;
    setStatus({ kind: "checking" });
    try {
      await makeClient(key).list(1);
      setApiKey(key);
      dialog.current?.close();
    } catch (err) {
      const f = friendlyError(err, "lookup");
      setStatus({ kind: "error", message: `${f.title}. ${f.detail}`.trim(), offline: f.code === "network" });
    }
  }

  function saveAnyway() {
    setApiKey(draft.trim());
    dialog.current?.close();
  }

  function disconnect() {
    setApiKey(null);
    dialog.current?.close();
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn-small ${styles.trigger}`}
        data-connected={apiKey ? "true" : "false"}
        onClick={open}
        title={apiKey ? `Connected with ${maskKey(apiKey)}` : "Connect an API key"}
      >
        {apiKey ? (
          <>
            <span className={styles.dot} aria-hidden="true" />
            Connected
          </>
        ) : (
          "Connect"
        )}
      </button>

      <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}>
        <form onSubmit={connect} className={styles.form}>
          <p className="eyebrow">Studio access</p>
          <h2 id={titleId} className={`display ${styles.title}`}>
            Connect an API key
          </h2>
          <p className={styles.lede}>
            KunoWorld doesn&apos;t have self-serve accounts or billing yet — those come later. For now you connect with an
            API key issued to you.
          </p>

          {apiKey && (
            <p className={styles.current}>
              Connected now with <code>{maskKey(apiKey)}</code>
            </p>
          )}

          <label className={styles.label} htmlFor={`${titleId}-key`}>
            API key
          </label>
          <div className={styles.inputRow}>
            <input
              ref={input}
              id={`${titleId}-key`}
              className={styles.input}
              type={reveal ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="kuno_…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button type="button" className="btn btn-small btn-quiet" onClick={() => setReveal((r) => !r)} aria-pressed={reveal}>
              {reveal ? "Hide" : "Show"}
            </button>
          </div>

          <ul className={styles.facts} role="list">
            <li>
              Saved only in this browser (localStorage) and sent only to <code>{API_BASE}</code> as a bearer token.
            </li>
            <li>Film keys are different: each film&apos;s key is made in this browser and never leaves it.</li>
          </ul>

          {isLocal && (
            <p className={styles.hint}>
              Running the local devkit? Your key is <code>KUNO_DEV_API_KEY</code> in <code>dev.env</code>.
            </p>
          )}

          {status.kind === "error" && (
            <p className={styles.error} role="alert">
              {status.message}
            </p>
          )}

          <div className={styles.buttons}>
            {apiKey && (
              <button type="button" className="btn btn-small btn-quiet" onClick={disconnect}>
                Disconnect
              </button>
            )}
            <span className={styles.spacer} />
            <button type="button" className="btn btn-small" onClick={() => dialog.current?.close()}>
              Cancel
            </button>
            {status.kind === "error" && status.offline ? (
              <button type="button" className="btn btn-small btn-primary" onClick={saveAnyway} disabled={!draft.trim()}>
                Save without checking
              </button>
            ) : (
              <button type="submit" className="btn btn-small btn-primary" disabled={!draft.trim() || status.kind === "checking"}>
                {status.kind === "checking" ? "Checking…" : "Check & connect"}
              </button>
            )}
          </div>
        </form>
      </dialog>
    </>
  );
}
