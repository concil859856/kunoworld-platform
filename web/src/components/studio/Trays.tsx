"use client";

import type { InputRole } from "@kunoworld/sdk";
import type { KeyboardEvent } from "react";

import { ratioLabel, willCrop } from "@/lib/media";
import { EDIT_OPS } from "@/lib/shot";
import { MODE_ROLES, type Problem } from "@/lib/validation";

import { keyframeTimes, type ComposerApi, type ComposerInputs, type MediaItem } from "./composerState";
import { ACCEPT, MediaSlot } from "./MediaSlot";
import styles from "./Trays.module.css";

interface TrayProps {
  composer: ComposerApi;
  problems: Problem[];
}

function RoleProblems({ problems, roles }: { problems: Problem[]; roles: InputRole[] }) {
  const mine = problems.filter((p) => p.roles?.some((r) => roles.includes(r)));
  if (!mine.length) return null;
  return (
    <ul className={styles.problems} role="list">
      {mine.map((p) => (
        <li key={p.code + p.message}>{p.message}</li>
      ))}
    </ul>
  );
}

function CropWarning({ item, aspect, label }: { item: MediaItem | null; aspect: string; label: string }) {
  if (!item || !willCrop(item.info.width, item.info.height, aspect)) return null;
  return (
    <p className={styles.warn}>
      {label} is {ratioLabel(item.info.width, item.info.height)}; the shot is {aspect}, so it will be cropped to fill.
    </p>
  );
}

// ---------------------------------------------------------------- frames

export function FramesTray({ composer, problems }: TrayProps) {
  const { state, profile, actions } = composer;
  const { first, last } = state.inputs;
  const allowFirst = profile.modes.includes("image_to_video") || profile.modes.includes("first_last_frame");
  const allowLast = profile.modes.includes("last_frame") || profile.modes.includes("first_last_frame");

  const set = (key: "first" | "last") => (files: File[]) => {
    const item = actions.addMedia(files[0]);
    actions.updateInputs((i) => ({ ...i, [key]: item }));
  };
  const swap = () => actions.updateInputs((i) => ({ ...i, first: i.last, last: i.first }));
  const loop = () => {
    if (!first) return;
    const copy = actions.addMedia(first.file, first.name);
    actions.updateInputs((i) => ({ ...i, last: copy }));
  };

  const hint =
    first && last
      ? "The shot travels from your first frame to your last."
      : first
        ? "The shot starts on your frame."
        : last
          ? "The shot ends on your frame."
          : "Add a first frame, a last frame, or both.";

  return (
    <div className={styles.tray}>
      <div className={styles.framesRow}>
        <MediaSlot
          label="First frame"
          item={first}
          accept={ACCEPT.image}
          onFiles={set("first")}
          onRemove={() => actions.updateInputs((i) => ({ ...i, first: null }))}
          disabled={!allowFirst}
          badge="IN"
        />
        <div className={styles.between}>
          <button type="button" className={styles.iconButton} onClick={swap} disabled={(!first && !last) || !allowLast} aria-label="Swap first and last frames" title="Swap">
            ⇄
          </button>
          <span className={styles.arrow} aria-hidden="true" />
          <button type="button" className={styles.textButton} onClick={loop} disabled={!first || !allowLast} title="Use the first frame as the last frame too, for a loop">
            Loop
          </button>
        </div>
        <MediaSlot
          label="Last frame"
          item={last}
          accept={ACCEPT.image}
          onFiles={set("last")}
          onRemove={() => actions.updateInputs((i) => ({ ...i, last: null }))}
          disabled={!allowLast}
          note={!allowLast ? `${profile.name} takes a first frame only` : undefined}
          badge="OUT"
        />
        <p className={styles.trayHint}>{hint}</p>
      </div>
      <CropWarning item={first} aspect={state.settings.aspectRatio} label="The first frame" />
      <CropWarning item={last} aspect={state.settings.aspectRatio} label="The last frame" />
      <RoleProblems problems={problems} roles={["first_frame", "last_frame"]} />
    </div>
  );
}

// ---------------------------------------------------------------- keyframes

