/**
 * Client-side request checks. Mirrors validate_roles / validate_params in
 * kuno_protocol/profiles.py so problems show inline before anything is encrypted,
 * uploaded or charged. The gateway and the enclave still enforce the same rules.
 */

import {
  numFrames,
  shotPrompt,
  storyboardDurationS,
  storyboardTrimFrames,
  type InputRole,
  type Mode,
  type ModelProfile,
  type ShotJoin,
} from "@kunoworld/sdk";

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
  storyboard: { required: [], allowed: [] },
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
  storyboard: "Storyboard",
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
  /** A storyboard shot the problem is about (from 0), so its card can show it. */
  shot?: number;
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
  // A storyboard's length comes from its shots, which validateStoryboard checks one by one.
  const timed = params.mode !== "storyboard";
  if (timed && (params.durationS < lim.min_duration_s || params.durationS > lim.max_duration_s)) {
    out.push({ code: "duration", message: `Duration must be between ${lim.min_duration_s} and ${lim.max_duration_s} seconds.` });
  } else if (timed) {
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
  const fpsMax = lim.max_duration_s_by_fps?.[String(params.fps)];
  if (timed && fpsMax !== undefined && lim.fps.includes(params.fps) && params.durationS > fpsMax) {
    out.push({ code: "duration_fps", message: `At ${params.fps} fps, ${profile.name} renders up to ${fpsMax} seconds.` });
  }
  if (params.audio && !lim.audio) out.push({ code: "audio", message: `${profile.name} can't generate audio.` });
  return [...out, ...validateRoles(profile, params.mode, roles)];
}

/** `optional`: a storyboard's scene, which may be empty. */
export function validatePrompt(profile: ModelProfile, prompt: string, negativePrompt?: string, optional = false): Problem[] {
  const out: Problem[] = [];
  if (!optional && !prompt.trim()) out.push({ code: "prompt_empty", message: "Describe the shot first." });
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

export interface ShotDraft {
  prompt: string;
  durationS: number;
  join: ShotJoin;
}

const n = (x: number) => x.toLocaleString("en-US");
const seconds = (x: number) => `${Number(x.toFixed(1))} s`;

/**
 * A storyboard's rules, from `_validate_storyboard` in kuno_protocol/profiles.py, plus what the enclave refuses: 2 to
 * `max_shots` shots, each within the profile's duration limits with a prompt that fits alongside the scene, and a
 * stitched length within `max_total_s`. The first shot's join is always fresh, so it isn't checked here: the composer
 * sends it that way. Problems about one shot carry its index.
 */
export function validateStoryboard(profile: ModelProfile, scene: string, shots: ShotDraft[], fps: number): Problem[] {
  const out: Problem[] = [];
  const lim = profile.limits;
  const board = lim.storyboard;
  if (!board) return out; // validateRoles already says the model doesn't do storyboards.
  if (shots.length < 2 || shots.length > board.max_shots) {
    out.push({ code: "shot_count", message: `A storyboard has 2 to ${board.max_shots} shots — you have ${shots.length}.` });
  }
  const fpsMax = lim.max_duration_s_by_fps?.[String(fps)];
  const trim = storyboardTrimFrames(profile);
  const max = lim.max_prompt_chars;
  let durationsOk = true;
  shots.forEach((shot, i) => {
    const name = `Shot ${i + 1}`;
    if (!shot.prompt.trim()) out.push({ code: "shot_prompt_empty", message: `${name} needs a prompt.`, shot: i });
    const length = shotPrompt(scene, shot.prompt).length;
    if (length > max) {
      out.push({
        code: "shot_prompt_long",
        message: `${name} and the scene come to ${n(length)} characters; ${profile.name} takes ${n(max)}.`,
        shot: i,
      });
    }
    const steps = (shot.durationS - lim.min_duration_s) / (lim.duration_step_s || 1);
    if (shot.durationS < lim.min_duration_s || shot.durationS > lim.max_duration_s || Math.abs(steps - Math.round(steps)) > 1e-6) {
      durationsOk = false;
      out.push({ code: "shot_duration", message: `${name} must be ${lim.min_duration_s}–${lim.max_duration_s} seconds, in whole steps.`, shot: i });
    } else if (fpsMax !== undefined && shot.durationS > fpsMax) {
      durationsOk = false;
      out.push({ code: "shot_duration_fps", message: `At ${fps} fps, ${name.toLowerCase()} can be at most ${fpsMax} seconds.`, shot: i });
    } else if (i > 0 && shot.join !== "fresh" && numFrames(profile, shot.durationS, fps) <= trim) {
      durationsOk = false;
      out.push({ code: "shot_too_short", message: `${name} is too short to join to the shot before.`, shot: i });
    }
  });
  if (durationsOk && shots.length) {
    const stitched = storyboardDurationS(profile, specsOf(shots), fps);
    if (stitched > board.max_total_s + 1e-6) {
      out.push({
        code: "storyboard_long",
        message: `These shots make ${seconds(stitched)}; a storyboard can be at most ${board.max_total_s} s. Shorten or remove a shot.`,
      });
    }
  }
  return out;
}

/** The shots as the protocol sees them: the first always fresh. */
export function specsOf(shots: Pick<ShotDraft, "durationS" | "join">[]): { duration_s: number; join: ShotJoin }[] {
  return shots.map((shot, i) => ({ duration_s: shot.durationS, join: i === 0 ? "fresh" : shot.join }));
}
