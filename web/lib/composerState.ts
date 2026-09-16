"use client";

import type { GenerateInput, GenerateRequest, InputRole, Mode, ModelProfile } from "@kunoworld/sdk";
import { useCallback, useMemo, useReducer } from "react";

import { CATALOG } from "@/lib/catalog";
import type { InputSummary } from "@/lib/library";
import { kindOf, probeMedia, type MediaInfo } from "@/lib/media";
import {
  EDIT_OPS,
  TABS,
  clampSettings,
  clampShots,
  defaultSettings,
  defaultShots,
  makeShot,
  supportsTab,
  type ComposerTab,
  type EditOp,
  type ShotSettings,
  type StoryboardShot,
} from "@/lib/shot";
import type { ShotDraft } from "@/lib/validation";

// ---------------------------------------------------------------- media items

export interface MediaItem {
  id: string;
  file: Blob;
  name: string;
  /** Object URL for local previews only. */
  url: string;
  info: MediaInfo;
  timeS?: number;
}

let seq = 0;

export function makeItem(file: Blob, name?: string): MediaItem {
  seq += 1;
  return {
    id: `m${seq}-${Date.now().toString(36)}`,
    file,
    name: name ?? (file instanceof File ? file.name : "media"),
    url: URL.createObjectURL(file),
    info: { kind: kindOf(file) },
  };
}

export interface ComposerInputs {
  first: MediaItem | null;
  last: MediaItem | null;
  keyframes: MediaItem[];
  /** Keyframes spread evenly over the duration until the user places one by hand. */
  keyframesAuto: boolean;
  refImages: MediaItem[];
  refVideos: MediaItem[];
  refAudio: MediaItem[];
  source: MediaItem | null;
  soundtrack: MediaItem | null;
  a2vFirst: MediaItem | null;
  editImages: MediaItem[];
  retakeStart: number;
  retakeEnd: number;
}

export const EMPTY_INPUTS: ComposerInputs = {
  first: null,
  last: null,
  keyframes: [],
  keyframesAuto: true,
  refImages: [],
  refVideos: [],
  refAudio: [],
  source: null,
  soundtrack: null,
  a2vFirst: null,
  editImages: [],
  retakeStart: 0,
  retakeEnd: 2,
};

const SINGLE_KEYS = ["first", "last", "source", "soundtrack", "a2vFirst"] as const;
const LIST_KEYS = ["keyframes", "refImages", "refVideos", "refAudio", "editImages"] as const;

function mapItems(inputs: ComposerInputs, fn: (item: MediaItem) => MediaItem): ComposerInputs {
  const next = { ...inputs };
  for (const k of SINGLE_KEYS) next[k] = inputs[k] ? fn(inputs[k] as MediaItem) : null;
  for (const k of LIST_KEYS) next[k] = inputs[k].map(fn);
  return next;
}

export function keyframeTimes(items: MediaItem[], auto: boolean, duration: number): number[] {
  if (auto) {
    return items.map((_, i) => (items.length === 1 ? 0 : Math.round(((i * duration) / (items.length - 1)) * 100) / 100));
  }
  return items.map((it) => Math.min(Math.max(it.timeS ?? 0, 0), duration));
}

// ---------------------------------------------------------------- state

export interface ComposerState {
  tab: ComposerTab;
  editOp: EditOp;
  profileId: string;
  prompt: string;
  settings: ShotSettings;
  inputs: ComposerInputs;
  /** The Storyboard tab's shots. `prompt` is then the scene they share. */
  shots: StoryboardShot[];
  notice: string | null;
  /** The user picked a stock themselves; don't auto-select one for them. */
  touched: boolean;
}

/** A setup to load. `shots` replaces the storyboard's shots when given, and leaves them alone otherwise. */
export type ComposerSnapshot = Pick<ComposerState, "tab" | "editOp" | "profileId" | "prompt" | "settings" | "inputs"> & {
  shots?: ShotDraft[];
};

export interface Submission {
  request: GenerateRequest;
  requested: ModelProfile;
  predicted: ModelProfile;
  fallbackReason: string | null;
  mode: Mode;
  estimate: number | null;
  summaries: InputSummary[];
  snapshot: ComposerSnapshot;
}

interface Collected {
  role: InputRole;
  item: MediaItem;
  timeS?: number;
  startS?: number;
  endS?: number;
}