export function KeyframesTray({ composer, problems }: TrayProps) {
  const { state, profile, actions } = composer;
  const { keyframes, keyframesAuto } = state.inputs;
  const max = profile.limits.max_inputs.keyframe ?? 0;
  const duration = state.settings.durationS;
  const times = keyframeTimes(keyframes, keyframesAuto, duration);

  const add = (files: File[]) => {
    const room = Math.max(0, max - keyframes.length);
    if (files.length > room) actions.setNotice(`Only ${room} more keyframe${room === 1 ? "" : "s"} fit on ${profile.name}.`);
    const items = files.slice(0, room).map((f) => ({ ...actions.addMedia(f), timeS: duration }));
    actions.updateInputs((i) => ({ ...i, keyframes: [...i.keyframes, ...items] }));
  };
  const setTime = (index: number, value: number) =>
    actions.updateInputs((i) => ({
      ...i,
      keyframesAuto: false,
      keyframes: i.keyframes.map((it, n) => ({ ...it, timeS: n === index ? value : times[n] })),
    }));
  const setAuto = (auto: boolean) =>
    actions.updateInputs((i) => ({
      ...i,
      keyframesAuto: auto,
      keyframes: auto ? i.keyframes : i.keyframes.map((it, n) => ({ ...it, timeS: times[n] })),
    }));

  return (
    <div className={styles.tray}>
      <div className={styles.trayHead}>
        <span className={styles.counter} data-over={keyframes.length > max}>
          {keyframes.length}/{max} keyframes
        </span>
        <label className={styles.check}>
          <input type="checkbox" checked={keyframesAuto} onChange={(e) => setAuto(e.target.checked)} />
          Space evenly across {duration} s
        </label>
      </div>
      <div className={styles.timeline} aria-hidden="true">
        <span className={styles.track} />
        {times.map((t, n) => (
          <span key={keyframes[n].id} className={styles.marker} style={{ left: `${duration ? (t / duration) * 100 : 0}%` }}>
            {n + 1}
          </span>
        ))}
        <span className={styles.tickStart}>0 s</span>
        <span className={styles.tickEnd}>{duration} s</span>
      </div>
      <ul className={styles.slotList} role="list">
        {keyframes.map((it, n) => (
          <li key={it.id} className={styles.keyframe}>
            <MediaSlot
              size="sm"
              label={`Keyframe ${n + 1}`}
              item={it}
              accept={ACCEPT.image}
              onRemove={() => actions.updateInputs((i) => ({ ...i, keyframes: i.keyframes.filter((_, k) => k !== n) }))}
            />
            <label className={styles.time}>
              at
              <input
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={times[n]}
                onChange={(e) => setTime(n, Number(e.target.value))}
                aria-label={`Keyframe ${n + 1} time in seconds`}
              />
              s
            </label>
          </li>
        ))}
        {keyframes.length < max && (
          <li>
            <MediaSlot size="sm" label="Add keyframes" accept={ACCEPT.image} multiple onFiles={add} note={`${max - keyframes.length} left`} />
          </li>
        )}
      </ul>
      <RoleProblems problems={problems} roles={["keyframe"]} />
    </div>
  );
}

// ---------------------------------------------------------------- references

const REF_GROUPS = [
  { key: "refImages", role: "reference_image", title: "Images", tag: "Picture", accept: ACCEPT.image },
  { key: "refVideos", role: "reference_video", title: "Videos", tag: "Video", accept: ACCEPT.video },
  { key: "refAudio", role: "reference_audio", title: "Audio", tag: "Audio", accept: ACCEPT.audio },
] as const;

function durationWarnings(items: MediaItem[], noun: string): string[] {
  const out: string[] = [];
  const known = items.map((i) => i.info.duration).filter((d): d is number => d !== undefined);
  if (known.some((d) => d < 2 || d > 15)) out.push(`${noun} work best at 2–15 s each.`);
  const total = known.reduce((a, b) => a + b, 0);
  if (total > 15) out.push(`${noun} add up to ${total.toFixed(1)} s; MiniMax H3 uses at most 15 s in total.`);
  return out;
}

