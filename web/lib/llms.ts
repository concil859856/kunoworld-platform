/**
 * kunoworld.com/llms.txt and /llms-full.txt: KunoWorld explained for language models and the people using them
 * (the llmstxt.org convention). `/llms.txt` is the short index; `/llms-full.txt` explains the whole project in one file.
 *
 * Public text: everything here must already be true of the public site and the code. It states what is built and
 * what is not, with dates. Models come from the catalog (lib/profiles.json, synced from kuno_protocol), so the model
 * section can't drift from the profiles the network loads. Prices are placeholders, so no numbers are repeated here.
 */

import type { ModelProfile } from "@kunoworld/sdk";

import { CATALOG, durationRange, fpsRange, isH3, offersStandard, resolutionRange, variantLabel } from "./catalog";
import { SITE } from "./config";

const UPDATED = "2026-09-17";
const url = (path: string) => `${SITE.url}${path}`;

const MODE_NAMES: Record<string, string> = {
  text_to_video: "text to video",
  image_to_video: "image to video",
  last_frame: "last frame",
  first_last_frame: "first and last frame",
  keyframes: "keyframes",
  retake: "retake",
  audio_to_video: "audio to video",
  reference_to_video: "reference to video",
  video_edit: "video edit",
  extend_video: "extend video",
  storyboard: "storyboard",
  plan: "plan from a brief",
};

const SUMMARY =
  "KunoWorld is private, verifiable AI video generation on a Bittensor subnet. People create video with MiniMax H3 and " +
  "LTX-2.5. In Private mode the prompt, inputs and video are encrypted end to end between the customer's device and a " +
  "GPU worker inside a hardware enclave (Intel TDX with NVIDIA confidential computing), and every video comes with a " +
  "signed receipt anyone can verify. KunoWorld is a development preview: it is not yet serving customers on " +
  "confidential hardware, and prices are placeholders.";

function modelLine(profile: ModelProfile): string {
  const label = variantLabel(profile);
  const name = isH3(profile) ? (label === "H3" ? "MiniMax H3" : `MiniMax H3 ${label}`) : `LTX-2.5 ${label}`;
  const privacy = offersStandard(profile) ? "Private and Standard" : "Private only";
  const modes = profile.modes.map((m) => MODE_NAMES[m] ?? m).join(", ");
  return (
    `- \`${profile.id}\` (${name}): ${profile.tagline}. ${durationRange(profile)}, ` +
    `${resolutionRange(profile)}, ${fpsRange(profile)}${profile.limits.audio ? ", with audio" : ""}. ` +
    `Modes: ${modes}. ${privacy}. Runs on ${profile.gpus_per_worker} GPU${profile.gpus_per_worker === 1 ? "" : "s"} per worker.`
  );
}

export function llmsTxt(): string {
  return `# KunoWorld

> ${SUMMARY}

Key facts:
- Every video has a privacy mode. **Private** (the default) is end-to-end encrypted and runs only on confidential GPUs. **Standard** lets KunoWorld and the GPU provider read the job, so it can run on any GPU and costs less.
- Before a client sends anything to a worker, it checks the worker itself: the worker's Intel TDX quote against Intel's root, its GPUs' NVIDIA attestation, and an owner-signed list of approved software images. None of these checks trusts KunoWorld's servers.
- Creation modes: text, image and first/last frame to video, keyframes, references, video edit and extend, retake, audio to video, and storyboards (2 to 12 chained shots delivered as one video, on LTX-2.5 Fast), which a confidential worker can plan from a written brief.
- Sexual and explicit content is banned in both modes. Videos are stored until their owner deletes them.
- The MiniMax H3 licence excludes the United States, the European Union, the United Kingdom and South Korea; requests from there are served by LTX-2.5.
- The whole project, explained in one file: ${url("/llms-full.txt")}

## Docs

- [Everything about KunoWorld](${url("/llms-full.txt")}): what it is, status, privacy modes, verification, models, content policy, storage, developers, miners, validators, licences, limits of the guarantees
- [Documentation](${url("/docs")}): the studio, privacy modes, keys and recovery, share links, SDK quickstart, creation modes, model routing, receipts, troubleshooting, project status
- [API reference](${url("/api")}): the HTTP API for developers
- [Developers](${url("/developers")}): the JavaScript and Python SDKs
- [Models](${url("/models")}): model profiles, limits and placeholder prices
- [Privacy and provenance](${url("/privacy")}): what each mode protects and what it doesn't
- [Verify a video](${url("/verify")}): check a video against its signed receipt

## Policies

- [Terms of Service](${url("/terms")}): draft
- [Privacy Policy](${url("/privacy-policy")}): draft
- [Report a video](${url("/report")})

## Optional

- [About](${url("/about")})
- [Blog](${url("/blog")})
- [Use cases](${url("/use-cases")})
- [Showcase](${url("/showcase")}): creative films made with other video models for illustration, each labelled with the model that made it, not output of the KunoWorld network
`;
}

