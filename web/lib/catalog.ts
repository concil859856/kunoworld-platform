/**
 * The model catalog. Static pages render from a snapshot of
 * kuno_protocol/profiles.json (the same file the gateway and workers load);
 * live pages replace it with /v1/models, which adds availability and worker counts.
 */

import type { Limits, ModelProfile } from "@kunoworld/sdk";

import raw from "./profiles.json";

export const FAMILY_H3 = "minimax-h3";
export const FAMILY_LTX = "ltx-2.5";

const LIMIT_DEFAULTS: Partial<Limits> = {
  duration_step_s: 1,
  max_inputs: {},
  input_groups: [],
  max_total_inputs: null,
  visual_required_with_audio: false,
  max_prompt_chars: 2000,
  negative_prompt: false,
  prompt_enhancer: false,
  seed: true,
};

/** Fills the defaults pydantic applies server-side, so snapshot and live profiles look the same. */
export function normalizeProfile(profile: ModelProfile): ModelProfile {
  return {
    ...profile,
    timeout_s: profile.timeout_s ?? 1800,
    limits: { ...LIMIT_DEFAULTS, ...profile.limits } as Limits,
  };
}

export const CATALOG: ModelProfile[] = (raw.profiles as unknown as ModelProfile[]).map(normalizeProfile);

export function profilesOrCatalog(live: ModelProfile[] | undefined | null): ModelProfile[] {
  return live && live.length ? live.map(normalizeProfile) : CATALOG;
}

export function isH3(profile: Pick<ModelProfile, "family">): boolean {
  return profile.family === FAMILY_H3;
}

export interface Stock {
  family: string;
  brand: string;
  stockName: string;
  code: string;
  bestFor: string;
}

export const STOCKS: Record<string, Stock> = {
  [FAMILY_H3]: {
    family: FAMILY_H3,
    brand: "MiniMax H3",
    stockName: "The Ensemble Stock",
    code: "KW-H3 768E",
    bestFor: "Performances, dialogue and scenes built from your own cast, props and voices.",
  },
  [FAMILY_LTX]: {
    family: FAMILY_LTX,
    brand: "LTX-2.5",
    stockName: "The Fast Stock",
    code: "KW-LTX 4K25",
    bestFor: "Quick drafts, precise keyframes, retakes and high-resolution finals.",
  },
};

export function stockFor(profile: Pick<ModelProfile, "family">): Stock {
  return STOCKS[profile.family] ?? { family: profile.family, brand: profile.family, stockName: "", code: "", bestFor: "" };
}

const VARIANT_LABELS: Record<string, string> = {
  "h3-turbo": "Turbo",
  h3: "H3",
  "h3-reference": "Director",
  "ltx-2.5-fast": "Fast",
  "ltx-2.5-pro": "Pro",
  "ltx-2.5-4k": "4K",
};

export function variantLabel(profile: Pick<ModelProfile, "id" | "name">): string {
  return VARIANT_LABELS[profile.id] ?? profile.name;
}

/** Resolutions with their per-second rates, cheapest first. */
export function ratesOf(profile: ModelProfile): Array<[string, number]> {
  return Object.entries(profile.pricing.usd_per_second).sort((a, b) => a[1] - b[1]);
}

export function minRate(profile: ModelProfile): number {
  return Math.min(...Object.values(profile.pricing.usd_per_second));
}

export function durationRange(profile: ModelProfile): string {
  return `${profile.limits.min_duration_s}–${profile.limits.max_duration_s} s`;
}

export function resolutionRange(profile: ModelProfile): string {
  const keys = Object.keys(profile.limits.sizes);
  return keys.length > 1 ? `${keys[0]}–${keys[keys.length - 1]}` : keys[0];
}

export function fpsRange(profile: ModelProfile): string {
  const fps = profile.limits.fps;
  return fps.length > 1 ? `${fps[0]}–${fps[fps.length - 1]} fps` : `${fps[0]} fps`;
}

export function familyProfiles(profiles: ModelProfile[], family: string): ModelProfile[] {
  return profiles.filter((p) => p.family === family);
}
