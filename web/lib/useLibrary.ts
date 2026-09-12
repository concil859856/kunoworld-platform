"use client";

import type { GenerateRequest, JobStatus, KunoClient } from "@kunoworld/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { friendlyError, type FriendlyError } from "./errors";
import { keyFingerprint } from "./kuno";
import { exportEntries, isActive, loadLibrary, parseBackup, saveLibrary, type LibraryEntry } from "./library";
import type { ComposerTab, EditOp, ShotSettings } from "./shot";

/*
 * The studio library.
 *
 * Every take is persisted in this browser with its JobHandle, and the handle carries the
 * output key — the only key that opens the finished film. So a take survives a reload:
 * the ciphertext is re-downloaded from the relay and decrypted here, rather than the
 * video being held in memory. Nothing here is ever sent to the server.
 *
 * Libraries are kept per API key, so connecting with a different key shows a different
 * shelf rather than mixing them.
 */

export interface FilmState {
  url?: string;
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
function statusPatch(s: JobStatus): Partial<LibraryEntry> {
  const base: Partial<LibraryEntry> = { price: s.price_usd };
  if (s.status === "queued") return { ...base, step: "queued", progress: 0 };
  if (s.status === "running") {
    if (s.stage === "sealing" || s.progress >= 0.92) return { ...base, step: "sealing", progress: 1 };
    return { ...base, step: "generating", progress: Math.min(1, Math.max(0, (s.progress - 0.05) / 0.85)) };
  }
  if (s.status === "succeeded") return { ...base, step: "decrypting", progress: 1, receipt: s.receipt ?? undefined };
  return base;
}

export function useLibrary(client: KunoClient | null, apiKey: string | null) {
  const fingerprint = useMemo(() => (apiKey ? keyFingerprint(apiKey) : null), [apiKey]);

  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [films, setFilms] = useState<Record<string, FilmState>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const entriesRef = useRef(entries);
  const filmsRef = useRef(films);
  const controllers = useRef(new Map<string, AbortController>());
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
    return () => Object.values(urls).forEach((f) => f.url && URL.revokeObjectURL(f.url));
  }, []);

  const update = useCallback((id: string, patch: Partial<LibraryEntry>) => {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const setFilm = useCallback((id: string, film: FilmState) => {
    setFilms((f) => ({ ...f, [id]: film }));
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

  /** Polls a job to completion, then downloads, verifies and decrypts it here. */
  const watch = useCallback(
    async (entry: LibraryEntry) => {
      if (!entry.handle || !client) return;
      const id = entry.id;
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
            update(id, statusPatch(s));
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
          setFilm(id, { error: friendlyError(err, "open") });
          update(id, { step: "ready", progress: 1, receipt: lastStatus.receipt ?? undefined });
        } else {
          const error = friendlyError(err, "render");
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

  /** Re-downloads a finished film's ciphertext and decrypts it locally. */
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
        setFilm(entry.id, { error: friendlyError(err, "open") });
      } finally {
        release();
      }
    },
    [client, acquire, release, setFilm, update],
  );

  const submit = useCallback(
    async (input: SubmitInput, snapshot: Snapshot) => {
      if (!client) return;
      const localId = `local-${crypto.randomUUID()}`;
      const draft: LibraryEntry = {
        id: localId,
        handle: null,
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
        step: "encrypting",
        progress: 0,
        price: input.estimate,
      };
      setEntries((list) => [...list, draft]);

      let handle;
      try {
        handle = await client.submit(input.request, (stage) =>
          update(localId, { step: stage === "uploading" || stage === "submitting" ? "uploading" : "encrypting" }),
        );
      } catch (err) {
        update(localId, { step: "failed", error: friendlyError(err, "submit") });
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

  const remove = useCallback((entry: LibraryEntry) => {
    const ok = window.confirm(
      "Remove this take from the library? This deletes the only key to the film from this browser — download it first if you want to keep it.",
    );
    if (!ok) return;
    controllers.current.get(entry.id)?.abort();
    const film = filmsRef.current[entry.id];
    if (film?.url) URL.revokeObjectURL(film.url);
    setEntries((list) => list.filter((e) => e.id !== entry.id));
  }, []);

  const forgetAll = useCallback(() => {
    const ok = window.confirm(
      "Forget the whole library? This deletes every film key stored in this browser. Films you haven't downloaded can't be opened afterwards.",
    );
    if (!ok) return;
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setEntries([]);
  }, []);

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
   * Downloads every film key in this library. The file opens these films anywhere, so it
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
