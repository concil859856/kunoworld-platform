/**
 * Client-side request checks. Mirrors validate_roles / validate_params in
 * kuno_protocol/profiles.py so problems show inline before anything is encrypted,
 * uploaded or charged. The gateway and the enclave still enforce the same rules.
 */

import type { InputRole, Mode, ModelProfile } from "@kunoworld/sdk";

export const MODE_ROLES: Record<Mode, { required: InputRole[]; allowed: InputRole[] }> = {
  text_to_video: { required: [], allowed: [] },
  image_to_video: { required: ["first_frame"], allowed: ["first_frame"] },
  last_frame: { required: ["last_frame"], allowed: ["last_frame"] },
  first_last_frame: { required: ["first_frame", "last_frame"], allowed: ["first_frame", "last_frame"] },
  keyframes: { required: ["keyframe"], allowed: ["keyframe"] },
  reference_to_video: { required: [], allowed: ["reference_image", "reference_video", "reference_audio"] },
  video_edit: { required: ["source_video"], allowed: ["source_video", "reference_image"] },
  extend_video: { required: ["source_video"], allowed: ["source_video", "reference_image"] },
  audio_to_video: { required: ["source_audio"], allowed: ["source_audio", "first_frame", "reference_image"] },
  retake: { required: ["source_video"], allowed: ["source_video"] },
};

export const VISUAL_ROLES: ReadonlySet<InputRole> = new Set<InputRole>([
  "first_frame",
  "last_frame",
  "keyframe",
  "reference_image",
  "reference_video",
  "source_video",
]);
export const AUDIO_ROLES: ReadonlySet<InputRole> = new Set<InputRole>(["reference_audio", "source_audio"]);

export const MODE_LABEL: Record<Mode, string> = {
  text_to_video: "Text to video",
  image_to_video: "First frame",
  last_frame: "Last frame",
  first_last_frame: "First & last frame",
  keyframes: "Keyframes",
  reference_to_video: "References",
  video_edit: "Edit",
  extend_video: "Extend",
  audio_to_video: "Audio to video",
  retake: "Retake",
};

const ROLE_NOUN: Record<InputRole, [string, string]> = {
  first_frame: ["a first frame", "first frames"],
  last_frame: ["a last frame", "last frames"],
  keyframe: ["a keyframe", "keyframes"],
  reference_image: ["a reference image", "reference images"],
  reference_video: ["a reference clip", "reference clips"],
  reference_audio: ["an audio reference", "audio references"],
  source_video: ["a source video", "source videos"],
  source_audio: ["a soundtrack", "soundtracks"],
};

const singular = (r: InputRole) => ROLE_NOUN[r][0];
const plural = (r: InputRole) => ROLE_NOUN[r][1];