export function llmsFullTxt(): string {
  const ltx = CATALOG.filter((p) => !isH3(p));
  const h3 = CATALOG.filter((p) => isH3(p));
  return `# KunoWorld: the whole project in one file

> ${SUMMARY}

Updated ${UPDATED}. Short index: ${url("/llms.txt")}. This file describes the design and says plainly which parts are built, which have run for real, and which haven't. If it disagrees with ${url("/docs")}, the documentation is the reference for how to use the product.

## 1. What KunoWorld is

- **A video studio and API.** People describe a scene, give frames, reference images, clips or audio, or plan several shots as a storyboard, and get a video with sound. The website's studio is at ${url("/studio")}; developers use the JavaScript and Python SDKs or the HTTP API.
- **A privacy promise.** In Private mode, nobody but the customer and the attested enclave that renders the video can read the prompt, the inputs or the result: not KunoWorld, not the GPU owner, not the network in between.
- **A verifiable result.** Each video comes with a receipt signed by the enclave key, stating which model made it from which (hashed) request, plus a C2PA content-credentials manifest embedded in the file. Anyone can check it at ${url("/verify")}.
- **A Bittensor subnet.** Independent miners supply the GPUs and are paid in the subnet's emissions for verified work. Validators check that miners run the approved software on genuine confidential hardware. The subnet is not yet registered on Bittensor mainnet.

## 2. Status (${UPDATED})

Built and tested (against simulated enclaves and test doubles):
- Email sign-in, API keys for developers, the studio, and encryption in the browser and the SDKs.
- Private and Standard modes, model routing with licence-region rules, encrypted uploads and downloads, deletion, key sync, share links and signed receipts.
- The gateway's accounts, credit ledger and top-ups (card, USDT, TAO and subnet alpha), moderation tooling, content credentials and validator feeds.
- The miner worker's job loop and safety checks, and the validator's attestation checks, test jobs, step audits and scoring.
- Client-side verification of Intel TDX quotes and NVIDIA GPU attestation, tested on Intel's sample quotes and NVIDIA's real signing certificates.
- The confidential VM image builds reproducibly.

Run on real GPUs, without confidential computing (September 2026):
- The LTX-2.5 worker (Fast and Pro) on an NVIDIA RTX PRO 6000 Blackwell, and the MiniMax H3 worker (H3 and H3 Director) on four NVIDIA H200s. Jobs were rendered, encrypted, signed and opened by the SDK, with receipts matching the videos.

Not done yet:
- Running on confidential hardware end to end: a live TDX quote, live NVIDIA evidence, and the confidential VM booting on a TDX host. Until then, **KunoWorld cannot claim hardware confidentiality**; development networks use simulated attestation and may return placeholder video.
- Publishing the SDK packages and the subnet source code.
- Registration on Bittensor mainnet, and weight setting on a live chain.
- Live payments, load testing, and an accuracy evaluation of the safety classifiers.
- Final prices. Every price shown today is a placeholder.
- C2PA Trust List membership for KunoWorld's signing root, and a production timestamp authority.

## 3. How a Private video is made

1. The client (the studio in a browser, or an SDK) asks the gateway for a route: which model profile and which workers can serve the request. The gateway applies the owner's model switch, the licence-region rules and the workers' capacity.
2. The client verifies a worker's attestation itself (section 5). It does not trust the gateway for this.
3. It opens an HPKE session to the worker's enclave key and encrypts the inputs. It then seals the prompt and settings, using the public job parameters as authenticated associated data, so a relay that changes any public parameter makes decryption fail inside the enclave.
4. The gateway queues ciphertext. The worker decrypts inside the enclave, runs the safety checks, generates the video, and embeds a C2PA manifest.
5. The worker encrypts the video to a key only the customer holds, signs a receipt (digests only, no content), and uploads the ciphertext.
6. The client downloads the ciphertext, checks the receipt signature and the digests, and decrypts on the device.

The output key is in the job handle. A lost key means a lost video: KunoWorld can't recover it. Key sync (optional) stores keys with the account, encrypted in the browser under a recovery code or passkey that KunoWorld never sees.

## 4. Privacy modes

| | Private (default) | Standard |
|---|---|---|
| Who can read the prompt, inputs and video | only the customer, and the attested enclave that renders it | the customer, KunoWorld's systems, and the GPU provider |
| Which GPUs may serve it | confidential (TEE) workers only | any worker |
| What KunoWorld sees | metadata: account, model, duration, resolution, aspect ratio, frame rate, input roles, sizes, timing, price, status, receipt | everything |
| Storage | ciphertext on Cloudflare R2 until the owner deletes it | encrypted at rest on Cloudflare R2 until the owner deletes it |
| Price | higher; long MiniMax H3 clips cost more per second | lower, flat per second |

In both modes:
- **Access.** Only the account that made a video can open it, unless it creates a share link. KunoWorld operators may open content only for a report of child sexual abuse material or sexual content involving a minor, or under a legal preservation hold, and every view is logged. There is no sampled review. For a Private video they also need its output key, supplied with such a report.
- **Share links.** A Private link carries its key after \`#\`, which browsers never send to a server.
- **Account standing.** Private mode needs an account in good standing: a credited top-up, no active restriction, and fewer than 2 blocked jobs in 30 days.

## 5. Verification: how anyone can check a worker and a video

- **Attestation.** A confidential worker proves what it runs with an Intel TDX quote. The quote's measurements identify the exact VM image, and its report data binds a fresh nonce, the worker's encryption and signing keys, and NVIDIA GPU evidence. The measurements must appear in the **golden manifest**, a list of approved images signed by the subnet owner's key, which the API serves whole at \`GET /v1/manifest/signed\`.
- **Endorsements.** Browsers can't reach Intel's collateral service or NVIDIA's attestation service themselves. So the gateway relays what Intel and NVIDIA signed next to each worker's evidence: Intel's DCAP collateral, and NVIDIA's signed attestation tokens with their certificate chains. Clients check them offline:
  - The quote goes through full DCAP verification against Intel's SGX root CA, including a TCB status check.
  - Each NVIDIA token must be signed by a key certified by NVIDIA's attestation-service intermediate, which is pinned by public-key hash, and must attest every GPU in the evidence for the right nonce, with debug disabled and measurements matching NVIDIA's reference values.
  - A relay can withhold this material but can't forge it. Evidence without it is refused.
- **Receipts.** Every result is signed by the enclave's attested key. A receipt binds the job, the model profile, the request's parameter digest and the video's content digest. Anyone can look one up by video hash at ${url("/verify")}.
- **Content credentials.** A C2PA manifest is embedded before the video is encrypted, signed under a short-lived certificate that KunoWorld's certificate authority issues only to freshly attested enclaves.
- **Validators.** They challenge workers with their own nonces, send test jobs that look like customer jobs, re-verify receipts, and in verified mode replay individual denoising steps to confirm the declared model did the work.

## 6. Models

Each model family has several profiles. The gateway routes a request to a profile that the owner's switch enables, that the requester's licence region permits, and that a worker has capacity for. If it has to fall back, the job handle says so (\`profileId\`, \`fallbackReason\`: \`region\`, \`switched_off\` or \`capacity\`).

LTX-2.5 (Lightricks; LTX-2 Community License):
${ltx.map(modelLine).join("\n")}

MiniMax H3 (MiniMax; MiniMax H3 Community License):
${h3.map(modelLine).join("\n")}

- **Storyboards.** LTX-2.5 Fast chains 2 to 12 shots into one video of at most 120 seconds, rendered one shot after another by one worker inside one enclave, with one receipt. The scene is written once and each shot has its own prompt and length. A shot either continues the one before (one unbroken take), cuts to a new picture over the same sound, or starts fresh. Each joined shot repeats the previous shot's last 17 frames, which are trimmed, so the video is a little shorter than its shots added up. The price is per stitched second. Storyboards run only on confidential GPUs, in both privacy modes, because validators don't step-audit them yet. In the JavaScript SDK pass \`shots\` (the scene goes in \`prompt\`); in the Python SDK, \`generate(prompt=scene, shots=[Shot(...)])\`; over HTTP, \`params.shots\` lists each shot's \`duration_s\` and \`join\`, and a Standard request adds \`shots: [{prompt}]\`.
- **Plans (Director).** LTX-2.5 Fast can write a storyboard from a brief inside the enclave: a scene and 2 to 12 shots, each with a prompt, a length and a join, fitted to a target length of 4 to 120 seconds. Nothing is rendered; the customer edits the plan (or has single shots rewritten) and renders it as an ordinary storyboard. The planner is the small language model bundled with LTX-2.5, so a plan is a first draft, and every change code made to what it wrote is listed in the plan's \`repairs\`. A plan costs a flat placeholder price whatever its length (\`pricing.plan_usd\`, and \`standard_plan_usd\` in Standard mode), runs only on confidential GPUs whose workers advertise the \`plan/1\` feature, and is refunded if the planner writes nothing usable (\`plan_failed\`). In Private mode the brief is sealed on the customer's device and the plan is opened there: the gateway sees the target length, the frame, the price, the status and the receipt, never the brief or the plan. In Standard mode KunoWorld reads both, checks them against the content policy and stores the plan until the owner deletes it. SDKs: \`kuno.plan\` and \`kuno.revisePlan\` (JavaScript), \`client.plan\`, \`client.revise_plan\` and \`generate(plan=...)\` (Python). Over HTTP: Private, a sealed job with \`params.mode\` \`"plan"\` to \`POST /v1/plans\` (or \`/v1/videos\`), whose output blob is the sealed plan JSON and whose receipt carries \`plan\` instead of \`video\`; Standard, \`POST /v1/standard/plans\` \`{params, brief, style?, options?}\`, then \`GET /v1/standard/plans/{job_id}\`.
- **Prices.** The live profiles, limits and placeholder prices are at ${url("/models")} and \`GET /v1/models\`, which returns \`pricing_placeholder: true\` while they are placeholders. Every video job costs at least $0.10; a plan costs its flat price. The gateway holds the price when a job is submitted and refunds it automatically if the job fails, is blocked, is canceled or times out.

## 7. Content policy and safety

- **Ban.** All sexual or explicit content is banned in both modes, and no setting allows it.
- **Checks.** Prompts are checked against a shared content policy at the gateway (Standard) and inside the enclave (both modes). A prompt classifier and frame classifiers over the rendered video also run inside the enclave, before anything is signed or sealed. All checks fail closed.
- **Errors.** A Standard request that breaks the policy is refused with \`422 content_policy\`; a Private job blocked inside the enclave fails with \`safety_blocked\`.
- **Consequences.** Blocked jobs count as strikes, and repeated strikes restrict the account. A job blocked only for text a model wrote inside the enclave (an enhanced prompt or a Director plan) is refused and refunded without a strike.
- **Reports.** Anyone can report a video at ${url("/report")}.
- **Tracing.** Private content can't be reviewed. Enforcement relies on in-enclave checks, account strikes, reports, and signed provenance that traces a surfaced copy back to its job.

## 8. Accounts, payment and storage

- **Sign-in.** People sign in by email link; there are no passwords. The website keeps the session in an HttpOnly cookie, so the browser never holds an API key.
- **API keys.** Developers create API keys on the account page and keep them on their servers, never in a web page.
- **Credits.** Credits are pay-as-you-go: top up by card (Stripe), USDT on TRON or Ethereum (NOWPayments), or TAO and subnet alpha sent from a Bittensor coldkey linked to the account.
- **Deletion.** Videos stay on Cloudflare R2 until their owner deletes them. Deleting removes the stored video (and, for Standard, the prompt, inputs and preview). Billing records, job metadata and the signed receipt stay.

## 9. For developers

- **SDKs.** A JavaScript client for browsers and Node.js 20.19+ (\`@kunoworld/sdk\`) and a Python client (\`kunoworld\`). Both implement the same byte-level protocol: route, verify, encrypt, submit, poll, verify the receipt, decrypt, delete. The packages are not yet published.
- **Verification options.**
  - Pin a golden manifest, or give the subnet owner's public key so the client uses the gateway's manifest only if the owner signed it.
  - TDX workers are accepted only with verified endorsements.
- **HTTP API.**
  - \`GET /v1/models\`, \`GET /v1/route\`, \`GET /v1/manifest\` and \`GET /v1/manifest/signed\`.
  - \`POST /v1/quote\`: the exact price a job would be charged now (the model after routing, the params, a breakdown, and the balance with a key), before anything is encrypted; send the job's shape, never a prompt.
  - Elements (encrypted characters, products, locations, styles and voices): \`/v1/elements\`. Everything describing an Element is encrypted on the customer's device under a key derived from key sync; the gateway stores ciphertext only.
  - Private jobs: \`POST /v1/blobs\` and \`POST /v1/videos\`, then \`GET /v1/videos/{job_id}\`, \`POST /v1/videos/{job_id}/cancel\` and \`DELETE /v1/videos/{job_id}\`.
  - Plans: \`POST /v1/plans\` (sealed, mode plan) and \`GET /v1/plans/{job_id}\`; Standard plans at \`/v1/standard/plans\`. Quote a plan with \`POST /v1/quote\` and \`mode: "plan"\`.
  - Standard jobs live under \`/v1/standard/…\`.
  - Provenance lookup: \`GET /v1/provenance/{content_digest}\`.
  - Share links: \`/v1/account/shares\` and \`/v1/shares/{token}\`.
  - Full reference: ${url("/api")}.
- **Quickstart.** A local development network (gateway plus a simulated worker producing placeholder video) is described at ${url("/docs#quickstart")}.

### For AI agents

- **Local MCP server.** \`kunoworld-mcp\` (Python package \`kunoworld\`, extra \`mcp\`; not yet on PyPI) runs on the user's computer over stdio for Claude Code, Claude Desktop, Cursor and other MCP clients. Tools: list_models, quote_price, generate_video, plan_video, revise_plan, get_job, download_video, cancel_job, list_jobs. plan_video writes an editable storyboard from a brief (a flat price, nothing rendered), revise_plan rewrites some or all of its shots, and generate_video renders it by its plan_id; plans stay in the local job store.
- **Why local.** Private jobs are encrypted and decrypted on the user's computer, so the server must run there. KunoWorld runs no hosted MCP server: a hosted one would receive prompts readable, and could only ever offer Standard mode.
- **What the assistant sees.** Private mode keeps prompts and videos from KunoWorld and GPU operators, not from the AI assistant or its provider, which see what the user types and what the tools return.
- **Spending.** generate_video quotes first and refuses, creating and charging nothing, over max_price_usd or the server's KUNOWORLD_MAX_JOB_USD cap. Quote and agree the price with the user before generating.
- **Handles.** Private job keys stay in local files readable only by the user; no tool returns a key.
- **Skill.** The \`kunoworld-video\` Agent Skill (in the SDK repository, \`skills/kunoworld-video\`) covers when to use KunoWorld, Private vs Standard, quoting, LTX-2.5 and MiniMax H3 prompts, storyboards, plans from a brief and the content rules.

## 10. For miners

- **Hardware.** Miners provide GPU servers and run KunoWorld's published, measured worker image inside a confidential VM: Intel Xeon 5th gen or Xeon 6 with TDX, and NVIDIA GPUs in confidential-computing mode.
  - Class C1: 1× RTX PRO 6000 Blackwell Server Edition, which serves LTX-2.5 Fast.
  - Class C2: 1× H200, B200 or B300, which serves all LTX-2.5 profiles.
  - Class C4: 4× H200, B200 or B300 per worker, which serves MiniMax H3. It runs as two workers in one whole-server 8-GPU confidential VM.
  - Consumer GPUs have no confidential mode and can't mine. A no-TEE tier for Standard jobs was designed, but it is off at launch.
- **Isolation.** The worker's keys are created inside the VM and never leave it. The worker makes only outbound connections, never logs content, and can't see customer prompts, media or videos in Private mode.
- **Licence territory.** A worker declares the country it runs in. The network refuses to register MiniMax H3 profiles in the United States, the European Union, the United Kingdom or South Korea, where H3's licence doesn't allow it, testing included.
- **Pay.**
  - Miners earn for verified work on jobs customers paid for, measured in video compute units that scale with each profile's measured GPU cost.
  - A capped share pays for verified confidential GPU-hours of available capacity.
  - Emission is never burned.
- **Collateral.** Registration requires per-GPU collateral; the amount isn't set yet.
- **Availability.** The worker image, the confidential VM image and its measurements are not published yet.

## 11. For validators

- **Roles.** KunoWorld runs one main validator that assigns work and sends test jobs. Other validators run auditor code: they independently check the published attestation evidence and receipts, and set weights from the public record of verified work.
- **Checks.** Validators verify worker attestation with their own nonces, run test jobs that look like customer traffic, re-verify every receipt against the attested key, audit verified-mode commitments by replaying denoising steps, and gate scores on live attestation and reliability.
- **Weights.** Weights are never set on the owner's key or a burn address.

## 12. What the guarantees don't cover

- **Physical attacks.** Research such as TEE.fail (2025) showed that a cheap memory-bus interposer can defeat Intel TDX and AMD SEV-SNP. A miner willing to physically attack their own machine could, in principle, read what it processes. Canary jobs, audits, collateral and hardware identity raise the cost, but don't remove the risk.
- **GPU-to-GPU traffic on 8× H200 servers.** MiniMax H3 uses four GPUs. On HGX H200 servers, traffic between GPUs inside the server is not encrypted in NVIDIA's Protected PCIe mode; reading it needs physical access to the server. B200 and B300 servers encrypt it.
- **Standard mode** gives up confidentiality by design.
- **Status.** None of the hardware guarantees apply until confidential hardware runs end to end (section 2).

## 13. Licences

- **MiniMax H3.** The MiniMax H3 Community License (https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE) excludes the United States, the European Union, the United Kingdom and South Korea. KunoWorld serves H3 only to requests from, and on workers in, other countries, and treats an unknown country as excluded.
- **LTX-2.5.** The LTX-2 Community License (https://huggingface.co/Lightricks/LTX-2/blob/main/LICENSE).
- **Credits.** Generated videos name the model that made them.

## 14. Glossary

- **Enclave / confidential VM (CVM):** a virtual machine whose memory is encrypted by the CPU (Intel TDX), so the host can't read it.
- **Attestation / quote:** a hardware-signed statement of what software a CVM booted, with data the CVM chose to bind (here: a nonce, its keys and GPU evidence).
- **Golden manifest:** the owner-signed list of approved image measurements.
- **Endorsements:** the Intel collateral and NVIDIA attestation tokens relayed so clients can verify attestation offline.
- **Receipt:** the enclave-signed certificate for a finished video.
- **VCU:** video compute unit, the measure miners are paid in.
- **Gateway:** KunoWorld's API service. It routes and relays ciphertext, handles accounts and payments, and can't read Private jobs.
- **Canary:** a validator's test job, indistinguishable from customer traffic.

## 15. Links

- Studio: ${url("/studio")}
- Documentation: ${url("/docs")}
- API reference: ${url("/api")}
- Developers: ${url("/developers")}
- Models: ${url("/models")}
- Privacy and provenance: ${url("/privacy")}
- Verify a video: ${url("/verify")}
- Terms (draft): ${url("/terms")}; Privacy Policy (draft): ${url("/privacy-policy")}
- Report a video: ${url("/report")}
`;
}
