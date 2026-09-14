"use client";

import {
  KunoError,
  type AnyJobHandle,
  type GenerateRequest,
  type JobStatus,
  type KunoClient,
  type PrivacyMode,
  type StandardVideoSummary,
} from "@kunoworld/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { friendlyError, type FriendlyError } from "./errors";
import { keyFingerprint } from "./kuno";
import {
  exportEntries,
  isActive,
  isStandard,
  loadLibrary,
  parseBackup,
  saveLibrary,
  type LibraryEntry,
  type Step,
} from "./library";
import type { ComposerTab, EditOp, ShotSettings } from "./shot";

/*
 * The studio library.
 *
 * Every private take is persisted in this browser with its JobHandle, and the handle carries the
 * output key — the only key that opens the finished film. So a take survives a reload:
 * the ciphertext is re-downloaded from storage and decrypted here, rather than the
 * video being held in memory. The key is never sent to the server.
 *
 * Standard takes are listed from GET /v1/standard/videos when the studio signs in, shown with a
 * preview frame, and downloaded when opened.
 *
 * In both modes the stored video stays until it is deleted here (DELETE /v1/videos/{id}).
 * Libraries are kept per signed-in account, so another account shows a different shelf.
 */

export interface FilmState {
  url?: string;
  /** A preview frame (standard takes), shown until the video is opened. */
  poster?: string;
  opening?: boolean;
  error?: FriendlyError;
}

export interface Snapshot {
  tab: ComposerTab;
  editOp: EditOp;
  settings: ShotSettings;
}

export interface SubmitInput {
  request: GenerateRequest;
  mode: LibraryEntry["mode"];
  requestedProfileId: string;
  predictedProfileId: string;
  fallbackReason: string | null;
  estimate: number | null;
  inputs: LibraryEntry["inputs"];
}

/** Maps a gateway status onto the entry fields the shelf renders. */
function statusPatch(s: JobStatus, standard: boolean): Partial<LibraryEntry> {
  const base: Partial<LibraryEntry> = { price: s.price_usd };
  if (s.status === "queued") return { ...base, step: "queued", progress: 0 };
  if (s.status === "running") {
    if (!standard && (s.stage === "sealing" || s.progress >= 0.92)) return { ...base, step: "sealing", progress: 1 };
    return { ...base, step: "generating", progress: Math.min(1, Math.max(0, (s.progress - 0.05) / 0.85)) };
  }
  if (s.status === "succeeded") {
    return { ...base, step: standard ? "downloading" : "decrypting", progress: 1, receipt: s.receipt ?? undefined };
  }
  return base;
}

const STEP_FOR_STATE: Record<JobStatus["status"], Step> = {
  queued: "queued",
  running: "generating",
  succeeded: "ready",
  failed: "failed",
  canceled: "canceled",
};

/** A standard take as the gateway lists it. Its receipt arrives when it's opened. */
function standardEntry(client: KunoClient, row: StandardVideoSummary): LibraryEntry {
  const p = row.params;
  const step = STEP_FOR_STATE[row.status] ?? "queued";
  return {
    id: row.job_id,
    handle: client.standardHandle(row),
    privacy: "standard",
    createdAt: row.created_at * 1000,
    prompt: row.prompt ?? "",
    tab: "text",
    editOp: "edit",
    mode: p.mode,
    requestedProfileId: row.profile_id,
    profileId: row.profile_id,
    fallbackReason: null,
    settings: {
      resolution: p.resolution,
      aspectRatio: p.aspect_ratio,
      durationS: p.duration_s,
      fps: p.fps,
      audio: p.audio,
      seed: "",
      negativePrompt: "",
      enhance: false,
    },
    inputs: p.input_roles.map((role) => ({ role, name: "" })),
    step,
    progress: step === "ready" ? 1 : 0,
    price: null,
    error:
      step === "failed" ? friendlyError(new KunoError(0, row.error_code ?? "internal_error", ""), "render", "standard") : undefined,
  };
}

