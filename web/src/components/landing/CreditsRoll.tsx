"use client";

import { useEffect, useRef } from "react";

import { EndCredits, type CreditLine } from "@/components/verify/EndCredits";
import { edgeCode } from "@/lib/format";

import styles from "./CreditsRoll.module.css";

const LINES: CreditLine[] = [
  { role: "Directed by", value: "You" },
  { role: "Model", value: "MiniMax H3 Turbo" },
  { role: "Attribution", value: "MiniMax H3" },
  { role: "Stage", value: `Sealed stage ${edgeCode("stage", 8)}…`, mono: true },
  { role: "Proof of hardware", value: "Checked by your browser before anything was sent" },
  { role: "Software image", value: `sha256:${edgeCode("image", 12)}…${edgeCode("image-tail", 6)}`, mono: true },
  { role: "Content hash", value: `${edgeCode("content", 16)}…${edgeCode("content-tail", 8)}`, mono: true },
  { role: "Signature", value: "Valid ✓", tone: "ok" },
  { role: "Rendered", value: "2026-09-11 21:04 UTC · 38 s in the stage" },
  { role: "Format", value: "1344×768 · 24 fps · 8 s · stereo audio" },
  { role: "Seen by", value: "Nobody else" },
];

/** An example certificate rolling like end credits. Pauses offscreen; static for reduced motion. */
export function CreditsRoll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      el.dataset.running = entry.isIntersecting ? "true" : "false";
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure className={styles.figure}>
      <div ref={ref} className={styles.roll} data-running="false">
        <div className={styles.crawl}>
          <EndCredits lines={LINES} title="Certificate" kicker="A KunoWorld film" />
        </div>
      </div>
      <figcaption className={styles.caption}>
        Example certificate — values are illustrative. Real ones are looked up by the film&apos;s hash.
      </figcaption>
    </figure>
  );
}
