/**
 * The site's footage index, written by scripts/assets.mjs.
 *
 * Every component that shows a clip reads it from here and must render without one:
 * until the footage is generated the index is empty, and the site falls back to its
 * procedural frames. That keeps the design honest in CI and on a fresh checkout.
 */

import generated from "./reel.generated.json";

export type ClipRole = "hero" | "mode" | "stock" | "texture";

/** Where a clip came from. The site labels it; we never imply the network made it. */
export type ClipSource = "ltx-reference" | "h3-reference" | "kuno";

export interface Clip {
  id: string;
  role: ClipRole;
  mode?: string;
  family?: string;
  src: string;
  poster: string;
  width: number;
  height: number;
  duration: number;
  audio: boolean;
  alt: string;
  prompt: string;
  source: ClipSource;
  endpoint: string;
}

const INDEX = (generated.clips ?? {}) as unknown as Record<string, Clip>;

export const ALL_CLIPS: Clip[] = Object.values(INDEX);

/** True once any footage has been generated. Components branch on this, not on file existence. */
export const HAS_FOOTAGE = ALL_CLIPS.length > 0;

export function clip(id: string): Clip | undefined {
  return INDEX[id];
}

export function clipsByRole(role: ClipRole): Clip[] {
  return ALL_CLIPS.filter((c) => c.role === role);
}

export function clipForMode(mode: string): Clip | undefined {
  return ALL_CLIPS.find((c) => c.mode === mode);
}

export function clipForFamily(family: string): Clip | undefined {
  return ALL_CLIPS.find((c) => c.family === family);
}

/**
 * The provenance line shown under sample footage. Reference renders come from the same
 * open weights the network runs, but they were not made by a sealed stage and carry no
 * certificate — so they never claim one.
 */
export function provenanceOf(c: Clip): string {
  switch (c.source) {
    case "kuno":
      return "Made on the KunoWorld network · certificate attached";
    case "h3-reference":
      return "Reference render · MiniMax H3 weights, not made on the network";
    default:
      return "Reference render · LTX-2 weights, not made on the network";
  }
}

export const FOOTAGE_NOTE =
  "Sample footage is rendered from the same open weights the network runs. It is not network output and carries no certificate — films you make in the studio do.";
