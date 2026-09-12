"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import type { Clip as ClipData } from "@/lib/reel";

import styles from "./Clip.module.css";

/*
 * One piece of footage.
 *
 * A page of this site can hold twenty of these, so nothing plays unless it is on screen:
 * each clip starts when it scrolls in and stops when it leaves. Under reduced motion
 * nothing moves at all — the poster frame stands in, with a control to play it on purpose.
 * Sound is always off until the viewer asks for it.
 *
 * With no footage generated yet, `fallback` renders instead (usually a procedural frame),
 * so the layout is identical before and after the reel exists.
 */

export interface ClipProps {
  clip?: ClipData;
  /** Shown when the clip has not been generated yet. */
  fallback?: ReactNode;
  /** Width/height ratio for the box. Defaults to the clip's own. */
  ratio?: string;
  /** Load immediately rather than on scroll — for the hero only. */
  priority?: boolean;
  /** Offer a sound toggle on clips that have an audio track. */
  sound?: boolean;
  className?: string;
  children?: ReactNode;
}

export function Clip({ clip, fallback, ratio, priority = false, sound = false, className = "", children }: ClipProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const labelId = useId();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(motion.matches);
    apply();
    motion.addEventListener("change", apply);

    // Play only what the viewer can actually see.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (motion.matches) return;
        if (entry.isIntersecting) {
          video.play().then(() => setPlaying(true)).catch(() => {
            /* autoplay refused; the poster stays and the control appears */
          });
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") video.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      motion.removeEventListener("change", apply);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clip?.src]);

  if (!clip) {
    return (
      <div className={`${styles.box} ${className}`} style={{ aspectRatio: ratio ?? "16 / 9" }}>
        {fallback ?? <div className={styles.empty} aria-hidden="true" />}
        {children}
      </div>
    );
  }

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      className={`${styles.box} ${className}`}
      style={{ aspectRatio: ratio ?? `${clip.width} / ${clip.height}` }}
      data-ready={ready}
    >
      <video
        ref={videoRef}
        className={styles.video}
        poster={clip.poster}
        muted={muted}
        loop
        playsInline
        preload={priority ? "auto" : "none"}
        autoPlay={priority}
        aria-labelledby={labelId}
        onLoadedData={() => setReady(true)}
      >
        <source src={clip.src} type="video/mp4" />
      </video>

      <p id={labelId} className="sr-only">
        {clip.alt}
      </p>

      <div className={styles.controls}>
        {reduced && (
          <button type="button" className={styles.control} onClick={toggle} aria-pressed={playing}>
            {playing ? "Pause" : "Play"}
          </button>
        )}
        {sound && clip.audio && (
          <button
            type="button"
            className={styles.control}
            onClick={() => {
              setMuted((m) => !m);
              const video = videoRef.current;
              if (video?.paused) void video.play().then(() => setPlaying(true)).catch(() => {});
            }}
            aria-pressed={!muted}
          >
            {muted ? "Sound on" : "Sound off"}
          </button>
        )}
      </div>

      {children}
    </div>
  );
}
