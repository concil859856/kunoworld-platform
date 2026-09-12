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
          return url;
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
      return url;
    },
  };
}

// ---------------------------------------------------------------- selection

export const PROVIDERS = ["elevenlabs", "fal"];

/**
 * Picks a provider from the keys available. ElevenLabs is preferred when both are present:
 * it serves LTX-2 Retake and Audio-to-Video as well, which match modes we actually route.
 */
export function pickProvider(env, wanted = null) {
  const keys = { elevenlabs: env.ELEVENLABS_API_KEY, fal: env.FAL_KEY };
  const make = { elevenlabs, fal };
  const order = wanted ? [wanted] : PROVIDERS;
  for (const name of order) {
    if (keys[name]) return make[name](keys[name].trim());
  }
  return null;
}
