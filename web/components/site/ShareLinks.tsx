"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, sharesApi, type ShareLink } from "@/lib/keyvault-api";

import styles from "./Account.module.css";

/** The account page's "Share links" section: every link this account made, with its status and a way to revoke it. */

const STATUS: Record<ShareLink["status"], string> = {
  active: "Working",
  revoked: "Revoked",
  expired: "Expired",
  video_deleted: "Video deleted",
  video_removed: "Video removed",
  account_closed: "Account closed",
  unavailable: "Not available",
};

const date = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

export function ShareLinks() {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLinks(await sharesApi.list());
    } catch (err) {
      setLinks([]);
      setError(err instanceof ApiError && err.status !== 404 ? err.message : "Share links aren't available right now.");
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await load();
    })();
  }, [load]);

  async function revoke(link: ShareLink) {
    if (!window.confirm("Revoke this link? Anyone who has it won't be able to watch the video any more.")) return;
    setBusy(link.share_id);
    setError(null);
    try {
      await sharesApi.revoke(link.share_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't revoke the link. Try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="share-links" className={styles.section} aria-labelledby="share-links-title">
      <h2 id="share-links-title" className={styles.sectionTitle}>
        Share links
      </h2>
      <p className={styles.fine}>
        Only you can open your videos, unless you make a share link for one in the studio. Anyone with a link can watch that video
        until you revoke the link, it expires, or the video is deleted. A link is shown only when it&apos;s made; KunoWorld keeps a
        hash of it and a view count, and nothing about who watched.
      </p>
      {links === null ? (
        <p className={styles.fine} aria-live="polite">
          Loading your links…
        </p>
      ) : links.length === 0 ? (
        <p className={styles.fine}>No share links yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table} aria-label="Your share links">
            <thead>
              <tr>
                <th scope="col">Video</th>
                <th scope="col">Mode</th>
                <th scope="col">Created</th>
                <th scope="col">Expires</th>
                <th scope="col">Views</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.share_id} data-share-id={link.share_id} data-job-id={link.job_id} data-status={link.status}>
                  <td className={styles.mono}>{link.job_id.slice(0, 8)}</td>
                  <td>{link.privacy === "private" ? "Private" : "Standard"}</td>
                  <td>{date(link.created_at)}</td>
                  <td>{link.expires_at === null ? "Never" : date(link.expires_at)}</td>
                  <td>{link.view_count}</td>
                  <td>{STATUS[link.status] ?? link.status}</td>
                  <td>
                    {link.status === "active" && (
                      <button
                        type="button"
                        className="text-link"
                        disabled={busy === link.share_id}
                        aria-label={`Revoke the link to video ${link.job_id.slice(0, 8)}`}
                        onClick={() => void revoke(link)}
                      >
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
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
