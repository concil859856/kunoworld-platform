"use client";

import type { JobStatus } from "@kunoworld/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { openConnect } from "@/components/site/ConnectDialog";
import { profilesOrCatalog, isH3 } from "@/lib/catalog";
import { friendlyError, type FriendlyError } from "@/lib/errors";
import { keyFingerprint, makeClient, useApiKey } from "@/lib/kuno";
import { isActive, loadLibrary, saveLibrary, type LibraryEntry } from "@/lib/library";
import { extractLastFrame } from "@/lib/media";
import { supportsTab } from "@/lib/shot";
import { useModels, type LiveModels } from "@/lib/useModels";

import { Composer } from "./Composer";
import { EMPTY_INPUTS, useComposer, type ComposerSnapshot, type Submission } from "./composerState";
import { Feed } from "./Feed";
import { Inspector } from "./Inspector";
import { Rail } from "./Rail";
import styles from "./Studio.module.css";

export interface FilmState {
  url?: string;
  opening?: boolean;
  error?: FriendlyError;
}

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

/** Keeps a separate library per API key; remounts when the key changes. */
export function Studio() {
  const apiKey = useApiKey();
  const live = useModels(20_000);
  return <StudioSession key={apiKey ? keyFingerprint(apiKey) : "anonymous"} apiKey={apiKey} live={live} />;
}