export function ReferencesTray({ composer, problems, onInsert }: TrayProps & { onInsert: (token: string) => void }) {
  const { state, profile, actions } = composer;
  const lim = profile.limits;
  const total = state.inputs.refImages.length + state.inputs.refVideos.length + state.inputs.refAudio.length;
  const maxTotal = lim.max_total_inputs ?? Infinity;
  const warnings = [...durationWarnings(state.inputs.refVideos, "Reference clips"), ...durationWarnings(state.inputs.refAudio, "Audio references")];

  const add = (key: (typeof REF_GROUPS)[number]["key"], role: InputRole) => (files: File[]) => {
    const room = Math.max(0, Math.min((lim.max_inputs[role] ?? 0) - state.inputs[key].length, maxTotal - total));
    if (files.length > room) actions.setNotice(`Only ${room} more ${role === "reference_image" ? "image" : role === "reference_video" ? "clip" : "audio track"}${room === 1 ? "" : "s"} fit.`);
    const items = files.slice(0, room).map((f) => actions.addMedia(f));
    actions.updateInputs((i) => ({ ...i, [key]: [...i[key], ...items] }) as ComposerInputs);
  };

  return (
    <div className={styles.tray}>
      <div className={styles.trayHead}>
        <span className={styles.counter} data-over={total > maxTotal}>
          {total}/{Number.isFinite(maxTotal) ? maxTotal : "—"} files
        </span>
        <span className={styles.trayHint}>
          Order matters — refer to them in your prompt as &lt;Picture 1&gt;, &lt;Video 1&gt;, &lt;Audio 1&gt;.
        </span>
      </div>
      <div className={styles.refGroups}>
        {REF_GROUPS.map((g) => {
          const items = state.inputs[g.key];
          const max = lim.max_inputs[g.role] ?? 0;
          return (
            <section key={g.key} className={styles.refGroup} aria-label={`${g.title} references`}>
              <h4 className={styles.refHead}>
                <span>{g.title}</span>
                <span className={styles.counter} data-over={items.length > max}>
                  {items.length}/{max}
                </span>
              </h4>
              <ul className={styles.slotList} role="list">
                {items.map((it, n) => (
                  <li key={it.id} className={styles.refItem}>
                    <MediaSlot
                      size="sm"
                      label={`${g.tag} ${n + 1}`}
                      item={it}
                      accept={g.accept}
                      badge={`@${g.tag}${n + 1}`}
                      onRemove={() => actions.updateInputs((i) => ({ ...i, [g.key]: i[g.key].filter((x) => x.id !== it.id) }) as ComposerInputs)}
                    />
                    <button type="button" className={styles.insert} onClick={() => onInsert(`<${g.tag} ${n + 1}>`)} aria-label={`Insert <${g.tag} ${n + 1}> into the prompt`}>
                      Insert
                    </button>
                  </li>
                ))}
                {items.length < max && total < maxTotal && (
                  <li>
                    <MediaSlot size="sm" label={`Add ${g.title.toLowerCase()}`} accept={g.accept} multiple onFiles={add(g.key, g.role)} />
                  </li>
                )}
              </ul>
              <RoleProblems problems={problems} roles={[g.role]} />
            </section>
          );
        })}
      </div>
      {warnings.map((w) => (
        <p key={w} className={styles.warn}>
          {w}
        </p>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- edit

function RetakeWindow({
  duration,
  start,
  end,
  onChange,
}: {
  duration: number | undefined;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const max = duration ?? 60;
  return (
    <fieldset className={styles.window}>
      <legend>Window to regenerate</legend>
      <div className={styles.windowBar} aria-hidden="true">
        {duration ? (
          <span
            className={styles.windowSel}
            style={{ left: `${Math.min(100, (start / max) * 100)}%`, width: `${Math.max(0, Math.min(100, ((end - start) / max) * 100))}%` }}
          />
        ) : null}
      </div>
      <div className={styles.windowInputs}>
        <label>
          From
          <input type="number" min={0} max={max} step={0.1} value={start} onChange={(e) => onChange(Number(e.target.value), end)} />s
        </label>
        <label>
          to
          <input type="number" min={0} max={max} step={0.1} value={end} onChange={(e) => onChange(start, Number(e.target.value))} />s
        </label>
        {duration ? <span className={styles.muted}>of {duration.toFixed(1)} s</span> : <span className={styles.muted}>clip length unknown</span>}
      </div>
    </fieldset>
  );
}

function EditImages({ composer, max }: { composer: ComposerApi; max: number }) {
  const { state, actions } = composer;
  const items = state.inputs.editImages;
  const add = (files: File[]) => {
    const room = Math.max(0, max - items.length);
    const added = files.slice(0, room).map((f) => actions.addMedia(f));
    actions.updateInputs((i) => ({ ...i, editImages: [...i.editImages, ...added] }));
  };
  return (
    <div className={styles.editImages}>
      <span className={styles.subhead}>
        Reference images · optional · {items.length}/{max}
      </span>
      <ul className={styles.slotList} role="list">
        {items.map((it, n) => (
          <li key={it.id}>
            <MediaSlot
              size="sm"
              label={`Picture ${n + 1}`}
              item={it}
              accept={ACCEPT.image}
              badge={`@Picture${n + 1}`}
              onRemove={() => actions.updateInputs((i) => ({ ...i, editImages: i.editImages.filter((x) => x.id !== it.id) }))}
            />
          </li>
        ))}
        {items.length < max && (
          <li>
            <MediaSlot size="sm" label="Add images" accept={ACCEPT.image} multiple onFiles={add} />
          </li>
        )}
      </ul>
    </div>
  );
}

export function EditTray({ composer, problems }: TrayProps) {
  const { state, profile, actions } = composer;
  const i = state.inputs;
  const op = EDIT_OPS.find((o) => o.id === state.editOp) ?? EDIT_OPS[0];
  const allowed = MODE_ROLES[op.mode].allowed;
  const refMax = allowed.includes("reference_image") ? (profile.limits.max_inputs.reference_image ?? 0) : 0;
  const firstAllowed = allowed.includes("first_frame") && (profile.limits.max_inputs.first_frame ?? 0) > 0;

  const setSingle = (key: "source" | "soundtrack" | "a2vFirst") => (files: File[]) => {
    const item = actions.addMedia(files[0]);
    actions.updateInputs((x) => ({ ...x, [key]: item }));
  };
  const clear = (key: "source" | "soundtrack" | "a2vFirst") => () => actions.updateInputs((x) => ({ ...x, [key]: null }));

  function onOpsKey(e: KeyboardEvent<HTMLDivElement>) {
    const n = EDIT_OPS.findIndex((o) => o.id === state.editOp);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = EDIT_OPS[(n + dir + EDIT_OPS.length) % EDIT_OPS.length];
    actions.setEditOp(next.id);
    (e.currentTarget.querySelector(`[data-op="${next.id}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <div className={styles.tray}>
      <div className={styles.ops} role="radiogroup" aria-label="Edit operation" onKeyDown={onOpsKey}>
        {EDIT_OPS.map((o) => (
          <button
            key={o.id}
            data-op={o.id}
            type="button"
            role="radio"
            aria-checked={o.id === state.editOp}
            tabIndex={o.id === state.editOp ? 0 : -1}
            onClick={() => actions.setEditOp(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className={styles.trayHint}>{op.hint}</p>
      <div className={styles.editRow}>
        {op.id !== "audio" ? (
          <>
            <MediaSlot label="Source video" item={i.source} accept={ACCEPT.video} onFiles={setSingle("source")} onRemove={clear("source")} badge="SRC" />
            {op.id === "retake" && (
              <RetakeWindow
                duration={i.source?.info.duration}
                start={i.retakeStart}
                end={i.retakeEnd}
                onChange={(a, b) => actions.updateInputs((x) => ({ ...x, retakeStart: a, retakeEnd: b }))}
              />
            )}
            {op.id !== "retake" && refMax > 0 && <EditImages composer={composer} max={refMax} />}
          </>
        ) : (
          <>
            <MediaSlot label="Soundtrack" item={i.soundtrack} accept={ACCEPT.audio} onFiles={setSingle("soundtrack")} onRemove={clear("soundtrack")} badge="SND" />
            {firstAllowed && (
              <MediaSlot
                label="First frame"
                note="optional"
                item={i.a2vFirst}
                accept={ACCEPT.image}
                onFiles={setSingle("a2vFirst")}
                onRemove={clear("a2vFirst")}
                badge="IN"
              />
            )}
            {refMax > 0 && <EditImages composer={composer} max={refMax} />}
          </>
        )}
      </div>
      {op.id === "audio" && profile.limits.visual_required_with_audio && (
        <p className={styles.trayHint}>{profile.name} needs an image alongside the soundtrack.</p>
      )}
      <RoleProblems problems={problems} roles={["source_video", "source_audio", "reference_image", "first_frame"]} />
    </div>
  );
}
