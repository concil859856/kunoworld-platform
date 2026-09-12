/**
 * Where footage comes from.
 *
 * Two providers serve the same open LTX-2 weights our network runs, so either produces
 * honest reference renders. A clip says what it wants (`tier: fast | pro`); the provider
 * maps that to its own model.
 *
 *   elevenlabs  POST /v1/flows/video, polled. Model ids are resolved at runtime from
 *               /v1/flows/video/models — they are not published, so we never hardcode
 *               them. Needs a key with the image_video_generation permission.
 *   fal         POST queue.fal.run/<model>, polled. Model ids are stable and documented.
 *
 * Neither key is ever printed.
 */

const EL = "https://api.elevenlabs.io";
const FAL = "https://queue.fal.run";
const OR = "https://openrouter.ai/api/v1";

async function jsonOrThrow(res, what) {
  const body = await res.text();
  if (!res.ok) throw new Error(`${what} ${res.status}: ${body.slice(0, 400)}`);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`${what}: expected JSON, got ${body.slice(0, 200)}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every provider hands back bytes, because not all of them expose a public URL. */
async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * The completed-response shape for a flows generation is not documented, so rather than
 * guess a field path we look for the first URL that is plausibly the rendered video.
 */
function findVideoUrl(value, depth = 0) {
  if (depth > 6 || value == null) return null;
  if (typeof value === "string") {
    return /^https?:\/\//.test(value) && /\.(mp4|webm|mov)(\?|$)/i.test(value) ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findVideoUrl(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value === "object") {
    // Prefer an explicit video container when one is present.
    for (const key of ["video", "output", "result", "media", "assets"]) {
      if (key in value) {
        const hit = findVideoUrl(value[key], depth + 1);
        if (hit) return hit;
      }
    }
    for (const item of Object.values(value)) {
      const hit = findVideoUrl(item, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

// ---------------------------------------------------------------- ElevenLabs

function elevenlabs(key) {
  const headers = { "xi-api-key": key, "Content-Type": "application/json" };
  let catalog = null;

  async function models() {
    if (catalog) return catalog;
    const res = await fetch(`${EL}/v1/flows/video/models`, { headers });
    if (res.status === 401) {
      const body = await res.text();
      throw new Error(
        body.includes("image_video_generation")
          ? "this ElevenLabs key lacks the image_video_generation permission — enable it on the key (and a Pro plan or above) in the dashboard"
          : `ElevenLabs rejected the key: ${body.slice(0, 200)}`,
      );
    }
    const data = await jsonOrThrow(res, "ElevenLabs model list");
    catalog = Array.isArray(data) ? data : (data.models ?? data.data ?? []);
    return catalog;
  }

  /** Find the LTX model for a tier by name, since ids are not published. */
  async function modelFor(clip) {
    const all = await models();
    const text = (m) => `${m.model_id ?? m.id ?? ""} ${m.name ?? ""}`.toLowerCase();
    const ltx = all.filter((m) => text(m).includes("ltx"));
    if (!ltx.length) {
      throw new Error(`no LTX model in ElevenLabs' catalogue; available: ${all.map(text).join(", ").slice(0, 300)}`);
    }
    const wants = clip.mode === "retake" ? "retake" : clip.generate_audio && clip.mode === "audio_to_video" ? "audio" : clip.tier === "pro" ? "pro" : "fast";
    const hit = ltx.find((m) => text(m).includes(wants)) ?? ltx.find((m) => text(m).includes(clip.tier === "pro" ? "pro" : "fast")) ?? ltx[0];
    return hit.model_id ?? hit.id;
  }

  return {
    name: "elevenlabs",

    async generate(clip, log) {
      const model_id = await modelFor(clip);
      log(`      model ${model_id}`);
      const created = await jsonOrThrow(
        await fetch(`${EL}/v1/flows/video`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model_id,
            prompt: clip.prompt,
            resolution: clip.resolution,
            duration_secs: Number(clip.duration),
            aspect_ratio: "16:9",
          }),
        }),
        "ElevenLabs create",
      );
      const id = created.id ?? created.generation_id;
      if (!id) throw new Error(`no generation id in response: ${JSON.stringify(created).slice(0, 200)}`);

      const deadline = Date.now() + 15 * 60_000;
      let last = "";
      while (Date.now() < deadline) {
        const status = await jsonOrThrow(await fetch(`${EL}/v1/flows/video/${id}`, { headers }), "ElevenLabs poll");
        const state = status.status ?? status.state;
        if (state !== last) log(`      ${String(state).toLowerCase()}…`), (last = state);
        if (state === "completed") {
          const url = findVideoUrl(status);
          if (!url) throw new Error(`completed but no video URL: ${JSON.stringify(status).slice(0, 300)}`);
          return { bytes: await download(url), cost: null, model: model_id };
        }
        if (state === "failed") throw new Error(`render failed: ${JSON.stringify(status.error ?? status).slice(0, 300)}`);
        await sleep(4000);
      }
      throw new Error("timed out after 15 minutes");
    },
  };
}

