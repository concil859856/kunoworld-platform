"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { accountError } from "@/lib/errors";

import styles from "./Account.module.css";

export interface WalletRow {
  address: string;
  linked_at: number;
}

interface Challenge {
  challenge_id: string;
  message: string;
  expires_at: number;
  address: string;
}

type ErrorBody = { code?: string; message?: string } | null;

const when = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

const clock = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

/** Single-quoted for a POSIX shell: the message spans lines, and btcli must sign it byte for byte. */
const shellQuote = (text: string) => `'${text.replaceAll("'", `'\\''`)}'`;

async function post<T>(path: string, payload: unknown): Promise<{ ok: boolean; body: (T & ErrorBody) | null }> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  const body = (await response?.json().catch(() => null)) as (T & ErrorBody) | null;
  return { ok: Boolean(response?.ok), body };
}

/**
 * TAO and alpha go to one treasury address and a transfer carries no memo, so a deposit is matched
 * to an account by the coldkey that sent it. Linking proves the coldkey is yours: it signs a
 * one-time message naming this account, in a browser wallet or with btcli.
 */
export function WalletLinker({ initialWallets }: { initialWallets: WalletRow[] }) {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState<"" | "challenge" | "extension" | "verify">("");
  const [copied, setCopied] = useState(false);
  const [linked, setLinked] = useState("");
  const [error, setError] = useState("");

  async function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const coldkey = address.trim();
    setBusy("challenge");
    setError("");
    setLinked("");
    const { ok, body } = await post<Omit<Challenge, "address">>("/auth/wallets/challenge", { address: coldkey });
    setBusy("");
    if (!ok || !body?.challenge_id) {
      setError(accountError(body, "Couldn't start linking the coldkey. Try again."));
      return;
    }
    setChallenge({ challenge_id: body.challenge_id, message: body.message, expires_at: body.expires_at, address: coldkey });
    setSignature("");
    setCopied(false);
  }

  async function verify(signed: string) {
    if (!challenge) return;
    setBusy("verify");
    setError("");
    const { ok, body } = await post<WalletRow>("/auth/wallets/verify", {
      challenge_id: challenge.challenge_id,
      signature: signed.trim(),
    });
    setBusy("");
    if (!ok) {
      setError(accountError(body, "Couldn't link the coldkey. Try again."));
      return;
    }
    setLinked(`Linked ${challenge.address}.`);
    setChallenge(null);
    setAddress("");
    setSignature("");
    router.refresh();
  }

  async function signWithExtension() {
    if (!challenge) return;
    setBusy("extension");
    setError("");
    let signed: string;
    try {
      // Loaded on demand: the extension bridge is large, and it only works in a browser.
      const [{ web3Accounts, web3Enable, web3FromAddress }, { stringToHex }] = await Promise.all([
        import("@polkadot/extension-dapp"),
        import("@polkadot/util"),
      ]);
      const extensions = await web3Enable("KunoWorld");
      if (extensions.length === 0) {
        throw new Error("No wallet extension answered. Install Polkadot.js, Talisman or SubWallet and allow KunoWorld, or sign with btcli.");
      }
      const accounts = await web3Accounts({ ss58Format: 42 });
      if (!accounts.some((account) => account.address === challenge.address)) {
        throw new Error("Your wallet extension doesn't hold this coldkey. Add it there, or sign with btcli.");
      }
      const injector = await web3FromAddress(challenge.address);
      if (!injector.signer.signRaw) throw new Error("This wallet extension can't sign messages. Sign with btcli instead.");
      ({ signature: signed } = await injector.signer.signRaw({
        address: challenge.address,
        data: stringToHex(challenge.message),
        type: "bytes",
      }));
    } catch (err) {
      setBusy("");
      setError(err instanceof Error ? err.message : "The wallet extension didn't sign the message.");
      return;
    }
    await verify(signed);
  }

  async function unlink(row: WalletRow) {
    if (!window.confirm(`Unlink ${row.address}? Deposits from it will no longer be credited to this account.`)) return;
    setError("");
    setLinked("");
    const response = await fetch(`/auth/wallets/${encodeURIComponent(row.address)}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setError("Couldn't unlink the coldkey. Try again.");
      return;
    }
    router.refresh();
  }

  const command = challenge ? `btcli wallet sign --message ${shellQuote(challenge.message)}` : "";

  return (
    <div className={styles.stack}>
      {initialWallets.length === 0 ? (
        <p className={styles.fine}>No coldkeys linked yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Coldkey</th>
                <th scope="col">Linked</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {initialWallets.map((row) => (
                <tr key={row.address}>
                  <td className={styles.mono}>{row.address}</td>
                  <td>{when(row.linked_at)}</td>
                  <td>
                    <button type="button" className="text-link" onClick={() => void unlink(row)}>
                      Unlink
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {linked && (
        <p role="status" className={styles.success}>
          {linked}
        </p>
      )}

      {!challenge ? (
        <form className={styles.inline} onSubmit={start}>
          <label className={styles.field}>
            <span>Coldkey address</span>
            <input
              value={address}
              required
              spellCheck={false}
              autoComplete="off"
              placeholder="5F…"
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
          <button type="submit" className="ocean-button button-dark" disabled={busy !== ""}>
            {busy === "challenge" ? "Preparing…" : "Link coldkey"}
          </button>
        </form>
      ) : (
        <div className={`${styles.panel} ${styles.wide}`}>
          <h3 className={styles.panelTitle}>Sign to prove this coldkey is yours</h3>
          <p className={`${styles.mono} ${styles.address}`}>{challenge.address}</p>
          <p className={styles.fine}>
            The message names your account and expires at {clock(challenge.expires_at)}. Signing it moves no funds.
          </p>
          <pre className={styles.message} aria-label="Message to sign">
            {challenge.message}
          </pre>

          <div className={styles.option}>
            <h4 className={styles.optionTitle}>With a browser wallet</h4>
            <p className={styles.fine}>Polkadot.js, Talisman or SubWallet, holding this coldkey.</p>
            <div>
              <button
                type="button"
                className="ocean-button button-dark"
                disabled={busy !== ""}
                onClick={() => void signWithExtension()}
              >
                {busy === "extension" ? "Waiting for your wallet…" : "Sign with browser extension"}
              </button>
            </div>
          </div>

          <form
            className={styles.option}
            onSubmit={(event) => {
              event.preventDefault();
              void verify(signature);
            }}
          >
            <h4 className={styles.optionTitle}>Or with btcli</h4>
            <p className={styles.fine}>Run this on the machine that holds the coldkey, then paste the signature it prints.</p>
            <pre className={styles.message} aria-label="btcli command">
              {command}
            </pre>
            <div>
              <button
                type="button"
                className="text-link"
                onClick={() => void navigator.clipboard?.writeText(command).then(() => setCopied(true))}
              >
                {copied ? "Copied" : "Copy command"}
              </button>
            </div>
            <label className={styles.field}>
              <span>Signature</span>
              <input
                value={signature}
                required
                spellCheck={false}
                autoComplete="off"
                placeholder="0x…"
                onChange={(e) => setSignature(e.target.value)}
              />
            </label>
            <div className={styles.actions}>
              <button type="submit" className="ocean-button button-light" disabled={busy !== "" || !signature.trim()}>
                {busy === "verify" ? "Checking…" : "Verify and link"}
              </button>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setChallenge(null);
                  setError("");
                }}
              >
                Start over
              </button>
            </div>
          </form>
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
