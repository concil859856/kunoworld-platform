"use client";

import {
  KunoError,
  planPriceUsd,
  type JobStatus,
  type KunoClient,
  type ModelProfile,
  type Plan,
  type PlanHandle,
  type PrivacyMode,
} from "@kunoworld/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ComposerApi } from "./composerState";
import { friendlyError } from "./errors";
import { makeShot } from "./shot";

/*
 * Plans from a brief (Director): the Storyboard tab's "Plan from a brief" panel and its per-shot Rewrite.
 *
 * A plan is a job like a video, through the same SDK: a Private one is sealed in this browser to an attested worker that
 * writes plans, and opened here. It renders nothing. The plan fills the composer's scene and shot cards, where it is an
 * ordinary storyboard to edit and render. A plan isn't kept on the shelf: it has no video, and the cards are the draft.
 * The last plan is kept in memory, so its shots can be rewritten after the cards were edited.
 */

export type PlanPhase = "idle" | "sending" | "planning" | "checking";

/** What a failed plan says, in the panel. */
export interface PlanProblem {
  code: string;
  title: string;
  detail: string;
  link?: { href: string; label: string };
}

/** Target lengths offered as chips, kept to the profile's plan limits. */
export const TARGET_CHOICES = [15, 30, 45, 60, 90, 120];

export function targetChoices(profile: ModelProfile): number[] {
  const low = profile.limits.plan?.min_target_s ?? 4;
  const high = profile.limits.storyboard?.max_total_s ?? 0;
  return TARGET_CHOICES.filter((s) => s >= low && s <= high);
}

/** Whether a profile writes plans: plan mode, its limits and a price in this privacy mode. */
export function plansOffered(profile: ModelProfile, privacy: PrivacyMode): boolean {
  return profile.modes.includes("plan") && Boolean(profile.limits.plan && profile.limits.storyboard) && planPriceUsd(profile, privacy) !== null;
}

/** Codes that all mean no worker can take the plan now. Nothing was sent or charged for any of them. */
const NO_PLANNER = new Set(["plans_unavailable", "no_capacity", "enclave_unavailable", "envelope_exceeded", "no_attested_worker"]);

export function planProblem(err: unknown, privacy: PrivacyMode, rendering: boolean): PlanProblem {
  const code = err instanceof KunoError ? err.code : "error";
  if (code === "safety_blocked") {
    return {
      code,
      title: "Blocked by the content policy",
      detail:
        privacy === "private"
          ? "The check inside the sealed worker stopped this plan, so no person read your brief. You weren't charged."
          : "The content check stopped this plan. You weren't charged.",
    };
  }
  if (code === "content_policy") {
    return {
      code,
      title: "Blocked by the content policy",
      detail: "This brief breaks KunoWorld's content policy, so it wasn't planned. Nothing was charged, and blocked briefs count as strikes on your account.",
    };
  }
  if (NO_PLANNER.has(code) && !rendering) {
    return { code, title: "No worker can write plans right now", detail: "Nothing was sent or charged. Try again in a minute, or write the shots yourself." };
  }
  if (code === "rate_limited") {
    return { code, title: "Too many plans in the last minute", detail: "Wait a moment and try again. Nothing was charged." };
  }
  if (code === "invalid_brief") {
    return { code, title: "Write a brief first", detail: "Say what the video is for, what happens and how it should feel." };
  }
  if ((code === "invalid_plan" || code === "invalid_options") && err instanceof KunoError) {
    const message = err.message.replace(/^The plan to revise can't be sent: /, "").replace(/^The plan options don't fit this job: /, "");
    return { code, title: "Fix the shots first", detail: `${message.charAt(0).toUpperCase()}${message.slice(1).replace(/\.?$/, ".")}` };
  }
  const friendly = friendlyError(err, rendering ? "render" : "submit", privacy);
  return { code: friendly.code, title: friendly.title, detail: friendly.detail, link: friendly.link };
}

/** The composer's storyboard as a plan to revise: the last plan's title, notes and target, with the cards as they are now. */
export function planFromComposer(last: Plan, composer: ComposerApi): Plan {
  const { state, profile } = composer;
  const s = state.settings;
  return {
    ...last,
    profile_id: profile.id,
    resolution: s.resolution,
    aspect_ratio: s.aspectRatio,
    fps: s.fps,
    audio: s.audio,
    scene: state.prompt.trim(),
    shots: state.shots.map((shot, i) => ({
      beat: shot.beat ?? "",
      prompt: shot.prompt.trim(),
      duration_s: shot.durationS,
      join: i === 0 ? "fresh" : shot.join,
    })),
  };
}

