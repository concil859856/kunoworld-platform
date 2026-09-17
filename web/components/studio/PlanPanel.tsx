"use client";

import { planPriceUsd, type PrivacyMode } from "@kunoworld/sdk";
import { Eye, LoaderCircle, LockKeyhole, Sparkles, X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";

import type { ComposerApi } from "@/lib/composerState";
import { usd } from "@/lib/format";
import { plansOffered, targetChoices, type PlannerApi } from "@/lib/plan";

import styles from "./Trays.module.css";

/*
 * "Plan from a brief", at the top of the Storyboard tab: a brief, a target length and an optional style become a scene
 * and shot cards, written inside a confidential worker. The plan is a first draft; the cards below are where it's edited
 * and rendered. Privacy follows the take's own choice further down the composer.
 */

const PHASE_LABEL = { idle: "", sending: "Sending the brief…", planning: "Planning…", checking: "Checking the plan…" } as const;

export function PlanPanel({ composer, planner, privacy }: { composer: ComposerApi; planner: PlannerApi; privacy: PrivacyMode }) {
  const { profile, state } = composer;
  const ids = useId();
  const [brief, setBrief] = useState("");
  const [targetS, setTargetS] = useState(30);
  const [style, setStyle] = useState("");
  const [instruction, setInstruction] = useState("");
  const limits = profile.limits.plan;
  const price = planPriceUsd(profile, privacy);

  if (!plansOffered(profile, privacy) || !limits) {
    return (
      <section className={`${styles.tray} ${styles.planPanel}`} aria-labelledby={`${ids}-title`}>
        <h3 className={styles.planTitle} id={`${ids}-title`}>
          Plan from a brief
        </h3>
        <p className={styles.trayHint}>{profile.name} doesn&apos;t write plans. LTX-2.5 Fast does.</p>
      </section>
    );
  }

  const choices = targetChoices(profile);
  const target = choices.includes(targetS) ? targetS : (choices[1] ?? choices[0]);
  const maxBrief = limits.max_brief_chars ?? 4000;
  const maxStyle = limits.max_style_chars ?? 500;
  const briefChars = [...brief].length;
  const { busy, phase, rewriting, problem, plan, notices } = planner;
  const planning = busy && rewriting === null;
  const s = state.settings;

  function onChipKey(e: KeyboardEvent<HTMLDivElement>) {
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = choices[(choices.indexOf(target) + dir + choices.length) % choices.length];
    setTargetS(next);
    (e.currentTarget.querySelector(`[data-target="${next}"]`) as HTMLElement | null)?.focus();
  }

  return (
    <section className={`${styles.tray} ${styles.planPanel}`} aria-labelledby={`${ids}-title`} data-plan-panel="">
      <div className={styles.planHead}>
        <h3 className={styles.planTitle} id={`${ids}-title`}>
          Plan from a brief
        </h3>
        <a className={styles.planPrivacy} href="/privacy" target="_blank" rel="noreferrer">
          {privacy === "private" ? <LockKeyhole size={12} aria-hidden /> : <Eye size={12} aria-hidden />}
          {privacy === "private" ? "Planned inside a confidential worker" : "Standard: KunoWorld can read the brief"}
        </a>
      </div>

      <textarea
        className={styles.shotText}
        aria-label="Brief"
        aria-describedby={`${ids}-brief-chars`}
        value={brief}
        placeholder="A 30-second ad for a small coffee roastery, warm and handmade."
        onChange={(e) => setBrief(e.target.value)}
      />
      <span className={styles.counter} data-over={briefChars > maxBrief} id={`${ids}-brief-chars`}>
        {briefChars.toLocaleString("en-US")}/{maxBrief.toLocaleString("en-US")}
      </span>

      <div className={styles.planRow}>
        <span className={styles.subhead} id={`${ids}-length`}>
          Length
        </span>
        <div className={styles.ops} role="radiogroup" aria-labelledby={`${ids}-length`} onKeyDown={onChipKey}>
          {choices.map((seconds) => (
            <button
              key={seconds}
              type="button"
              role="radio"
              data-target={seconds}
              aria-checked={seconds === target}
              tabIndex={seconds === target ? 0 : -1}
              onClick={() => setTargetS(seconds)}
            >
              {seconds} s
            </button>
          ))}
        </div>
        <span className={styles.muted}>
          {s.aspectRatio} · {s.resolution} · {s.audio ? "Sound on" : "No sound"}
        </span>
      </div>

      <label className={styles.planField}>
        <span className={styles.subhead}>Style (optional)</span>
        <input
          className={styles.planInput}
          value={style}
          maxLength={maxStyle}
          placeholder="warm, handheld, 35mm film look"
          onChange={(e) => setStyle(e.target.value)}
        />
      </label>

      <div className={styles.planActions}>
        <button
          type="button"
          className={styles.planButton}
          disabled={busy}
          onClick={() => void planner.makePlan(brief, target, style, privacy)}
        >
          {planning ? <LoaderCircle size={14} className="spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
          {planning ? "Planning…" : `Plan · ${usd(price)}`}
        </button>
        <span className={styles.muted}>A first draft to edit. Usually under a minute; nothing renders yet.</span>
      </div>

      {busy && (
        <p className={styles.planStatus} role="status">
          <LoaderCircle size={13} className="spin" aria-hidden />
          {rewriting === null ? PHASE_LABEL[phase] : rewriting === "all" ? "Rewriting every shot…" : `Rewriting shot ${rewriting}…`}
          <button type="button" className={styles.textButton} onClick={planner.cancel}>
            Stop
          </button>
        </p>
      )}

      {problem && (
        <div className={styles.planProblem} role="alert">
          <p>
            <strong>{problem.title}.</strong> {problem.detail}
          </p>
          {problem.link && <a href={problem.link.href}>{problem.link.label}</a>}
        </div>
      )}

      {plan && notices.length > 0 && (
        <ul className={styles.planNotices} aria-label="About this plan">
          {notices.map((notice, i) => (
            <li key={`${i}-${notice}`}>
              <span>{notice}</span>
              <button type="button" className={styles.iconButton} aria-label="Dismiss" onClick={() => planner.dismiss(i)}>
                <X size={12} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {plan && (
        <div className={styles.planRewrite}>
          <input
            className={styles.planInput}
            aria-label="What to change in every shot"
            value={instruction}
            placeholder="Optional: what to change, e.g. more night scenes"
            onChange={(e) => setInstruction(e.target.value)}
          />
          <button
            type="button"
            className={styles.textButton}
            disabled={busy}
            onClick={() => void planner.rewrite(null, instruction, privacy)}
          >
            Rewrite all · {usd(price)}
          </button>
        </div>
      )}
    </section>
  );
}
