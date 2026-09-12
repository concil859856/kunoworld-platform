import type { Metadata } from "next";
import Link from "next/link";

import { Code } from "@/components/site/Code";
import { CATALOG, durationRange, isH3, ratesOf, resolutionRange, variantLabel } from "@/lib/catalog";
import { LINKS } from "@/lib/config";
import { rate } from "@/lib/format";
import { MODE_LABEL, MODE_ROLES } from "@/lib/validation";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Developers",
  description: "The KunoWorld HTTP API, both SDKs, the certificate format and the full error table.",
};

const INSTALL = `
npm install @kunoworld/sdk
pip install kunoworld
`;

const JS = `
import { KunoClient } from "@kunoworld/sdk";

const kuno = new KunoClient({ apiKey: process.env.KUNO_API_KEY });

// Routes the job, checks the stage's hardware evidence, encrypts, uploads, submits.
const job = await kuno.submit(
  {
    prompt: "A lighthouse keeper lights the lamp at dusk",
    model: "ltx-2.5-fast",
    durationS: 8,
    resolution: "1080p",
    aspectRatio: "21:9",
  },
  (stage) => console.log(stage), // routing → verifying → encrypting → uploading → submitting
);

// job is a JobHandle. It holds the only key that opens the film: store it like a password.
const { video, receipt, fallbackReason } = await kuno.wait(job, {
  onProgress: (s) => console.log(s.status, s.stage, Math.round(s.progress * 100)),
});
`;

const JS_FRAMES = `
// First and last frame (MiniMax H3 or LTX-2.5)
const job = await kuno.submit({
  prompt: "The door swings open onto a snowfield",
  model: "h3-turbo",
  inputs: [
    { role: "first_frame", file: firstPng },
    { role: "last_frame", file: lastPng },
  ],
});

// Keyframes at chosen times (LTX-2.5)
await kuno.submit({
  prompt: "A darkroom through one day",
  model: "ltx-2.5-fast",
  durationS: 6,
  inputs: [
    { role: "keyframe", file: dawn, timeS: 0 },
    { role: "keyframe", file: dusk, timeS: 6 },
  ],
});

// Retake a window of a clip: mode is explicit, the window rides on the input
await kuno.submit({
  prompt: "Re-shoot the middle: she turns towards the window",
  model: "ltx-2.5-fast",
  mode: "retake",
  inputs: [{ role: "source_video", file: take1, startS: 1, endS: 3.5 }],
});

// References (MiniMax H3 Director): up to 9 images, 3 clips, 3 audio tracks, 12 in total
await kuno.submit({
  prompt: "<Picture 1> walks into the bar from <Video 1>; <Audio 1> is her voice",
  model: "h3-reference",
  inputs: [
    { role: "reference_image", file: portrait },
    { role: "reference_video", file: barClip },
    { role: "reference_audio", file: voice },
  ],
});
`;

const PY = `
import os
from kunoworld import KunoClient

with KunoClient(api_key=os.environ["KUNO_API_KEY"]) as kuno:
    result = kuno.generate(
        "A lighthouse keeper lights the lamp at dusk",
        model="h3-turbo",
        duration_s=8,
        first_frame="keeper.png",
    )
    result.save("keeper.mp4")
    print(result.content_digest)  # look it up at kunoworld.com/verify

    # Submit now, collect later: export() is everything needed to open the film.
    job = kuno.generate("A ferry crosses a harbour", model="ltx-2.5-fast", wait=False)
    keys = job.export()  # job_id, output_key, signing_public_key, profile_id
`;

const VERIFY = `
import { KunoClient, verifyReceipt, verifyEvidence, b64d } from "@kunoworld/sdk";

// Public: anyone can look up a film's certificate by its SHA-256.
const cert = await new KunoClient().provenance(fileBytes);
cert.model.name;          // "MiniMax H3 Turbo"
cert.model.attribution;   // "MiniMax H3" — show this wherever H3 made the film
cert.signature_valid;     // checked by the gateway…

// …and by you, against the stage's own attested key and the golden manifest.
verifyReceipt(cert.receipt, b64d(cert.enclave.evidence.signing_public_key));
verifyEvidence(cert.enclave.evidence, await new KunoClient().manifest());
`;

// ---------------------------------------------------------------- reference data

