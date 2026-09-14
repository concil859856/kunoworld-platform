"use client";

import { b64d, decryptBlob, sha256Hex, verifyReceipt, type Receipt } from "@kunoworld/sdk";
import { BadgeCheck, Eye, Flag, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";

import { CATALOG } from "@/lib/catalog";
import { PROXY_BASE } from "@/lib/config";

import styles from "./Share.module.css";

/*
 * Plays a video someone shared with a link.
 *
 * Standard: the video streams from KunoWorld through this site.
 * Private: the encrypted video comes through this site, and this page opens it with the key in the link's fragment
 * ("#k=..."), which the browser never sends anywhere. Before it plays, the page checks the download against the
 * enclave-signed receipt, the receipt's signature, and the decrypted video against the receipt's content digest.
 */

/** `GET /v1/shares/{token}`. */
export interface ShareDetails {
  privacy: "private" | "standard";
  profile_id: string;
  created_at: number;
  shared_at: number;
  expires_at: number | null;
  content_digest: string;
  receipt: Receipt | null;
  signing_public_key: string | null;
}

type View =
  | { kind: "opening" }
  | { kind: "ready"; url: string }
  | { kind: "missing_key" }
  | { kind: "bad_key" }
  | { kind: "wrong_key" }
  | { kind: "integrity" }
  | { kind: "gone" }
  | { kind: "failed"; message: string };

const MESSAGES: Record<Exclude<View["kind"], "opening" | "ready" | "failed">, string> = {
  missing_key:
    "This private video's link is missing its key. The key is the part of the link after “#”. Ask the person who shared it to send the whole link.",
  bad_key: "The key in this link is incomplete. Check that you copied the whole link, including everything after “#”.",
  wrong_key: "The key in this link doesn't open this video. Check that you copied the whole link, or ask for it again.",
  integrity: "This video didn't match its signed receipt, so it isn't shown.",
  gone: "This link no longer works.",
};

const date = (ts: number) =>
  new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(ts * 1000) + " UTC";

function receiptSigned(details: ShareDetails): boolean {
  if (!details.receipt || !details.signing_public_key) return false;
  try {
    return verifyReceipt(details.receipt, b64d(details.signing_public_key));
  } catch {
    return false;
  }
}

async function openPrivate(token: string, details: ShareDetails, fragment: string): Promise<View> {
  const raw = new URLSearchParams(fragment.replace(/^#/, "")).get("k");
  if (!raw) return { kind: "missing_key" };
  let key: Uint8Array;
  try {
    key = b64d(raw);
  } catch {
    return { kind: "bad_key" };
  }
  if (!/^[A-Za-z0-9_-]{43}$/.test(raw) || key.length !== 32) return { kind: "bad_key" };

  let sealed: Uint8Array;
  try {
    const response = await fetch(`${PROXY_BASE}/v1/shares/${encodeURIComponent(token)}/video`, { cache: "no-store" });
    if (response.status === 404 || response.status === 410) return { kind: "gone" };
    if (response.status === 429) return { kind: "failed", message: "Too many requests from your network. Try again in a minute." };
    if (!response.ok) return { kind: "failed", message: "The video couldn't be downloaded. Try again." };
    sealed = new Uint8Array(await response.arrayBuffer());
  } catch {
    return { kind: "failed", message: "The video couldn't be downloaded. Try again." };
  }

  const receipt = details.receipt;
  if (!receipt || (await sha256Hex(sealed)) !== receipt.body.output_digest || !receiptSigned(details)) return { kind: "integrity" };
  let video: Uint8Array;
  try {
    video = decryptBlob(key, `${receipt.body.job_id}/output/video`, sealed);
  } catch {
    return { kind: "wrong_key" };
  }
  if ((await sha256Hex(video)) !== details.content_digest) return { kind: "integrity" };
  return { kind: "ready", url: URL.createObjectURL(new Blob([new Uint8Array(video)], { type: "video/mp4" })) };
}

export function SharedVideo({ token, details }: { token: string; details: ShareDetails }) {
  const standard = details.privacy === "standard";
  const [view, setView] = useState<View>(standard ? { kind: "ready", url: `${PROXY_BASE}/v1/shares/${encodeURIComponent(token)}/video` } : { kind: "opening" });
  const [signed, setSigned] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    void (async () => {
      await Promise.resolve();
      if (!alive) return;
      setSigned(receiptSigned(details));
      if (standard) return;
      const next = await openPrivate(token, details, window.location.hash);
      if (next.kind === "ready") objectUrl = next.url;
      if (alive) setView(next);
      else if (objectUrl) URL.revokeObjectURL(objectUrl);
    })();
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, details, standard]);

  const video = details.receipt?.body.video;
  const aspect = video && video.width > 0 && video.height > 0 ? `${video.width} / ${video.height}` : "16 / 9";
  const model = CATALOG.find((p) => p.id === details.profile_id)?.name ?? details.profile_id;

  return (
    <div className={styles.player} data-share-privacy={details.privacy} data-share-view={view.kind}>
      <div className={styles.frame} style={{ "--aspect": aspect } as React.CSSProperties}>
        {view.kind === "ready" ? (
          <video
            className={styles.video}
            controls
            playsInline
            preload="metadata"
            src={view.url}
            aria-label="Shared video"
            onError={() => standard && setView({ kind: "failed", message: "This video couldn't be played. The link may no longer work." })}
          />
        ) : (
          <p className={styles.message} role={view.kind === "opening" ? "status" : "alert"}>
            {view.kind === "opening" ? "Opening the video in your browser…" : view.kind === "failed" ? view.message : MESSAGES[view.kind]}
          </p>
        )}
      </div>

      <p className={styles.badge}>
        {standard ? <Eye size={16} aria-hidden /> : <LockKeyhole size={16} aria-hidden />}
        <span>
          {standard
            ? "Standard video: KunoWorld serves it to anyone with this link."
            : "Private video: decrypted here in your browser with the key in this link. KunoWorld can't see it."}
        </span>
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>Model</dt>
          <dd>{model}</dd>
        </div>
        <div>
          <dt>Made</dt>
          <dd>{date(details.created_at)}</dd>
        </div>
        <div>
          <dt>Shared</dt>
          <dd>{date(details.shared_at)}</dd>
        </div>
        {details.expires_at !== null && (
          <div>
            <dt>Link expires</dt>
            <dd>{date(details.expires_at)}</dd>
          </div>
        )}
        <div>
          <dt>Receipt</dt>
          <dd>{signed === null ? "Checking…" : signed ? "Signed by the attested GPU enclave" : "Couldn't be verified"}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <a className="text-link" href={`/verify?sha256=${details.content_digest}`}>
          <BadgeCheck size={15} aria-hidden /> Check its certificate
        </a>
        <a className="text-link" href={`/report?digest=${details.content_digest}`}>
          <Flag size={15} aria-hidden /> Report this video
        </a>
      </div>

      <p className={styles.note}>
        Someone shared this video with a link. Only its owner can open it otherwise, and they can revoke the link at any time.
        KunoWorld counts views of shared links but doesn&apos;t record who watched.
      </p>
    </div>
  );
}
