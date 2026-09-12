/** Composer vocabulary: tabs, edit operations, shot settings and routing predictions. */

import { fitParams, priceUsd, type InputRole, type Mode, type ModelProfile, type ModelsResponse } from "@kunoworld/sdk";

import { isH3, variantLabel } from "./catalog";
import { MODE_LABEL } from "./validation";

export type ComposerTab = "text" | "frames" | "keyframes" | "references" | "edit";
export type EditOp = "edit" | "extend" | "retake" | "audio";

export const TABS: Array<{ id: ComposerTab; label: string }> = [
  { id: "text", label: "Text" },
  { id: "frames", label: "Frames" },
  { id: "keyframes", label: "Keyframes" },
  { id: "references", label: "References" },
  { id: "edit", label: "Edit" },
];

export const EDIT_OPS: Array<{ id: EditOp; label: string; mode: Mode; hint: string }> = [
  { id: "edit", label: "Edit", mode: "video_edit", hint: "Change what happens in a clip, guided by your prompt." },
  { id: "extend", label: "Extend", mode: "extend_video", hint: "Continue a clip past its last frame." },
  { id: "retake", label: "Retake", mode: "retake", hint: "Regenerate a window of a clip and keep the rest." },
  { id: "audio", label: "Audio → video", mode: "audio_to_video", hint: "Picture driven by your own soundtrack." },
];

const EDIT_OP_MODE = Object.fromEntries(EDIT_OPS.map((op) => [op.id, op.mode])) as Record<EditOp, Mode>;

const TAB_MODES: Record<Exclude<ComposerTab, "edit">, Mode[]> = {
  text: ["text_to_video"],
  frames: ["image_to_video", "last_frame", "first_last_frame"],
  keyframes: ["keyframes"],
  references: ["reference_to_video"],
};

export function tabModes(tab: ComposerTab, editOp: EditOp): Mode[] {
  return tab === "edit" ? [EDIT_OP_MODE[editOp]] : TAB_MODES[tab];
}

export function supportsTab(profile: ModelProfile, tab: ComposerTab, editOp: EditOp): boolean {
  return tabModes(tab, editOp).some((m) => profile.modes.includes(m));
}

/** Why a stock can't do the current tab, in one short phrase. */
export function unsupportedReason(profile: ModelProfile, tab: ComposerTab, editOp: EditOp): string {
  if (tab === "references") return "References are a MiniMax H3 Director feature";
  if (tab === "keyframes") return isH3(profile) ? "Keyframes are an LTX-2.5 feature" : `${variantLabel(profile)} doesn't do keyframes`;
  if (tab === "edit") return `${variantLabel(profile)} doesn't do ${MODE_LABEL[EDIT_OP_MODE[editOp]].toLowerCase()}`;
  if (tab === "frames") return `${variantLabel(profile)} doesn't take frames`;
  return `${variantLabel(profile)} needs reference media — use References or Edit`;
}

export function modeFor(tab: ComposerTab, editOp: EditOp, roles: InputRole[]): Mode {
  switch (tab) {
    case "text":
      return "text_to_video";
    case "frames": {
      const first = roles.includes("first_frame");
      const last = roles.includes("last_frame");
      if (first && last) return "first_last_frame";
      if (last) return "last_frame";
      return "image_to_video";
    }
    case "keyframes":
      return "keyframes";
    case "references":
      return "reference_to_video";
    case "edit":
      return EDIT_OP_MODE[editOp];
  }
}

export interface ShotSettings {
  resolution: string;
  aspectRatio: string;
  durationS: number;
  fps: number;
  audio: boolean;
  seed: string;
  negativePrompt: string;
  enhance: boolean;
}

export function defaultSettings(profile: ModelProfile): ShotSettings {
  return clampSettings(profile, {
    resolution: "",
    aspectRatio: "16:9",
    durationS: 5,
    fps: profile.limits.default_fps,
    audio: true,
    seed: "",
    negativePrompt: "",
    enhance: false,
  });
}

/** Fits settings to a profile's limits. The UI shows every change as a changed chip. */
export function clampSettings(profile: ModelProfile, s: ShotSettings): ShotSettings {
  const lim = profile.limits;
  const resolutions = Object.keys(lim.sizes);
  const resolution = resolutions.includes(s.resolution) ? s.resolution : resolutions[0];
  const sizes = lim.sizes[resolution] ?? {};
  const aspects = Object.keys(sizes);
  const aspectRatio = aspects.includes(s.aspectRatio) ? s.aspectRatio : aspects.includes("16:9") ? "16:9" : aspects[0];
  const step = lim.duration_step_s || 1;
  const bounded = Math.min(Math.max(s.durationS, lim.min_duration_s), lim.max_duration_s);
  const durationS = Math.min(lim.max_duration_s, lim.min_duration_s + Math.round((bounded - lim.min_duration_s) / step) * step);
  return {
    ...s,
    resolution,
    aspectRatio,
    durationS,
    fps: lim.fps.includes(s.fps) ? s.fps : lim.default_fps,
    audio: s.audio && lim.audio,
    enhance: s.enhance && lim.prompt_enhancer,
  };
}

