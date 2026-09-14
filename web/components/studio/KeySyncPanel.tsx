"use client";

import { KeyRound } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { generateRecoveryCode, passkeysAvailable } from "@/lib/keyvault";
import type { KeySync } from "@/lib/useKeySync";

import styles from "./KeySync.module.css";

/*
 * Key sync, in the studio's library and in "Keys & recovery" on the account page.
 *
 * Setting up shows a recovery code once and won't continue until the person says they saved it and types its last
 * four characters. A passkey is offered afterwards, where the browser has passkeys. On a new device, the same panel
 * unlocks with the code or a passkey.
 */

const noEvents = () => () => {};

const day = (ts?: number) =>
  ts ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(ts * 1000) : "";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function download(code: string): void {
  const text = `KunoWorld recovery code\n\n${code}\n\nIt unlocks your private video keys on a new device. Keep it somewhere safe and private.\nKunoWorld doesn't keep a copy and can't recover it.\n`;
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "kunoworld-recovery-code.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function RecoveryCodeStep({
  code,
  heading,
  note,
  action,
  busy,
  onConfirm,
  onCancel,
}: {
  code: string;
  heading: string;
  note: string;
  action: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [lastFour, setLastFour] = useState("");
  const [copied, setCopied] = useState(false);
  const matches = lastFour.trim().toUpperCase() === code.slice(-4);
  return (
    <div className={styles.panel}>
      <h3 className={styles.title}>{heading}</h3>
      <p className={styles.text}>{note}</p>
      <output className={styles.code} aria-label="Your recovery code">
        {code}
      </output>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => undefined)}
        >
          {copied ? "Copied" : "Copy code"}
        </button>
        <button type="button" className={styles.button} onClick={() => download(code)}>
          Download as a text file
        </button>
      </div>
      <label className={styles.check}>
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span>I saved my recovery code somewhere safe</span>
      </label>
      <label className={styles.field}>
        <span>Type its last four characters to confirm</span>
        <input
          value={lastFour}
          maxLength={4}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(e) => setLastFour(e.target.value)}
        />
      </label>
      <div className={styles.row}>
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={!saved || !matches || busy} onClick={onConfirm}>
          {action}
        </button>
        <button type="button" className={styles.button} disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function KeySyncPanel({
  sync,
  hasPrivateTakes = false,
  variant = "studio",
}: {
  sync: KeySync;
  hasPrivateTakes?: boolean;
  variant?: "studio" | "account";
}) {
  const [code, setCode] = useState<string | null>(null);
  const [flow, setFlow] = useState<"setup" | "rotate" | null>(null);
  const [offerPasskey, setOfferPasskey] = useState(false);
  const [entered, setEntered] = useState("");
  const [passkeyLabel, setPasskeyLabel] = useState("");
  const canPasskey = useSyncExternalStore(noEvents, passkeysAvailable, () => false);

  const { status, vault, busy, error } = sync;
  const working = busy !== null;
  const account = variant === "account";
  const Heading = account ? "h3" : "h2";
  const titleId = `key-sync-title-${variant}`;

  if (status === "signed_out") return null;

  const footer = (
    <>
      {busy && (
        <p role="status" className={styles.status}>
          {busy}
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </>
  );

  const wrap = (children: React.ReactNode, label = "Key sync") => (
    <section className={account ? styles.panel : `info-banner key-sync ${styles.panel}`} aria-label={label} data-key-sync={status}>
      {children}
      {footer}
    </section>
  );

  if (code && flow) {
    return wrap(
      <RecoveryCodeStep
        code={code}
        heading={flow === "setup" ? "Save your recovery code" : "Save your new recovery code"}
        note={
          flow === "setup"
            ? "This code unlocks your private video keys on any device you sign in on. It's shown only now. KunoWorld doesn't keep a copy and can't recover it: without it, a passkey or a browser that's already unlocked, your private videos can't be opened on a new device."
            : "Rotating makes a new master key and this new recovery code, and re-encrypts every synced key in this browser. Your old recovery code and every passkey stop working, and other browsers will need this new code. You can add passkeys again afterwards."
        }
        action={flow === "setup" ? "Turn on key sync" : "Rotate keys"}
        busy={working}
        onConfirm={() => {
          const current = flow;
          void (current === "setup" ? sync.setUp(code) : sync.rotate(code)).then((ok) => {
            if (!ok) return;
            setCode(null);
            setFlow(null);
            if (canPasskey) setOfferPasskey(true);
          });
        }}
        onCancel={() => {
          setCode(null);
          setFlow(null);
        }}
      />,
    );
  }

  if (status === "loading") {
    return wrap(
      <p className={styles.status} aria-live="polite">
        Checking key sync…
      </p>,
    );
  }

  if (status === "unavailable") {
    return wrap(<p className={styles.fine}>Key sync isn&apos;t available right now. Your keys in this browser still work, and backups still do.</p>);
  }

  const startSetup = () => {
    sync.setError(null);
    setCode(generateRecoveryCode());
    setFlow("setup");
  };

  const unlockers = account && vault && (
    <ul className={styles.list} aria-label="Ways to unlock your keys">
      {vault.unlockers.map((u) => (
        <li key={u.unlocker_id}>
          <span>
            <strong>{u.kind === "passkey" ? u.label || "Passkey" : "Recovery code"}</strong>
            {u.created_at ? ` · added ${day(u.created_at)}` : ""}
          </span>
          <button
            type="button"
            className={styles.button}
            aria-label={`Remove ${u.kind === "passkey" ? u.label || "passkey" : "recovery code"}`}
            disabled={working || vault.unlockers.length <= 1}
            title={vault.unlockers.length <= 1 ? "Keep at least one way to unlock your keys." : undefined}
            onClick={() => {
              if (window.confirm("Remove this way of unlocking your keys? Devices can't use it to unlock any more.")) void sync.removeUnlocker(u.unlocker_id);
            }}
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );

  const turnOff = account && (
    <button
      type="button"
      className={`${styles.button} ${styles.danger}`}
      disabled={working}
      onClick={() => {
        if (
          window.confirm(
            "Turn off key sync? KunoWorld deletes your synced keys (they're encrypted, so nobody could read them anyway). Keys already in a browser stay there, but other devices can't unlock them any more. Back up your keys first if a device doesn't have them.",
          )
        ) {
          void sync.turnOff();
        }
      }}
    >
      Turn off key sync
    </button>
  );

  if (status === "off") {
    const prompting = !account && hasPrivateTakes && !sync.dismissed;
    return wrap(
      <>
        <Heading id={titleId} className={styles.title}>
          <KeyRound size={18} aria-hidden /> {prompting ? "Keep your private video keys on all your devices" : "Key sync is off"}
        </Heading>
        <p className={styles.text}>
          {prompting
            ? "Your private video keys are only in this browser. Turn on key sync to store them encrypted with a recovery code only you hold, so you can open your private videos on any device you sign in on. KunoWorld can't read them."
            : "Key sync stores your private video keys encrypted with a recovery code only you hold, so you can open your private videos on other devices. KunoWorld can't read them."}
        </p>
        <div className={styles.row}>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={startSetup}>
            Set up key sync
          </button>
          {prompting && (
            <button type="button" className={styles.button} onClick={sync.dismiss}>
              Not now
            </button>
          )}
        </div>
      </>,
      prompting ? "Set up key sync" : "Key sync",
    );
  }

  if (status === "locked") {
    return wrap(
      <>
        <Heading id={titleId} className={styles.title}>
          <KeyRound size={18} aria-hidden /> Unlock your private video keys
        </Heading>
        <p className={styles.text}>
          Key sync is on for this account. Enter your recovery code{sync.hasPasskey && canPasskey ? " or use your passkey" : ""} to open your
          private videos in this browser.
        </p>
        <form
          className={styles.row}
          onSubmit={(e) => {
            e.preventDefault();
            void sync.unlockWithCode(entered).then((ok) => ok && setEntered(""));
          }}
        >
          <label className={styles.field}>
            <span>Recovery code</span>
            <input
              value={entered}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
              onChange={(e) => setEntered(e.target.value)}
            />
          </label>
          <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={working || !entered.trim()}>
            Unlock
          </button>
          {sync.hasPasskey && canPasskey && (
            <button type="button" className={styles.button} disabled={working} onClick={() => void sync.unlockWithPasskey()}>
              Use a passkey
            </button>
          )}
        </form>
        {unlockers}
        {account && <div className={styles.row}>{turnOff}</div>}
      </>,
    );
  }

  // unlocked
  const count = vault?.jobKeyCount ?? 0;
  return wrap(
    <>
      <Heading id={titleId} className={styles.title}>
        <KeyRound size={18} aria-hidden /> Key sync is on
      </Heading>
      {offerPasskey ? (
        <>
          <p className={styles.text}>
            Add a passkey too? It unlocks your keys with this device&apos;s fingerprint, face or screen lock. Your recovery code keeps
            working.
          </p>
          <div className={styles.row}>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              disabled={working}
              onClick={() => void sync.addPasskey().then((ok) => ok && setOfferPasskey(false))}
            >
              Add a passkey
            </button>
            <button type="button" className={styles.button} disabled={working} onClick={() => setOfferPasskey(false)}>
              Done
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.text}>
            {plural(count, "private video key")} synced. They&apos;re encrypted in this browser before they&apos;re stored, so KunoWorld
            can&apos;t read them. New private takes sync automatically.
          </p>
          {unlockers}
          {account && canPasskey && (
            <div className={styles.row}>
              <label className={styles.field}>
                <span>Passkey name (optional)</span>
                <input value={passkeyLabel} maxLength={64} placeholder="e.g. Work laptop" onChange={(e) => setPasskeyLabel(e.target.value)} />
              </label>
            </div>
          )}
          <div className={styles.row}>
            {canPasskey && (
              <button
                type="button"
                className={styles.button}
                disabled={working}
                onClick={() => void sync.addPasskey(passkeyLabel.trim()).then((ok) => ok && setPasskeyLabel(""))}
              >
                Add a passkey
              </button>
            )}
            <button type="button" className={styles.button} disabled={working} onClick={sync.lock}>
              Lock this browser
            </button>
            {account && (
              <button
                type="button"
                className={styles.button}
                disabled={working}
                onClick={() => {
                  sync.setError(null);
                  setCode(generateRecoveryCode());
                  setFlow("rotate");
                }}
              >
                Rotate keys
              </button>
            )}
            {turnOff}
            {!account && (
              <a className={styles.link} href="/account#keys-and-recovery">
                Manage keys &amp; recovery
              </a>
            )}
          </div>
        </>
      )}
    </>,
  );
}