function joinList(items: string[]): string {
  if (items.length < 2) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export interface Problem {
  code: string;
  message: string;
  /** Roles the problem is about, so trays can highlight the right slots. */
  roles?: InputRole[];
}

export function validateRoles(profile: ModelProfile, mode: Mode, roles: InputRole[]): Problem[] {
  const out: Problem[] = [];
  const lim = profile.limits;
  if (!profile.modes.includes(mode)) {
    out.push({ code: "mode", message: `${profile.name} doesn't do ${MODE_LABEL[mode].toLowerCase()}.` });
  }
  const { required, allowed } = MODE_ROLES[mode];
  const present = new Set(roles);
  const count = (r: InputRole) => roles.filter((x) => x === r).length;

  const missing = required.filter((r) => !present.has(r));
  if (missing.length) {
    out.push({ code: "missing", message: `${MODE_LABEL[mode]} needs ${joinList(missing.map(singular))}.`, roles: missing });
  }
  const extra = [...present].filter((r) => !allowed.includes(r));
  if (extra.length) {
    out.push({ code: "extra", message: `${MODE_LABEL[mode]} doesn't take ${joinList(extra.map(plural))}.`, roles: extra });
  }
  if (mode === "reference_to_video" && present.size === 0) {
    out.push({ code: "empty", message: "Add at least one reference image, clip or audio track." });
  }
  for (const role of present) {
    if (!allowed.includes(role)) continue;
    const limit = lim.max_inputs[role] ?? 0;
    const n = count(role);
    if (n > limit) {
      out.push({
        code: "max",
        message:
          limit === 0
            ? `${profile.name} doesn't take ${plural(role)}.`
            : `${profile.name} takes at most ${limit} ${limit === 1 ? plural(role).replace(/s$/, "") : plural(role)} — you have ${n}.`,
        roles: [role],
      });
    }
  }
  for (const group of lim.input_groups ?? []) {
    const n = group.roles.reduce((sum, r) => sum + count(r), 0);
    if (n > group.max) {
      out.push({
        code: "group",
        message: `${profile.name} takes at most ${group.max} across ${joinList(group.roles.map(plural))} — you have ${n}.`,
        roles: group.roles,
      });
    }
  }
  if (lim.max_total_inputs != null && roles.length > lim.max_total_inputs) {
    out.push({
      code: "total",
      message: `${profile.name} takes at most ${lim.max_total_inputs} files in total — you have ${roles.length}.`,
    });
  }
  if (
    lim.visual_required_with_audio &&
    [...present].some((r) => AUDIO_ROLES.has(r)) &&
    ![...present].some((r) => VISUAL_ROLES.has(r))
  ) {
    out.push({
      code: "audio_visual",
      message: `${profile.name} needs an image or video alongside audio.`,
      roles: ["reference_audio", "source_audio"],
    });
  }
  return out;
}

export interface ShotParams {
  mode: Mode;
  durationS: number;
  resolution: string;
  aspectRatio: string;
  fps: number;
  audio: boolean;
}

export function validateParams(profile: ModelProfile, params: ShotParams, roles: InputRole[]): Problem[] {
  const out: Problem[] = [];
  const lim = profile.limits;
  if (params.durationS < lim.min_duration_s || params.durationS > lim.max_duration_s) {
    out.push({ code: "duration", message: `Duration must be between ${lim.min_duration_s} and ${lim.max_duration_s} seconds.` });
  } else {
    const steps = (params.durationS - lim.min_duration_s) / lim.duration_step_s;
    if (Math.abs(steps - Math.round(steps)) > 1e-6) {
      out.push({ code: "duration_step", message: `Duration must be in ${lim.duration_step_s}-second steps.` });
    }
  }
  const sizes = lim.sizes[params.resolution];
  if (!sizes) out.push({ code: "resolution", message: `${profile.name} doesn't render ${params.resolution}.` });
  else if (!sizes[params.aspectRatio]) {
    out.push({ code: "aspect", message: `${profile.name} doesn't render ${params.resolution} at ${params.aspectRatio}.` });
  }
  if (!lim.fps.includes(params.fps)) out.push({ code: "fps", message: `Frame rate must be one of ${lim.fps.join(", ")} fps.` });
  if (params.audio && !lim.audio) out.push({ code: "audio", message: `${profile.name} can't generate audio.` });
  return [...out, ...validateRoles(profile, params.mode, roles)];
}

export function validatePrompt(profile: ModelProfile, prompt: string, negativePrompt?: string): Problem[] {
  const out: Problem[] = [];
  if (!prompt.trim()) out.push({ code: "prompt_empty", message: "Describe the shot first." });
  if (prompt.length > profile.limits.max_prompt_chars) {
    out.push({
      code: "prompt_long",
      message: `Prompts are limited to ${profile.limits.max_prompt_chars.toLocaleString("en-US")} characters on ${profile.name}.`,
    });
  }
  if (negativePrompt?.trim() && !profile.limits.negative_prompt) {
    out.push({ code: "negative", message: `${profile.name} doesn't use negative prompts.` });
  }
  return out;
}