// ---------------------------------------------------------------- fal

/** $ per second of output, by tier and resolution. From fal.ai/pricing. */
const FAL_RATES = {
  pro: { "1080p": 0.06, "1440p": 0.12, "2160p": 0.24 },
  fast: { "1080p": 0.04, "1440p": 0.08, "2160p": 0.16 },
};

const FAL_MODELS = {
  fast: "fal-ai/ltx-2/text-to-video/fast",
  pro: "fal-ai/ltx-2/text-to-video",
};

/**
 * What a clip will cost, in USD, without needing a key — costing a reel is arithmetic on
 * the manifest and should not require credentials. Returns null where the provider does
 * not publish a per-second rate (ElevenLabs), rather than inventing a number.
 */
export function estimateFor(providerName, clip) {
  if (providerName === "openrouter") {
    const rate = OR_RATES[clip.model];
    if (!rate) return null;
    return (clip.generate_audio ? rate.audio : rate.silent) * Number(clip.duration);
  }
  if (providerName !== "fal") return null;
  const tier = clip.tier === "pro" ? "pro" : "fast";
  return (FAL_RATES[tier][clip.resolution] ?? FAL_RATES.fast["1080p"]) * Number(clip.duration);
}

function fal(key) {
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };

  return {
    name: "fal",

    async generate(clip, log) {
      const model = FAL_MODELS[clip.tier === "pro" ? "pro" : "fast"];
      log(`      model ${model}`);
      const queued = await jsonOrThrow(
        await fetch(`${FAL}/${model}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: clip.prompt,
            resolution: clip.resolution,
            fps: Number(clip.fps),
            duration: Number(clip.duration),
            generate_audio: Boolean(clip.generate_audio),
          }),
        }),
        "fal submit",
      );
      const statusUrl = queued.status_url ?? `${FAL}/${model}/requests/${queued.request_id}/status`;
      const responseUrl = queued.response_url ?? `${FAL}/${model}/requests/${queued.request_id}`;

      const deadline = Date.now() + 15 * 60_000;
      let last = "";
      while (Date.now() < deadline) {
        const status = await jsonOrThrow(await fetch(statusUrl, { headers }), "fal poll");
        if (status.status !== last) log(`      ${String(status.status).toLowerCase().replace("_", " ")}…`), (last = status.status);
        if (status.status === "COMPLETED") break;
        if (status.status === "FAILED" || status.error) throw new Error(`render failed: ${JSON.stringify(status.error ?? status).slice(0, 300)}`);
        await sleep(4000);
      }
      if (last !== "COMPLETED") throw new Error("timed out after 15 minutes");

      const result = await jsonOrThrow(await fetch(responseUrl, { headers }), "fal result");
      const url = findVideoUrl(result);
      if (!url) throw new Error(`no video in result: ${JSON.stringify(result).slice(0, 300)}`);
      return { bytes: await download(url), cost: null, model };
    },
  };
}

// ---------------------------------------------------------------- OpenRouter

/**
 * $ per second of output for the models we use. OpenRouter publishes these as
 * `pricing_skus` on /videos/models; they are copied here so a reel can be costed without
 * a key. Verify against the live endpoint before trusting a number that matters.
 */
const OR_RATES = {
  "google/veo-3.1": { audio: 0.4, silent: 0.2 },
  "google/veo-3.1-fast": { audio: 0.12, silent: 0.1 },
  "google/veo-3.1-lite": { audio: 0.08, silent: 0.05 },
};

/** Durations each model will accept; anything else is rejected outright. */
export const OR_DURATIONS = {
  "google/veo-3.1": [4, 6, 8],
  "google/veo-3.1-fast": [4, 6, 8],
  "google/veo-3.1-lite": [4, 6, 8],
};

function openrouter(key) {
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  return {
    name: "openrouter",

    async generate(clip, log) {
      const body = {
        model: clip.model,
        prompt: clip.prompt,
        aspect_ratio: clip.aspect_ratio ?? "16:9",
        duration: Number(clip.duration),
        resolution: clip.resolution,
        generate_audio: Boolean(clip.generate_audio),
      };
      if (clip.seed != null) body.seed = Number(clip.seed);
      // Built by the caller: local stills become data URLs so they never need hosting.
      if (clip.frame_images?.length) body.frame_images = clip.frame_images;

      log(`      model ${clip.model}${body.frame_images ? ` + ${body.frame_images.length} frame image(s)` : ""}`);
      const created = await jsonOrThrow(
        await fetch(`${OR}/videos`, { method: "POST", headers, body: JSON.stringify(body) }),
        "OpenRouter create",
      );
      const id = created.id;
      if (!id) throw new Error(`no job id in response: ${JSON.stringify(created).slice(0, 200)}`);
      const pollUrl = created.polling_url?.startsWith("http") ? created.polling_url : `${OR}/videos/${id}`;

      const deadline = Date.now() + 20 * 60_000;
      let last = "";
      let cost = null;
      while (Date.now() < deadline) {
        const status = await jsonOrThrow(await fetch(pollUrl, { headers }), "OpenRouter poll");
        if (status.status !== last) log(`      ${String(status.status).replace("_", " ")}…`), (last = status.status);
        if (status.usage?.cost != null) cost = Number(status.usage.cost);
        if (status.status === "completed") break;
        if (["failed", "cancelled", "expired"].includes(status.status)) {
          throw new Error(`render ${status.status}: ${String(status.error ?? "").slice(0, 300)}`);
        }
        await sleep(5000);
      }
      if (last !== "completed") throw new Error("timed out after 20 minutes");

      // The content endpoint is authenticated, so download it here rather than handing
      // back a URL the caller would have to sign.
      const res = await fetch(`${OR}/videos/${id}/content`, { headers: { Authorization: headers.Authorization } });
      if (!res.ok) throw new Error(`download failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
      return { bytes: Buffer.from(await res.arrayBuffer()), cost, model: clip.model };
    },
  };
}

// ---------------------------------------------------------------- selection

export const PROVIDERS = ["openrouter", "elevenlabs", "fal"];

/**
 * Picks a provider from the keys available. OpenRouter is first because it works today and
 * carries the strongest catalogue (Veo, Sora, Kling, Seedance). Note that it has no LTX or
 * MiniMax H3, so its output is not from the weights the network serves — clips generated
 * here must be labelled as samples from another model, never as network output.
 */
export function pickProvider(env, wanted = null) {
  const keys = { openrouter: env.OPENROUTER_API_KEY, elevenlabs: env.ELEVENLABS_API_KEY, fal: env.FAL_KEY };
  const make = { openrouter, elevenlabs, fal };
  const order = wanted ? [wanted] : PROVIDERS;
  for (const name of order) {
    if (keys[name]) return make[name](keys[name].trim());
  }
  return null;
}