export function collectInputs(state: Pick<ComposerState, "tab" | "editOp" | "inputs" | "settings">): {
  inputs: GenerateInput[];
  summaries: InputSummary[];
  roles: InputRole[];
  items: Collected[];
} {
  const { tab, editOp, inputs: i, settings } = state;
  const out: Collected[] = [];
  if (tab === "frames") {
    if (i.first) out.push({ role: "first_frame", item: i.first });
    if (i.last) out.push({ role: "last_frame", item: i.last });
  } else if (tab === "keyframes") {
    const times = keyframeTimes(i.keyframes, i.keyframesAuto, settings.durationS);
    i.keyframes
      .map((item, n) => ({ item, t: times[n] }))
      .sort((a, b) => a.t - b.t)
      .forEach(({ item, t }) => out.push({ role: "keyframe", item, timeS: t }));
  } else if (tab === "references") {
    i.refImages.forEach((item) => out.push({ role: "reference_image", item }));
    i.refVideos.forEach((item) => out.push({ role: "reference_video", item }));
    i.refAudio.forEach((item) => out.push({ role: "reference_audio", item }));
  } else if (tab === "edit") {
    if (editOp === "audio") {
      if (i.soundtrack) out.push({ role: "source_audio", item: i.soundtrack });
      if (i.a2vFirst) out.push({ role: "first_frame", item: i.a2vFirst });
      i.editImages.forEach((item) => out.push({ role: "reference_image", item }));
    } else {
      if (i.source) {
        out.push(
          editOp === "retake"
            ? { role: "source_video", item: i.source, startS: i.retakeStart, endS: i.retakeEnd }
            : { role: "source_video", item: i.source },
        );
      }
      if (editOp !== "retake") i.editImages.forEach((item) => out.push({ role: "reference_image", item }));
    }
  }
  return {
    items: out,
    roles: out.map((o) => o.role),
    inputs: out.map((o) => ({ role: o.role, file: o.item.file, timeS: o.timeS, startS: o.startS, endS: o.endS })),
    summaries: out.map((o) => ({ role: o.role, name: o.item.name, timeS: o.timeS, startS: o.startS, endS: o.endS })),
  };
}

function usable(p: ModelProfile): boolean {
  return p.enabled !== false && p.available_in_region !== false && (p.workers === undefined || p.workers > 0);
}

/** Describes what clampSettings changed, so nothing changes silently. */
function describeChanges(before: ShotSettings, after: ShotSettings): string[] {
  const out: string[] = [];
  if (before.durationS !== after.durationS) out.push(`${after.durationS} s`);
  if (before.resolution && before.resolution !== after.resolution) out.push(after.resolution);
  if (before.aspectRatio !== after.aspectRatio) out.push(after.aspectRatio);
  if (before.fps !== after.fps) out.push(`${after.fps} fps`);
  if (before.audio !== after.audio) out.push(after.audio ? "audio on" : "no audio");
  if (before.enhance !== after.enhance) out.push("enhance off");
  return out;
}

function withProfile(state: ComposerState, profile: ModelProfile, reason: string | null): ComposerState {
  const settings = clampSettings(profile, state.settings);
  const changes = describeChanges(state.settings, settings);
  // Shot lengths only matter, and are only mentioned, on the Storyboard tab.
  const shots = clampShots(profile, settings.fps, state.shots);
  if (state.tab === "storyboard" && shots !== state.shots) changes.push("shot lengths");
  const parts = [reason, changes.length ? `Adjusted to fit ${profile.name}: ${changes.join(", ")}.` : null].filter(Boolean);
  return { ...state, profileId: profile.id, settings, shots, notice: parts.length ? parts.join(" ") : null };
}

function ensureProfile(state: ComposerState, profiles: ModelProfile[]): ComposerState {
  const current = profiles.find((p) => p.id === state.profileId);
  const candidates = profiles.filter((p) => supportsTab(p, state.tab, state.editOp));
  /*
   * Staying put is only right if this stock can serve here. Picking a tab whose only
   * stock is unlicensed in this region parks you on it; without this, a later op that
   * the same stock happens to support would keep you there, even when a usable stock
   * does that op too.
   */
  if (current && supportsTab(current, state.tab, state.editOp) && (usable(current) || !candidates.some(usable))) {
    return state;
  }
  const pick =
    candidates.find((p) => p.family === current?.family && usable(p)) ?? candidates.find(usable) ?? candidates[0];
  if (!pick) return state;
  const what = state.tab === "edit" ? EDIT_OPS.find((o) => o.id === state.editOp)?.label : TABS.find((t) => t.id === state.tab)?.label;
  return withProfile(state, pick, `${what} needs a different stock — switched to ${pick.name}.`);
}