interface Endpoint {
  method: string;
  path: string;
  auth: string;
  takes: string;
  returns: string;
}

const CUSTOMER_API: Endpoint[] = [
  {
    method: "GET",
    path: "/v1/models",
    auth: "public",
    takes: "—",
    returns: "country, workers_online (distinct attested workers), the signed switch, and every profile with enabled, available_in_region and workers",
  },
  { method: "GET", path: "/v1/manifest", auth: "public", takes: "—", returns: "the golden manifest: version, issued_at, allowed measurements, mock_quote_keys, max_evidence_age_s" },
  { method: "GET", path: "/v1/switch", auth: "public", takes: "—", returns: "the owner-signed SwitchConfig and its Ed25519 signature" },
  {
    method: "GET",
    path: "/v1/route",
    auth: "public",
    takes: "mode (required), profile_id, family",
    returns: "profile_id, requested_profile_id, fallback_reason (region | switched_off | capacity | null), and up to 5 enclaves with full attestation evidence",
  },
  {
    method: "POST",
    path: "/v1/blobs",
    auth: "API key",
    takes: "the raw encrypted blob as the body; it must begin with KUNOB1 and be at most 512 MB",
    returns: "201 with blob_id, sha256, size",
  },
  { method: "GET", path: "/v1/blobs/{blob_id}", auth: "API key", takes: "—", returns: "the bytes, for your own blobs or a blob attached to your job" },
  {
    method: "POST",
    path: "/v1/videos",
    auth: "API key",
    takes: "job_id (lowercase UUIDv4), params, enclave_id, enc, ciphertext, input_blob_ids, webhook_url",
    returns: "201 with the JobStatus. The price is debited here and refunded on any non-success.",
  },
  { method: "GET", path: "/v1/videos", auth: "API key", takes: "limit (default 50, capped at 200)", returns: "your JobStatus list, newest first" },
  { method: "GET", path: "/v1/videos/{job_id}", auth: "API key", takes: "—", returns: "JobStatus" },
  { method: "POST", path: "/v1/videos/{job_id}/cancel", auth: "API key", takes: "—", returns: "JobStatus. A non-terminal job ends as canceled and is refunded." },
  {
    method: "GET",
    path: "/v1/provenance/{sha256}",
    auth: "public",
    takes: "the SHA-256 of a finished video file",
    returns: "receipt, signature_valid, model (id, name, attribution) and enclave (id, tee, image_digest, hardware, evidence)",
  },
  { method: "GET", path: "/healthz", auth: "public", takes: "—", returns: "ok, version" },
];

const PARAMS: Array<[string, string]> = [
  ["profile_id", "The profile that will render. Must match the routed profile."],
  ["mode", "One of the ten modes below. Inferred from the input roles when the SDKs send it for you."],
  ["duration_s", "Within the profile's range, on its step."],
  ["resolution", "A key of limits.sizes, e.g. 720p, 1080p, 768p, 2160p."],
  ["aspect_ratio", "A key under that resolution, e.g. 16:9, 9:16, 21:9."],
  ["fps", "One of limits.fps."],
  ["audio", "Generate sound with the picture. Forced off where the profile can't."],
  ["input_roles", "One role per uploaded blob, in the same order as input_blob_ids."],
];

const STATUS_FIELDS: Array<[string, string]> = [
  ["status", "queued · running · succeeded · failed · canceled"],
  ["stage", "A free-text label from inside the stage, e.g. queued, denoising, sealing"],
  ["progress", "0…1"],
  ["price_usd", "What was debited"],
  ["output_blob_id", "The sealed film, once it exists"],
  ["receipt", "The stage's signed receipt, once sealed"],
  ["error_code", "Machine-readable failure reason (table below); error is the human message"],
];

const RECEIPT_FIELDS: Array<[string, string]> = [
  ["job_id, enclave_id, profile_id", "What ran, and where"],
  ["image_digest", "The software image the stage was approved to run"],
  ["params_digest, input_digest", "Hashes of the public parameters and of the sealed request plus input blobs"],
  ["output_digest, output_bytes", "SHA-256 and size of the sealed (still encrypted) film"],
  ["content_digest", "SHA-256 of the decrypted MP4 — the key certificates are looked up by"],
  ["attestation_digest", "The hardware evidence the stage registered with"],
  ["started_at, finished_at, gpu_seconds", "Timings from inside the stage"],
  ["video", "duration_s, width, height, fps, frames, audio"],
  ["miner_hotkey", "The Bittensor hotkey that earns for the work, or null"],
];

