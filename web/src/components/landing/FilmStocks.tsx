"use client";

import type { ModelProfile } from "@kunoworld/sdk";

import { AvailabilityPill } from "@/components/site/AvailabilityPill";
import { useLiveModels } from "@/components/site/LiveModels";
import { CATALOG, FAMILY_H3, FAMILY_LTX, STOCKS, familyProfiles, minRate, ratesOf, variantLabel } from "@/lib/catalog";
import { rate } from "@/lib/format";
import { availability } from "@/lib/shot";

import styles from "./FilmStocks.module.css";

function span(profiles: ModelProfile[], pick: (p: ModelProfile) => number[]): [number, number] {
  const all = profiles.flatMap(pick);
  return [Math.min(...all), Math.max(...all)];
}

function h3Specs(profiles: ModelProfile[]): Array<[string, string]> {
  const director = profiles.find((p) => p.modes.includes("reference_to_video"));
  const [dMin, dMax] = span(profiles, (p) => [p.limits.min_duration_s, p.limits.max_duration_s]);
  const refs = director?.limits.max_inputs;
  return [
    ["Resolution", Object.keys(profiles[0].limits.sizes).join(" · ")],
    ["Length", `${dMin}–${dMax} s`],
    ["Sound", "Native stereo audio, dialogue included"],
    [
      "References",
      refs ? `Up to ${refs.reference_image} images, ${refs.reference_video} clips and ${refs.reference_audio} audio tracks` : "—",
    ],
    ["Frames", "First, last, or both"],
    ["Direction", "Edit, extend, or drive a scene from audio"],
  ];
}

function ltxSpecs(profiles: ModelProfile[]): Array<[string, string]> {
  const [dMin, dMax] = span(profiles, (p) => [p.limits.min_duration_s, p.limits.max_duration_s]);
  const [fMin, fMax] = span(profiles, (p) => p.limits.fps);
  const has4k = profiles.some((p) => "2160p" in p.limits.sizes);
  const keyframes = Math.max(...profiles.map((p) => p.limits.max_inputs.keyframe ?? 0));
  return [
    ["Resolution", has4k ? "720p up to 4K" : "720p–1080p"],
    ["Length", `${dMin}–${dMax} s`],
    ["Frame rate", `${fMin}–${fMax} fps`],
    ["Keyframes", `Up to ${keyframes}, placed on a timeline`],
    ["Retake", "Regenerate a window, keep the rest"],
    ["Sound", "Native audio, or picture driven by yours"],
  ];
}

export function FilmStocks() {
  const live = useLiveModels();
  const profiles = live.data ? live.data.models : CATALOG;
  const country = live.data?.country ?? null;

  const boxes = [
    { family: FAMILY_H3, specs: h3Specs(familyProfiles(CATALOG, FAMILY_H3)) },
    { family: FAMILY_LTX, specs: ltxSpecs(familyProfiles(CATALOG, FAMILY_LTX)) },
  ];

  return (
    <div className={styles.stocks}>
      {boxes.map(({ family, specs }) => {
        const stock = STOCKS[family];
        const members = familyProfiles(profiles, family);
        const h3 = family === FAMILY_H3;
        const regionLocked = h3 && live.data && members.every((p) => p.available_in_region === false);
        return (
          <article key={family} className={styles.box} data-family={h3 ? "h3" : "ltx"} aria-labelledby={`stock-${family}`}>
            <div className={styles.band}>
              <span>{stock.code}</span>
              <span>{h3 ? "COLOR · SOUND · 24 FPS" : "COLOR · SOUND · TO 50 FPS"}</span>
            </div>
            <span className={styles.spine} aria-hidden="true">
              {stock.code}
            </span>
            <header className={styles.header}>
              <h3 id={`stock-${family}`} className={`display ${styles.brand}`}>
                {stock.brand}
              </h3>
              <p className={styles.stockName}>{stock.stockName}</p>
            </header>
            <dl className={styles.specs}>
              {specs.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <ul className={styles.variants} role="list">
              {members.map((p) => (
                <li key={p.id}>
                  <span className={styles.variantName}>
                    <strong>{h3 ? p.name : `LTX-2.5 ${variantLabel(p)}`}</strong>
                    <span>{p.tagline}</span>
                  </span>
                  <span className={styles.variantMeta}>
                    <span className={styles.rate} title={ratesOf(p).map(([r, v]) => `${r}: ${rate(v)}/s`).join(" · ")}>
                      from {rate(minRate(p))}/s
                    </span>
                    <AvailabilityPill availability={availability(p, Boolean(live.data))} compact />
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.bestFor}>
              <span className="eyebrow">Best for</span> {stock.bestFor}
            </p>
            {h3 && (
              <p className={styles.region} data-locked={regionLocked ? "true" : "false"}>
                {regionLocked
                  ? "MiniMax H3 isn't licensed in your region yet — shots you start on H3 render on LTX-2.5 where it can make them."
                  : live.data
                    ? `MiniMax H3 is available where you are${country ? "" : ""}.`
                    : "MiniMax H3 availability depends on your region. Its license doesn't yet cover the US, EU, UK or South Korea."}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