type Action =
  | { type: "tab"; tab: ComposerTab; profiles: ModelProfile[] }
  | { type: "editOp"; op: EditOp; profiles: ModelProfile[] }
  | { type: "profile"; profile: ModelProfile; auto?: boolean }
  | { type: "prompt"; prompt: string }
  | { type: "settings"; patch: Partial<ShotSettings>; profile: ModelProfile }
  | { type: "inputs"; update: (inputs: ComposerInputs) => ComposerInputs }
  | { type: "shots"; update: (shots: StoryboardShot[]) => StoryboardShot[] }
  | { type: "item"; id: string; patch: Partial<MediaItem> }
  | { type: "load"; snapshot: ComposerSnapshot; profiles: ModelProfile[]; notice: string | null }
  | { type: "notice"; notice: string | null };

function reducer(state: ComposerState, action: Action): ComposerState {
  switch (action.type) {
    case "tab":
      return ensureProfile({ ...state, tab: action.tab, notice: null }, action.profiles);
    case "editOp":
      return ensureProfile({ ...state, editOp: action.op, notice: null }, action.profiles);
    case "profile":
      return { ...withProfile(state, action.profile, null), touched: state.touched || !action.auto };
    case "prompt":
      return { ...state, prompt: action.prompt };
    case "settings": {
      const settings = clampSettings(action.profile, { ...state.settings, ...action.patch });
      return { ...state, settings, shots: clampShots(action.profile, settings.fps, state.shots) };
    }
    case "inputs":
      return { ...state, inputs: action.update(state.inputs) };
    case "shots":
      return { ...state, shots: action.update(state.shots) };
    case "item":
      return { ...state, inputs: mapItems(state.inputs, (it) => (it.id === action.id ? { ...it, ...action.patch } : it)) };
    case "load": {
      const profile = action.profiles.find((p) => p.id === action.snapshot.profileId) ?? action.profiles[0];
      const { shots, ...snapshot } = action.snapshot;
      const settings = clampSettings(profile, snapshot.settings);
      const loaded: ComposerState = {
        ...state,
        ...snapshot,
        profileId: profile.id,
        settings,
        shots: shots?.length ? clampShots(profile, settings.fps, shots.map((shot) => makeShot(shot))) : state.shots,
        notice: action.notice,
        touched: true,
      };
      return ensureProfile(loaded, action.profiles);
    }
    case "notice":
      return { ...state, notice: action.notice };
  }
}

function initialState(): ComposerState {
  const profile = CATALOG[0];
  return {
    tab: "text",
    editOp: "edit",
    profileId: profile.id,
    prompt: "",
    settings: defaultSettings(profile),
    inputs: EMPTY_INPUTS,
    shots: defaultShots(),
    notice: null,
    touched: false,
  };
}

export function useComposer(profiles: ModelProfile[]) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const profile = useMemo(
    () => profiles.find((p) => p.id === state.profileId) ?? profiles[0],
    [profiles, state.profileId],
  );

  const probe = useCallback((item: MediaItem) => {
    void probeMedia(item.file, item.url).then((info) => dispatch({ type: "item", id: item.id, patch: { info } }));
  }, []);

  /** Wraps files as media items and starts reading their dimensions/duration. */
  const addMedia = useCallback(
    (file: Blob, name?: string): MediaItem => {
      const item = makeItem(file, name);
      probe(item);
      return item;
    },
    [probe],
  );

  const actions = useMemo(
    () => ({
      setTab: (tab: ComposerTab) => dispatch({ type: "tab", tab, profiles }),
      setEditOp: (op: EditOp) => dispatch({ type: "editOp", op, profiles }),
      setProfile: (p: ModelProfile, auto = false) => dispatch({ type: "profile", profile: p, auto }),
      setPrompt: (prompt: string) => dispatch({ type: "prompt", prompt }),
      patchSettings: (patch: Partial<ShotSettings>) => dispatch({ type: "settings", patch, profile }),
      updateInputs: (update: (inputs: ComposerInputs) => ComposerInputs) => dispatch({ type: "inputs", update }),
      updateShots: (update: (shots: StoryboardShot[]) => StoryboardShot[]) => dispatch({ type: "shots", update }),
      patchItem: (id: string, patch: Partial<MediaItem>) => dispatch({ type: "item", id, patch }),
      load: (snapshot: ComposerSnapshot, notice: string | null) => dispatch({ type: "load", snapshot, profiles, notice }),
      setNotice: (notice: string | null) => dispatch({ type: "notice", notice }),
      addMedia,
    }),
    [profiles, profile, addMedia],
  );

  return { state, profile, actions };
}

export type ComposerApi = ReturnType<typeof useComposer>;