const BEFORE_ERRORS: Array<[string, string, string]> = [
  ["unauthorized", "401", "Missing or unknown API key."],
  ["forbidden", "403", "A validator or admin endpoint, called without that role."],
  ["unknown_model", "404", "No profile with that id."],
  ["mode_unsupported", "422", "The named profile doesn't serve that mode."],
  ["mode_unavailable", "409", "No profile currently serves that mode."],
  ["region_restricted", "451", "The model's license excludes the caller's territory and no other family serves the mode."],
  ["model_disabled", "409", "The owner's signed switch has that profile off."],
  ["no_capacity", "503", "No attested worker is serving the profile."],
  ["no_attested_worker", "503", "Raised by the SDK, not the gateway: no offered enclave passed attestation locally. Nothing was sent."],
  ["unsupported_media", "—", "Raised by the SDK: the file's bytes are not a supported image, video or audio type."],
  ["not_encrypted", "400", "An upload that doesn't begin with KUNOB1. The relay only accepts ciphertext."],
  ["too_large", "413", "A blob over 512 MB after encryption."],
  ["invalid_params", "422", "Duration, size, frame rate or input roles don't fit the profile."],
  ["invalid_inputs", "422", "Roles and blob ids don't line up, or a blob is unknown, not yours, or already used."],
  ["invalid_envelope", "422", "enc or ciphertext isn't base64url."],
  ["duplicate_job", "409", "That job id already exists."],
  ["enclave_unavailable", "409", "The chosen worker left the network before accepting the job. Ask /v1/route again."],
  ["insufficient_balance", "402", "The price exceeds the account balance. Nothing is charged or sent."],
  ["not_found", "404", "No such job or blob on this account."],
  ["expired", "410", "The sealed blob passed the 7-day retention window and was deleted."],
];

const JOB_ERRORS: Array<[string, string]> = [
  ["safety_blocked", "The content check inside the stage refused the request. It runs in the enclave, so no person reads the prompt."],
  ["prompt_too_long", "The sealed prompt is longer than the profile allows (the gateway can't see it, so this is caught in the stage)."],
  ["unsupported_option", "An option the profile doesn't take, such as a negative prompt where there is none."],
  ["invalid_params", "The sealed request disagrees with the public parameters."],
  ["bad_payload", "The decrypted request is malformed."],
  ["bad_inputs", "An input blob failed authentication or doesn't match its manifest entry."],
  ["unsupported_media", "An input isn't a supported file type for its role."],
  ["decrypt_failed", "The request didn't decrypt inside the stage — it was altered in transit, or sealed to another enclave."],
  ["profile_not_served", "The worker doesn't serve that profile (it was re-assigned or re-registered)."],
  ["replay", "That job id was already processed by this enclave."],
  ["internal_error", "The render failed inside the stage."],
  ["queue_timeout", "No worker picked the job up within the queue window."],
  ["canceled", "You canceled it."],
];

const CLIENT_ERRORS: Array<[string, string]> = [
  ["integrity", "The sealed download, the receipt signature, or the decrypted bytes didn't match. The SDK refuses to hand the film back."],
  ["decrypt_failed", "The film didn't open with this JobHandle's output key."],
  ["not_ready", "result() was called before the job succeeded."],
  ["timeout", "wait() gave up (30 minutes by default)."],
  ["aborted", "wait()'s AbortSignal fired."],
];

