/**
 * The studio library: one entry per take, persisted in this browser's localStorage.
 * Each entry holds the SDK JobHandle — including the output key, the only key that
 * opens the finished film. Nothing here is ever sent to the server; films are
 * re-downloaded as ciphertext and decrypted locally when opened.
 */

import type { InputRole, JobHandle, Mode, Receipt } from "@kunoworld/sdk";

import type { FriendlyError } from "./errors";
import type { ComposerTab, EditOp, ShotSettings } from "./shot";

export type Step =
  | "encrypting"
  | "uploading"
  | "queued"
  | "generating"
  | "sealing"
  | "decrypting"
  | "ready"
  | "failed"
  | "canceled";

export interface InputSummary {
  role: InputRole;
  name: string;
  timeS?: number;
  startS?: number;
  endS?: number;
}

export interface LibraryEntry {
  /** Job id once submitted; a local id before that. */
  id: string;
  handle: JobHandle | null;
  createdAt: number;
  prompt: string;
  tab: ComposerTab;
  editOp: EditOp;
  mode: Mode;
  requestedProfileId: string;
  profileId: string;
  fallbackReason: string | null;
  settings: ShotSettings;
  inputs: InputSummary[];
  step: Step;
  /** 0..1 of the generating step. */
  progress: number;
  /** Charged price once the gateway accepted the job, else the estimate. */
  price: number | null;
  receipt?: Receipt;
  error?: FriendlyError;
}

const PREFIX = "kuno.library.v1:";
const MAX_ENTRIES = 300;

export function loadLibrary(fingerprint: string): LibraryEntry[] {
  try {
    const raw = window.localStorage.getItem(PREFIX + fingerprint);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.id === "string" && e.handle) : [];
  } catch {
    return [];
  }
}

export function saveLibrary(fingerprint: string, entries: LibraryEntry[]): boolean {
  try {
    const persistable = entries.filter((e) => e.handle).slice(-MAX_ENTRIES);
    window.localStorage.setItem(PREFIX + fingerprint, JSON.stringify(persistable));
    return true;
  } catch {
    return false;
  }
}

export function isActive(entry: LibraryEntry): boolean {
  return !["ready", "failed", "canceled"].includes(entry.step);
}

// ---------------------------------------------------------------- key backup

/**
 * Backup and restore of the film keys. The file holds every JobHandle, so it
 * opens the films anywhere — it is as sensitive as the films themselves and
 * never leaves the user's machine unless they send it somewhere.
 */

export const BACKUP_KIND = "kunoworld-film-keys";
export const BACKUP_VERSION = 2;

const FALLBACK_SETTINGS: ShotSettings = {
  resolution: "",
  aspectRatio: "16:9",
  durationS: 5,
  fps: 24,
  audio: true,
  seed: "",
  negativePrompt: "",
  enhance: false,
};

export function exportEntries(entries: LibraryEntry[]): string {
  // `error` is transient UI state; JSON.stringify drops the undefined.
  const films = entries.filter((e) => e.handle).map((e) => ({ ...e, error: undefined }));
  return JSON.stringify({ kind: BACKUP_KIND, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), films }, null, 2);
}

function restorable(entry: unknown): entry is LibraryEntry {
  const e = entry as LibraryEntry | null;
  const h = e?.handle;
  return Boolean(h && typeof h.jobId === "string" && typeof h.outputKey === "string" && typeof h.signingPublicKey === "string");
}

/** Fills anything an older or hand-edited backup left out, so a restore never renders a broken card. */
function normalize(entry: LibraryEntry): LibraryEntry {
  const handle = entry.handle!;
  const step: Step = entry.step === "failed" || entry.step === "canceled" ? entry.step : "ready";
  return {
    ...entry,
    id: handle.jobId,
    handle,
    createdAt: typeof entry.createdAt === "number" ? entry.createdAt : (handle.createdAt ?? 0) * 1000 || Date.now(),
    prompt: typeof entry.prompt === "string" ? entry.prompt : "",
    tab: entry.tab ?? "text",
    editOp: entry.editOp ?? "edit",
    mode: entry.mode ?? "text_to_video",
    requestedProfileId: entry.requestedProfileId ?? handle.profileId,
    profileId: entry.profileId ?? handle.profileId,
    fallbackReason: entry.fallbackReason ?? handle.fallbackReason ?? null,
    settings: { ...FALLBACK_SETTINGS, ...entry.settings },
    inputs: Array.isArray(entry.inputs) ? entry.inputs : [],
    step,
    progress: 1,
    price: typeof entry.price === "number" ? entry.price : null,
    error: undefined,
  };
}

/** Throws an explanatory Error when the file isn't a usable backup. */
export function parseBackup(text: string): LibraryEntry[] {
  let data: { kind?: unknown; films?: unknown };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error("that file isn't JSON");
  }
  if (!data || data.kind !== BACKUP_KIND) throw new Error("that isn't a KunoWorld film-key backup");
  if (!Array.isArray(data.films)) throw new Error("the backup has no films list");
  const films = data.films.filter(restorable).map(normalize);
  if (!films.length) throw new Error("the backup holds no film keys");
  return films;
}
