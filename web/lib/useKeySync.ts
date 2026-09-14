"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, vaultApi } from "./keyvault-api";
import {
  KeySyncError,
  dismissPrompt,
  entryFromRecord,
  forgetDeviceKey,
  loadDeviceKey,
  loadSynced,
  makePasskeyUnlocker,
  makeRecoveryUnlocker,
  newId,
  newMasterKey,
  passkeysForThisSite,
  promptDismissed,
  rewrapJobKey,
  saveDeviceKey,
  saveSynced,
  syncable,
  syncedState,
  unlockWithPasskey,
  unlockWithRecoveryCode,
  unwrapJobKey,
  wrapJobKey,
  type Unlocker,
  type Vault,
} from "./keyvault";
import { keyFingerprint } from "./kuno";
import type { LibraryEntry } from "./library";

/*
 * Key sync for one signed-in account (lib/keyvault.ts has the cryptography).
 *
 * - off:        no vault yet. The studio offers to set one up after the first Private take.
 * - locked:     a vault exists, but this browser doesn't have the master key. Unlock with the recovery code or a passkey.
 * - unlocked:   synced keys are opened into the library, and this browser's private keys (made here, restored from a
 *               backup, or from before key sync) are wrapped and uploaded, once each and again when a take finishes.
 * - unavailable: the gateway or this site can't serve key sync; the library works as before, on this browser's keys.
 *
 * With no library (the account page), unlocking only remembers the key here, for managing unlockers and rotating.
 */

export type KeySyncStatus = "signed_out" | "loading" | "unavailable" | "off" | "locked" | "unlocked";

export interface KeySyncLibrary {
  entries: LibraryEntry[];
  importEntries: (entries: LibraryEntry[]) => number;
  setNotice: (notice: string | null) => void;
}

export interface VaultSummary {
  masterKeyId: string;
  version: number;
  jobKeyCount: number;
  createdAt: number;
  updatedAt: number;
  unlockers: Unlocker[];
}

const summarize = (vault: Vault): VaultSummary => ({
  masterKeyId: vault.master_key_id,
  version: vault.version,
  jobKeyCount: vault.job_key_count,
  createdAt: vault.created_at,
  updatedAt: vault.updated_at,
  unlockers: vault.unlockers,
});

function describe(err: unknown): string {
  if (err instanceof KeySyncError || err instanceof ApiError) {
    const message = err.message.trim();
    return /[.!?]$/.test(message) ? message : `${message}.`;
  }
  return "Something went wrong. Try again.";
}

