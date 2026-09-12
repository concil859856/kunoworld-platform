"use client";

import type { ModelProfile } from "@kunoworld/sdk";
import { useEffect, useMemo, useRef, useState } from "react";

import { openConnect } from "@/components/site/ConnectDialog";
import { isH3, variantLabel } from "@/lib/catalog";
import { clockTime, relativeDay, usd } from "@/lib/format";
import { isActive, type LibraryEntry } from "@/lib/library";
import { ratioValue } from "@/lib/media";
import { fallbackNotice } from "@/lib/shot";

import styles from "./Feed.module.css";
import type { FilmState } from "./Studio";
import { Steps } from "./Steps";

const SUGGESTIONS = [
  "A lighthouse keeper lights the lamp at dusk, the beam sweeping across a restless sea",
  "Rain on a tram window at night; a woman reads a letter and smiles, neon smearing in the glass",
  "Slow dolly through a darkroom as a print develops in the tray under a red safelight",
];

export function stockLabel(profile: ModelProfile | undefined, fallbackId: string): string {
  if (!profile) return fallbackId;
  return isH3(profile) ? profile.name : `LTX-2.5 ${variantLabel(profile)}`;
}

export function Feed({
  entries,
  films,
  profiles,
  selectedId,
  connected,
  onSelect,
  onNeedFilm,
  onSuggest,
}: {
  entries: LibraryEntry[];
  films: Record<string, FilmState>;
  profiles: ModelProfile[];
  selectedId: string | null;
  connected: boolean;
  onSelect: (id: string) => void;
  onNeedFilm: (entry: LibraryEntry) => void;
  onSuggest: (text: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const count = entries.length;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const groups = useMemo(() => {
    const out: Array<{ day: string; items: LibraryEntry[] }> = [];
    for (const e of entries) {
      const day = relativeDay(e.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className={styles.feed} ref={scroller}>
        <div className={styles.empty}>
          <p className={`display ${styles.emptyTitle}`}>
            The tray is <em>empty.</em>
          </p>
          <p className={styles.emptyText}>
            Describe a shot below. Your prompt and any frames are encrypted in this browser before they leave it; the
            finished film is opened here too.
          </p>
          {!connected && (
            <button type="button" className="btn btn-primary btn-small" onClick={openConnect}>
              Connect an API key to generate
            </button>
          )}
          <ul className={styles.suggestions} role="list" aria-label="Prompt ideas">
            {SUGGESTIONS.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => onSuggest(s)}>
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.feed} ref={scroller}>
      {groups.map((g) => (
        <section key={g.day} className={styles.group} aria-label={g.day}>
          <h2 className={styles.day}>{g.day}</h2>
          <ul className={styles.grid} role="list">
            {g.items.map((e) => (
              <ResultCard
                key={e.id}
                entry={e}
                film={films[e.id]}
                profile={profiles.find((p) => p.id === e.profileId)}
                requested={profiles.find((p) => p.id === e.requestedProfileId)}
                selected={e.id === selectedId}
                onSelect={onSelect}
                onNeedFilm={onNeedFilm}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ResultCard({
  entry,
  film,
  profile,
  requested,
  selected,
  onSelect,
  onNeedFilm,
}: {
  entry: LibraryEntry;
  film: FilmState | undefined;
  profile: ModelProfile | undefined;
  requested: ModelProfile | undefined;
  selected: boolean;
  onSelect: (id: string) => void;
  onNeedFilm: (entry: LibraryEntry) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [unplayable, setUnplayable] = useState(false);
  const ready = entry.step === "ready";
  const needsFilm = ready && !film;

  useEffect(() => {
    const el = ref.current;
    if (!el || !needsFilm) return;
    const io = new IntersectionObserver(([hit]) => {
      if (hit.isIntersecting) {
        onNeedFilm(entry);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [needsFilm, entry, onNeedFilm]);

  const play = () => {
    const v = video.current;
    if (v) void v.play().catch(() => undefined);
  };
  const stop = () => {
    const v = video.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
  };

  const aspect = ratioValue(entry.settings.aspectRatio);
  const notice = fallbackNotice(entry.fallbackReason, requested, profile);
  const failed = entry.step === "failed" || entry.step === "canceled";

  return (
    <li ref={ref} className={styles.card} data-step={entry.step} data-selected={selected} onMouseEnter={play} onMouseLeave={stop}>
      <div className={styles.frame} style={{ aspectRatio: String(aspect) }}>
        {ready && film?.url && !unplayable && (
          <video
            ref={video}
            className={styles.video}
            src={film.url}
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setUnplayable(true)}
          />
        )}
        {ready && film?.url && unplayable && <span className={styles.overlay}>This browser can&apos;t preview the film. Download it to watch.</span>}
        {ready && !film?.url && (
          <span className={styles.overlay}>
            {film?.error ? film.error.title : (
              <>
                <span className={styles.lock} aria-hidden="true" /> Sealed · opening here…
              </>
            )}
          </span>
        )}
        {isActive(entry) && (
          <div className={styles.developing}>
            <Steps entry={entry} />
          </div>
        )}
        {failed && (
          <span className={styles.overlay} data-tone="bad">
            <strong>{entry.error?.title ?? "Failed"}</strong>
          </span>
        )}
        {entry.fallbackReason && <span className={styles.fallbackFlag} title={notice ?? undefined}>Fallback</span>}
      </div>
      <div className={styles.caption}>
        <span className={styles.stock}>{stockLabel(profile, entry.profileId)}</span>
        <span className={styles.meta}>
          {entry.settings.durationS} s · {entry.settings.resolution} · {clockTime(entry.createdAt)}
        </span>
        <span className={styles.prompt}>{entry.prompt}</span>
        {failed ? (
          <span className={styles.charge}>{entry.handle ? `Refunded ${usd(entry.price)}` : "Not charged"}</span>
        ) : (
          <span className={styles.charge}>{usd(entry.price)}</span>
        )}
      </div>
      <button
        type="button"
        className={styles.hit}
        onClick={() => onSelect(entry.id)}
        onFocus={play}
        onBlur={stop}
        aria-label={`Open take: ${entry.prompt || "untitled"} — ${stockLabel(profile, entry.profileId)}`}
        aria-pressed={selected}
      />
    </li>
  );
}
