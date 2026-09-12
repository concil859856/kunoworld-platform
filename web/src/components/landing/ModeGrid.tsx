"use client";

import Image from "next/image";
import Link from "next/link";
import type { Mode } from "@kunoworld/sdk";

import { Clip } from "@/components/fx/Clip";
import { Reveal } from "@/components/fx/Reveal";
import { CATALOG, isH3, variantLabel } from "@/lib/catalog";
import { clipForMode, HAS_FOOTAGE } from "@/lib/reel";
import { posterForMode, HAS_STILLS, STILLS_NOTE } from "@/lib/stills";
import { MODE_LABEL } from "@/lib/validation";

import styles from "./ModeGrid.module.css";

/*
 * Every way to start a shot, each one shown rather than described.
 *
 * This is the section that makes the breadth legible: most services offer text and image
 * to video. We route ten modes across two model families, and the stocks that can do each
 * one are read from the same catalog the studio uses, so this can never drift from what
 * the network actually accepts.
 */

const HINTS: Record<Mode, string> = {
  text_to_video: "Describe the shot. Nothing else needed.",
  image_to_video: "Start on your image and move from there.",
  last_frame: "Arrive at your image on the final frame.",
  first_last_frame: "Give both ends; the shot travels between them.",
  keyframes: "Pin images to timecodes and hit each one.",
  reference_to_video: "Bring your own cast, props and voices.",
  video_edit: "Change what happens in a clip you already have.",
  extend_video: "Continue a clip past its last frame.",
  audio_to_video: "Picture driven by your own soundtrack.",
  retake: "Regenerate one window, keep the rest of the take.",
};

const ORDER: Mode[] = [
  "text_to_video",
  "image_to_video",
  "first_last_frame",
  "keyframes",
  "reference_to_video",
  "audio_to_video",
  "retake",
  "extend_video",
  "video_edit",
  "last_frame",
];

/** Which stocks accept this mode, straight from the profile catalog. */
function stocksFor(mode: Mode): string {
  const names = CATALOG.filter((p) => p.modes.includes(mode)).map((p) => (isH3(p) ? `H3 ${variantLabel(p)}` : `LTX ${variantLabel(p)}`));
  if (!names.length) return "";
  const families = new Set(CATALOG.filter((p) => p.modes.includes(mode)).map((p) => p.family));
  return families.size > 1 ? "Both stocks" : names.join(" · ");
}

export function ModeGrid() {
  return (
    <>
      <ul className={styles.grid} role="list">
        {ORDER.map((mode, i) => {
          const shot = clipForMode(mode);
          // Until a mode has footage, its tile holds a generated still rather than an
          // empty panel. The still never claims to be video.
          const holding = shot ? undefined : posterForMode(mode);
          return (
            <Reveal as="li" key={mode} className={styles.cell} delay={(i % 3) * 0.08}>
              <Link href="/studio" className={styles.card}>
                <Clip
                  clip={shot}
                  ratio="16 / 9"
                  className={styles.clip}
                  sound={mode === "audio_to_video"}
                  fallback={
                    holding ? (
                      <Image
                        src={holding.src}
                        alt={holding.alt}
                        fill
                        sizes="(max-width: 420px) 100vw, (max-width: 620px) 50vw, 33vw"
                        className={styles.poster}
                      />
                    ) : undefined
                  }
                />
                <div className={styles.meta}>
                  <h3 className={styles.name}>{MODE_LABEL[mode]}</h3>
                  <p className={styles.hint}>{HINTS[mode]}</p>
                  <p className={styles.stocks}>{stocksFor(mode)}</p>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </ul>
      {!HAS_FOOTAGE && HAS_STILLS && <p className={styles.note}>{STILLS_NOTE}</p>}
    </>
  );
}
