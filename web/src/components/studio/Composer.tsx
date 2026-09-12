"use client";

import type { GenerateRequest, ModelProfile } from "@kunoworld/sdk";
import { useId, useMemo, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";

import { openConnect } from "@/components/site/ConnectDialog";
import { isH3 } from "@/lib/catalog";
import { rate, usd } from "@/lib/format";
import { isMac } from "@/lib/kuno";
import {
  TABS,
  durationOptions,
  estimatePrice,
  fallbackNotice,
  frameSize,
  modeFor,
  predictRoute,
  type ComposerTab,
} from "@/lib/shot";
import type { LiveModels } from "@/lib/useModels";
import { validateParams, validatePrompt, type Problem } from "@/lib/validation";

import styles from "./Composer.module.css";
import { collectInputs, type ComposerApi, type Submission } from "./composerState";
import { ModelPicker } from "./ModelPicker";
import { EditTray, FramesTray, KeyframesTray, ReferencesTray } from "./Trays";

const noop = () => () => {};
const QUIET_UNTIL_ATTEMPT = new Set(["prompt_empty", "missing", "empty"]);
const MAX_SEED = 2 ** 31 - 1;

export function Composer({
  composer,
  profiles,
  live,
  connected,
  onGenerate,
  promptRef,
}: {
  composer: ComposerApi;
  profiles: ModelProfile[];
  live: LiveModels;
  connected: boolean;
  onGenerate: (sub: Submission) => void;
  promptRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const { state, profile, actions } = composer;
  const lim = profile.limits;
  const [attempted, setAttempted] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const mac = useSyncExternalStore(noop, isMac, () => false);
  const ids = useId();

  const collected = useMemo(() => collectInputs(state), [state]);
  const mode = modeFor(state.tab, state.editOp, collected.roles);
  const prediction = predictRoute(live.data, profile, mode);
  const target = prediction.ok ? prediction.profile : profile;
  const reason = prediction.ok ? prediction.reason : null;
  const estimate = prediction.ok ? estimatePrice(target, mode, collected.roles, state.settings, reason) : null;

  // Recomputed each render: cheap, and a manual useMemo here can't be preserved by
  // the React Compiler because its dependencies are objects derived during render.
  const problems: Problem[] = (() => {
    const s = state.settings;
    const out: Problem[] = [
      ...validatePrompt(profile, state.prompt, lim.negative_prompt ? s.negativePrompt : ""),
      ...validateParams(
        profile,
        { mode, durationS: s.durationS, resolution: s.resolution, aspectRatio: s.aspectRatio, fps: s.fps, audio: s.audio },
        collected.roles,
      ),
    ];
    if (state.tab === "frames" && !state.inputs.first && !state.inputs.last) {
      const i = out.findIndex((p) => p.code === "missing");
      if (i >= 0) out[i] = { code: "missing", message: "Add a first frame, a last frame, or both.", roles: ["first_frame", "last_frame"] };
    }
    if (state.tab === "edit" && state.editOp === "retake" && state.inputs.source) {
      const { retakeStart: a, retakeEnd: b } = state.inputs;
      const d = state.inputs.source.info.duration;
      if (!(a >= 0 && b > a)) out.push({ code: "window", message: "The retake window must start before it ends.", roles: ["source_video"] });
      else if (d && b > d + 0.01) {
        out.push({ code: "window_end", message: `The retake window ends after the clip does (${d.toFixed(1)} s).`, roles: ["source_video"] });
      }
    }
    const seed = s.seed.trim();
    if (lim.seed && seed && (!/^\d{1,10}$/.test(seed) || Number(seed) > MAX_SEED)) {
      out.push({ code: "seed", message: `Seeds are whole numbers from 0 to ${MAX_SEED.toLocaleString("en-US")}.` });
    }
    if (!prediction.ok) out.push({ code: prediction.code, message: prediction.message });
    const seen = new Set<string>();
    return out.filter((p) => (seen.has(p.message) ? false : (seen.add(p.message), true)));
  })();

  const shown = attempted ? problems : problems.filter((p) => !QUIET_UNTIL_ATTEMPT.has(p.code));
  const trayProblems = shown.filter((p) => p.roles?.length);
  const generalProblems = shown.filter((p) => !p.roles?.length);
  const blocked = problems.length > 0;
  const routeNotice = prediction.ok ? fallbackNotice(reason, profile, target, true) : null;

  function submit() {
    setAttempted(true);
    if (!connected) {
      openConnect();
      return;
    }
    if (blocked || !prediction.ok) return;
    const s = state.settings;
    const seed = s.seed.trim();
    const request: GenerateRequest = {
      prompt: state.prompt.trim(),
      model: profile.id,
      mode,
      durationS: s.durationS,
      resolution: s.resolution,
      aspectRatio: s.aspectRatio,
      fps: s.fps,
      audio: s.audio,
      seed: lim.seed && seed ? Number(seed) : undefined,
      negativePrompt: lim.negative_prompt && s.negativePrompt.trim() ? s.negativePrompt.trim() : undefined,
      inputs: collected.inputs,
      options: s.enhance && lim.prompt_enhancer ? { enhance_prompt: true } : undefined,
    };
    onGenerate({
      request,
      requested: profile,
      predicted: target,
      fallbackReason: reason,
      mode,
      estimate,
      summaries: collected.summaries,
      snapshot: {
        tab: state.tab,
        editOp: state.editOp,
        profileId: state.profileId,
        prompt: state.prompt,
        settings: state.settings,
        inputs: state.inputs,
      },
    });
    setAttempted(false);
  }

  function onPromptKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Only Cmd/Ctrl+Enter generates. Plain Enter (and Shift+Enter) is a new line, never a spend.
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = TABS.findIndex((t) => t.id === state.tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    actions.setTab(TABS[next].id);
    document.getElementById(`${ids}-tab-${TABS[next].id}`)?.focus();
  }

  const tabCount = (tab: ComposerTab): number => {
    const i = state.inputs;
    if (tab === "frames") return Number(Boolean(i.first)) + Number(Boolean(i.last));
    if (tab === "keyframes") return i.keyframes.length;
    if (tab === "references") return i.refImages.length + i.refVideos.length + i.refAudio.length;
    if (tab === "edit") return Number(Boolean(i.source)) + Number(Boolean(i.soundtrack)) + Number(Boolean(i.a2vFirst)) + i.editImages.length;
    return 0;
  };

  const insertToken = (token: string) => {
    const p = state.prompt;
    actions.setPrompt(`${p}${p && !/\s$/.test(p) ? " " : ""}${token} `);
    promptRef.current?.focus();
  };

  const sizes = lim.sizes[state.settings.resolution] ?? {};
  const resolutions = Object.keys(lim.sizes);
  const promptNearLimit = state.prompt.length > lim.max_prompt_chars * 0.8;

  return (
    <div className={styles.composer} role="group" aria-label="Composer">
      <div className={styles.top}>
        <div className={styles.tabs} role="tablist" aria-label="Shot type" onKeyDown={onTabKey}>
          {TABS.map((t) => {
            const n = tabCount(t.id);
            return (
              <button
                key={t.id}
                id={`${ids}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={state.tab === t.id}
                aria-controls={`${ids}-tray`}
                tabIndex={state.tab === t.id ? 0 : -1}
                onClick={() => actions.setTab(t.id)}
              >
                {t.label}
                {n > 0 && <span className={styles.tabCount}>{n}</span>}
              </button>
            );
          })}
        </div>
        <ModelPicker
          profiles={profiles}
          selected={profile}
          onSelect={(p) => actions.setProfile(p)}
          tab={state.tab}
          editOp={state.editOp}
          live={Boolean(live.data)}
        />
      </div>

      {state.notice && (
        <p className={styles.notice} role="status">
          {state.notice}
          <button type="button" onClick={() => actions.setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      <div id={`${ids}-tray`} role="tabpanel" aria-labelledby={`${ids}-tab-${state.tab}`} className={styles.trayArea} data-tab={state.tab}>
        {state.tab === "frames" && <FramesTray composer={composer} problems={trayProblems} />}
        {state.tab === "keyframes" && <KeyframesTray composer={composer} problems={trayProblems} />}
        {state.tab === "references" && <ReferencesTray composer={composer} problems={trayProblems} onInsert={insertToken} />}
        {state.tab === "edit" && <EditTray composer={composer} problems={trayProblems} />}

        <div className={styles.promptWrap}>
          <label htmlFor={`${ids}-prompt`} className="sr-only">
            Prompt
          </label>
          <textarea
            ref={promptRef}
            id={`${ids}-prompt`}
            className={styles.prompt}
            value={state.prompt}
            onChange={(e) => actions.setPrompt(e.target.value)}
            onKeyDown={onPromptKey}
            placeholder={
              state.tab === "references"
                ? "Direct the scene. Refer to your references as <Picture 1>, <Video 1>, <Audio 1>…"
                : "Describe the shot: subject, action, camera, light, sound…"
            }
            rows={3}
            spellCheck
            aria-describedby={`${ids}-hint`}
          />
          {promptNearLimit && (
            <span className={styles.charCount} data-over={state.prompt.length > lim.max_prompt_chars}>
              {state.prompt.length.toLocaleString("en-US")}/{lim.max_prompt_chars.toLocaleString("en-US")}
            </span>
          )}
        </div>
      </div>

      <div className={styles.chips}>
        <label className={styles.chip}>
          <span className="sr-only">Aspect ratio</span>
          <select value={state.settings.aspectRatio} onChange={(e) => actions.patchSettings({ aspectRatio: e.target.value })}>
            {Object.keys(sizes).map((ar) => {
              const size = frameSize(profile, state.settings.resolution, ar);
              return (
                <option key={ar} value={ar}>
                  {ar}
                  {size ? ` · ${size[0]}×${size[1]}` : ""}
                </option>
              );
            })}
          </select>
        </label>
        <label className={styles.chip}>
          <span className="sr-only">Duration</span>
          <select value={state.settings.durationS} onChange={(e) => actions.patchSettings({ durationS: Number(e.target.value) })}>
            {durationOptions(profile).map((d) => (
              <option key={d} value={d}>
                {d} s
              </option>
            ))}
          </select>
        </label>
        {resolutions.length > 1 ? (
          <label className={styles.chip}>
            <span className="sr-only">Resolution</span>
            <select value={state.settings.resolution} onChange={(e) => actions.patchSettings({ resolution: e.target.value })}>
              {resolutions.map((r) => (
                <option key={r} value={r}>
                  {r} · {rate(profile.pricing.usd_per_second[r])}/s
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className={styles.staticChip} title="This stock renders at one resolution">
            {resolutions[0]}
          </span>
        )}
        {lim.fps.length > 1 ? (
          <label className={styles.chip}>
            <span className="sr-only">Frame rate</span>
            <select value={state.settings.fps} onChange={(e) => actions.patchSettings({ fps: Number(e.target.value) })}>
              {lim.fps.map((f) => (
                <option key={f} value={f}>
                  {f} fps
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className={styles.staticChip}>{lim.fps[0]} fps</span>
        )}
        {lim.audio && (
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={state.settings.audio}
            onClick={() => actions.patchSettings({ audio: !state.settings.audio })}
            title={isH3(profile) ? "MiniMax H3 generates native stereo audio with the picture" : "Generate a soundtrack with the picture"}
          >
            <span className={styles.toggleMark} aria-hidden="true" />
            Audio
          </button>
        )}
        {lim.prompt_enhancer && (
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={state.settings.enhance}
            onClick={() => actions.patchSettings({ enhance: !state.settings.enhance })}
            title="Rewrites your prompt inside the sealed stage before rendering. The rewrite never leaves the stage."
          >
            <span className={styles.toggleMark} aria-hidden="true" />
            Enhance prompt
          </button>
        )}
        {(lim.seed || lim.negative_prompt) && (
          <button type="button" className={styles.advancedToggle} aria-expanded={advanced} aria-controls={`${ids}-advanced`} onClick={() => setAdvanced((a) => !a)}>
            Advanced
          </button>
        )}
      </div>

      {/* The rewrite happens inside the enclave, so it can't be shown here for editing.
          Say so plainly rather than implying a review step that doesn't exist. */}
      {lim.prompt_enhancer && state.settings.enhance && (
        <p className={styles.enhanceNote}>
          The stock rewrites your prompt inside the sealed stage, just before rendering. The rewrite never leaves the
          stage, so it can&apos;t be shown to you here — turn this off to render exactly what you wrote.
        </p>
      )}

      {advanced && (
        <div id={`${ids}-advanced`} className={styles.advanced}>
          {lim.seed && (
            <label className={styles.field}>
              <span>Seed</span>
              <input
                inputMode="numeric"
                placeholder="Random"
                value={state.settings.seed}
                onChange={(e) => actions.patchSettings({ seed: e.target.value.replace(/[^\d]/g, "") })}
              />
            </label>
          )}
          {lim.negative_prompt && (
            <label className={`${styles.field} ${styles.wide}`}>
              <span>Negative prompt</span>
              <input
                placeholder="What to avoid"
                value={state.settings.negativePrompt}
                onChange={(e) => actions.patchSettings({ negativePrompt: e.target.value })}
              />
            </label>
          )}
        </div>
      )}

      {routeNotice && (
        <div className={styles.messages} aria-live="polite">
          <p className={styles.route}>{routeNotice}</p>
        </div>
      )}

      <div className={styles.footer}>
        <p id={`${ids}-hint`} className={styles.hint}>
          <span className={styles.lock} aria-hidden="true" />
          Encrypted on this device before upload
          <span className={styles.kbd}>
            <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
            <kbd>↵</kbd> generates · <kbd>↵</kbd> is a new line
          </span>
        </p>
        <div className={styles.go}>
          {/* Why Generate is off, said next to the button. Problems that belong to a
              slot stay on that slot, so this points at them instead of repeating them. */}
          {connected && blocked && (
            <div id={`${ids}-blocked`} className={styles.blockers} aria-live="polite">
              {generalProblems.length > 0 ? (
                <ul role="list" aria-label="Problems to fix" className={styles.problems}>
                  {generalProblems.map((p) => (
                    <li key={p.code + p.message}>{p.message}</li>
                  ))}
                </ul>
              ) : trayProblems.length > 0 ? (
                <p className={styles.blockHint}>Fix the highlighted inputs above.</p>
              ) : (
                <p className="sr-only">{problems[0].message}</p>
              )}
            </div>
          )}
          <button
            type="button"
            className={`btn btn-primary ${styles.generate}`}
            onClick={submit}
            aria-disabled={connected && blocked}
            aria-describedby={connected && blocked ? `${ids}-blocked` : `${ids}-hint`}
            title={blocked ? problems[0]?.message : undefined}
          >
            {connected ? (
              <>
                Generate <span className={styles.price}>{estimate === null ? "" : `· ${usd(estimate)}`}</span>
              </>
            ) : (
              "Connect to generate"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
