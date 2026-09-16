"use client";

import { shotPrompt, type ShotJoin } from "@kunoworld/sdk";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComposerApi } from "@/lib/composerState";
import { JOINS, durationOptions, makeShot, storyboardLength, type StoryboardShot } from "@/lib/shot";
import type { Problem } from "@/lib/validation";

import styles from "./Trays.module.css";

/*
 * The Storyboard tab: a list of shots rendered one after another and stitched into one video.
 *
 * The scene every shot shares is the composer's prompt box, above this tray. Each card here holds one shot: what
 * happens, how long it runs, and how it starts from the shot before. The first shot always starts fresh, whatever
 * join it holds, so a shot moved to the top and back keeps the join it had.
 */

/** 4 → "4", 13.708 → "13.7": lengths read better rounded to a tenth. */
const secs = (n: number) => String(Number(n.toFixed(1)));

function JoinPicker({ shot, index, onChange }: { shot: StoryboardShot; index: number; onChange: (join: ShotJoin) => void }) {
  const hintId = useId();
  const current = JOINS.find((j) => j.id === shot.join) ?? JOINS[0];

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const n = JOINS.findIndex((j) => j.id === shot.join);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = JOINS[(n + dir + JOINS.length) % JOINS.length];
    onChange(next.id);
    (e.currentTarget.querySelector(`[data-join="${next.id}"]`) as HTMLElement | null)?.focus();
  }

  if (index === 0) {
    return (
      <div className={styles.join}>
        <span className={styles.subhead}>Starts as</span>
        <p className={styles.joinHint}>
          <strong>New shot</strong> — the first shot always starts fresh
        </p>
      </div>
    );
  }
  return (
    <div className={styles.join}>
      <span className={styles.subhead} aria-hidden="true">
        Starts as
      </span>
      <div
        className={styles.ops}
        role="radiogroup"
        aria-describedby={hintId}
        aria-label={`How shot ${index + 1} starts`}
        onKeyDown={onKey}
      >
        {JOINS.map((j) => (
          <button
            key={j.id}
            type="button"
            role="radio"
            data-join={j.id}
            aria-checked={j.id === shot.join}
            tabIndex={j.id === shot.join ? 0 : -1}
            title={`${j.label} — ${j.hint}`}
            onClick={() => onChange(j.id)}
          >
            {j.label}
          </button>
        ))}
      </div>
      <p className={styles.joinHint} id={hintId}>
        <strong>{current.label}</strong> — {current.hint}
      </p>
    </div>
  );
}

/** The stitched video as a strip: each shot's share of it, with a seam where a shot cuts or starts fresh. */
function Strip({ shots, overlapS }: { shots: StoryboardShot[]; overlapS: number }) {
  return (
    <div className={styles.strip} aria-hidden="true">
      {shots.map((shot, i) => {
        const join = i === 0 ? "fresh" : shot.join;
        const kept = Math.max(0.1, shot.durationS - (join === "fresh" ? 0 : overlapS));
        return (
          <span key={shot.id} className={styles.stripShot} data-join={join} style={{ flexGrow: kept }}>
            {i + 1}
          </span>
        );
      })}
    </div>
  );
}

