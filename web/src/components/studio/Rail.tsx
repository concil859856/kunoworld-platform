"use client";

import { useMemo, useState } from "react";

import { openConnect } from "@/components/site/ConnectDialog";
import { CATALOG, isH3, variantLabel } from "@/lib/catalog";
import { LINKS } from "@/lib/config";
import { clockTime, relativeDay } from "@/lib/format";
import { exportEntries, isActive, type LibraryEntry } from "@/lib/library";

import styles from "./Rail.module.css";

type Filter = "all" | "active" | "ready" | "failed";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Rendering" },
  { id: "ready", label: "Ready" },
  { id: "failed", label: "Failed" },
];

function stockName(profileId: string): string {
  const p = CATALOG.find((x) => x.id === profileId);
  if (!p) return profileId;
  return isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`;
}

function backup(entries: LibraryEntry[]) {
  const blob = new Blob([exportEntries(entries)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kunoworld-film-keys-${new Date().toISOString().slice(0, 10)}.json`;
  // Some browsers only honour a click on an anchor that is in the document.
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Rail({
  entries,
  selectedId,
  onSelect,
  onForget,
  onRestore,
  connected,
  onClose,
}: {
  entries: LibraryEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onForget: () => void;
  onRestore: (file: File) => void;
  connected: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const shown = [...entries]
      .reverse()
      .filter((e) => {
        if (filter === "active" && !isActive(e)) return false;
        if (filter === "ready" && e.step !== "ready") return false;
        if (filter === "failed" && e.step !== "failed" && e.step !== "canceled") return false;
        return !q || e.prompt.toLowerCase().includes(q) || stockName(e.profileId).toLowerCase().includes(q);
      });
    const out: Array<{ day: string; items: LibraryEntry[] }> = [];
    for (const e of shown) {
      const day = relativeDay(e.createdAt);
      const last = out[out.length - 1];
      if (last && last.day === day) last.items.push(e);
      else out.push({ day, items: [e] });
    }
    return out;
  }, [entries, query, filter]);

  return (
    <div className={styles.rail}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Library <span className={styles.count}>{entries.length}</span>
        </h2>
        <button type="button" className={`btn btn-small btn-quiet ${styles.close}`} onClick={onClose}>
          Close
        </button>
      </div>

      <label className={styles.search}>
        <span className="sr-only">Search the library</span>
        <input type="search" placeholder="Search takes" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p className={styles.searchNote}>Search runs on this device.</p>

      <div className={styles.filters} role="group" aria-label="Filter">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className={styles.list}>
        {!connected && (
          <div className={styles.empty}>
            <p>Connect an API key to start a library. Each key keeps its own.</p>
            <button type="button" className="btn btn-small btn-primary" onClick={openConnect}>
              Connect
            </button>
          </div>
        )}
        {connected && entries.length === 0 && <p className={styles.empty}>Takes you make appear here, newest first.</p>}
        {groups.map((g) => (
          <section key={g.day} className={styles.group}>
            <h3 className={styles.day}>{g.day}</h3>
            <ul role="list">
              {g.items.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={styles.item}
                    aria-current={e.id === selectedId ? "true" : undefined}
                    data-step={e.step}
                    onClick={() => onSelect(e.id)}
                  >
                    <span className={styles.state} aria-hidden="true" />
                    <span className={styles.itemText}>
                      <span className={styles.prompt}>{e.prompt || "Untitled take"}</span>
                      <span className={styles.meta}>
                        {stockName(e.profileId)} · {e.settings.durationS} s · {clockTime(e.createdAt)}
                      </span>
                    </span>
                    <span className="sr-only">
                      {e.step === "ready" ? "ready" : e.step === "failed" ? "failed" : e.step === "canceled" ? "canceled" : "rendering"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className={styles.foot}>
        <p>
          Each film&apos;s key is stored only in this browser. Clear this site&apos;s data and those films can&apos;t be
          opened — download what you want to keep.
        </p>
        <div className={styles.footButtons}>
          {entries.some((e) => e.handle) && (
            <button type="button" className="btn btn-small" onClick={() => backup(entries)} title="Anyone with this file can open these films">
              Back up keys
            </button>
          )}
          {/* A label around a real file input: clickable, keyboard-reachable, and named for screen readers. */}
          <label className={`btn btn-small ${styles.restore}`} title="Load a backup file to bring film keys back to this browser">
            <span aria-hidden="true">Restore keys</span>
            <input
              type="file"
              className="sr-only"
              accept="application/json,.json"
              aria-label="Restore keys"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) onRestore(file);
              }}
            />
          </label>
          {entries.some((e) => e.handle) && (
            <button type="button" className="btn btn-small btn-quiet" onClick={onForget}>
              Forget all
            </button>
          )}
        </div>
        <p className={styles.license}>
          MiniMax H3 is used under the{" "}
          <a href={LINKS.h3License} target="_blank" rel="noreferrer">
            MiniMax H3 Community License
          </a>
          ; LTX-2.5 under the{" "}
          <a href={LINKS.ltxLicense} target="_blank" rel="noreferrer">
            LTX-2 Community License
          </a>
          .
        </p>
      </div>
    </div>
  );
}