const JS_METHODS: Array<[string, string]> = [
  ["new KunoClient({ apiKey, baseUrl, manifest, country, fetch })", "Pin `manifest` for zero-trust verification; otherwise the gateway's is used."],
  ["models(maxAgeMs = 15000)", "GET /v1/models, cached in the client."],
  ["manifest()", "GET /v1/manifest, cached for the client's lifetime."],
  ["route(mode, model?, family?)", "GET /v1/route."],
  ["submit(request, onStage?)", "Routes, verifies attestation, encrypts, uploads and submits. Returns a JobHandle."],
  ["wait(handle, { onProgress, signal, pollMs, timeoutMs })", "Polls, then downloads, verifies and decrypts. Throws a KunoError carrying the job's error_code."],
  ["result(handle, status?)", "The same download-verify-decrypt step on a job you already know succeeded."],
  ["status(jobId) · list(limit) · cancel(jobId)", "The JobStatus endpoints."],
  ["provenance(file) · provenanceByDigest(hex)", "Public certificate lookup, no API key needed."],
  ["fitParams · inferMode · priceUsd · sniffMime · jobAad", "The same pure helpers the client uses, for pricing and previewing a request."],
  ["verifyReceipt · verifyEvidence · enclaveIdFor · parseTdxQuote · reportDataFor", "Verification you can run yourself."],
  ["encryptBlob · decryptBlob · openSenderSession · sha256Hex · b64e/b64d · canonicalJson", "The wire primitives, if you'd rather build the envelope by hand."],
];

const PY_METHODS: Array<[string, string]> = [
  ["KunoClient(api_key, base_url, manifest=, country=, timeout=, transport=)", "A context manager over one httpx client."],
  ["generate(prompt, …, wait=True)", "The whole round trip. first_frame, last_frame, keyframes, reference_images/videos/audio, source_video, source_audio are all keyword arguments."],
  ["prepare(prompt, inputs=…) → PreparedJob", "Route, verify, encrypt, upload and seal without submitting."],
  ["submit(prepared) → VideoJob", "POST /v1/videos."],
  ["models() · profile(id) · manifest() · route(mode, model, family)", "Discovery."],
  ["provenance(video) · provenance_by_digest(digest)", "Public certificate lookup."],
  ["VideoJob.status() · cancel() · wait(timeout, poll_s, on_progress) · result()", "Following a job."],
  ["VideoJob.export() / VideoJob.restore(client, data)", "Save and reload the keys that open a film."],
  ["GenerationResult.video · receipt · content_digest · save(path)", "What comes back."],
];

const NOT_YET: Array<[string, string]> = [
  ["Webhooks", "POST /v1/videos accepts and stores webhook_url, but nothing is delivered yet. Poll status(jobId), or use wait()."],
  ["Accounts and billing", "No sign-up, no self-serve keys, no top-ups, no invoices. Keys are issued by hand and balances are set by hand."],
  ["Prompt-enhancement preview", "The enhancer rewrites your prompt inside the sealed stage, immediately before rendering. Nothing outside the enclave sees the rewrite, so there is no endpoint that returns it for review."],
  ["Streaming", "No partial frames or progressive download. Progress is a number and a stage label."],
  ["Rate limits", "No published quotas and no rate-limit headers yet."],
  ["Async Python client", "The Python SDK is synchronous. The JavaScript SDK is promise-based and runs in browsers and Node."],
];

