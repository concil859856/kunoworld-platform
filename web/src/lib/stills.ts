/**
 * The site's stills index, written by scripts/stills.mjs.
 *
 * Two roles that must not be confused:
 *
 *   input   real source media for a mode that takes media — a first frame, a last frame,
 *           keyframes, reference images. These are what we feed LTX-2's image-to-video,
 *           first/last-frame and reference endpoints, so a demo of those modes is an
 *           honest job rather than a text prompt dressed up as an image one.
 *   poster  a holding frame for a mode tile until its clip exists. Replaced by a frame cut
 *           from the real video, and never presented as video.
 *
 * As with the reel, every component reads from here and must render without anything.
 */

import generated from "./stills.generated.json";

export type StillRole = "input" | "poster";

export interface Still {
  id: string;
  role: StillRole;
  /** The mode this still belongs to, as a Mode id. */
  for: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  prompt: string;
  source: string;
  model: string;
}

const INDEX = (generated.stills ?? {}) as unknown as Record<string, Still>;

export const ALL_STILLS: Still[] = Object.values(INDEX);

export const HAS_STILLS = ALL_STILLS.length > 0;

export function still(id: string): Still | undefined {
  return INDEX[id];
}

/** The holding frame for a mode tile, used only until that mode has real footage. */
export function posterForMode(mode: string): Still | undefined {
  return ALL_STILLS.find((s) => s.role === "poster" && s.for === mode);
}

/** The source media a mode takes, in manifest order. */
export function inputsForMode(mode: string): Still[] {
  return ALL_STILLS.filter((s) => s.role === "input" && s.for === mode);
}

export const STILLS_NOTE =
  "Stills are generated reference images, not network output. The ones marked as inputs are the actual media fed to the model in these examples.";
