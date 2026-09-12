#!/usr/bin/env node
/**
 * Generates the site's stills from scripts/stills.manifest.json, through OpenRouter.
 *
 *   node scripts/stills.mjs --dry-run            # what it would cost, generates nothing
 *   node scripts/stills.mjs                      # generate everything missing
 *   node scripts/stills.mjs --role input         # just the media the modes take as input
 *   node scripts/stills.mjs --only in-first-frame
 *   node scripts/stills.mjs --force              # regenerate even if the file exists
 *
 * Needs OPENROUTER_API_KEY in /video/.env and ffmpeg on PATH. OpenRouter has no video
 * models at all (445 models, none with video output), so this covers stills only —
 * scripts/assets.mjs does the footage through ElevenLabs or fal.
 *
 * Two roles, and they are not interchangeable. `input` stills are the real source media
 * for image-to-video, first/last-frame, keyframes and reference modes, so the demos are
 * honest jobs rather than text prompts dressed up as image ones. `poster` stills are a
 * holding frame for a mode tile until its clip exists, and are replaced by a frame cut
 * from the real video.
 *
 * Results land in public/stills/ and are indexed in src/lib/stills.generated.json.
 * Already-generated stills are skipped, so re-running after a failure costs nothing extra.
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
const OUT = join(WEB, "public", "stills");
const INDEX = join(WEB, "src", "lib", "stills.generated.json");

const ENDPOINT = "https://openrouter.ai/api/v1/images";

/**
 * Measured, not published: the model metadata quotes a per-token rate, while one image
 * actually bills about this much. Used only for the estimate; real spend is read back
 * from each response's usage.cost.
 */
const MEASURED_COST = 0.067;

/**
 * The house style, kept here rather than in the manifest so every still matches without
 * fifteen copies of the same adjectives. Manifest prompts describe subject and light only.
 */
const STYLE =
  "Cinematic film still, 35mm, anamorphic, shallow depth of field, natural film grain, " +
  "muted palette of deep warm blacks, amber tungsten highlights and cold teal shadows, " +
  "no text, no watermark, no people unless described";

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
const BUDGET = Number(value("budget", "25"));

const log = (...m) => console.log(...m);
const money = (n) => `$${n.toFixed(2)}`;

async function loadKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY.trim();
  try {
    const text = await readFile(join(REPO, ".env"), "utf8");
    for (const line of text.split("\n")) {
      const [k, ...rest] = line.split("=");
      if (k?.trim() === "OPENROUTER_API_KEY") return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env; the environment may still carry the key */
  }
  return null;
}

function fingerprint(still) {
  const { id, model, prompt, aspect_ratio } = still;
  return createHash("sha256").update(JSON.stringify({ id, model, prompt, aspect_ratio, STYLE })).digest("hex").slice(0, 12);
}

async function probe(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file]);
  const s = JSON.parse(stdout).streams?.[0] ?? {};
  return { width: Number(s.width) || 0, height: Number(s.height) || 0 };
}

/** Inputs stay larger: they are fed back into image-to-video, not just displayed. */
async function encode(source, still) {
  const jpg = join(OUT, `${still.id}.jpg`);
  const width = still.role === "input" ? 1280 : 1024;
  // Asking for a film still sometimes gets an actual film-frame border drawn in. That is
  // harmless on a poster, but an input image is fed back into image-to-video, where the
  // model would animate the border as if it were part of the scene — so trim it off.
  const crop = still.role === "input" ? "crop=iw*0.96:ih*0.96," : "";
  await run("ffmpeg", ["-y", "-i", source, "-vf", `${crop}scale=${width}:-2:flags=lanczos`, "-q:v", "4", jpg]);
  return { jpg, ...(await probe(jpg)) };
}

async function generate(still, key) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: still.model,
      prompt: `${STYLE}. ${still.prompt}`,
      n: 1,
      aspect_ratio: still.aspect_ratio,
      output_format: "png",
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 300)}`);
  const data = JSON.parse(body);
  if (data.error) throw new Error(`OpenRouter: ${JSON.stringify(data.error).slice(0, 300)}`);
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error(`no image in response: ${body.slice(0, 300)}`);
  return { bytes: Buffer.from(b64, "base64"), cost: Number(data.usage?.cost) || 0 };
}

async function main() {
  const manifest = JSON.parse(await readFile(join(HERE, "stills.manifest.json"), "utf8"));
  const defaults = manifest.defaults ?? {};
  let stills = manifest.stills.map((s) => ({ ...defaults, ...s }));

  if (ONLY) stills = stills.filter((s) => s.id === ONLY);
  if (ROLE) stills = stills.filter((s) => s.role === ROLE);
  if (!stills.length) {
    console.error("No stills matched. Check --only / --role against scripts/stills.manifest.json.");
    process.exit(1);
  }

  const previous = existsSync(INDEX) ? JSON.parse(await readFile(INDEX, "utf8")) : { stills: {} };
  const index = { ...previous.stills };

  const pending = stills.filter((s) => {
    if (FORCE) return true;
    const done = index[s.id];
    return !done || done.fingerprint !== fingerprint(s) || !existsSync(join(OUT, `${s.id}.jpg`));
  });

  const estimate = pending.length * MEASURED_COST;
  log(`\n${stills.length} stills in the manifest · ${pending.length} to generate · estimate ${money(estimate)} (measured ~${money(MEASURED_COST)} each)\n`);

  if (DRY) {
    for (const s of pending) log(`  ${s.id.padEnd(20)} ${String(s.role).padEnd(7)} ${s.aspect_ratio}  ${s.model}`);
    log(`\nDry run — nothing generated. Budget cap is ${money(BUDGET)}.`);
    return;
  }
  if (!pending.length) {
    log("Everything is already generated. Use --force to redo a still.");
    return;
  }
  if (estimate > BUDGET) {
    console.error(`Estimate ${money(estimate)} exceeds the ${money(BUDGET)} budget. Raise it with --budget or trim the manifest.`);
    process.exit(1);
  }

  const key = await loadKey();
  if (!key) {
    console.error("No OPENROUTER_API_KEY found. Add it to /video/.env (chmod 600) or export it, then re-run.");
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  let spent = 0;
  const failures = [];

  for (const [i, still] of pending.entries()) {
    log(`  [${i + 1}/${pending.length}] ${still.id}  ${still.role}`);
    const temp = join(OUT, `${still.id}.src.png`);
    try {
      const { bytes, cost } = await generate(still, key);
      await writeFile(temp, bytes);
      spent += cost;

      const out = await encode(temp, still);
      index[still.id] = {
        id: still.id,
        role: still.role,
        for: still.for,
        src: `/stills/${still.id}.jpg`,
        width: out.width,
        height: out.height,
        alt: still.alt,
        prompt: still.prompt,
        source: still.source,
        model: still.model,
        fingerprint: fingerprint(still),
      };
      log(`      ✓ ${out.width}×${out.height}  ${money(cost)}`);
      // Write after every still so an interrupted run keeps what it paid for.
      await writeFile(INDEX, JSON.stringify({ generated_at: new Date().toISOString(), stills: index }, null, 2) + "\n");
    } catch (err) {
      failures.push(`${still.id}: ${err.message}`);
      log(`      ✗ ${err.message}`);
    } finally {
      await rm(temp, { force: true });
    }
  }

  log(`\nSpent ${money(spent)}. ${Object.keys(index).length} stills indexed.`);
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
