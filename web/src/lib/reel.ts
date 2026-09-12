/**
 * The site's footage index, written by scripts/assets.mjs.
 *
 * Every component that shows a clip reads it from here and must render without one:
 * until the footage is generated the index is empty, and the site falls back to its
 * procedural frames. That keeps the design honest in CI and on a fresh checkout.
 */

import generated from "./reel.generated.json";

export type ClipRole = "hero" | "mode" | "stock" | "texture";

/**
 * Where a clip came from. The site labels it; we never imply the network made it.
 *
 * `kuno` is the only value that may claim network provenance. Everything else is a sample
 * rendered elsewhere — possibly by a model we do not even serve — and must say so.
 */
export type ClipSource = "veo-reference" | "ltx-reference" | "h3-reference" | "kuno";

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
  /** Which service rendered it, e.g. "openrouter". Written by scripts/assets.mjs. */
  provider?: string;
  /** The exact model, e.g. "google/veo-3.1". Shown in the provenance line. */
  model?: string;
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
const MODEL_LABEL: Record<Exclude<ClipSource, "kuno">, string> = {
  "veo-reference": "Google Veo 3.1",
  "ltx-reference": "LTX-2",
  "h3-reference": "MiniMax H3",
};

export function provenanceOf(c: Clip): string {
  if (c.source === "kuno") return "Made on the KunoWorld network · certificate attached";
  return `Sample · ${c.model ?? MODEL_LABEL[c.source]}, not made on the network`;
}

/**
 * Derived from the clips actually present rather than hardcoded, so the wording cannot
 * drift from the footage. The samples may come from a model the network does not serve,
 * so this must never imply otherwise — only a film with a certificate can claim that.
 */
function footageNote(): string {
  const models = Array.from(
    new Set(ALL_CLIPS.filter((c) => c.source !== "kuno").map((c) => c.model ?? MODEL_LABEL[c.source as Exclude<ClipSource, "kuno">])),
  );
  const made = models.length === 0 ? "third-party models" : models.length === 1 ? models[0] : `${models.slice(0, -1).join(", ")} and ${models.at(-1)}`;
  return (
    `Sample footage on this page was generated with ${made}, to show what each kind of request looks like. ` +
    "It was not made on the KunoWorld network, is not output from the models the network serves, and carries no " +
    "certificate — films you make in the studio are."
  );
}

export const FOOTAGE_NOTE = footageNote();
