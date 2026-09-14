"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { provenanceOf } from "@/lib/reel";
import { heroReel } from "@/lib/showcase";

const REDUCED = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (onChange: () => void) => {
  const media = matchMedia(REDUCED);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const motionAllowed = () => !matchMedia(REDUCED).matches;
const motionOnServer = () => false;

/** "auto" follows the reduced-motion preference; the toggle turns it into an explicit choice. */
type Choice = "auto" | "play" | "pause";

/**
 * The homepage hero: a full-bleed reel of sample clips (lib/showcase.ts `heroReel`) behind a bold
 * headline. A clip hands over to the next when it ends. Nothing plays under reduced motion unless
 * the viewer presses play, the reel pauses offscreen, and the current clip's provenance is always
 * on screen: none of this footage was made on the network.
 */
export function CinematicHero() {
  const clips = heroReel;
  const motionOK = useSyncExternalStore(subscribeMotion, motionAllowed, motionOnServer);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Choice>("auto");
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fills = useRef<Array<HTMLElement | null>>([]);
  const clip = clips[index];
  const wantsPlay = !failed && (choice === "play" || (choice === "auto" && motionOK));
  const shouldPlay = wantsPlay && visible;

  const show = (next: number) => {
    if (next === index) return;
    setIndex(next);
    setReady(false);
    setFailed(false);
  };

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => setVisible(entries[0].isIntersecting), { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (shouldPlay) void el.play().catch(() => {});
    else el.pause();
  }, [shouldPlay, clip.src]);

  // The active segment fills with the clip's real playback position, not a timer that drifts.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      const bar = fills.current[index];
      if (video && bar && video.duration) bar.style.transform = `scaleX(${Math.min(1, video.currentTime / video.duration)})`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, index]);

  // Warm the next poster so a hand-over never flashes an empty frame.
  useEffect(() => {
    if (!wantsPlay || clips.length < 2) return;
    const next = new Image();
    next.src = clips[(index + 1) % clips.length].poster;
  }, [wantsPlay, index, clips]);

  const toggle = () => {
    if (playing) {
      setChoice("pause");
      return;
    }
    setChoice("play");
    setFailed(false);
    const el = videoRef.current;
    if (el?.currentSrc) void el.play().catch(() => {});
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <section ref={sectionRef} className="reel-hero" data-hero="true">
      <div className="reel-media" data-clip={clip.id} style={{ "--focus": clip.focus ?? "50% 50%" } as CSSProperties}>
        <img key={clip.poster} src={clip.poster} alt={clip.alt} fetchPriority={index === 0 ? "high" : "auto"} />
        <video
          ref={videoRef}
          src={wantsPlay ? clip.src : undefined}
          poster={clip.poster}
          muted
          playsInline
          loop={clips.length === 1}
          preload="metadata"
          aria-hidden="true"
          className={ready ? "is-ready" : ""}
          onCanPlay={() => setReady(true)}
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => show((index + 1) % clips.length)}
          onError={() => {
            setFailed(true);
            setPlaying(false);
          }}
        />
      </div>
      <div className="reel-scrim" aria-hidden="true" />

      <div className="reel-content">
        <p className="reel-kicker"><i aria-hidden="true" />MiniMax H3 &amp; LTX-2.5 · Built on Bittensor</p>
        <h1 className="reel-title">Think it.<br />Make it <span className="reel-gradient">move.</span></h1>
        <p className="reel-sub">Cinematic video from a line of text, a single frame or your own references. Private by default: your prompt is encrypted on your device before it leaves.</p>
        <div className="reel-actions">
          <a className="reel-cta reel-cta-primary" href="/studio">Start creating <ArrowUpRight size={18} /></a>
          <a className="reel-cta reel-cta-secondary" href="/developers">Build with the API</a>
        </div>
      </div>

      <div className="reel-controls">
        <div className="reel-track">
          <div className="reel-segments">
            {clips.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className="reel-segment"
                aria-current={i === index ? "true" : undefined}
                aria-label={`Show clip ${i + 1} of ${clips.length}: ${c.title}`}
                onClick={() => show(i)}
              >
                <span>
                  <i
                    ref={(el) => {
                      fills.current[i] = el;
                    }}
                    style={i === index ? undefined : { transform: i < index ? "scaleX(1)" : "scaleX(0)" }}
                  />
                </span>
              </button>
            ))}
          </div>
          <p className="reel-now"><span>{pad(index + 1)} / {pad(clips.length)}</span><strong>{clip.category}</strong><span>{clip.title}</span></p>
        </div>
        <p className="reel-provenance">{provenanceOf(clip)}</p>
        <button type="button" className="reel-toggle" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
      </div>
    </section>
  );
}