export default function DevelopersPage() {
  return (
    <div className={`wrap ${styles.page}`}>
      <header className={styles.head}>
        <p className="eyebrow">API &amp; SDKs</p>
        <h1 className={`display ${styles.title}`}>
          Build on <em>sealed</em> video.
        </h1>
        <p className={styles.lede}>
          The SDKs do the private part on your side: they check the stage&apos;s hardware evidence, encrypt prompts and
          media to it, and decrypt and verify the result. Our API never receives anything it could watch.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="quickstart">
        <div className={styles.sectionHead}>
          <h2 id="quickstart" className={`display ${styles.h2}`}>
            Quick<em>start</em>
          </h2>
          <div className={styles.body}>
            <p>
              Base URL <code>https://api.kunoworld.com</code>. Authenticate with{" "}
              <code>Authorization: Bearer &lt;key&gt;</code>. Self-serve keys and billing arrive with accounts; until
              then keys are issued by hand.
            </p>
          </div>
        </div>
        <Code code={INSTALL} lang="sh" title="install" />
        <Code code={JS} lang="js" title="generate.mjs" />
        <Code code={PY} lang="python" title="generate.py" />
      </section>

      <section className={styles.section} aria-labelledby="modes">
        <div className={styles.sectionHead}>
          <h2 id="modes" className={`display ${styles.h2}`}>
            Modes and <em>input roles</em>
          </h2>
          <div className={styles.body}>
            <p>
              Every input is uploaded as a separate encrypted blob and described by a <strong>role</strong>. The mode
              follows from the roles, except for <code>extend_video</code>, <code>retake</code> and{" "}
              <code>audio_to_video</code>, which you name explicitly because they share their roles with another mode.
            </p>
            <p>
              Per-role caps, shared group caps and the total cap live in each profile&apos;s <code>limits</code> in{" "}
              <code>GET /v1/models</code>. The studio validates against exactly these rules before encrypting anything.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Modes and the input roles they take</caption>
            <thead>
              <tr>
                <th scope="col">Mode</th>
                <th scope="col">Required roles</th>
                <th scope="col">Also accepts</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(MODE_ROLES) as Array<keyof typeof MODE_ROLES>).map((mode) => {
                const { required, allowed } = MODE_ROLES[mode];
                const extra = allowed.filter((r) => !required.includes(r));
                return (
                  <tr key={mode}>
                    <td>
                      <span className={styles.strong}>{MODE_LABEL[mode]}</span>
                      <br />
                      <code>{mode}</code>
                    </td>
                    <td>{required.length ? required.map((r) => <code key={r}>{r} </code>) : "—"}</td>
                    <td>{extra.length ? extra.map((r) => <code key={r}>{r} </code>) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Code code={JS_FRAMES} lang="js" title="inputs.mjs" />
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Model profiles</caption>
            <thead>
              <tr>
                <th scope="col">Profile</th>
                <th scope="col">Modes</th>
                <th scope="col">Length · size</th>
                <th scope="col">Input caps</th>
                <th scope="col">Per second</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((p) => {
                const caps = Object.entries(p.limits.max_inputs);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className={styles.strong}>{isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`}</span>
                      <br />
                      <code>{p.id}</code>
                    </td>
                    <td>{p.modes.map((m) => MODE_LABEL[m]).join(", ")}</td>
                    <td>
                      {durationRange(p)} · {resolutionRange(p)} · {p.limits.fps.join("/")} fps
                    </td>
                    <td>
                      {caps.length ? caps.map(([role, n]) => `${n} ${role}`).join(", ") : "text only"}
                      {p.limits.max_total_inputs != null && `; ${p.limits.max_total_inputs} in total`}
                      {p.limits.visual_required_with_audio && "; audio needs a visual"}
                    </td>
                    <td className="mono">
                      {ratesOf(p)
                        .map(([r, v]) => `${r} ${rate(v)}`)
                        .join(" · ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="http">
        <div className={styles.sectionHead}>
          <h2 id="http" className={`display ${styles.h2}`}>
            The <em>HTTP API</em>
          </h2>
          <div className={styles.body}>
            <p>
              Errors are JSON: <code>{'{ "detail": { "code": …, "message": … } }'}</code>. Both SDKs turn them into a{" "}
              <code>KunoError</code> carrying that <code>code</code> and the HTTP status.
            </p>
            <p>
              You never have to call these by hand — <code>submit()</code> does the routing, attestation check,
              encryption, upload and submission in one step — but the surface is small enough to use directly.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Customer endpoints</caption>
            <thead>
              <tr>
                <th scope="col">Endpoint</th>
                <th scope="col">Auth</th>
                <th scope="col">Takes</th>
                <th scope="col">Returns</th>
              </tr>
            </thead>
            <tbody>
              {CUSTOMER_API.map((e) => (
                <tr key={e.method + e.path}>
                  <td>
                    <span className={styles.strong}>{e.method}</span>
                    <br />
                    <code>{e.path}</code>
                  </td>
                  <td>{e.auth}</td>
                  <td>{e.takes}</td>
                  <td>{e.returns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>GenerationParams — what the API can see</h3>
            <dl>
              {PARAMS.map(([name, meaning]) => (
                <div key={name}>
                  <dt>
                    <code>{name}</code>
                  </dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={styles.card}>
            <h3>JobStatus</h3>
            <dl>
              {STATUS_FIELDS.map(([name, meaning]) => (
                <div key={name}>
                  <dt>
                    <code>{name}</code>
                  </dt>
                  <dd>{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className={styles.card}>
            <h3>Surfaces that aren&apos;t for customers</h3>
            <p>
              <code>/miner/v1/*</code> is the API each sealed stage calls: <code>nonce</code>, <code>enclaves</code>{" "}
              (register with attestation), <code>pull</code>, <code>jobs/{"{id}"}/progress</code>,{" "}
              <code>complete</code>, <code>fail</code>, <code>blobs</code>, <code>challenges/{"{id}"}</code>. Every
              call is signed with the enclave&apos;s attested key over{" "}
              <code>X-Kuno-Enclave</code>, <code>X-Kuno-Timestamp</code> and <code>X-Kuno-Signature</code>.
            </p>
            <p>
              <code>/validator/v1/enclaves</code> and <code>/validator/v1/ledger</code> are open for anyone auditing
              the network — receipts and attestation evidence, never content. <code>/validator/v1/challenges</code>{" "}
              needs a registered validator key.
            </p>
            <p>
              <code>/admin/v1/switch</code> reads and writes the model switch. The write needs the admin token{" "}
              <em>and</em> a config signed by the owner key, with an increasing <code>issued_at</code>.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="sdks">
        <div className={styles.sectionHead}>
          <h2 id="sdks" className={`display ${styles.h2}`}>
            The two <em>SDKs</em>
          </h2>
          <div className={styles.body}>
            <p>
              Both do the same work and are open source, so the client-side cryptography can be read and audited:{" "}
              <a className="link" href={LINKS.sdkRepo} rel="noreferrer" target="_blank">
                github.com/kunoworld/sdk
              </a>
              .
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">JavaScript SDK</caption>
            <thead>
              <tr>
                <th scope="col">
                  <code>@kunoworld/sdk</code> — JavaScript
                </th>
                <th scope="col">What it does</th>
              </tr>
            </thead>
            <tbody>
              {JS_METHODS.map(([name, meaning]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Python SDK</caption>
            <thead>
              <tr>
                <th scope="col">
                  <code>kunoworld</code> — Python
                </th>
                <th scope="col">What it does</th>
              </tr>
            </thead>
            <tbody>
              {PY_METHODS.map(([name, meaning]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="privacy">
        <div className={styles.sectionHead}>
          <h2 id="privacy" className={`display ${styles.h2}`}>
            The privacy <em>model</em>
          </h2>
          <div className={styles.body}>
            <p>
              <strong>The API sees</strong> only what it needs to price and route: profile, mode, duration, resolution,
              aspect ratio, frame rate, the audio flag, input roles, blob sizes and timing.
            </p>
            <p>
              <strong>The API never sees</strong> your prompt, negative prompt, seed, options, input media, the finished
              video, or any key. Inputs are uploaded as encrypted blobs; the request is HPKE-sealed to the stage&apos;s
              attested key and bound to the public parameters, so changing them in transit breaks decryption.
            </p>
            <p>
              <strong>The output key</strong> is derived in your process and returned inside the <code>JobHandle</code>. Lose
              it and nobody — including us — can open that film. Sealed outputs stay on the relay for 7 days.
            </p>
            <p>
              <strong>For zero-trust verification</strong>, pin the golden manifest you trust:{" "}
              <code>new KunoClient({"{"} manifest {"}"})</code>. Otherwise the SDK uses the one the gateway serves.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="regions">
        <div className={styles.sectionHead}>
          <h2 id="regions" className={`display ${styles.h2}`}>
            Regions and the <em>model switch</em>
          </h2>
          <div className={styles.body}>
            <p>
              The MiniMax H3 Community License excludes four territories: the <strong>European Union</strong>, the{" "}
              <strong>United Kingdom</strong>, the <strong>United States</strong> and the{" "}
              <strong>Republic of Korea</strong>. An unknown location — no country on the request, or Cloudflare&apos;s{" "}
              <code>XX</code>/<code>T1</code> — counts as excluded too, deliberately. LTX-2.5 carries no territory
              restriction.
            </p>
            <p>
              Location comes from the <code>CF-IPCountry</code> header at the edge. <code>X-Kuno-Country</code> (the
              SDKs&apos; <code>country</code> option) is honoured only by a gateway started with{" "}
              <code>KUNO_ALLOW_COUNTRY_OVERRIDE=1</code>, for local development.
            </p>
            <p>
              Check <code>available_in_region</code> on each entry of <code>GET /v1/models</code> before you offer a
              model to a user. The owner&apos;s signed switch runs in one of four modes — <code>h3</code>,{" "}
              <code>ltx</code>, <code>both</code> or <code>auto</code> — and in <code>auto</code> (and in{" "}
              <code>both</code>, except for capacity) a blocked request falls across to the other family. When that
              happens the response carries a <code>fallback_reason</code> of <code>region</code>,{" "}
              <code>switched_off</code> or <code>capacity</code>, and the SDKs adapt your parameters to the profile
              that will actually render. If nothing can serve the mode you get{" "}
              <code>region_restricted</code>, <code>no_capacity</code> or <code>model_disabled</code> instead.
            </p>
            <p>
              Where MiniMax H3 made a film, its license requires the attribution <strong>&ldquo;MiniMax H3&rdquo;</strong> to
              be shown. It travels with the certificate as <code>model.attribution</code>.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="receipts">
        <div className={styles.sectionHead}>
          <h2 id="receipts" className={`display ${styles.h2}`}>
            Receipts &amp; <em>certificates</em>
          </h2>
          <div className={styles.body}>
            <p>
              A receipt is Ed25519-signed by the stage&apos;s attested key over{" "}
              <code>&quot;kuno/v1/receipt\n&quot; + canonical_json(body)</code>. The body holds digests and metadata
              only — no content — so a certificate can be public without revealing anything about the film.
            </p>
            <p>
              <code>wait()</code> only returns a film after checking that the sealed download matches{" "}
              <code>output_digest</code>, that the receipt is signed by the attested stage for this job, and that the
              decrypted bytes match <code>content_digest</code>. The same receipt is public by content hash at{" "}
              <code>GET /v1/provenance/&#123;sha256&#125;</code> and on{" "}
              <Link href="/verify" className="link">
                kunoworld.com/verify
              </Link>
              .
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Receipt body</caption>
            <thead>
              <tr>
                <th scope="col">Receipt field</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {RECEIPT_FIELDS.map(([name, meaning]) => (
                <tr key={name}>
                  <td>
                    <code>{name}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Code code={VERIFY} lang="js" title="verify.mjs" />
      </section>

      <section className={styles.section} aria-labelledby="errors">
        <div className={styles.sectionHead}>
          <h2 id="errors" className={`display ${styles.h2}`}>
            Errors &amp; <em>refunds</em>
          </h2>
          <div className={styles.body}>
            <p>
              A job is charged when the gateway accepts it, and refunded automatically if it fails, times out, is
              canceled, or is stopped by the content check. Anything that goes wrong before acceptance costs nothing.
            </p>
            <p>
              Failures after acceptance arrive as <code>JobStatus.error_code</code>, and <code>wait()</code> throws a{" "}
              <code>KunoError</code> carrying that code directly.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Errors before a job is accepted</caption>
            <thead>
              <tr>
                <th scope="col">Before acceptance — nothing charged</th>
                <th scope="col">HTTP</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {BEFORE_ERRORS.map(([code, status, meaning]) => (
                <tr key={code}>
                  <td>
                    <code>{code}</code>
                  </td>
                  <td className="mono">{status}</td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Job failure codes</caption>
            <thead>
              <tr>
                <th scope="col">
                  After acceptance — <code>error_code</code>, refunded
                </th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {JOB_ERRORS.map(([code, meaning]) => (
                <tr key={code}>
                  <td>
                    <code>{code}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Errors raised in your own process</caption>
            <thead>
              <tr>
                <th scope="col">Raised by the SDK, in your process</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {CLIENT_ERRORS.map(([code, meaning]) => (
                <tr key={code}>
                  <td>
                    <code>{code}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="not-yet">
        <div className={styles.sectionHead}>
          <h2 id="not-yet" className={`display ${styles.h2}`}>
            Not yet <em>available</em>
          </h2>
          <div className={styles.body}>
            <p>
              Plainly, so you can plan around it. Everything above exists today; nothing on this list does.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Not yet available</caption>
            <thead>
              <tr>
                <th scope="col">Missing</th>
                <th scope="col">Where that leaves you</th>
              </tr>
            </thead>
            <tbody>
              {NOT_YET.map(([name, detail]) => (
                <tr key={name}>
                  <td>
                    <span className={styles.strong}>{name}</span>
                  </td>
                  <td>{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
