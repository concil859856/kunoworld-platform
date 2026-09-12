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
