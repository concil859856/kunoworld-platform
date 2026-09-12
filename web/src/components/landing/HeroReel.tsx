"use client";

import { useEffect, useRef, useState } from "react";

import { clipsByRole, type Clip } from "@/lib/reel";

import { DevelopingFrame } from "./DevelopingFrame";
import styles from "./HeroReel.module.css";

/*
 * The hero: full-bleed footage behind the headline, one shot at a time.
 *
 * This manages its own <video> elements rather than using <Clip>, because every shot is
 * on screen at once and only one may decode at a time. The active shot plays, the next
 * one preloads, the rest stay parked. When a shot ends the reel crossfades to the next.
 *
 * Fallbacks, in order: real footage → the procedural developing frame (WebGL) → a still
 * gradient. Under reduced motion the reel holds a single poster and never cycles.
 */

const HOLD_MS = 9000; // safety advance if 'ended' never fires (autoplay blocked)

export function HeroReel() {
  const clips = clipsByRole("hero");
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(motion.matches);
    apply();
    motion.addEventListener("change", apply);
    return () => motion.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!clips.length || reduced) return;
    const current = videos.current[active];
    if (!current) return;

    videos.current.forEach((video, i) => {
      if (!video || i === active) return;
      video.pause();
      if (i !== (active + 1) % clips.length) video.currentTime = 0;
    });

    current.currentTime = 0;
    void current.play().catch(() => {
      /* refused: the poster carries the frame and the timer still advances the reel */
    });

    const advance = () => setActive((i) => (i + 1) % clips.length);
    current.addEventListener("ended", advance);
    const timer = window.setTimeout(advance, HOLD_MS);
    return () => {
      current.removeEventListener("ended", advance);
      window.clearTimeout(timer);
    };
  }, [active, clips.length, reduced]);

  if (!clips.length) {
    return (
      <div className={styles.reel} data-empty="true">
        <DevelopingFrame background />
      </div>
    );
  }

  return (
    <div className={styles.reel}>
      {clips.map((shot: Clip, i) => (
        <video
          key={shot.id}
          ref={(node) => {
            videos.current[i] = node;
          }}
          className={styles.shot}
          data-active={i === active}
          poster={shot.poster}
          muted
          playsInline
          preload={i === 0 ? "auto" : "none"}
          autoPlay={i === 0 && !reduced}
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src={shot.src} type="video/mp4" />
        </video>
      ))}

      <div className={styles.scrim} aria-hidden="true" />

      <p className="sr-only">{clips[active]?.alt}</p>

      {!reduced && clips.length > 1 && (
        <div className={styles.ticks} role="tablist" aria-label="Reel">
          {clips.map((shot, i) => (
            <button
              key={shot.id}
              type="button"
              role="tab"
              className={styles.tick}
              data-active={i === active}
              aria-selected={i === active}
              aria-label={`Shot ${i + 1}`}
              onClick={() => setActive(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
