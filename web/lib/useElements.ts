"use client";

import {
  KunoError,
  deriveElementsKey,
  formatElementsKey,
  type Element,
  type ElementDraft,
  type ElementFileDraft,
  type KunoClient,
} from "@kunoworld/sdk";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { KeySync } from "./useKeySync";

/*
 * The signed-in account's Elements (platform/gateway/ELEMENTS.md), opened in this browser.
 *
 * They're sealed under a key derived from the key sync master key, so they need key sync unlocked here:
 * - signed_out, loading: nothing to show yet.
 * - key_sync_off:  no vault. Turning key sync on is the first step.
 * - locked:        a vault exists but this browser hasn't unlocked it.
 * - ready:         listed and opened. Files are downloaded and opened only when something needs them, and kept here as
 *                  object URLs until the Element changes or the page closes.
 * - unavailable:   the gateway doesn't serve Elements, or can't be reached.
 */

export type ElementsStatus = "signed_out" | "loading" | "key_sync_off" | "locked" | "ready" | "unavailable";

export interface OpenedFile {
  blob: Blob;
  url: string;
}

function message(err: unknown): string {
  if (err instanceof KunoError) {
    const text = err.message.trim();
    return /[.!?]$/.test(text) ? text : `${text}.`;
  }
  return "Something went wrong. Try again.";
}

export function useElements(client: KunoClient | null, accountId: string | null, keySync: Pick<KeySync, "status" | "masterKey">) {
  const [elements, setElements] = useState<Element[]>([]);
  const [unreadable, setUnreadable] = useState(0);
  const [loaded, setLoaded] = useState<"no" | "yes" | "failed">("no");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, OpenedFile>>({});
  const pending = useRef(new Map<string, Promise<OpenedFile>>());
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  });

  const master = keySync.masterKey;
  const key = useMemo(
    () => (master && accountId ? deriveElementsKey(master.key, accountId, master.id) : null),
    [master, accountId],
  );

  const reload = useCallback(async () => {
    if (!client || !key) return;
    try {
      const list = await client.elements.list(key);
      setElements([...list.elements].sort((a, b) => b.updatedAt - a.updatedAt));
      setUnreadable(list.unreadable.length);
      setLoaded("yes");
    } catch (err) {
      setLoaded("failed");
      setError(err instanceof KunoError && err.status === 404 ? null : message(err));
    }
  }, [client, key]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      if (!alive) return;
      setLoaded("no");
      if (!key) {
        // Locked, signed out or rotated elsewhere: nothing opened under the old key stays in the page.
        for (const opened of Object.values(filesRef.current)) URL.revokeObjectURL(opened.url);
        setFiles({});
        setElements([]);
        setUnreadable(0);
        return;
      }
      await reload();
    })();
    return () => {
      alive = false;
    };
  }, [key, reload]);

  // Opened files are per Element revision: a changed or deleted Element's object URLs go.
  useEffect(() => {
    const live = new Set(elements.map((e) => `${e.elementId}:${e.revision}:`));
    const stale = Object.keys(filesRef.current).filter((id) => ![...live].some((prefix) => id.startsWith(prefix)));
    if (!stale.length) return;
    for (const id of stale) URL.revokeObjectURL(filesRef.current[id].url);
    setFiles((current) => Object.fromEntries(Object.entries(current).filter(([id]) => !stale.includes(id))));
  }, [elements]);

  useEffect(
    () => () => {
      for (const file of Object.values(filesRef.current)) URL.revokeObjectURL(file.url);
    },
    [],
  );

  /** One of an Element's files, opened here. Asked for twice at once, it downloads once. */
  const file = useCallback(
    (element: Element, position = 0): Promise<OpenedFile> => {
      const id = `${element.elementId}:${element.revision}:${position}`;
      const have = filesRef.current[id];
      if (have) return Promise.resolve(have);
      const inFlight = pending.current.get(id);
      if (inFlight) return inFlight;
      if (!client) return Promise.reject(new KunoError(0, "signed_out", "Sign in again."));
      const work = client.elements
        .file(element, position)
        .then((data) => {
          const blob = new Blob([new Uint8Array(data)], { type: element.files[position]?.mime ?? "application/octet-stream" });
          const opened = { blob, url: URL.createObjectURL(blob) };
          setFiles((current) => ({ ...current, [id]: opened }));
          return opened;
        })
        .finally(() => pending.current.delete(id));
      pending.current.set(id, work);
      return work;
    },
    [client],
  );

  const run = useCallback(async <T>(label: string, work: () => Promise<T>): Promise<T | null> => {
    setBusy(label);
    setError(null);
    try {
      return await work();
    } catch (err) {
      setError(message(err));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const create = useCallback(
    (draft: ElementDraft) =>
      run("Encrypting and saving…", async () => {
        if (!client || !key) throw new KunoError(0, "locked", "Unlock key sync in this browser first.");
        const made = await client.elements.create(key, draft, { affirmRules: true });
        setElements((current) => [made, ...current]);
        return made;
      }),
    [client, key, run],
  );

  /** Without `files`, the Element keeps its files. */
  const update = useCallback(
    (element: Element, draft: Omit<ElementDraft, "files"> & { files?: ElementFileDraft[] }) =>
      run("Encrypting and saving…", async () => {
        if (!client || !key) throw new KunoError(0, "locked", "Unlock key sync in this browser first.");
        try {
          const saved = await client.elements.update(key, element, draft, { affirmRules: true });
          setElements((current) => [saved, ...current.filter((e) => e.elementId !== saved.elementId)]);
          return saved;
        } catch (err) {
          if (err instanceof KunoError && err.code === "element_changed") {
            await reload();
            throw new KunoError(0, "element_changed", "This Element was changed on another device. It's been reloaded: make your change again.");
          }
          throw err;
        }
      }),
    [client, key, reload, run],
  );

  const remove = useCallback(
    (element: Element) =>
      run("Deleting…", async () => {
        if (!client) throw new KunoError(0, "signed_out", "Sign in again.");
        await client.elements.delete(element.elementId);
        setElements((current) => current.filter((e) => e.elementId !== element.elementId));
        return true;
      }),
    [client, run],
  );

  let status: ElementsStatus;
  if (!accountId || keySync.status === "signed_out") status = "signed_out";
  else if (keySync.status === "loading") status = "loading";
  else if (keySync.status === "unavailable") status = "unavailable";
  else if (keySync.status === "off") status = "key_sync_off";
  else if (keySync.status === "locked" || !key) status = "locked";
  else if (loaded === "no") status = "loading";
  else if (loaded === "failed" && !elements.length) status = "unavailable";
  else status = "ready";

  return {
    status,
    elements,
    /** Stored Elements this browser's key didn't open (made under older keys, or damaged). */
    unreadable,
    busy,
    error,
    setError,
    files,
    file,
    create,
    update,
    remove,
    reload,
    /** The Elements key as text, for a program using the SDK (`parseElementsKey`). Null until unlocked. */
    keyText: key ? formatElementsKey(key) : null,
  };
}

export type ElementsLibrary = ReturnType<typeof useElements>;
