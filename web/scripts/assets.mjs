#!/usr/bin/env node
/**
 * Generates the site's footage from scripts/reel.manifest.json.
 *
 *   node scripts/assets.mjs --dry-run          # what it would cost, generates nothing
 *   node scripts/assets.mjs                    # generate everything missing
 *   node scripts/assets.mjs --only hero-wave   # one clip
 *   node scripts/assets.mjs --role hero        # one group
 *   node scripts/assets.mjs --force            # regenerate even if the file exists
 *
 * Needs FAL_KEY in /video/.env (or the environment) and ffmpeg on PATH. Results land in
 * public/reel/ and are committed; src/lib/reel.generated.json indexes them for the site.
 *
 * Already-generated clips are skipped, so re-running after a failure costs nothing extra.
 * The key is never printed.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..");
const REPO = join(WEB, "..", "..");
const OUT = join(WEB, "public", "reel");
const INDEX = join(WEB, "src", "lib", "reel.generated.json");

/** $ per second of output, by endpoint tier and resolution. From fal.ai/pricing. */
const RATES = {
  pro: { "1080p": 0.06, "1440p": 0.12, "2160p": 0.24 },
  fast: { "1080p": 0.04, "1440p": 0.08, "2160p": 0.16 },
};

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const DRY = flag("dry-run");
const FORCE = flag("force");
const ONLY = value("only", null);
const ROLE = value("role", null);
const BUDGET = Number(value("budget", "50"));

// ---------------------------------------------------------------- helpers

const log = (...m) => console.log(...m);
const money = (n) => `$${n.toFixed(2)}`;

/** Reads KEY=value from /video/.env without pulling in a dependency. */
async function loadKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY.trim();
  try {
    const text = await readFile(join(REPO, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k?.trim() === "FAL_KEY") return rest.join("=").trim();
    }
  } catch {
    /* no .env; fall through to the error below */
  }
  return null;
}

function tierOf(endpoint) {
  return endpoint.endsWith("/fast") ? "fast" : "pro";
}

function costOf(clip) {
  const rate = RATES[tierOf(clip.endpoint)][clip.resolution] ?? RATES.fast["1080p"];
  return rate * clip.duration;
}

/** The exact request we send, so a changed prompt regenerates but a reordered file does not. */
function fingerprint(clip) {
  const { id, endpoint, prompt, resolution, fps, duration, generate_audio } = clip;
  return createHash("sha256")
    .update(JSON.stringify({ id, endpoint, prompt, resolution, fps, duration, generate_audio }))
    .digest("hex")
    .slice(0, 12);
}

async function ffprobe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration,nb_frames",
    "-show_entries", "format=duration",
    "-of", "json", file,
  ]);
  const info = JSON.parse(stdout);
  const stream = info.streams?.[0] ?? {};
  return {
    width: Number(stream.width) || 0,
    height: Number(stream.height) || 0,
    duration: Number(stream.duration || info.format?.duration) || 0,
  };
}

async function hasAudioStream(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file]);
  return stdout.trim().length > 0;
}

// ---------------------------------------------------------------- fal

const FAL = "https://queue.fal.run";

async function falJson(url, key, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.text();
  if (!res.ok) {
    // Surface fal's own message; it never contains the key.
    throw new Error(`fal ${res.status} on ${url.replace(FAL, "")}: ${body.slice(0, 400)}`);
  }
  return JSON.parse(body);
}

