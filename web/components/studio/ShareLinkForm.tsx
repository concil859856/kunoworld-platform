"use client";

import type { JobHandle } from "@kunoworld/sdk";
import { Link2, Share2 } from "lucide-react";
import { useState } from "react";

import { ApiError, shareUrl, sharesApi } from "@/lib/keyvault-api";
import { isStandard, type LibraryEntry } from "@/lib/library";
import { PRIVATE_SHARE_WARNING, STANDARD_SHARE_WARNING } from "@/lib/privacy-copy";

import styles from "./KeySync.module.css";

/*
 * Makes a share link for one finished take. Links are off until made, and each can expire. A private take's link
 * carries its key after "#", which browsers never send, so KunoWorld still can't open the video, but anyone holding
 * the whole link can. The link is shown once; the account page lists and revokes links.
 */

const EXPIRY: Array<{ label: string; seconds: number | null }> = [
  { label: "Never", seconds: null },
  { label: "In 1 day", seconds: 86_400 },
  { label: "In 7 days", seconds: 7 * 86_400 },
  { label: "In 30 days", seconds: 30 * 86_400 },
];

export function ShareLinkForm({ entry }: { entry: LibraryEntry }) {
  const [open, setOpen] = useState(false);
  const [expiry, setExpiry] = useState("0");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const standard = isStandard(entry);

  if (!entry.handle || entry.step !== "ready") return null;
  const handle = entry.handle;

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    const seconds = EXPIRY[Number(expiry)]?.seconds ?? null;
    try {
      const made = await sharesApi.create(handle.jobId, seconds === null ? null : Math.floor(Date.now() / 1000) + seconds);
      setLink(shareUrl(made, standard ? undefined : (handle as JobHandle).outputKey));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't make a link. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!link) return;
    const done = () => setCopied(true);
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(done, () => window.prompt("Copy the share link:", link));
    else window.prompt("Copy the share link:", link);
  }

  if (!open) {
    return (
      <div className="result-actions">
        <button onClick={() => setOpen(true)}>
          <Share2 size={16} /> Share
        </button>
      </div>
    );
  }

  return (
    <section className={styles.panel} aria-label="Share this video">
      <p className={styles.warning}>{standard ? STANDARD_SHARE_WARNING : PRIVATE_SHARE_WARNING}</p>
      {!link ? (
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Link expires</span>
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY.map((option, i) => (
                <option key={option.label} value={String(i)}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={() => void create()}>
            <Link2 size={16} aria-hidden /> {busy ? "Making link…" : "Create link"}
          </button>
        </div>
      ) : (
        <>
          <label className={styles.field}>
            <span>Share link</span>
            <input readOnly value={link} className={styles.linkField} onFocus={(e) => e.currentTarget.select()} />
          </label>
          <div className={styles.row}>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className={styles.button} onClick={() => setLink(null)}>
              Make another link
            </button>
          </div>
          <p className={styles.fine}>
            This link is shown only now. See and revoke your links under Share links on{" "}
            <a className={styles.link} href="/account#share-links">
              your account page
            </a>
            .
          </p>
        </>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div className={styles.row}>
        <button
          type="button"
          className={styles.button}
          onClick={() => {
            setOpen(false);
            setLink(null);
            setError(null);
          }}
        >
          Close
        </button>
      </div>
    </section>
  );
}
