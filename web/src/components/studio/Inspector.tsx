"use client";

import type { ModelProfile } from "@kunoworld/sdk";
import Link from "next/link";
import { useEffect, useId, useState, type RefObject } from "react";

import { CertificateView } from "@/components/verify/CertificateView";
import { useCertificate } from "@/components/verify/useCertificate";
import { isH3 } from "@/lib/catalog";
import { clockTime, relativeDay, usd } from "@/lib/format";
import { isActive, type LibraryEntry } from "@/lib/library";
import { ratioValue } from "@/lib/media";
import { fallbackNotice, frameSize } from "@/lib/shot";
import { MODE_LABEL } from "@/lib/validation";

import { stockLabel } from "./Feed";
import styles from "./Inspector.module.css";
import { Steps } from "./Steps";
import type { FilmState } from "./Studio";

type Tab = "take" | "certificate";

const ROLE_SHORT: Record<string, string> = {
  first_frame: "First frame",
  last_frame: "Last frame",
  keyframe: "Keyframe",
  reference_image: "Image",
  reference_video: "Clip",
  reference_audio: "Audio",
  source_video: "Source video",
  source_audio: "Soundtrack",
};

export function Inspector({
  entry,
  film,
  profiles,
  onClose,
  onCancel,
  onRemove,
  onReuse,
  onUseLastFrame,
  onCopyLink,
  onOpenFilm,
  titleRef,
}: {
  entry: LibraryEntry | null;
  film: FilmState | undefined;
  profiles: ModelProfile[];
  onClose: () => void;
  onCancel: (e: LibraryEntry) => void;
  onRemove: (e: LibraryEntry) => void;
  onReuse: (e: LibraryEntry) => void;
  onUseLastFrame: (e: LibraryEntry) => void;
  onCopyLink: (e: LibraryEntry) => void;
  onOpenFilm: (e: LibraryEntry) => void;
  /** Focus lands here when a take is opened, so the keyboard follows the selection. */
  titleRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const [tab, setTab] = useState<Tab>("take");
  const ids = useId();

  if (!entry) {
    return (
      <div className={styles.inspector}>
        <div className={styles.blank}>
          <p className={styles.blankTitle}>Nothing selected</p>
          <p>Pick a take to play it, see its settings, reuse them, or read its certificate.</p>
        </div>
      </div>
    );
  }

  const profile = profiles.find((p) => p.id === entry.profileId);
  const requested = profiles.find((p) => p.id === entry.requestedProfileId);
  const notice = fallbackNotice(entry.fallbackReason, requested, profile);
  const ready = entry.step === "ready";
  const failed = entry.step === "failed" || entry.step === "canceled";
  const size = profile ? frameSize(profile, entry.settings.resolution, entry.settings.aspectRatio) : null;

  return (
    <div className={styles.inspector}>
      <header className={styles.head}>
        <div className={styles.titleRow}>
          <h2 className={styles.title} ref={titleRef} tabIndex={-1}>
            {stockLabel(profile, entry.profileId)}
          </h2>
          <button type="button" className={`btn btn-small btn-quiet ${styles.close}`} onClick={onClose}>
            Close
          </button>
        </div>
        {profile && isH3(profile) && <p className={styles.attribution}>Made with MiniMax H3</p>}
        <div className={styles.tabs} role="tablist" aria-label="Inspector">
          {(["take", "certificate"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${ids}-${t}-tab`}
              aria-controls={`${ids}-${t}`}
              aria-selected={tab === t}
              tabIndex={tab === t ? 0 : -1}
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                  const next = t === "take" ? "certificate" : "take";
                  setTab(next);
                  document.getElementById(`${ids}-${next}-tab`)?.focus();
                }
              }}
            >
              {t === "take" ? "Take" : "Certificate"}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.body}>
        {tab === "take" ? (
          <div role="tabpanel" id={`${ids}-take`} aria-labelledby={`${ids}-take-tab`} className={styles.panel}>
            <Player entry={entry} film={film} onOpenFilm={onOpenFilm} />

            {notice && <p className={styles.notice}>{notice}</p>}

            {isActive(entry) && (
              <div className={styles.steps}>
                <Steps entry={entry} variant="list" />
              </div>
            )}

            {failed && entry.error && (
              <div className={styles.error} role="alert">
                <strong>{entry.error.title}</strong>
                {entry.error.detail && <span>{entry.error.detail}</span>}
                <span className={styles.charge}>
                  {entry.handle ? `Refunded ${usd(entry.price)} automatically.` : "Nothing was charged."}
                </span>
              </div>
            )}

            <div className={styles.actions}>
              {ready && film?.url && (
                <a className="btn btn-small btn-primary" href={film.url} download={`kunoworld-${entry.id.slice(0, 8)}.mp4`}>
                  Download
                </a>
              )}
              {ready && entry.receipt && (
                <button type="button" className="btn btn-small" onClick={() => onCopyLink(entry)}>
                  Copy certificate link
                </button>
              )}
              {ready && film?.url && (
                <button type="button" className="btn btn-small" onClick={() => onUseLastFrame(entry)}>
                  Use last frame
                </button>
              )}
              <button type="button" className="btn btn-small" onClick={() => onReuse(entry)}>
                Reuse settings
              </button>
              {isActive(entry) && entry.handle && (
                <button type="button" className="btn btn-small btn-quiet" onClick={() => onCancel(entry)}>
                  Cancel
                </button>
              )}
              {!isActive(entry) && (
                <button type="button" className="btn btn-small btn-quiet" onClick={() => onRemove(entry)}>
                  Remove
                </button>
              )}
            </div>

            <section className={styles.prompt} aria-label="Prompt">
              <p className="eyebrow">Prompt</p>
              <p>{entry.prompt}</p>
            </section>

            <dl className={styles.details}>
              <div>
                <dt>Stock</dt>
                <dd>
                  {stockLabel(profile, entry.profileId)}
                  {entry.fallbackReason && requested && <span className={styles.sub}> · asked for {requested.name}</span>}
                </dd>
              </div>
              <div>
                <dt>Shot</dt>
                <dd>{MODE_LABEL[entry.mode]}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>
                  {entry.settings.resolution} · {entry.settings.aspectRatio}
                  {size ? ` · ${size[0]}×${size[1]}` : ""} · {entry.settings.fps} fps
                </dd>
              </div>
              <div>
                <dt>Length</dt>
                <dd>
                  {entry.settings.durationS} s · {entry.settings.audio ? "with audio" : "silent"}
                </dd>
              </div>
              {entry.settings.seed && (
                <div>
                  <dt>Seed</dt>
                  <dd className="mono">{entry.settings.seed}</dd>
                </div>
              )}
              {entry.inputs.length > 0 && (
                <div>
                  <dt>Inputs</dt>
                  <dd>
                    <ul role="list" className={styles.inputs}>
                      {entry.inputs.map((i, n) => (
                        <li key={`${i.role}-${n}`}>
                          {ROLE_SHORT[i.role] ?? i.role}
                          {i.timeS !== undefined ? ` @ ${i.timeS} s` : ""}
                          {i.startS !== undefined ? ` ${i.startS}–${i.endS} s` : ""} · <span className={styles.sub}>{i.name}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              <div>
                <dt>Price</dt>
                <dd>{failed ? (entry.handle ? `${usd(entry.price)} — refunded` : "Not charged") : usd(entry.price)}</dd>
              </div>
              <div>
                <dt>Made</dt>
                <dd>
                  {relativeDay(entry.createdAt)}, {clockTime(entry.createdAt)}
                </dd>
              </div>
              {entry.handle && (
                <div>
                  <dt>Job</dt>
                  <dd className="mono">{entry.id}</dd>
                </div>
              )}
            </dl>

            <p className={styles.privacy}>
              Decrypted in this browser with a key that never left it. Neither the stage&apos;s owner nor KunoWorld can
              open this film.
            </p>
          </div>
        ) : (
          <div role="tabpanel" id={`${ids}-certificate`} aria-labelledby={`${ids}-certificate-tab`} className={styles.panel}>
            {entry.receipt ? (
              <CertificatePanel key={entry.id} digest={entry.receipt.body.content_digest} onCopy={() => onCopyLink(entry)} />
            ) : (
              <p className={styles.muted}>
                {failed ? "No certificate — this take didn't finish." : "The certificate is signed when the stage seals the film."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Player({ entry, film, onOpenFilm }: { entry: LibraryEntry; film: FilmState | undefined; onOpenFilm: (e: LibraryEntry) => void }) {
  const [unplayable, setUnplayable] = useState(false);
  const ready = entry.step === "ready";

  useEffect(() => {
    if (ready && !film) onOpenFilm(entry);
  }, [ready, film, entry, onOpenFilm]);

  return (
    <div className={styles.player} style={{ aspectRatio: String(ratioValue(entry.settings.aspectRatio)) }}>
      {ready && film?.url && !unplayable && (
        <video key={film.url} className={styles.video} src={film.url} controls playsInline preload="metadata" onError={() => setUnplayable(true)} />
      )}
      {ready && film?.url && unplayable && (
        <p className={styles.playerNote}>This browser can&apos;t play the film&apos;s codec (H.264). Download it to watch.</p>
      )}
      {ready && !film?.url && (
        <p className={styles.playerNote}>
          {film?.error ? (
            <>
              <strong>{film.error.title}</strong>
              <br />
              {film.error.detail}
            </>
          ) : (
            "Downloading the sealed film and decrypting it here…"
          )}
        </p>
      )}
      {!ready && <div className={styles.playerDark} aria-hidden="true" />}
    </div>
  );
}

function CertificatePanel({ digest, onCopy }: { digest: string; onCopy: () => void }) {
  const { state, checkDigest } = useCertificate();

  useEffect(() => {
    void checkDigest(digest);
  }, [digest, checkDigest]);

  return (
    <div className={styles.certificate}>
      {(state.kind === "looking" || state.kind === "idle") && <p className={styles.muted}>Reading the certificate…</p>}
      {state.kind === "found" && <CertificateView prov={state.prov} checks={state.checks} variant="compact" />}
      {state.kind === "missing" && <p className={styles.muted}>The gateway has no certificate for this film&apos;s hash.</p>}
      {state.kind === "error" && (
        <p className={styles.muted}>
          {state.error.title}. {state.error.detail}
        </p>
      )}
      <div className={styles.actions}>
        <button type="button" className="btn btn-small" onClick={onCopy}>
          Copy certificate link
        </button>
        <Link className="btn btn-small btn-quiet" href={`/verify?sha256=${digest}`} target="_blank">
          Open on the verify page
        </Link>
      </div>
      <p className={styles.privacy}>
        The certificate is public by the film&apos;s hash. It names the model and the sealed hardware — never your prompt or
        inputs.
      </p>
    </div>
  );
}