/** How long a key that failed to upload waits before key sync tries again. */
const RETRY_MS = 30_000;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function useKeySync(accountId: string | null, library?: KeySyncLibrary) {
  const fingerprint = useMemo(() => (accountId ? keyFingerprint(`account:${accountId}`) : null), [accountId]);
  const [status, setStatus] = useState<KeySyncStatus>("loading");
  const [vault, setVault] = useState<VaultSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // Bumped after a failed upload, so the upload runs again without waiting for the library to change.
  const [retry, setRetry] = useState(0);

  const master = useRef<{ id: string; key: Uint8Array } | null>(null);
  const synced = useRef<Record<string, string>>({});
  const pushing = useRef(false);
  const pushAgain = useRef(false);
  const libraryRef = useRef(library);
  useEffect(() => {
    libraryRef.current = library;
  });

  /** Opens every synced key and adds the takes this library doesn't have yet. */
  const pull = useCallback(
    async (current: Vault, key: Uint8Array) => {
      const lib = libraryRef.current;
      if (!accountId || !fingerprint || !lib) return;
      const next: Record<string, string> = {};
      const entries: LibraryEntry[] = [];
      let broken = 0;
      for (const item of current.job_keys) {
        try {
          const record = await unwrapJobKey(accountId, key, item);
          next[item.job_id] = record.contentDigest ?? "";
          entries.push(entryFromRecord(record));
        } catch {
          broken += 1;
        }
      }
      synced.current = next;
      saveSynced(fingerprint, next);
      const added = lib.importEntries(entries);
      if (added) lib.setNotice(`Unlocked ${plural(added, "private video key")} from key sync. Open a take to decrypt it here.`);
      if (broken) setError(`${plural(broken, "synced key")} couldn't be opened with this master key.`);
    },
    [accountId, fingerprint],
  );

  /** Remembers the master key on this browser and treats the vault as unlocked. */
  const adopt = useCallback(
    async (current: Vault, key: Uint8Array, { pullKeys = true } = {}) => {
      if (!fingerprint) return;
      master.current = { id: current.master_key_id, key };
      saveDeviceKey(fingerprint, current.master_key_id, key);
      setVault(summarize(current));
      if (pullKeys) await pull(current, key);
      setStatus("unlocked");
    },
    [fingerprint, pull],
  );

  const refresh = useCallback(async () => {
    if (!accountId || !fingerprint) {
      setStatus("signed_out");
      return;
    }
    let current: Vault | null;
    try {
      current = libraryRef.current ? await vaultApi.load() : await vaultApi.summary();
    } catch {
      setStatus("unavailable");
      return;
    }
    if (!current) {
      master.current = null;
      forgetDeviceKey(fingerprint);
      setVault(null);
      setStatus("off");
      return;
    }
    const device = loadDeviceKey(fingerprint);
    if (device && device.masterKeyId === current.master_key_id) {
      await adopt(current, device.key, { pullKeys: Boolean(libraryRef.current) });
      return;
    }
    // Rotated on another device, or never unlocked here.
    if (device) forgetDeviceKey(fingerprint);
    master.current = null;
    setVault(summarize(current));
    setStatus("locked");
  }, [accountId, fingerprint, adopt]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      await Promise.resolve();
      if (!alive) return;
      setDismissed(fingerprint ? promptDismissed(fingerprint) : false);
      synced.current = fingerprint ? loadSynced(fingerprint) : {};
      await refresh();
    })();
    return () => {
      alive = false;
    };
  }, [fingerprint, refresh]);

  /** Uploads (wrapped) every private key this library holds that key sync doesn't have in its current state. */
  const push = useCallback(async () => {
    if (!accountId || !fingerprint) return;
    if (pushing.current) {
      pushAgain.current = true;
      return;
    }
    pushing.current = true;
    try {
      do {
        pushAgain.current = false;
        for (const entry of libraryRef.current?.entries ?? []) {
          const unlocked = master.current;
          if (!unlocked) return;
          if (!syncable(entry)) continue;
          const state = syncedState(entry);
          if (synced.current[entry.id] === state) continue;
          try {
            const wrapped = await wrapJobKey(accountId, unlocked.key, entry);
            const result = await vaultApi.putJobKey(entry.id, unlocked.id, wrapped);
            synced.current = { ...synced.current, [entry.id]: state };
            saveSynced(fingerprint, synced.current);
            setVault((v) => v && { ...v, version: result.version, jobKeyCount: v.jobKeyCount + (result.created ? 1 : 0) });
            setError((e) => (e?.startsWith("Couldn't sync a key") ? null : e));
          } catch (err) {
            if (err instanceof ApiError && (err.code === "vault_changed" || err.code === "no_vault")) {
              await refresh();
              return;
            }
            if (err instanceof ApiError && (err.status === 404 || err.code === "not_private")) {
              // The video is gone from KunoWorld, or was never private: nothing to keep.
              synced.current = { ...synced.current, [entry.id]: state };
              continue;
            }
            if (err instanceof ApiError && err.code === "vault_full") {
              setError(`${describe(err)} Newer keys stay in this browser only.`);
              return;
            }
            setError(`Couldn't sync a key: ${describe(err)} It's still in this browser, and key sync tries again shortly.`);
            window.setTimeout(() => setRetry((n) => n + 1), RETRY_MS);
            return;
          }
        }
      } while (pushAgain.current);
    } finally {
      pushing.current = false;
    }
  }, [accountId, fingerprint, refresh]);

  const entries = library?.entries;
  useEffect(() => {
    if (status === "unlocked" && entries) void push();
  }, [status, entries, push, retry]);

  const run = useCallback(async (label: string, work: () => Promise<void>): Promise<boolean> => {
    setBusy(label);
    setError(null);
    try {
      await work();
      return true;
    } catch (err) {
      setError(describe(err));
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const setUp = useCallback(
    (code: string) =>
      run("Turning on key sync…", async () => {
        if (!accountId) throw new KeySyncError("signed_out", "Sign in again.");
        const key = newMasterKey();
        const unlocker = await makeRecoveryUnlocker(accountId, key, code);
        let created: Vault;
        try {
          created = await vaultApi.create(newId(), [unlocker]);
        } catch (err) {
          if (err instanceof ApiError && err.code === "vault_exists") {
            await refresh();
            throw new KeySyncError("vault_exists", "Key sync was already turned on from another device. Unlock with that recovery code.");
          }
          throw err;
        }
        synced.current = {};
        await adopt(created, key);
      }),
    [accountId, adopt, refresh, run],
  );

  const unlockWith = useCallback(
    (how: "code" | "passkey", code = "") =>
      run(how === "code" ? "Unlocking…" : "Waiting for your passkey…", async () => {
        if (!accountId) throw new KeySyncError("signed_out", "Sign in again.");
        const current = libraryRef.current ? await vaultApi.load() : await vaultApi.summary();
        if (!current) {
          await refresh();
          throw new KeySyncError("no_vault", "Key sync is off for this account.");
        }
        const key = how === "code" ? await unlockWithRecoveryCode(accountId, current.unlockers, code) : await unlockWithPasskey(accountId, current.unlockers);
        await adopt(current, key, { pullKeys: Boolean(libraryRef.current) });
      }),
    [accountId, adopt, refresh, run],
  );

  const reloadSummary = useCallback(async () => {
    const current = await vaultApi.summary();
    if (!current) await refresh();
    else setVault(summarize(current));
  }, [refresh]);

  const addPasskey = useCallback(
    (label?: string) =>
      run("Waiting for your passkey…", async () => {
        const unlocked = master.current;
        if (!accountId || !unlocked) throw new KeySyncError("locked", "Unlock key sync in this browser first.");
        const me = (await fetch("/auth/me", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)) as { email?: string } | null;
        const exclude = (vault?.unlockers ?? []).filter((u) => u.kind === "passkey").map((u) => (u.params as { credential_id: string }).credential_id);
        const unlocker = await makePasskeyUnlocker(accountId, unlocked.key, {
          userName: me?.email ?? "KunoWorld account",
          label: label || "Passkey",
          exclude,
        });
        await vaultApi.addUnlocker(unlocked.id, unlocker);
        await reloadSummary();
      }),
    [accountId, reloadSummary, run, vault],
  );

  const removeUnlocker = useCallback(
    (unlockerId: string) =>
      run("Removing…", async () => {
        await vaultApi.removeUnlocker(unlockerId);
        await reloadSummary();
      }),
    [reloadSummary, run],
  );

  /** A new master key and recovery code; every synced key re-wrapped here, then replaced at once. Passkeys are removed. */
  const rotate = useCallback(
    (code: string) =>
      run("Rotating your keys…", async () => {
        const unlocked = master.current;
        if (!accountId || !fingerprint || !unlocked) throw new KeySyncError("locked", "Unlock key sync in this browser first.");
        const current = await vaultApi.load();
        if (!current) {
          await refresh();
          throw new KeySyncError("no_vault", "Key sync is off for this account.");
        }
        if (current.master_key_id !== unlocked.id) {
          await refresh();
          throw new KeySyncError("vault_changed", "Your keys were rotated on another device. Unlock again first.");
        }
        const key = newMasterKey();
        const jobKeys = [];
        for (const item of current.job_keys) jobKeys.push({ job_id: item.job_id, wrapped: await rewrapJobKey(accountId, unlocked.key, key, item) });
        const unlocker = await makeRecoveryUnlocker(accountId, key, code);
        const rotated = await vaultApi.rotate(current.version, newId(), [unlocker], jobKeys);
        // The same records under a new key: nothing to download or upload again.
        await adopt(rotated, key, { pullKeys: false });
      }),
    [accountId, adopt, fingerprint, refresh, run],
  );

  /** Forgets the master key on this browser only. Synced keys stay in the vault. */
  const lock = useCallback(() => {
    if (!fingerprint) return;
    master.current = null;
    forgetDeviceKey(fingerprint);
    setStatus((s) => (s === "unlocked" ? "locked" : s));
  }, [fingerprint]);

  const turnOff = useCallback(
    () =>
      run("Turning off key sync…", async () => {
        await vaultApi.turnOff();
        master.current = null;
        if (fingerprint) {
          forgetDeviceKey(fingerprint);
          saveSynced(fingerprint, {});
        }
        synced.current = {};
        setVault(null);
        setStatus("off");
      }),
    [fingerprint, run],
  );

  const dismiss = useCallback(() => {
    if (fingerprint) dismissPrompt(fingerprint);
    setDismissed(true);
  }, [fingerprint]);

  const passkeyUnlockers = useMemo(() => (vault ? passkeysForThisSite(vault.unlockers) : []), [vault]);

  return {
    status: accountId ? status : ("signed_out" as const),
    vault,
    busy,
    error,
    setError,
    dismissed,
    dismiss,
    hasPasskey: passkeyUnlockers.length > 0,
    setUp,
    unlockWithCode: (code: string) => unlockWith("code", code),
    unlockWithPasskey: () => unlockWith("passkey"),
    addPasskey,
    removeUnlocker,
    rotate,
    lock,
    turnOff,
    refresh,
  };
}

export type KeySync = ReturnType<typeof useKeySync>;