export function usePlanner(client: KunoClient | null, composer: ComposerApi) {
  const [phase, setPhase] = useState<PlanPhase>("idle");
  /** The shot being rewritten (from 1), "all" for a whole-plan rewrite, or null for a new plan. */
  const [rewriting, setRewriting] = useState<number | "all" | null>(null);
  const [problem, setProblem] = useState<PlanProblem | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const running = useRef<{ ctrl: AbortController; handle: PlanHandle | null } | null>(null);
  const composerRef = useRef(composer);

  useEffect(() => {
    composerRef.current = composer;
  }, [composer]);
  useEffect(() => () => running.current?.ctrl.abort(), []);

  /** Loads a plan into the scene and the cards, keeping the cards that are already there (and their focus). */
  const apply = useCallback((next: Plan, rewritten: number | "all" | null) => {
    const { actions } = composerRef.current;
    const fresh = next.shots.map(() => makeShot());
    actions.setPrompt(next.scene);
    actions.updateShots((list) =>
      next.shots.map((shot, i) => ({ ...(list[i] ?? fresh[i]), prompt: shot.prompt, durationS: shot.duration_s, join: shot.join, beat: shot.beat })),
    );
    setPlan(next);
    const notes = next.repairs.map((repair) => `Adjusted: ${repair}.`);
    if (next.notes && rewritten === null) notes.push(`Planner note: ${next.notes}`);
    setNotices(notes);
  }, []);

  const run = useCallback(
    async (privacy: PrivacyMode, which: number | "all" | null, start: (client: KunoClient) => Promise<PlanHandle>) => {
      if (running.current) return;
      setProblem(null);
      if (!client) {
        setProblem({ code: "signed_out", title: "You're not signed in", detail: "Sign in with your email to plan and make videos.", link: { href: "/signin?next=/studio", label: "Sign in" } });
        return;
      }
      const ctrl = new AbortController();
      const current: { ctrl: AbortController; handle: PlanHandle | null } = { ctrl, handle: null };
      running.current = current;
      setRewriting(which);
      setPhase("sending");
      try {
        const handle = await start(client);
        current.handle = handle;
        if (ctrl.signal.aborted) return;
        setPhase("planning");
        const result = await client.waitPlan(handle, {
          signal: ctrl.signal,
          pollMs: 1000,
          onProgress: (status: JobStatus) => setPhase(status.stage === "checking" || status.stage === "sealing" ? "checking" : "planning"),
        });
        if (!ctrl.signal.aborted) apply(result.plan, which);
      } catch (err) {
        if (!ctrl.signal.aborted) setProblem(planProblem(err, privacy, current.handle !== null));
      } finally {
        if (running.current === current) running.current = null;
        setPhase("idle");
        setRewriting(null);
      }
    },
    [client, apply],
  );

  /** A new plan from a brief, framed by the composer's model, size, frame rate and sound. */
  const makePlan = useCallback(
    (brief: string, targetS: number, style: string, privacy: PrivacyMode) => {
      const { profile, state } = composerRef.current;
      const s = state.settings;
      return run(privacy, null, (c) =>
        c.submitPlan({
          brief: brief.trim(),
          targetS,
          style: style.trim() || undefined,
          privacy,
          model: profile.id,
          resolution: s.resolution,
          aspectRatio: s.aspectRatio,
          fps: s.fps,
          audio: s.audio,
        }),
      );
    },
    [run],
  );

  /** Rewrites one shot (from 1), or every shot, of the cards as they are now, under an optional instruction. */
  const rewrite = useCallback(
    (shot: number | null, instruction: string, privacy: PrivacyMode) => {
      if (!plan) return Promise.resolve();
      const current = planFromComposer(plan, composerRef.current);
      return run(privacy, shot ?? "all", (c) => c.submitRevision(current, instruction.trim(), { shots: shot ? [shot] : undefined, privacy }));
    },
    [plan, run],
  );

  /** Stops waiting and cancels the job; a canceled plan is refunded. */
  const cancel = useCallback(() => {
    const current = running.current;
    if (!current) return;
    current.ctrl.abort();
    running.current = null;
    if (client && current.handle) void client.cancel(current.handle.jobId).catch(() => undefined);
    setPhase("idle");
    setRewriting(null);
  }, [client]);

  const dismiss = useCallback((index: number) => setNotices((list) => list.filter((_, i) => i !== index)), []);

  return { phase, busy: phase !== "idle", rewriting, problem, plan, notices, makePlan, rewrite, cancel, dismiss, clearProblem: () => setProblem(null) };
}

export type PlannerApi = ReturnType<typeof usePlanner>;