export function StoryboardTray({ composer, problems }: { composer: ComposerApi; problems: Problem[] }) {
  const { state, profile, actions } = composer;
  const board = profile.limits.storyboard;
  const { shots, settings } = state;
  const ids = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const focusShot = useRef<string | null>(null);

  // A shot added from the button gets the cursor, so you can describe it straight away.
  useEffect(() => {
    const id = focusShot.current;
    if (!id) return;
    focusShot.current = null;
    listRef.current?.querySelector<HTMLTextAreaElement>(`[data-shot="${id}"] textarea`)?.focus();
  }, [shots]);

  if (!board) {
    return (
      <div className={styles.tray}>
        <p className={styles.trayHint}>{profile.name} doesn&apos;t do storyboards. Choose a model that does, such as LTX-2.5 Fast.</p>
      </div>
    );
  }

  const max = board.max_shots;
  const length = storyboardLength(profile, shots, settings.fps);
  const lengths = durationOptions(profile, settings.fps);
  const maxChars = profile.limits.max_prompt_chars;
  const over = length !== null && length.stitchedS > board.max_total_s + 1e-6;

  const patch = (id: string, change: Partial<StoryboardShot>) =>
    actions.updateShots((list) => list.map((shot) => (shot.id === id ? { ...shot, ...change } : shot)));
  const move = (from: number, to: number) =>
    actions.updateShots((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [shot] = next.splice(from, 1);
      next.splice(to, 0, shot);
      return next;
    });
  const remove = (id: string) => actions.updateShots((list) => (list.length > 2 ? list.filter((shot) => shot.id !== id) : list));
  const add = () => {
    const last = shots[shots.length - 1];
    const shot = makeShot({ durationS: last?.durationS ?? 5, join: "continue" });
    focusShot.current = shot.id;
    actions.updateShots((list) => (list.length < max ? [...list, shot] : list));
  };

  return (
    <div className={styles.tray} data-storyboard="">
      <div className={styles.trayHead}>
        <span className={styles.counter} data-over={shots.length > max}>
          {shots.length}/{max} shots
        </span>
        {length && (
          <span className={styles.counter} data-over={over}>
            {secs(length.stitchedS)} s of {board.max_total_s} s
          </span>
        )}
      </div>
      {length && <Strip shots={shots} overlapS={length.overlapS} />}
      {length && (
        <p className={styles.trayHint} role="status" aria-live="polite" data-testid="storyboard-length">
          Stitched video: {secs(length.stitchedS)} s.
          {length.joins > 0 &&
            ` The shots add up to ${secs(length.renderedS)} s; each joined shot loses about ${secs(length.overlapS)} s where it repeats the end of the shot before.`}
        </p>
      )}

      <ol className={styles.shotList} ref={listRef} aria-label="Shots">
        {shots.map((shot, i) => {
          const mine = problems.filter((p) => p.shot === i);
          const chars = shotPrompt(state.prompt, shot.prompt).length;
          const name = `shot ${i + 1}`;
          return (
            <li key={shot.id} className={styles.shotCard} data-shot={shot.id} data-invalid={mine.length > 0 || undefined} aria-label={`Shot ${i + 1}`}>
              <div className={styles.shotHead}>
                <strong className={styles.shotNumber}>Shot {i + 1}</strong>
                <span className={styles.shotTools}>
                  <button type="button" className={styles.iconButton} onClick={() => move(i, i - 1)} disabled={i === 0} aria-label={`Move ${name} earlier`} title="Earlier">
                    <ArrowUp size={13} aria-hidden />
                  </button>
                  <button type="button" className={styles.iconButton} onClick={() => move(i, i + 1)} disabled={i === shots.length - 1} aria-label={`Move ${name} later`} title="Later">
                    <ArrowDown size={13} aria-hidden />
                  </button>
                  <button type="button" className={styles.iconButton} onClick={() => remove(shot.id)} disabled={shots.length <= 2} aria-label={`Remove ${name}`} title={shots.length <= 2 ? "A storyboard has at least 2 shots" : "Remove"}>
                    <X size={13} aria-hidden />
                  </button>
                </span>
              </div>
              <textarea
                className={styles.shotText}
                aria-label={`What happens in ${name}`}
                aria-invalid={mine.length > 0 || undefined}
                aria-describedby={`${ids}-${shot.id}-chars`}
                value={shot.prompt}
                placeholder={i === 0 ? "What happens first: the action, the camera, the sound." : "What happens next."}
                onChange={(e) => patch(shot.id, { prompt: e.target.value })}
              />
              <div className={styles.shotControls}>
                <label className={styles.shotLength}>
                  <span className={styles.subhead}>Length</span>
                  <Select value={String(shot.durationS)} onValueChange={(v) => patch(shot.id, { durationS: Number(v) })}>
                    <SelectTrigger aria-label={`Length of ${name}`} className="select-control">
                      <SelectValue>{`${shot.durationS} s`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {lengths.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d} seconds
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <JoinPicker shot={shot} index={i} onChange={(join) => patch(shot.id, { join })} />
              </div>
              <div className={styles.shotFoot}>
                <span className={styles.counter} data-over={chars > maxChars} id={`${ids}-${shot.id}-chars`}>
                  {chars.toLocaleString("en-US")}/{maxChars.toLocaleString("en-US")}
                  {state.prompt.trim() ? " with the scene" : ""}
                </span>
              </div>
              {mine.length > 0 && (
                <ul className={styles.problems} role="list">
                  {mine.map((p) => (
                    <li key={p.code + p.message}>{p.message}</li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>

      <div className={styles.shotAdd}>
        <button type="button" className={styles.textButton} onClick={add} disabled={shots.length >= max}>
          <Plus size={13} aria-hidden /> Add shot
        </button>
        <span className={styles.muted}>{shots.length >= max ? `${max} shots is the most` : `${max - shots.length} more can fit`}</span>
      </div>
    </div>
  );
}