export function durationOptions(profile: ModelProfile): number[] {
  const lim = profile.limits;
  const step = lim.duration_step_s || 1;
  const out: number[] = [];
  for (let d = lim.min_duration_s; d <= lim.max_duration_s + 1e-9; d += step) out.push(Math.round(d * 100) / 100);
  return out;
}

export function frameSize(profile: ModelProfile, resolution: string, aspectRatio: string): [number, number] | null {
  return profile.limits.sizes[resolution]?.[aspectRatio] ?? null;
}

// ---------------------------------------------------------------- availability

export type AvailabilityState = "ok" | "region" | "off" | "empty" | "unknown";

export interface Availability {
  state: AvailabilityState;
  label: string;
  detail: string;
}

export function availability(profile: ModelProfile, live: boolean): Availability {
  if (!live || profile.workers === undefined) {
    return { state: "unknown", label: "Status unknown", detail: "Couldn't reach the network to check live status." };
  }
  if (profile.enabled === false) {
    return { state: "off", label: "Switched off", detail: "The network owner has this stock switched off right now." };
  }
  if (profile.available_in_region === false) {
    return {
      state: "region",
      label: "Not in your region",
      detail: isH3(profile)
        ? "MiniMax H3 isn't licensed in your region yet (its license excludes the US, EU, UK and South Korea, and unknown locations)."
        : "Not licensed in your region.",
    };
  }
  if (!profile.workers) {
    return { state: "empty", label: "No stages online", detail: "No sealed stage serving this stock is online right now." };
  }
  const n = profile.workers;
  return { state: "ok", label: `${n} stage${n === 1 ? "" : "s"}`, detail: `${n} sealed stage${n === 1 ? " is" : "s are"} online for this stock.` };
}

type FallbackReason = "region" | "switched_off" | "capacity";

export type RoutePrediction =
  | { ok: true; profile: ModelProfile; reason: FallbackReason | null; known: boolean }
  | { ok: false; code: string; message: string };

function unavailableReason(p: ModelProfile): FallbackReason | null {
  if (p.enabled === false) return "switched_off";
  if (p.available_in_region === false) return "region";
  if (p.workers !== undefined && p.workers <= 0) return "capacity";
  return null;
}

/** Mirrors kuno_protocol.switch.resolve_route for a request that names a profile. */
export function predictRoute(models: ModelsResponse | null, selected: ModelProfile, mode: Mode): RoutePrediction {
  if (!selected.modes.includes(mode)) {
    return { ok: false, code: "mode_unsupported", message: `${selected.name} doesn't do ${MODE_LABEL[mode].toLowerCase()}.` };
  }
  if (!models) return { ok: true, profile: selected, reason: null, known: false };
  const live = models.models.find((m) => m.id === selected.id) ?? selected;
  const reason = unavailableReason(live);
  if (!reason) return { ok: true, profile: live, reason: null, known: true };
  const sw = models.switch;
  const mayFallBack = sw.mode === "auto" || (sw.mode === "both" && reason !== "capacity") || reason === "switched_off";
  if (mayFallBack) {
    const alt = models.models.find((m) => m.family !== live.family && m.modes.includes(mode) && !unavailableReason(m));
    if (alt) return { ok: true, profile: alt, reason, known: true };
  }
  if (reason === "region") {
    return {
      ok: false,
      code: "region_restricted",
      message: `${live.name} isn't licensed in your region yet, and no other stock can do ${MODE_LABEL[mode].toLowerCase()}.`,
    };
  }
  if (reason === "capacity") {
    return { ok: false, code: "no_capacity", message: `No sealed stages are serving ${live.name} right now.` };
  }
  return { ok: false, code: "model_disabled", message: `${live.name} is switched off right now.` };
}

export function fallbackNotice(reason: string | null, requested: ModelProfile | undefined, actual: ModelProfile | undefined, future = false): string | null {
  if (!reason || !actual) return null;
  const verb = future ? "this will render on" : "rendered on";
  const req = requested ? (isH3(requested) ? "H3" : requested.name) : "The chosen stock";
  if (reason === "region") return `${req} isn't licensed in your region yet — ${verb} ${actual.name}.`;
  if (reason === "switched_off") return `${req} is switched off right now — ${verb} ${actual.name}.`;
  if (reason === "capacity") return `No stages were free for ${req} — ${verb} ${actual.name}.`;
  return `${verb[0].toUpperCase()}${verb.slice(1)} ${actual.name}.`;
}

/** The price the gateway will charge, including the parameter adaptation the SDK applies after a fallback. */
export function estimatePrice(
  profile: ModelProfile,
  mode: Mode,
  roles: InputRole[],
  settings: ShotSettings,
  fallbackReason: string | null,
): number | null {
  const params = fitParams(
    profile,
    mode,
    roles,
    {
      durationS: settings.durationS,
      resolution: settings.resolution,
      aspectRatio: settings.aspectRatio,
      fps: settings.fps,
      audio: settings.audio,
    },
    fallbackReason,
  );
  return priceUsd(profile, params.resolution, params.duration_s);
}