/** Submits to the queue and polls until the render is done. Returns the output video URL. */
async function generate(clip, key) {
  const input = {
    prompt: clip.prompt,
    resolution: clip.resolution,
    fps: Number(clip.fps),
    duration: Number(clip.duration),
    generate_audio: Boolean(clip.generate_audio),
  };
  const queued = await falJson(`${FAL}/${clip.endpoint}`, key, { method: "POST", body: JSON.stringify(input) });
  const statusUrl = queued.status_url ?? `${FAL}/${clip.endpoint}/requests/${queued.request_id}/status`;
  const responseUrl = queued.response_url ?? `${FAL}/${clip.endpoint}/requests/${queued.request_id}`;

  const deadline = Date.now() + 15 * 60_000;
  let last = "";
  while (Date.now() < deadline) {
    const status = await falJson(statusUrl, key);
    if (status.status !== last) {
      last = status.status;
      log(`      ${last.toLowerCase().replace("_", " ")}…`);
    }
    if (status.status === "COMPLETED") break;
    if (status.status === "FAILED" || status.error) throw new Error(`render failed: ${JSON.stringify(status.error ?? status).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  if (last !== "COMPLETED") throw new Error("timed out after 15 minutes");

  const result = await falJson(responseUrl, key);
  const url = result.video?.url ?? result.videos?.[0]?.url;
  if (!url) throw new Error(`no video in result: ${JSON.stringify(result).slice(0, 300)}`);
  return url;
}

// ---------------------------------------------------------------- encoding

/**
 * Two deliverables per clip: an MP4 sized for the web and a poster frame. Background
 * reels are stripped of audio so they can autoplay; clips that exist to demonstrate
 * sound keep it and stay muted until the viewer asks.
 */
async function encode(source, clip) {
  const mp4 = join(OUT, `${clip.id}.mp4`);
  const poster = join(OUT, `${clip.id}.jpg`);
  const keepAudio = Boolean(clip.generate_audio) && (await hasAudioStream(source));

  const width = clip.role === "hero" ? 1600 : 1280;
  const scale = `scale=${width}:-2:flags=lanczos`;

  await run("ffmpeg", [
    "-y", "-i", source,
    "-vf", scale,
    "-c:v", "libx264", "-profile:v", "high", "-crf", "23", "-preset", "slow",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    ...(keepAudio ? ["-c:a", "aac", "-b:a", "128k"] : ["-an"]),
    mp4,
  ]);

  // A frame from a little way in: the first frame is often the dullest.
  await run("ffmpeg", ["-y", "-ss", "1", "-i", mp4, "-frames:v", "1", "-vf", scale, "-q:v", "4", poster]);

  const probe = await ffprobe(mp4);
  return { mp4, poster, keepAudio, ...probe };
}

// ---------------------------------------------------------------- main

async function main() {
  const manifest = JSON.parse(await readFile(join(HERE, "reel.manifest.json"), "utf8"));
  const defaults = manifest.defaults ?? {};
  let clips = manifest.clips.map((c) => ({ ...defaults, ...c }));

  if (ONLY) clips = clips.filter((c) => c.id === ONLY);
  if (ROLE) clips = clips.filter((c) => c.role === ROLE);
  if (!clips.length) {
    console.error("No clips matched. Check --only / --role against scripts/reel.manifest.json.");
    process.exit(1);
  }

  const previous = existsSync(INDEX) ? JSON.parse(await readFile(INDEX, "utf8")) : { clips: {} };
  const index = { ...previous.clips };

  const pending = clips.filter((c) => {
    if (FORCE) return true;
    const done = index[c.id];
    return !done || done.fingerprint !== fingerprint(c) || !existsSync(join(OUT, `${c.id}.mp4`));
  });

  const estimate = pending.reduce((sum, c) => sum + costOf(c), 0);
  log(`\n${clips.length} clips in the manifest · ${pending.length} to generate · estimate ${money(estimate)}\n`);

  if (DRY) {
    for (const c of pending) log(`  ${c.id.padEnd(20)} ${tierOf(c.endpoint).padEnd(5)} ${c.duration}s ${c.resolution}  ${money(costOf(c))}`);
    log(`\nDry run — nothing generated. Budget cap is ${money(BUDGET)}.`);
    return;
  }
  if (!pending.length) {
    log("Everything is already generated. Use --force to redo a clip.");
    return;
  }
  if (estimate > BUDGET) {
    console.error(`Estimate ${money(estimate)} exceeds the ${money(BUDGET)} budget. Raise it with --budget or trim the manifest.`);
    process.exit(1);
  }

  const key = await loadKey();
  if (!key) {
    console.error("No FAL_KEY found. Add FAL_KEY=... to /video/.env (chmod 600) or export it, then re-run.");
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  let spent = 0;
  const failures = [];

  for (const [i, clip] of pending.entries()) {
    const cost = costOf(clip);
    log(`  [${i + 1}/${pending.length}] ${clip.id}  ${tierOf(clip.endpoint)} ${clip.duration}s ${clip.resolution}  ~${money(cost)}`);
    const temp = join(OUT, `${clip.id}.src.mp4`);
    try {
      const url = await generate(clip, key);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      await writeFile(temp, Buffer.from(await res.arrayBuffer()));
      spent += cost;

      const out = await encode(temp, clip);
      index[clip.id] = {
        id: clip.id,
        role: clip.role,
        ...(clip.mode ? { mode: clip.mode } : {}),
        ...(clip.family ? { family: clip.family } : {}),
        src: `/reel/${clip.id}.mp4`,
        poster: `/reel/${clip.id}.jpg`,
        width: out.width,
        height: out.height,
        duration: Number(out.duration.toFixed(2)),
        audio: out.keepAudio,
        alt: clip.alt,
        prompt: clip.prompt,
        source: clip.source,
        endpoint: clip.endpoint,
        fingerprint: fingerprint(clip),
      };
      log(`      ✓ ${out.width}×${out.height} ${out.duration.toFixed(1)}s${out.keepAudio ? " with audio" : ""}`);
      // Write after every clip so an interrupted run keeps what it paid for.
      await writeFile(INDEX, JSON.stringify({ generated_at: new Date().toISOString(), clips: index }, null, 2) + "\n");
    } catch (err) {
      failures.push(`${clip.id}: ${err.message}`);
      log(`      ✗ ${err.message}`);
    } finally {
      await rm(temp, { force: true });
    }
  }

  log(`\nSpent about ${money(spent)}. ${Object.keys(index).length} clips indexed.`);
  if (failures.length) {
    log(`\n${failures.length} failed (re-run to retry just these):`);
    for (const f of failures) log(`  ${f}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
