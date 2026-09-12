import type { Metadata } from "next";
import Link from "next/link";

import { Code } from "@/components/site/Code";
import { CATALOG, durationRange, isH3, ratesOf, resolutionRange, variantLabel } from "@/lib/catalog";
import { LINKS } from "@/lib/config";
import { rate } from "@/lib/format";
import { MODE_LABEL } from "@/lib/validation";

import styles from "../prose.module.css";

export const metadata: Metadata = {
  title: "Developers",
  description: "Generate sealed, certified video from your own code with the KunoWorld JavaScript and Python SDKs.",
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

// References (MiniMax H3 Director): up to 9 images, 3 clips, 3 audio tracks, 12 in total
const scene = await kuno.submit({
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
`;

const VERIFY = `
import { KunoClient, verifyReceipt, b64d } from "@kunoworld/sdk";

// Public: anyone can look up a film's certificate by its SHA-256.
const cert = await new KunoClient().provenance(fileBytes);
cert.model.name;          // "MiniMax H3 Turbo"
cert.model.attribution;   // "MiniMax H3"
cert.signature_valid;     // checked by the gateway…
verifyReceipt(cert.receipt, b64d(cert.enclave.evidence.signing_public_key)); // …and by you
`;

const ERRORS: Array<[string, string]> = [
  ["unauthorized", "Missing or unknown API key."],
  ["insufficient_balance", "The job costs more than the balance. Nothing is charged."],
  ["region_restricted", "H3 isn't licensed where the request comes from and no LTX profile supports the mode."],
  ["no_attested_worker", "No worker passed the SDK's attestation check. Nothing was sent."],
  ["no_capacity / model_disabled", "No workers online for the profile, or the owner switched it off."],
  ["invalid_params", "Duration, size, fps or input roles don't fit the profile."],
  ["safety_blocked, internal_error, timeout, …", "The job failed after submission; the reason arrives as JobStatus.error_code. Refunded automatically."],
  ["integrity", "The downloaded film or receipt didn't check out. The SDK refuses to return it."],
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
              Base URL <code>https://api.kunoworld.com</code>. Authenticate with <code>Authorization: Bearer &lt;key&gt;</code>.
              Self-serve keys and billing arrive with accounts; until then keys are issued by hand.
            </p>
          </div>
        </div>
        <Code code={INSTALL} lang="sh" title="install" />
        <Code code={JS} lang="js" title="generate.mjs" />
        <Code code={PY} lang="python" title="generate.py" />
      </section>

      <section className={styles.section} aria-labelledby="inputs">
        <div className={styles.sectionHead}>
          <h2 id="inputs" className={`display ${styles.h2}`}>
            Frames, keyframes, <em>references</em>
          </h2>
          <div className={styles.body}>
            <p>
              The mode is inferred from the input roles, or set explicitly (<code>extend_video</code>,{" "}
              <code>retake</code> and <code>audio_to_video</code> need it). Each profile publishes its limits in{" "}
              <code>GET /v1/models</code> — the studio validates against the same rules before encrypting anything.
            </p>
          </div>
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
                <th scope="col">Per second</th>
              </tr>
            </thead>
            <tbody>
              {CATALOG.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className={styles.strong}>{isH3(p) ? p.name : `LTX-2.5 ${variantLabel(p)}`}</span>
                    <br />
                    <code>{p.id}</code>
                  </td>
                  <td>{p.modes.map((m) => MODE_LABEL[m]).join(", ")}</td>
                  <td>
                    {durationRange(p)} · {resolutionRange(p)}
                  </td>
                  <td className="mono">
                    {ratesOf(p)
                      .map(([r, v]) => `${r} ${rate(v)}`)
                      .join(" · ")}
                  </td>
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
              attested key and bound to the public parameters.
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

      <section className={styles.section} aria-labelledby="receipts">
        <div className={styles.sectionHead}>
          <h2 id="receipts" className={`display ${styles.h2}`}>
            Receipts &amp; <em>certificates</em>
          </h2>
          <div className={styles.body}>
            <p>
              <code>wait()</code> only returns a film after checking that the sealed download matches the receipt&apos;s
              output digest, the receipt is signed by the attested stage for this job, and the decrypted bytes match its
              content digest. The same receipt is public by content hash at <code>GET /v1/provenance/&#123;sha256&#125;</code>{" "}
              and on <Link href="/verify" className="link">kunoworld.com/verify</Link>.
            </p>
          </div>
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
              Errors are <code>KunoError</code>s with a <code>code</code> and an HTTP <code>status</code>. A job is charged
              when it&apos;s accepted and refunded automatically if it fails, times out, is canceled or is blocked by the
              content check.
            </p>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">Error codes</caption>
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {ERRORS.map(([code, meaning]) => (
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

      <section className={styles.section} aria-labelledby="webhooks">
        <div className={styles.sectionHead}>
          <h2 id="webhooks" className={`display ${styles.h2}`}>
            Webhooks are <em>coming</em>
          </h2>
          <div className={styles.body}>
            <p>
              Signed, content-free notifications for completed, failed and refunded jobs are on the way. Until then, poll{" "}
              <code>status(jobId)</code> or use <code>wait()</code>.
            </p>
            <p>
              Source for both SDKs:{" "}
              <a className="link" href={LINKS.sdkRepo} rel="noreferrer" target="_blank">
                github.com/kunoworld/sdk
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