function StudioSession({ apiKey, live }: { apiKey: string | null; live: LiveModels }) {
  const fingerprint = apiKey ? keyFingerprint(apiKey) : null;
  const client = useMemo(() => makeClient(apiKey), [apiKey]);
  const profiles = useMemo(() => profilesOrCatalog(live.data?.models), [live.data]);
  const composer = useComposer(profiles);
  const { actions: composerActions, state: composerState } = composer;

  const [entries, setEntries] = useState<LibraryEntry[]>(() => (fingerprint ? loadLibrary(fingerprint) : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [films, setFilms] = useState<Record<string, FilmState>>({});
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const initialEntries = useRef(entries);
  const controllers = useRef(new Map<string, AbortController>());
  const inputCache = useRef(new Map<string, ComposerSnapshot>());
  const filmsRef = useRef(films);
  const toastTimer = useRef<number | undefined>(undefined);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const slots = useRef({ free: 2, queue: [] as Array<() => void> });

  useEffect(() => {
    filmsRef.current = films;
  }, [films]);

  useEffect(() => {
    if (fingerprint) saveLibrary(fingerprint, entries);
  }, [fingerprint, entries]);

  // Pick a sensible first stock once live availability is known, unless the user already chose.
  useEffect(() => {
    if (!live.data || composerState.touched) return;
    const current = profiles.find((p) => p.id === composerState.profileId);
    const ok = (p: (typeof profiles)[number]) =>
      p.enabled !== false && p.available_in_region !== false && (p.workers ?? 0) > 0 && supportsTab(p, composerState.tab, composerState.editOp);
    if (current && ok(current)) return;
    const pick = profiles.find(ok);
    if (pick) composerActions.setProfile(pick, true);
  }, [live.data, profiles, composerState.touched, composerState.profileId, composerState.tab, composerState.editOp, composerActions]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
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
      if (!entry.handle) return;
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
          setFilm(id, { error: friendlyError(err, "open") });
          update(id, { step: "ready", progress: 1, receipt: lastStatus.receipt ?? undefined });
        } else {
          const error = friendlyError(err, "render");
          update(id, { step: error.code === "job_canceled" ? "canceled" : "failed", error });
        }
      } finally {
        if (controllers.current.get(id) === ctrl) controllers.current.delete(id);
      }
    },
    [client, update, setFilm],
  );

  // Resume anything that was still rendering when the page was last closed.
  useEffect(() => {
    const ctrls = controllers.current;
    for (const e of initialEntries.current) if (e.handle && isActive(e)) void watch(e);
    return () => {
      ctrls.forEach((c) => c.abort());
      ctrls.clear();
    };
  }, [watch]);

  useEffect(() => {
    return () => {
      Object.values(filmsRef.current).forEach((f) => f.url && URL.revokeObjectURL(f.url));
    };
  }, []);

  /** Re-downloads a finished film's ciphertext and decrypts it locally (two at a time). */
  const ensureFilm = useCallback(
    async (entry: LibraryEntry) => {
      const current = filmsRef.current[entry.id];
      if (!entry.handle || entry.step !== "ready" || current?.url || current?.opening || current?.error) return;
      filmsRef.current = { ...filmsRef.current, [entry.id]: { opening: true } };
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

  const generate = useCallback(
    async (sub: Submission) => {
      if (!apiKey) {
        openConnect();
        return;
      }
      const localId = `local-${crypto.randomUUID()}`;
      const draft: LibraryEntry = {
        id: localId,
        handle: null,
        createdAt: Date.now(),
        prompt: sub.request.prompt,
        tab: sub.snapshot.tab,
        editOp: sub.snapshot.editOp,
        mode: sub.mode,
        requestedProfileId: sub.requested.id,
        profileId: sub.predicted.id,
        fallbackReason: sub.fallbackReason,
        settings: sub.snapshot.settings,
        inputs: sub.summaries,
        step: "encrypting",
        progress: 0,
        price: sub.estimate,
      };
      setEntries((list) => [...list, draft]);
      setSelectedId(localId);
      inputCache.current.set(localId, sub.snapshot);
      let handle;
      try {
        handle = await client.submit(sub.request, (stage) =>
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
      inputCache.current.set(handle.jobId, sub.snapshot);
      inputCache.current.delete(localId);
      setEntries((list) => list.map((e) => (e.id === localId ? next : e)));
      setSelectedId((cur) => (cur === localId ? handle.jobId : cur));
      void watch(next);
    },
    [apiKey, client, update, watch],
  );

  const selected = entries.find((e) => e.id === selectedId) ?? null;

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setInspectorOpen(true);
    setRailOpen(false);
  }, []);

  const cancel = useCallback(
    async (entry: LibraryEntry) => {
      try {
        await client.cancel(entry.id);
        notify("Canceled. The price is refunded automatically.");
      } catch (err) {
        notify(friendlyError(err, "render").title);
      }
    },
    [client, notify],
  );

  const remove = useCallback(
    (entry: LibraryEntry) => {
      const ok = window.confirm(
        "Remove this take from the library? This deletes the only key to the film from this browser — download it first if you want to keep it.",
      );
      if (!ok) return;
      controllers.current.get(entry.id)?.abort();
      const film = filmsRef.current[entry.id];
      if (film?.url) URL.revokeObjectURL(film.url);
      setEntries((list) => list.filter((e) => e.id !== entry.id));
      setSelectedId((cur) => (cur === entry.id ? null : cur));
    },
    [],
  );

  const reuse = useCallback(
    (entry: LibraryEntry) => {
      const cached = inputCache.current.get(entry.id);
      const snapshot: ComposerSnapshot = cached ?? {
        tab: entry.tab,
        editOp: entry.editOp,
        profileId: entry.requestedProfileId,
        prompt: entry.prompt,
        settings: entry.settings,
        inputs: EMPTY_INPUTS,
      };
      const lostInputs = !cached && entry.inputs.length > 0;
      composerActions.load(
        snapshot,
        lostInputs ? "Settings restored. Frames and references aren't kept after a reload — add them again." : null,
      );
      setInspectorOpen(false);
      promptRef.current?.focus();
      notify("Settings are back in the composer.");
    },
    [composerActions, notify],
  );

  const useLastFrame = useCallback(
    async (entry: LibraryEntry) => {
      const url = filmsRef.current[entry.id]?.url;
      if (!url) return;
      try {
        const blob = await extractLastFrame(url);
        const item = composerActions.addMedia(new File([blob], `last-frame-${entry.id.slice(0, 8)}.png`, { type: "image/png" }));
        composerActions.setTab("frames");
        composerActions.updateInputs((inputs) => ({ ...inputs, first: item }));
        setInspectorOpen(false);
        promptRef.current?.focus();
        notify("The last frame is now the first frame of a new shot.");
      } catch (err) {
        notify(`Couldn't grab the last frame: ${(err as Error).message}.`);
      }
    },
    [composerActions, notify],
  );

  const copyLink = useCallback(
    async (entry: LibraryEntry) => {
      if (!entry.receipt) return;
      const link = `${window.location.origin}/verify?sha256=${entry.receipt.body.content_digest}`;
      try {
        await navigator.clipboard.writeText(link);
        notify("Certificate link copied. It reveals nothing but the film's credits.");
      } catch {
        window.prompt("Copy the certificate link:", link);
      }
    },
    [notify],
  );

  const forgetAll = useCallback(() => {
    const ok = window.confirm(
      "Forget the whole library? This deletes every film key stored in this browser. Films you haven't downloaded can't be opened afterwards.",
    );
    if (!ok) return;
    controllers.current.forEach((c) => c.abort());
    controllers.current.clear();
    setEntries([]);
    setSelectedId(null);
  }, []);

  const counts = useMemo(() => {
    if (!live.data) return null;
    const max = Math.max(0, ...live.data.models.map((m) => m.workers ?? 0));
    return { stages: max, h3Here: live.data.models.some((m) => isH3(m) && m.available_in_region) };
  }, [live.data]);

  return (
    <div className={styles.studio} data-inspector={inspectorOpen && selected ? "open" : "closed"} data-rail={railOpen ? "open" : "closed"}>
      <aside className={styles.rail} aria-label="Library">
        <Rail
          entries={entries}
          selectedId={selectedId}
          onSelect={select}
          onForget={forgetAll}
          connected={Boolean(apiKey)}
          onClose={() => setRailOpen(false)}
        />
      </aside>

      <section className={styles.center} aria-label="Takes">
        <div className={styles.toolbar}>
          <button type="button" className={`btn btn-small ${styles.railToggle}`} onClick={() => setRailOpen(true)}>
            Library · {entries.length}
          </button>
          <h1 className={styles.heading}>Studio</h1>
          <span className={styles.seal} title="Stages are checked by your browser before anything is sent">
            <span className={styles.sealDot} data-live={counts ? "true" : "false"} aria-hidden="true" />
            {counts ? `Sealed · ${counts.stages} stage${counts.stages === 1 ? "" : "s"} online` : live.settled ? "Network unreachable" : "Checking network…"}
          </span>
          <span className={styles.keysNote}>Film keys stay in this browser</span>
          {selected && (
            <button type="button" className={`btn btn-small ${styles.inspectorToggle}`} onClick={() => setInspectorOpen(true)}>
              Inspector
            </button>
          )}
        </div>
        <Feed
          entries={entries}
          films={films}
          profiles={profiles}
          selectedId={selectedId}
          connected={Boolean(apiKey)}
          onSelect={select}
          onNeedFilm={ensureFilm}
          onSuggest={(text) => {
            composerActions.setPrompt(text);
            promptRef.current?.focus();
          }}
        />
      </section>

      <div className={styles.composer}>
        <Composer composer={composer} profiles={profiles} live={live} connected={Boolean(apiKey)} onGenerate={generate} promptRef={promptRef} />
      </div>

      <aside className={styles.inspector} aria-label="Inspector">
        <Inspector
          entry={selected}
          film={selected ? films[selected.id] : undefined}
          profiles={profiles}
          onClose={() => setInspectorOpen(false)}
          onCancel={cancel}
          onRemove={remove}
          onReuse={reuse}
          onUseLastFrame={useLastFrame}
          onCopyLink={copyLink}
          onOpenFilm={ensureFilm}
        />
      </aside>

      <div className={styles.scrim} onClick={() => { setInspectorOpen(false); setRailOpen(false); }} aria-hidden="true" />

      <div className={styles.toast} role="status" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}