export function useLibrary(client: KunoClient | null, accountId: string | null) {
  // Same label the studio used when it keyed libraries by "account:<id>", so saved takes carry over.
  const fingerprint = useMemo(() => (accountId ? keyFingerprint(`account:${accountId}`) : null), [accountId]);

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [films, setFilms] = useState<Record<string, FilmState>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const entriesRef = useRef(entries);
  const filmsRef = useRef(films);
  const controllers = useRef(new Map<string, AbortController>());
  const thumbnails = useRef(new Set<string>());
  const loadedFor = useRef<string | null>(null);
  // Two decryptions at a time: enough to feel instant, not enough to stall the tab.
  const slots = useRef({ free: 2, queue: [] as Array<() => void> });

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);
  useEffect(() => {
    filmsRef.current = films;
  }, [films]);

  // Swap shelves when the key changes, and persist every change after that.
  useEffect(() => {
    if (loadedFor.current === fingerprint) return;
    loadedFor.current = fingerprint;
    setEntries(fingerprint ? loadLibrary(fingerprint) : []);
  }, [fingerprint]);

  useEffect(() => {
    if (fingerprint && loadedFor.current === fingerprint) saveLibrary(fingerprint, entries);
  }, [fingerprint, entries]);

  useEffect(() => {
    const urls = filmsRef.current;
    return () =>
      Object.values(urls).forEach((f) => {
        if (f.url) URL.revokeObjectURL(f.url);
        if (f.poster) URL.revokeObjectURL(f.poster);
      });
  }, []);

  const update = useCallback((id: string, patch: Partial<LibraryEntry>) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  /** Replaces a take's film state, keeping its preview frame. */
  const setFilm = useCallback((id: string, film: FilmState) => {
    setFilms((f) => ({ ...f, [id]: { poster: f[id]?.poster, ...film } }));
  }, []);

  const acquire = useCallback(async () => {
    const s = slots.current;
    if (s.free > 0) {
      s.free -= 1;
      return;
    }
    await new Promise<void>((resolve) => s.queue.push(resolve));
  }, []);

  const release = useCallback(() => {
    const s = slots.current;
    const next = s.queue.shift();
    if (next) next();
    else s.free += 1;
  }, []);

  /** Polls a job to completion, then fetches it: decrypted here if private, downloaded if standard. */
  const watch = useCallback(
    async (entry: LibraryEntry) => {
      if (!entry.handle || !client) return;
      const id = entry.id;
      const standard = isStandard(entry);
      controllers.current.get(id)?.abort();
      const ctrl = new AbortController();
      controllers.current.set(id, ctrl);
      let last: JobStatus | null = null;
      try {
        const result = await client.wait(entry.handle, {
          signal: ctrl.signal,
          pollMs: 1000,
          onProgress: (s) => {
            last = s;
            update(id, statusPatch(s, standard));
          },
        });
        const url = URL.createObjectURL(new Blob([new Uint8Array(result.video)], { type: "video/mp4" }));
        setFilm(id, { url });
        update(id, { step: "ready", progress: 1, receipt: result.receipt, profileId: result.profileId, error: undefined });
      } catch (err) {
        if (ctrl.signal.aborted) return;
        const lastStatus = last as JobStatus | null;
        if (lastStatus?.status === "succeeded") {
          // It rendered; only opening it here failed, so keep the take openable.
          setFilm(id, { error: friendlyError(err, "open", entry.privacy) });
          update(id, { step: "ready", progress: 1, receipt: lastStatus.receipt ?? undefined });
        } else {
          const error = friendlyError(err, "render", entry.privacy);
          const canceled = error.code === "canceled" || error.code === "job_canceled";
          update(id, { step: canceled ? "canceled" : "failed", error });
        }
      } finally {
        if (controllers.current.get(id) === ctrl) controllers.current.delete(id);
      }
    },
    [client, update, setFilm],
  );

  // Resume anything that was still rendering when the page was last closed.
  useEffect(() => {
    if (!client) return;
    const ctrls = controllers.current;
    for (const e of entriesRef.current) if (e.handle && isActive(e)) void watch(e);
    return () => {
      ctrls.forEach((c) => c.abort());
      ctrls.clear();
    };
  }, [client, watch]);

  // Standard takes come from the gateway. A gateway without standard mode, or credentials that
  // can't list, leave the shelf showing this browser's private takes only.
  useEffect(() => {
    if (!client) return;
    let alive = true;
    client.listStandard(100).then(
      (rows) => {
        if (!alive) return;
        // Deleted rows stay in the gateway's list for billing; they're gone from the shelf.
        const listed = rows.filter((row) => !row.deleted).map((row) => standardEntry(client, row));
        const known = new Set(entriesRef.current.map((e) => e.id));
        const fresh = listed.filter((e) => !known.has(e.id));
        if (!fresh.length) return;
        setEntries((list) => {
          const ids = new Set(list.map((e) => e.id));
          return [...list, ...fresh.filter((e) => !ids.has(e.id))].sort((a, b) => a.createdAt - b.createdAt);
        });
        for (const e of fresh) if (isActive(e) && !controllers.current.has(e.id)) void watch(e);
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [client, watch]);

  // A preview frame for each finished standard take, fetched once.
  useEffect(() => {
    if (!client) return;
    for (const e of entries) {
      if (!isStandard(e) || e.step !== "ready" || !e.handle || thumbnails.current.has(e.id)) continue;
      thumbnails.current.add(e.id);
      const id = e.id;
      client.standardThumbnail(e.handle.jobId).then(
        (bytes) => {
          const poster = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
          setFilms((f) => ({ ...f, [id]: { ...f[id], poster } }));
        },
        () => {
          /* no preview: the card still opens the video */
        },
      );
    }
  }, [client, entries]);

  /** Fetches a finished film: re-downloads and decrypts a private one, downloads a standard one. */
  const openFilm = useCallback(
    async (entry: LibraryEntry) => {
      const current = filmsRef.current[entry.id];
      if (!client || !entry.handle || entry.step !== "ready" || current?.url || current?.opening) return;
      setFilm(entry.id, { opening: true });
      await acquire();
      try {
        const result = await client.result(entry.handle);
        const url = URL.createObjectURL(new Blob([new Uint8Array(result.video)], { type: "video/mp4" }));
        setFilm(entry.id, { url });
        if (!entry.receipt) update(entry.id, { receipt: result.receipt });
      } catch (err) {
        setFilm(entry.id, { error: friendlyError(err, "open", entry.privacy) });
      } finally {
        release();
      }
    },
    [client, acquire, release, setFilm, update],
  );

  const submit = useCallback(
    async (input: SubmitInput, snapshot: Snapshot) => {
      if (!client) return;
      const privacy: PrivacyMode = input.request.privacy ?? "private";
      const standard = privacy === "standard";
      const localId = `local-${crypto.randomUUID()}`;
      const draft: LibraryEntry = {
        id: localId,
        handle: null,
        privacy,
        createdAt: Date.now(),
        prompt: input.request.prompt ?? "",
        tab: snapshot.tab,
        editOp: snapshot.editOp,
        mode: input.mode,
        requestedProfileId: input.requestedProfileId,
        profileId: input.predictedProfileId,
        fallbackReason: input.fallbackReason,
        settings: snapshot.settings,
        inputs: input.inputs,
        step: standard ? "uploading" : "encrypting",
        progress: 0,
        price: input.estimate,
      };
      setEntries((list) => [...list, draft]);

      let handle: AnyJobHandle;
      try {
        handle = await client.submit(input.request, (stage) =>
          update(localId, { step: standard || stage === "uploading" || stage === "submitting" ? "uploading" : "encrypting" }),
        );
      } catch (err) {
        update(localId, { step: "failed", error: friendlyError(err, "submit", privacy) });
        return;
      }
      const next: LibraryEntry = {
        ...draft,
        id: handle.jobId,
        handle,
        profileId: handle.profileId,
        fallbackReason: handle.fallbackReason,
        step: "queued",
      };
      setEntries((list) => list.map((e) => (e.id === localId ? next : e)));
      void watch(next);
    },
    [client, update, watch],
  );

  const cancel = useCallback(
    async (entry: LibraryEntry) => {
      if (!client || !entry.handle) return;
      try {
        await client.cancel(entry.handle.jobId);
      } catch {
        /* the watcher will report whatever the gateway finally says */
      }
      controllers.current.get(entry.id)?.abort();
      update(entry.id, { step: "canceled" });
    },
    [client, update],
  );

  const dropFilm = useCallback((id: string) => {
    const film = filmsRef.current[id];
    if (film?.url) URL.revokeObjectURL(film.url);
    if (film?.poster) URL.revokeObjectURL(film.poster);
    setFilms((f) => {
      const next = { ...f };
      delete next[id];
      return next;
    });
  }, []);

  /**
   * Deletes a take from KunoWorld's storage, in either mode, and then from this shelf. A private
   * take's key is removed from this browser only after the server delete succeeds, so a failed
   * delete never leaves an encrypted video stored with no key to open or find it.
   */
  const remove = useCallback(
    async (entry: LibraryEntry) => {
      const standard = isStandard(entry);
      if (!entry.handle) {
        // Never reached the gateway: nothing is stored anywhere.
        if (!window.confirm("Remove this take from the library? It was never made, so nothing is stored.")) return;
        setEntries((list) => list.filter((e) => e.id !== entry.id));
        return;
      }
      const ok = window.confirm(
        standard
          ? "Delete this video from KunoWorld? Its stored video, prompt and inputs are deleted for good. If it's still rendering, it's canceled first. The charge record stays in your account activity."
          : "Delete this video from KunoWorld? Its encrypted copy is deleted from storage for good, and its key is removed from this browser. Download it first if you want to keep it. If it's still rendering, it's canceled first. The charge record stays in your account activity.",
      );
      if (!ok) return;
      if (!client) {
        setNotice("Sign in to delete videos.");
        return;
      }
      const jobId = entry.handle.jobId;
      if (isActive(entry)) {
        controllers.current.get(entry.id)?.abort();
        await client.cancel(jobId).catch(() => undefined);
      }
      try {
        await client.delete(jobId);
      } catch (err) {
        const error = friendlyError(err, "open", entry.privacy);
        // Already gone on the server: finish removing it here.
        if (!["not_found", "expired", "deleted", "removed"].includes(error.code)) {
          setNotice(`Couldn't delete that video — ${error.title}. It's still in your library${standard ? "" : ", with its key"}.`);
          return;
        }
      }
      controllers.current.get(entry.id)?.abort();
      dropFilm(entry.id);
      setEntries((list) => list.filter((e) => e.id !== entry.id));
    },
    [client, dropFilm],
  );

  const forgetAll = useCallback(() => {
    const keepsStandard = entriesRef.current.some(isStandard);
    const ok = window.confirm(
      "Forget every private video key in this browser? Their encrypted videos stay on KunoWorld's storage, but nobody can open them without a key — back up your keys first. To remove the videos themselves, delete them instead." +
        (keepsStandard ? " Standard takes stay in your KunoWorld library." : ""),
    );
    if (!ok) return;
    const forgotten = entriesRef.current.filter((e) => !isStandard(e)).map((e) => e.id);
    // The decrypted films go too: their object URLs would otherwise leak, and a later
    // restore of the same take would show the old film instead of re-opening its key.
    for (const id of forgotten) {
      controllers.current.get(id)?.abort();
      controllers.current.delete(id);
      dropFilm(id);
    }
    setEntries((list) => list.filter(isStandard));
  }, [dropFilm]);

  /** Reads a film-key backup and adds back anything this browser has forgotten. */
  const restore = useCallback(async (file: File) => {
    let restored: LibraryEntry[];
    try {
      restored = parseBackup(await file.text());
    } catch (err) {
      setNotice(`Couldn't read that backup — ${(err as Error).message}.`);
      return;
    }
    const known = new Set(entriesRef.current.map((e) => e.id));
    const fresh = restored.filter((e) => !known.has(e.id));
    if (!fresh.length) {
      setNotice("Those film keys are already in this library.");
      return;
    }
    setEntries((list) => [...list, ...fresh].sort((a, b) => a.createdAt - b.createdAt));
    setNotice(`Restored ${fresh.length} film key${fresh.length === 1 ? "" : "s"}. Open a take to decrypt it again.`);
  }, []);

  /**
   * Downloads every private film key in this library. The file opens these films anywhere, so it
   * is exactly as sensitive as the films themselves.
   */
  const exportBackup = useCallback(() => {
    const blob = new Blob([exportEntries(entriesRef.current)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunoworld-film-keys-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return { entries, films, notice, setNotice, submit, cancel, openFilm, remove, forgetAll, restore, exportBackup };
}
