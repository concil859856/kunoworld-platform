"use client";

import type { ModelsResponse } from "@kunoworld/sdk";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { useLiveModels } from "@/components/site/LiveModels";
import { FAMILY_H3, FAMILY_LTX } from "@/lib/catalog";

import styles from "./StagesTonight.module.css";

/** `workers_online` counts each stage once network-wide; per-family figures are lower bounds. */
export function stageCounts(data: ModelsResponse | null) {
  if (!data) return null;
  const maxOf = (family: string) =>
    Math.max(0, ...data.models.filter((m) => m.family === family).map((m) => m.workers ?? 0));
  return { all: data.workers_online, h3: maxOf(FAMILY_H3), ltx: maxOf(FAMILY_LTX) };
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function NightLights({ count }: { count: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rand = mulberry(7);
    const dust = Array.from({ length: 420 }, () => ({ x: rand(), y: 0.35 + rand() * 0.65, a: rand() }));
    const lr = mulberry(1913);
    const lights = Array.from({ length: Math.min(count, 600) }, () => ({
      x: 0.08 + lr() * 0.84,
      y: 0.45 + lr() * 0.45,
      phase: lr() * Math.PI * 2,
      size: 0.8 + lr() * 0.9,
    }));
    let raf = 0;
    let onscreen = false;

    const draw = (now: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#07060a");
      sky.addColorStop(1, "#0b0907");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // The planet's limb, as seen from a window seat.
      const cx = w / 2;
      const r = w * 1.6;
      const cy = h * 0.32 + r;
      const glow = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 26);
      glow.addColorStop(0, "rgba(230,163,74,0.16)");
      glow.addColorStop(1, "rgba(230,163,74,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0e0b09";
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      for (const d of dust) {
        ctx.fillStyle = `rgba(237,229,216,${0.025 + d.a * 0.04})`;
        ctx.fillRect(d.x * w, d.y * h, 1, 1);
      }
      const t = now / 1000;
      for (const l of lights) {
        const tw = reduce ? 1 : 0.75 + 0.25 * Math.sin(t * 0.7 + l.phase);
        const x = l.x * w;
        const y = l.y * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14 * l.size);
        g.addColorStop(0, `rgba(241,183,101,${0.45 * tw})`);
        g.addColorStop(1, "rgba(241,183,101,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 14 * l.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,226,170,${0.95 * tw})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.3 * l.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = onscreen && !reduce && lights.length ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      onscreen = entry.isIntersecting;
      if (onscreen && !raf) raf = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const ro = new ResizeObserver(() => {
      if (!raf) raf = requestAnimationFrame(loop);
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [count]);

  return <canvas ref={ref} className={styles.canvas} aria-hidden="true" />;
}

export function StagesTonight() {
  const live = useLiveModels();
  const counts = stageCounts(live.data);
  const dash = "—";

  return (
    <div className={styles.board}>
      <NightLights count={counts?.all ?? 0} />
      <div className={styles.readout}>
        <p className={styles.big}>
          <span className={styles.number}>{counts ? counts.all : dash}</span>
          <span className={styles.label}>sealed stages online</span>
        </p>
        <p className={`mono ${styles.ticker}`}>
          {counts ? (
            <>
              MINIMAX H3 · {counts.h3} &nbsp;/&nbsp; LTX-2.5 · {counts.ltx} &nbsp;/&nbsp; LIVE FROM THE NETWORK
            </>
          ) : live.settled ? (
            <>NETWORK UNREACHABLE FROM THIS BROWSER · NO NUMBERS SHOWN</>
          ) : (
            <>CHECKING THE NETWORK…</>
          )}
        </p>
      </div>
      <div className={styles.foot}>
        <p>
          Each light is a GPU server whose sealed hardware proved itself to the network within the last half hour.
          Positions are illustrative; the counts are live. The headline counts every stage once. A stage can serve
          several stocks, so the per-stock figures are lower bounds.
        </p>
        <Link href="/network" className="link">
          How the network works →
        </Link>
      </div>
    </div>
  );
}
