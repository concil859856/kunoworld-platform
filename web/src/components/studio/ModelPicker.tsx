"use client";

import type { ModelProfile } from "@kunoworld/sdk";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { AvailabilityPill } from "@/components/site/AvailabilityPill";
import { FAMILY_H3, FAMILY_LTX, STOCKS, durationRange, fpsRange, isH3, minRate, resolutionRange, variantLabel } from "@/lib/catalog";
import { rate } from "@/lib/format";
import { availability, supportsTab, unsupportedReason, type ComposerTab, type EditOp } from "@/lib/shot";

import styles from "./ModelPicker.module.css";

/** The model picker, styled as a shelf of film stocks grouped by family. */
export function ModelPicker({
  profiles,
  selected,
  onSelect,
  tab,
  editOp,
  live,
}: {
  profiles: ModelProfile[];
  selected: ModelProfile;
  onSelect: (p: ModelProfile) => void;
  tab: ComposerTab;
  editOp: EditOp;
  live: boolean;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    const first =
      panel.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]') ??
      panel.current?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])');
    first?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function choose(p: ModelProfile) {
    onSelect(p);
    setOpen(false);
    trigger.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const opts = Array.from(panel.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
    const i = opts.indexOf(document.activeElement as HTMLElement);
    const move = (to: number) => {
      e.preventDefault();
      opts[(to + opts.length) % opts.length]?.focus();
    };
    if (e.key === "ArrowDown") move(i + 1);
    else if (e.key === "ArrowUp") move(i - 1);
    else if (e.key === "Home") move(0);
    else if (e.key === "End") move(opts.length - 1);
    else if (e.key === "Escape" || e.key === "Tab") {
      if (e.key === "Escape") e.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
  }

  const selectedAvailability = availability(selected, live);

  return (
    <div className={styles.picker}>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.triggerFamily} data-family={isH3(selected) ? "h3" : "ltx"}>
          {STOCKS[selected.family]?.brand ?? selected.family}
        </span>
        <span className={styles.triggerName}>{variantLabel(selected)}</span>
        <AvailabilityPill availability={selectedAvailability} compact />
        <span className={styles.chevron} aria-hidden="true" />
        <span className="sr-only">Change film stock</span>
      </button>

      {open && (
        <div ref={panel} id={`${id}-list`} className={styles.panel} role="listbox" aria-label="Film stock" onKeyDown={onKeyDown}>
          {[FAMILY_H3, FAMILY_LTX].map((family) => {
            const stock = STOCKS[family];
            return (
              <div key={family} role="group" aria-labelledby={`${id}-${family}`} className={styles.group}>
                <div id={`${id}-${family}`} className={styles.groupHead} data-family={family === FAMILY_H3 ? "h3" : "ltx"}>
                  <strong>{stock.brand}</strong>
                  <em>{stock.stockName}</em>
                </div>
                {profiles
                  .filter((p) => p.family === family)
                  .map((p) => {
                    const fits = supportsTab(p, tab, editOp);
                    const av = availability(p, live);
                    return (
                      <div
                        key={p.id}
                        role="option"
                        tabIndex={-1}
                        aria-selected={p.id === selected.id}
                        aria-disabled={!fits}
                        className={styles.option}
                        onClick={() => fits && choose(p)}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && fits) {
                            e.preventDefault();
                            choose(p);
                          }
                        }}
                      >
                        <span className={styles.optHead}>
                          <span className={styles.optName}>{isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`}</span>
                          {fits ? <AvailabilityPill availability={av} compact /> : <span className={styles.why}>{unsupportedReason(p, tab, editOp)}</span>}
                        </span>
                        <span className={styles.optTag}>{p.tagline}</span>
                        <span className={styles.optSpecs}>
                          {resolutionRange(p)} · {durationRange(p)} · {fpsRange(p)} · from {rate(minRate(p))}/s
                        </span>
                        {fits && (av.state === "region" || av.state === "off" || av.state === "empty") && (
                          <span className={styles.why}>{av.detail}</span>
                        )}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
