#!/usr/bin/env node
/**
 * Generates the site's footage from scripts/reel.manifest.json.
 *
 *   node scripts/assets.mjs --dry-run              # what it would cost, generates nothing
 *   node scripts/assets.mjs                        # generate everything missing
 *   node scripts/assets.mjs --only hero-wave       # one clip
 *   node scripts/assets.mjs --role hero            # one group
 *   node scripts/assets.mjs --provider fal         # force a provider
 *   node scripts/assets.mjs --force                # regenerate even if the file exists
 *
 * Needs ffmpeg on PATH and a key in /video/.env: ELEVENLABS_API_KEY (needs the
 * image_video_generation permission, Pro plan or above) or FAL_KEY. Both serve LTX-2,
 * the same open weights the network runs.
 *
 * Results land in public/reel/ and are committed; src/lib/reel.generated.json indexes them.
 * Already-generated clips are skipped, so re-running after a failure costs nothing extra.
 * Keys are never printed.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { estimateFor, pickProvider, PROVIDERS } from "./providers.mjs";

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const WEB = join(HERE, "..");
const REPO = join(WEB, "..", "..");
const OUT = join(WEB, "public", "reel");
const INDEX = join(WEB, "src", "lib", "reel.generated.json");

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
const WANTED = value("provider", null);
const BUDGET = Number(value("budget", "50"));

const log = (...m) => console.log(...m);
const money = (n) => `$${n.toFixed(2)}`;

/** Reads KEY=value pairs from /video/.env without pulling in a dependency. */
async function loadEnv() {
  const env = { ...process.env };
  try {
    const text = await readFile(join(REPO, ".env"), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim() || line.startsWith("#")) continue;
      const [k, ...rest] = line.split("=");
      const key = k?.trim();
      if (key && !env[key]) env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env; the environment may still carry a key */
  }
  return env;
}

/** The request that produced a clip, so a changed prompt regenerates but a reorder doesn't. */
function fingerprint(clip) {
  const { id, tier, prompt, resolution, fps, duration, generate_audio } = clip;
  return createHash("sha256")
    .update(JSON.stringify({ id, tier, prompt, resolution, fps, duration, generate_audio }))
    .digest("hex")
    .slice(0, 12);
}

async function ffprobe(file) {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "stream=width,height,duration",
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

/**
 * Two deliverables per clip: an MP4 sized for the web and a poster frame. Background reels
 * are stripped of audio so they can autoplay; clips that exist to demonstrate sound keep it
 * and stay muted until the viewer asks.
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
  // A frame a little way in: the first frame is often the dullest.
  await run("ffmpeg", ["-y", "-ss", "1", "-i", mp4, "-frames:v", "1", "-vf", scale, "-q:v", "4", poster]);

  return { mp4, poster, keepAudio, ...(await ffprobe(mp4)) };
}

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
  if (WANTED && !PROVIDERS.includes(WANTED)) {
    console.error(`Unknown provider ${WANTED}. Use one of: ${PROVIDERS.join(", ")}`);
    process.exit(1);
  }

  const previous = existsSync(INDEX) ? JSON.parse(await readFile(INDEX, "utf8")) : { clips: {} };
  const index = { ...previous.clips };

  const pending = clips.filter((c) => {
    if (FORCE) return true;
    const done = index[c.id];
    return !done || done.fingerprint !== fingerprint(c) || !existsSync(join(OUT, `${c.id}.mp4`));
  });

  const env = await loadEnv();
  const provider = pickProvider(env, WANTED);

  // Costing is provider-specific and deliberately key-free: fal publishes a per-second
  // rate, ElevenLabs does not. With no key at all we still price the fal path, so the
  // reel can be costed before anyone signs up for anything.
  const pricingName = WANTED ?? provider?.name ?? "fal";
  const priceOf = (c) => estimateFor(pricingName, c);
  const priced = priceOf(clips[0]) != null;
  const estimate = priced ? pending.reduce((sum, c) => sum + priceOf(c), 0) : null;

  log(`\n${clips.length} clips in the manifest · ${pending.length} to generate`);
  log(`provider: ${provider ? provider.name : "none (no key found)"}`);
  log(estimate == null ? "estimate: not published by this provider\n" : `estimate: ${money(estimate)}\n`);

  if (DRY) {
    for (const c of pending) {
      log(`  ${c.id.padEnd(20)} ${String(c.tier).padEnd(5)} ${c.duration}s ${c.resolution}  ${priced ? money(priceOf(c)) : "—"}`);
    }
    log(`\nDry run — nothing generated.${priced ? ` Budget cap is ${money(BUDGET)}.` : ""}`);
    return;
  }
  if (!pending.length) {
    log("Everything is already generated. Use --force to redo a clip.");
    return;
  }
  if (!provider) {
    console.error(
      "No usable key found. Add one to /video/.env (chmod 600):\n" +
        "  ELEVENLABS_API_KEY=...   needs the image_video_generation permission, Pro plan or above\n" +
        "  FAL_KEY=...              pay as you go",
    );
    process.exit(1);
  }
  if (estimate != null && estimate > BUDGET) {
    console.error(`Estimate ${money(estimate)} exceeds the ${money(BUDGET)} budget. Raise it with --budget or trim the manifest.`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  let spent = 0;
  const failures = [];

  for (const [i, clip] of pending.entries()) {
    const cost = priceOf(clip);
    log(`  [${i + 1}/${pending.length}] ${clip.id}  ${clip.tier} ${clip.duration}s ${clip.resolution}${cost == null ? "" : `  ~${money(cost)}`}`);
    const temp = join(OUT, `${clip.id}.src.mp4`);
    try {
      const url = await provider.generate(clip, log);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed: ${res.status}`);
      await writeFile(temp, Buffer.from(await res.arrayBuffer()));
      if (cost != null) spent += cost;

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
        provider: provider.name,
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

  log(`\n${priced ? `Spent about ${money(spent)}. ` : ""}${Object.keys(index).length} clips indexed.`);
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
