/**
 * Elements in the studio: words, which models can use each Element, and turning chosen files into a draft. The
 * cryptography is the SDK's (`@kunoworld/sdk`, elements.ts); the gateway contract is platform/gateway/ELEMENTS.md.
 */

import {
  ELEMENT_LIMITS,
  elementRoles,
  sniffMime,
  type Element,
  type ElementFileDraft,
  type ElementKind,
  type InputRole,
  type ModelProfile,
} from "@kunoworld/sdk";

import { probeMedia } from "./media";

export const KIND_LABEL: Record<ElementKind, string> = {
  character: "Character",
  product: "Product",
  location: "Location",
  style: "Style",
  voice: "Voice",
};

export const KIND_HINT: Record<ElementKind, string> = {
  character: "A person or creature. Up to 4 pictures, from different angles.",
  product: "Something to show off. Up to 4 pictures.",
  location: "A place. Up to 4 pictures.",
  style: "A look to follow: colour, light, texture. Up to 4 pictures.",
  voice: "One voice clip, 5 to 15 seconds works best (30 at most).",
};

export const ROLE_LABEL: Partial<Record<InputRole, string>> = {
  first_frame: "first frame",
  last_frame: "last frame",
  keyframe: "keyframe",
  reference_image: "reference image",
  reference_audio: "reference voice",
};

/** The rules, as the studio shows them next to every form. */
export const ELEMENT_RULES_SENTENCE =
  "No public figures and no one under 18. A real person must be you, or must have given you permission. Nothing sexual.";

export const ELEMENTS_PRIVACY_SENTENCE =
  "Elements are encrypted in this browser with your key sync keys before they're stored. KunoWorld can't see their names, descriptions, pictures or voices.";

export const STANDARD_ELEMENT_SENTENCE =
  "In a Standard take, KunoWorld and the GPU provider can see an Element's pictures, voice and description, like any input.";

export interface ModelUse {
  profile: ModelProfile;
  roles: InputRole[];
  /** False where the model isn't licensed here or is switched off. */
  available: boolean;
}

function available(profile: ModelProfile): boolean {
  return profile.available_in_region !== false && profile.enabled !== false;
}

/** For each model that can take this Element's files, the roles it can fill. The description works with every model. */
export function modelUses(element: Pick<Element, "kind">, profiles: ModelProfile[]): ModelUse[] {
  return profiles
    .map((profile) => ({ profile, roles: elementRoles(element, profile), available: available(profile) }))
    .filter((use) => use.roles.length > 0);
}

/** "LTX-2.5 Fast, LTX-2.5 Pro as first frame, keyframe · MiniMax H3 Reference as reference image (not available here)." */
export function modelUsesSentence(element: Pick<Element, "kind">, profiles: ModelProfile[]): string {
  const groups = new Map<string, { names: string[]; available: boolean }>();
  for (const use of modelUses(element, profiles)) {
    const key = `${use.roles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}|${use.available}`;
    const group = groups.get(key) ?? { names: [], available: use.available };
    group.names.push(use.profile.name);
    groups.set(key, group);
  }
  if (!groups.size) {
    return element.kind === "voice" ? "no model takes a voice yet, so it stays stored for later." : "no model takes its pictures here.";
  }
  // Models that can serve here first.
  return `${[...groups.entries()]
    .sort(([, a], [, b]) => Number(b.available) - Number(a.available))
    .map(([key, g]) => `${g.names.join(", ")} as ${key.split("|")[0]}${g.available ? "" : " (not available here)"}`)
    .join(" · ")}.`;
}

const IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const AUDIO_ACCEPT = "audio/wav,audio/x-wav,audio/mpeg,audio/ogg,audio/flac";

export const acceptFor = (kind: ElementKind) => (kind === "voice" ? AUDIO_ACCEPT : IMAGE_ACCEPT);
export const maxFilesFor = (kind: ElementKind) => (kind === "voice" ? 1 : ELEMENT_LIMITS.maxImages);

/** A chosen file, read and probed, ready for a draft. `url` is a local preview. */
export interface PickedFile extends ElementFileDraft {
  url: string;
}

export async function pickFile(file: Blob, name?: string): Promise<PickedFile> {
  const data = new Uint8Array(await file.arrayBuffer());
  // The bytes decide the type, as the gateway and SDK do; the browser's guess is a fallback.
  const mime = sniffMime(data) ?? file.type.replace("audio/x-wav", "audio/wav");
  const typed = new Blob([data], { type: mime });
  const url = URL.createObjectURL(typed);
  const info = await probeMedia(typed, url);
  return {
    data,
    mime,
    url,
    name: name ?? (file instanceof File ? file.name : undefined),
    width: info.width,
    height: info.height,
    durationS: info.duration ? Math.round(info.duration * 10) / 10 : undefined,
  };
}

export const today = (): string => new Date().toISOString().slice(0, 10);
