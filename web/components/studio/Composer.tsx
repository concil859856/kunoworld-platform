"use client";

import type { GenerateInput, Mode, ModelProfile, ModelsResponse, PrivacyMode } from "@kunoworld/sdk";
import { AudioLines, ChevronRight, Eye, LoaderCircle, LockKeyhole, Sparkles, ArrowRight, SlidersHorizontal, Wand2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { offersStandard } from "@/lib/catalog";
import { collectInputs, type ComposerApi } from "@/lib/composerState";
import { usd } from "@/lib/format";
import type { InputSummary } from "@/lib/library";
import type { ShotSummary } from "@/lib/library";
import {
  durationOptions,
  estimatePrice,
  fallbackNotice,
  frameSize,
  modeFor,
  predictRoute,
  requestShots,
  storyboardLength,
  TABS,
} from "@/lib/shot";
import { MODE_LABEL, validateParams, validatePrompt, validateStoryboard, type Problem } from "@/lib/validation";
import { NSFW_SENTENCE, PRIVACY_COPY } from "@/lib/privacy-copy";
import { setPrivacyChoice, usePrivacyChoice } from "@/lib/usePrivacyChoice";

import { StoryboardTray } from "./StoryboardTray";
import { EditTray, FramesTray, KeyframesTray, ReferencesTray } from "./Trays";

/*
 * The composer, covering all eleven creation modes.
 *
 * Six tabs map onto the modes: text, frames (first/last), keyframes, references, edit —
 * which itself carries four operations (edit, extend, retake, audio-to-video) — and
 * storyboard, where the prompt box holds the scene every shot shares.
 * The state machine, role collection and profile switching live in lib/composerState;
 * this file is the surface. Problems are computed every render rather than memoised,
 * because they derive from objects created during render.
 */

const QUIET_UNTIL_ATTEMPT = new Set(["prompt_empty", "missing", "empty", "shot_prompt_empty"]);
const MAX_SEED = 2 ** 31 - 1;

export interface Submission {
  /** For a storyboard, the scene; it may be empty. */
  prompt: string;
  mode: Mode;
  /** A storyboard's shots, in order, the first fresh. */
  shots?: ShotSummary[];
  inputs: GenerateInput[];
  summaries: InputSummary[];
  requested: ModelProfile;
  predicted: ModelProfile;
  fallbackReason: string | null;
  estimate: number | null;
  privacy: PrivacyMode;
}

const PRIVACY_MODES: PrivacyMode[] = ["private", "standard"];

function Picker({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger aria-label={label} className="select-control">
          <SelectValue>{options.find((o) => o.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function Composer({
  composer,
  models,
  busy,
  onGenerate,
  onCancel,
}: {
  composer: ComposerApi;
  /** From the connected gateway, so routing predictions match where jobs actually go. */
  models: ModelsResponse | null;
  busy: boolean;
  onGenerate: (submission: Submission) => void;
  /** Shown while a job is in flight, so a long render can be abandoned. */
  onCancel?: () => void;
}) {
  const { state, profile, actions } = composer;
  const profiles = models?.models ?? [profile];
  const limits = profile.limits;
  const ids = useId();
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const [attempted, setAttempted] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  // Chosen per take and remembered per browser; Private until someone picks otherwise.
  const privacy = usePrivacyChoice();

  const collected = collectInputs(state);
  const mode = modeFor(state.tab, state.editOp, collected.roles);
  const storyboard = mode === "storyboard";
  const prediction = predictRoute(models, profile, mode);
  const target = prediction.ok ? prediction.profile : profile;
  const reason = prediction.ok ? prediction.reason : null;
  // A profile with no Standard price is sold in Private mode only: there a remembered Standard choice runs as Private,
  // and the choice itself is kept for the next model that offers Standard.
  const privateOnly = !offersStandard(profile) ? profile : !offersStandard(target) ? target : null;
  const takePrivacy: PrivacyMode = privateOnly ? "private" : privacy;
  const quote = prediction.ok ? estimatePrice(target, mode, collected.roles, state.settings, reason, takePrivacy, state.shots) : null;
  const length = storyboard ? storyboardLength(profile, state.shots, state.settings.fps) : null;
  const estimate = quote?.usd ?? null;

  const problems: Problem[] = (() => {
    const s = state.settings;
    const out: Problem[] = [
      // A storyboard's scene may be empty; each shot needs its own prompt instead.
      ...validatePrompt(profile, state.prompt, limits.negative_prompt ? s.negativePrompt : "", storyboard),
      ...validateParams(
        profile,
        { mode, durationS: s.durationS, resolution: s.resolution, aspectRatio: s.aspectRatio, fps: s.fps, audio: s.audio },
        collected.roles,
      ),
      ...(storyboard ? validateStoryboard(profile, state.prompt, state.shots, s.fps) : []),
    ];
    if (state.tab === "frames" && !state.inputs.first && !state.inputs.last) {
      const i = out.findIndex((p) => p.code === "missing");
      if (i >= 0) out[i] = { code: "missing", message: "Add a first frame, a last frame, or both.", roles: ["first_frame", "last_frame"] };
    }
    if (state.tab === "edit" && state.editOp === "retake" && state.inputs.source) {
      const { retakeStart: a, retakeEnd: b } = state.inputs;
      const d = state.inputs.source.info.duration;
      if (!(a >= 0 && b > a)) out.push({ code: "window", message: "The retake window must start before it ends.", roles: ["source_video"] });
      else if (d && b > d + 0.01) out.push({ code: "window_end", message: `The retake window ends after the clip does (${d.toFixed(1)} s).`, roles: ["source_video"] });
    }
    const seed = state.settings.seed.trim();
    if (limits.seed && seed && (!/^\d{1,10}$/.test(seed) || Number(seed) > MAX_SEED)) {
      out.push({ code: "seed", message: `Seeds are whole numbers from 0 to ${MAX_SEED.toLocaleString("en-US")}.` });
    }
    if (!prediction.ok) out.push({ code: prediction.code, message: prediction.message });
    const seen = new Set<string>();
    return out.filter((p) => (seen.has(p.message) ? false : (seen.add(p.message), true)));
  })();

  const shown = attempted ? problems : problems.filter((p) => !QUIET_UNTIL_ATTEMPT.has(p.code));
  const trayProblems = shown.filter((p) => p.roles?.length || p.shot !== undefined);
  const generalProblems = shown.filter((p) => !p.roles?.length && p.shot === undefined);
  const blocked = problems.length > 0;
  const routeNotice = prediction.ok ? fallbackNotice(reason, profile, target, true) : null;

  const tabCount = (tab: (typeof TABS)[number]["id"]) => {
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

  function submit() {
    setAttempted(true);
    if (blocked || busy) return;
    onGenerate({
      prompt: state.prompt.trim(),
      mode,
      shots: storyboard ? requestShots(state.shots) : undefined,
      inputs: collected.inputs,
      summaries: collected.summaries,
      requested: profile,
      predicted: target,
      fallbackReason: reason,
      estimate,
      privacy: takePrivacy,
    });
  }

  const size = frameSize(profile, state.settings.resolution, state.settings.aspectRatio);
  const aspects = Object.keys(limits.sizes[state.settings.resolution] ?? {});

  return (
    <section className="composer" aria-label="Video creation">
      <Tabs value={state.tab} onValueChange={(v) => actions.setTab(v as (typeof TABS)[number]["id"])}>
        <TabsList aria-label="Creation mode">
          {TABS.map((t) => {
            const n = tabCount(t.id);
            return (
              <TabsTrigger key={t.id} value={t.id} id={`${ids}-tab-${t.id}`}>
                {t.label}
                {n > 0 && <span className="tab-count">{n}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {state.notice && (
        <p className="status-message" role="status">
          {state.notice}
          <button type="button" onClick={() => actions.setNotice(null)} aria-label="Dismiss">
            ×
          </button>
        </p>
      )}

      <div role="tabpanel" aria-labelledby={`${ids}-tab-${state.tab}`} data-tab={state.tab}>
        {state.tab === "frames" && <FramesTray composer={composer} problems={trayProblems} />}
        {state.tab === "keyframes" && <KeyframesTray composer={composer} problems={trayProblems} />}
        {state.tab === "references" && <ReferencesTray composer={composer} problems={trayProblems} onInsert={insertToken} />}
        {state.tab === "edit" && <EditTray composer={composer} problems={trayProblems} />}
      </div>

      <div className="prompt-label">
        <label htmlFor={`${ids}-prompt`}>{storyboard ? "Scene" : "Your prompt"}</label>
        <span className="text-[12px] text-muted-foreground">{storyboard ? "Optional" : MODE_LABEL[mode]}</span>
        {limits.prompt_enhancer && (
          <button
            type="button"
            aria-pressed={state.settings.enhance}
            onClick={() => actions.patchSettings({ enhance: !state.settings.enhance })}
          >
            <Wand2 size={13} /> Enhance prompt
          </button>
        )}
      </div>
      <div className="prompt-box">
        <textarea
          id={`${ids}-prompt`}
          ref={promptRef}
          value={state.prompt}
          onChange={(e) => actions.setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={
            storyboard
              ? "Who and where: the characters, the place, the look. Every shot starts from this."
              : "Describe a scene, a feeling, a world that doesn't exist yet…"
          }
        />
        <div className="prompt-foot">
          <span>{storyboard ? "Shared by every shot." : "Let your imagination do the talking."}</span>
          <span>
            {state.prompt.length.toLocaleString()}/{limits.max_prompt_chars.toLocaleString()}
          </span>
        </div>
      </div>

      {state.tab === "storyboard" && <StoryboardTray composer={composer} problems={trayProblems} />}

      <div className="settings-row">
        <Picker
          label="Model"
          value={profile.id}
          onChange={(id) => {
            const p = profiles.find((x) => x.id === id);
            if (p) actions.setProfile(p);
          }}
          options={profiles.map((p) => ({ value: p.id, label: p.name }))}
        />
        {storyboard ? (
          // A storyboard's length comes from its shots: shown here, set on each shot.
          <div className="stitched-field">
            <span className="field-label">Stitched length</span>
            <output className="select-control stitched-length" aria-label="Stitched length">
              {length ? `${Number(length.stitchedS.toFixed(1))} s` : "—"}
            </output>
          </div>
        ) : (
          <Picker
            label="Duration"
            value={String(state.settings.durationS)}
            onChange={(v) => actions.patchSettings({ durationS: Number(v) })}
            options={durationOptions(profile, state.settings.fps).map((d) => ({ value: String(d), label: `${d} seconds` }))}
          />
        )}
        {Object.keys(limits.sizes).length > 1 && (
          <Picker
            label="Resolution"
            value={state.settings.resolution}
            onChange={(v) => actions.patchSettings({ resolution: v })}
            options={Object.keys(limits.sizes).map((r) => ({ value: r, label: r === "2160p" ? "4K" : r }))}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        {/* Its text is the current values, which makes a poor name: label it for what it opens. */}
        <button
          type="button"
          className="text-button !text-[12px]"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
          aria-label="Advanced settings"
        >
          <SlidersHorizontal size={14} />
          {state.settings.aspectRatio} · {state.settings.fps} fps
          <ChevronRight size={12} />
        </button>
        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
          {takePrivacy === "standard" ? <Eye size={12} /> : <LockKeyhole size={12} />} {PRIVACY_COPY[takePrivacy].short}
        </span>
      </div>

      {advanced && (
        <div className="settings-row">
          <Picker
            label="Aspect ratio"
            value={state.settings.aspectRatio}
            onChange={(v) => actions.patchSettings({ aspectRatio: v })}
            options={aspects.map((a) => ({ value: a, label: a }))}
          />
          {limits.fps.length > 1 && (
            <Picker
              label="Frame rate"
              value={String(state.settings.fps)}
              onChange={(v) => actions.patchSettings({ fps: Number(v) })}
              options={limits.fps.map((f) => ({ value: String(f), label: `${f} fps` }))}
            />
          )}
          {limits.seed && (
            <label>
              <span className="field-label">Seed</span>
              <input
                className="select-control"
                aria-label="Seed"
                inputMode="numeric"
                value={state.settings.seed}
                placeholder="random"
                onChange={(e) => actions.patchSettings({ seed: e.target.value })}
              />
            </label>
          )}
          {limits.negative_prompt && (
            <label style={{ gridColumn: "1 / -1" }}>
              <span className="field-label">Negative prompt</span>
              <input
                className="select-control"
                aria-label="Negative prompt"
                value={state.settings.negativePrompt}
                placeholder="What you don't want to see"
                onChange={(e) => actions.patchSettings({ negativePrompt: e.target.value })}
              />
            </label>
          )}
          {size && <p className="modal-copy">{size.join(" × ")} pixels</p>}
        </div>
      )}

      <fieldset className="privacy-choice">
        <legend className="field-label">Who can see this take</legend>
        <div className="privacy-options">
          {PRIVACY_MODES.map((m) => {
            const unavailable = m === "standard" && privateOnly !== null;
            return (
              <label key={m} className="privacy-option" data-checked={takePrivacy === m} data-disabled={unavailable || undefined}>
                <input
                  type="radio"
                  name={`${ids}-privacy`}
                  value={m}
                  checked={takePrivacy === m}
                  disabled={unavailable}
                  onChange={() => setPrivacyChoice(m)}
                  aria-labelledby={`${ids}-privacy-${m}`}
                  aria-describedby={`${ids}-privacy-${m}-note`}
                />
                <span>
                  <strong id={`${ids}-privacy-${m}`}>
                    {m === "standard" ? <Eye size={13} aria-hidden /> : <LockKeyhole size={13} aria-hidden />}
                    {PRIVACY_COPY[m].label}
                  </strong>
                  <small id={`${ids}-privacy-${m}-note`}>
                    {unavailable ? `Not available: ${privateOnly.name} is offered in Private mode only.` : PRIVACY_COPY[m].sentence}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        <small className="privacy-policy-note">{NSFW_SENTENCE}</small>
      </fieldset>

      <div className="composer-footer">
        <label className="audio-switch">
          <Switch
            checked={state.settings.audio}
            onCheckedChange={(v) => actions.patchSettings({ audio: v })}
            disabled={!limits.audio}
            aria-label="Generate audio"
          />
          <AudioLines size={14} /> Native audio
        </label>
        <button className="generate-button" onClick={submit} disabled={busy} aria-disabled={blocked} title={blocked ? problems[0]?.message : undefined}>
          {busy ? <LoaderCircle size={16} className="spin" /> : <Sparkles size={16} />}
          {busy ? "Creating…" : estimate === null ? "Generate video" : `Generate video · ${usd(estimate)}`}
          <ArrowRight size={16} />
        </button>
      </div>

      {busy && onCancel && (
        <button type="button" className="text-button mt-3" onClick={onCancel}>
          Cancel generation
        </button>
      )}
      <p className="estimate">
        {quote === null
          ? "Price unavailable"
          : `${PRIVACY_COPY[takePrivacy].label} price${quote.minimumApplied ? ` (the ${usd(target.pricing.min_job_usd)} minimum charge)` : ""} — placeholder, not final`}
      </p>
      {routeNotice && <p className="status-message">{routeNotice}</p>}
      {(generalProblems.length > 0 || trayProblems.length > 0) && (
        <ul className="problem-list" aria-label="Problems to fix">
          {generalProblems.map((p) => (
            <li key={p.code + p.message} role="alert" className="status-message error-message">
              {p.message}
            </li>
          ))}
          {/* The reason sits on an input up in the tray, so say where to look. */}
          {generalProblems.length === 0 && (
            <li role="alert" className="status-message error-message">
              {storyboard ? "Fix the highlighted shots above." : "Fix the highlighted inputs above."}
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
