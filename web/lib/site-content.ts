import { additionalPosts } from "./editorial-posts";
import type { CreationModeId } from "./showcase";

/* ---- Homepage copy. Clips live in lib/showcase.ts; model limits in lib/profiles.json. ---- */

/** Model cards, in display order: one line of strength each. Duration and resolutions come from the profile. */
export const modelStrengths: { id: string; strength: string }[] = [
  { id: "ltx-2.5-fast", strength: "Quick drafts with audio, keyframes and retakes." },
  { id: "ltx-2.5-pro", strength: "Finer control: guidance, negative prompts and audio-driven video." },
  { id: "ltx-2.5-4k", strength: "High-resolution finals with detail refinement." },
  { id: "h3-turbo", strength: "MiniMax H3 with native stereo audio, in 8 distilled steps." },
  { id: "h3", strength: "The full 50-step MiniMax H3, for maximum fidelity." },
  { id: "h3-reference", strength: "Direct a scene from up to 9 images, 3 clips and 3 audio tracks." },
];

type Destination = { href: string; label: string };

/** The creation-mode tabs. `modes` are protocol mode ids; the page lists the profiles that support them. */
export const creationModes: { id: CreationModeId; label: string; modes: string[]; title: string; copy: string; cta: Destination; secondary?: Destination }[] = [
  { id: "text", label: "Text to video", modes: ["text_to_video"], title: "Describe it. Watch it move.", copy: "Write the scene, the action, the camera and the light. Start with a sentence and refine from there.", cta: { href: "/studio", label: "Start with a prompt" } },
  { id: "image", label: "Image to video", modes: ["image_to_video"], title: "A still becomes a shot.", copy: "Give one image as the first frame and describe what happens next. The composition is yours; the model adds the motion.", cta: { href: "/studio?mode=image_to_video", label: "Bring a frame to life" } },
  { id: "first-last", label: "First & last frame", modes: ["first_last_frame", "last_frame"], title: "Choose where it starts and ends.", copy: "Set a first and a last frame and describe the journey between them, or give only a last frame to land on a composition you chose.", cta: { href: "/studio", label: "Set your frames" } },
  { id: "keyframes", label: "Keyframes", modes: ["keyframes"], title: "Pace a shot, beat by beat.", copy: "Place up to 8 keyframes along the clip to decide what the scene looks like at each moment.", cta: { href: "/studio", label: "Place keyframes" } },
  { id: "references", label: "References", modes: ["reference_to_video"], title: "Cast the scene yourself.", copy: "Give H3 Director up to 9 reference images, 3 clips and 3 audio tracks, such as a face, a prop or a place, and direct a new scene around them. Available through the SDK today.", cta: { href: "/docs#creation-modes", label: "Direct with the SDK" } },
  { id: "edit", label: "Edit & retake", modes: ["retake", "video_edit", "extend_video"], title: "Change a take, keep the rest.", copy: "Retake a window of a clip with LTX-2.5 and keep everything around it. With H3 Director in the SDK, edit what happens in a clip or extend it past its last frame.", cta: { href: "/studio", label: "Retake in the studio" }, secondary: { href: "/docs#creation-modes", label: "Editing with Director" } },
];

export type HomeTool = { id: string; title: string; copy: string; href: string; mode?: string };

/** Every creation mode, for the tools grid. Director-only modes go to the docs: Director is SDK-only today. */
export const homeModes: HomeTool[] = [
  { id: "text", mode: "text_to_video", title: "Text to video", copy: "Start from a written scene.", href: "/studio" },
  { id: "image", mode: "image_to_video", title: "Image to video", copy: "Bring one frame to life.", href: "/studio?mode=image_to_video" },
  { id: "last", mode: "last_frame", title: "Last frame", copy: "End on a composition you chose.", href: "/studio" },
  { id: "first-last", mode: "first_last_frame", title: "First & last frame", copy: "Find the path between two frames.", href: "/studio" },
  { id: "keyframes", mode: "keyframes", title: "Keyframes", copy: "Pace a shot with up to 8 frames.", href: "/studio" },
  { id: "retake", mode: "retake", title: "Retake", copy: "Redo a window, keep the rest.", href: "/studio" },
  { id: "audio", mode: "audio_to_video", title: "Audio to video", copy: "Picture driven by your soundtrack.", href: "/studio" },
  { id: "reference", mode: "reference_to_video", title: "Reference to video", copy: "Cast, props and places you supply.", href: "/docs#creation-modes" },
  { id: "edit", mode: "video_edit", title: "Video edit", copy: "Change what happens in a clip.", href: "/docs#creation-modes" },
  { id: "extend", mode: "extend_video", title: "Extend video", copy: "Continue past the last frame.", href: "/docs#creation-modes" },
];

export const homeTools: HomeTool[] = [
  { id: "privacy", title: "Private or Standard", copy: "Choose who can see each video.", href: "/docs#privacy-modes" },
  { id: "share", title: "Share links", copy: "One video, one revocable link.", href: "/docs#share-links" },
  { id: "keys", title: "Key sync", copy: "Open Private videos on any device.", href: "/docs#keys" },
  { id: "verify", title: "Verify a film", copy: "Check a video against its receipt.", href: "/verify" },
  { id: "sdk", title: "SDKs & API", copy: "JavaScript, Python and HTTP.", href: "/developers" },
];

/**
 * Homepage FAQ. Every answer follows subnet/PRIVACY_MODES.md, platform/gateway/PAYMENTS.md and
 * STANDARD_MODE.md, and research/research_pricing.md for what is decided: keep them in step.
 */
export const homeFaq: { q: string; a: string; link?: Destination }[] = [
  {
    q: "What’s the difference between Private and Standard?",
    a: "Private is the default. Your device encrypts the prompt and inputs for the attested enclave that renders the video, and the result is sealed to a key only you hold: KunoWorld can’t open it, or recover a lost key. In Standard, KunoWorld and the GPU provider can read the prompt, inputs and video, so it can run on any GPU and costs less. Production hardware verification is still in development.",
    link: { href: "/docs#privacy-modes", label: "Compare the modes" },
  },
  {
    q: "Who can see my videos?",
    a: "Only you, unless you create a share link for one. Nobody at KunoWorld opens your prompt, inputs or video, except for a report of child sexual abuse material or a legal preservation hold, and every such view is logged; a Private video also needs its key. In Standard, the GPU provider that renders the job can see it, and validators may check its prompt and settings, never the video.",
    link: { href: "/docs#share-links", label: "How share links work" },
  },
  {
    q: "Which models can I use?",
    a: "Six model profiles: LTX-2.5 Fast, Pro and 4K, and MiniMax H3 Turbo, H3 and H3 Director. H3 Director works through the SDK today. MiniMax H3 is used under the MiniMax H3 Community License and isn’t available in every region; there, a compatible LTX-2.5 profile may run instead. Real GPU serving is still being completed.",
    link: { href: "/models", label: "Compare the models" },
  },
  {
    q: "How much does it cost?",
    a: "You pay per second of video, by model, resolution and privacy mode, from credit you top up in advance. Standard costs less than Private, long Private MiniMax H3 clips cost more per second, and every job costs at least $0.10. All prices shown today are placeholders until launch pricing is set. Credit never expires, and a job that fails, times out, is cancelled or is blocked by the safety checks is refunded automatically.",
    link: { href: "/models", label: "See placeholder rates" },
  },
  {
    q: "Is sexual content allowed?",
    a: "No. Sexual content is banned in both modes: pornography, nudity, sexual acts, fetish content, sexualised depictions and erotic roleplay. Private mode is not a way around it. Prompts are checked before rendering and sampled frames after; a blocked job delivers nothing, is refunded and counts as a strike, and repeated strikes restrict the account.",
    link: { href: "/privacy", label: "How the ban is enforced" },
  },
  {
    q: "Is there an API or SDK?",
    a: "Yes: JavaScript and Python SDKs and an HTTP API, using API keys you create on your account page. The SDKs encrypt Private requests on your machine and check every video against its signed receipt. The packages aren’t published yet, so for now the SDKs install from the KunoWorld source.",
    link: { href: "/developers", label: "Build with KunoWorld" },
  },
  {
    q: "How can I pay?",
    a: "By card through Stripe, in USDT on TRON or Ethereum through NOWPayments, or in TAO and subnet alpha sent from a Bittensor coldkey linked to your account. TAO and alpha deposits earn bonus credit, 5% by default. Payments are built but not yet validated in production.",
  },
  {
    q: "Where are my videos stored, and how do I delete them?",
    a: "On Cloudflare R2, until you delete them: nothing expires on its own. A Private video is stored as ciphertext only your key opens; a Standard video is encrypted at rest. Delete a video in My creations or with the SDK and its stored files go, while billing records and the signed receipt stay. A legal preservation hold can keep deleted content, hidden, until the hold ends.",
    link: { href: "/docs#receipts", label: "Deleting a video" },
  },
];
export const sdkCode = `import { KunoClient } from "@kunoworld/sdk";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile("./trusted-manifest.json", "utf8")
);

const kuno = new KunoClient({
  baseUrl: process.env.KUNO_GATEWAY_URL,
  apiKey: process.env.KUNO_API_KEY,
  manifest,
});

const job = await kuno.submit({
  prompt: "Paper lanterns drift inside a vast spiral library. A slow camera push.",
  model: "ltx-2.5-fast",
  durationS: 5,
  resolution: "1080p",
  aspectRatio: "16:9",
});

const { video, receipt } = await kuno.wait(job);`;
export const pythonCode = `import os
from kunoworld import KunoClient
from kuno_protocol.attestation import GoldenManifest

manifest = GoldenManifest.model_validate_json(
    open("trusted-manifest.json").read()
)
kuno = KunoClient(
    os.environ["KUNO_API_KEY"],
    os.environ["KUNO_GATEWAY_URL"],
    manifest=manifest,
)
result = kuno.generate(
    "Paper lanterns drift inside a vast spiral library. A slow camera push.",
    model="ltx-2.5-fast",
    duration_s=5,
)
result.save("my-world.mp4")
with open("my-world.receipt.json", "w") as file:
    file.write(result.receipt.model_dump_json(indent=2))`;
export const posts = [
 {slug:"directing-the-impossible",category:"CREATIVE NOTES",title:"The art of directing the impossible.",description:"A practical way to move from a feeling to a scene worth watching.",image:"/media/lantern-library.webp",read:"5 min read",sections:[
 {heading:"Start with something you can feel",paragraphs:["A good video prompt often begins before you describe a single object. Is the scene restful, uncertain, expansive, or intimate? Decide what the audience should feel, then make every visual choice serve that feeling. An enormous library can feel welcoming or mysterious. Light, framing, and movement make the difference.","For a scene of quiet wonder, begin with towering spiral bookshelves, warm paper lanterns, and unhurried movement. You do not need a long list of cinematic adjectives. A few choices that agree with each other give the model a clearer direction. The impossible setting becomes easier to read when its light and materials feel familiar."]},
 {heading:"Give the camera one job",paragraphs:["Choose one movement for a short clip: a slow push through a library aisle, a sideways track past a miniature paper city, or a fixed view of a glass flower turning in the light. Asking for an orbit, a zoom, and a dramatic change of angle in five seconds often produces a less coherent result.","Write the shot as a simple sequence: subject, action, camera movement, light. For example: ‘Paper lanterns sway between monumental spiral bookshelves. The camera pushes slowly along the central aisle. Warm amber light catches the edges of the books.’ The architecture establishes scale while the lanterns give the shot a small, readable movement."]},
 {heading:"Change one thing at a time",paragraphs:["When a result is close, keep the subject and the framing. Change only the lighting or the pace. This makes it easier to understand what improved the shot, rather than starting a completely different experiment every time.","Use a reference frame when the exact composition matters. Text defines the action and atmosphere; a starting image gives the shot a visual anchor. First and last frames offer a more deliberate path between two moments."]},
 {heading:"Keep the small surprises",paragraphs:["Not every interesting result will match the original idea exactly. A reflection, an unusual shadow, or an unexpected rhythm may become the strongest part of the scene. Directing is as much about noticing what works as insisting on what you planned.","The visual studies on this site were commissioned as creative examples through external generation models. They illustrate this process; they are not a benchmark of KunoWorld’s unfinished GPU deployment."]}]},
 {slug:"a-language-for-camera-movement",category:"FIELD GUIDE",title:"Give your camera a little direction.",description:"Push, orbit, track, or simply stay still. A useful vocabulary for your next scene.",image:"/media/paper-metropolis.webp",read:"4 min read",sections:[
 {heading:"The slow push",paragraphs:["A push-in gradually moves the viewer closer to the subject. It is useful when a scene needs a sense of discovery: a doorway, a face, or a tiny building in a handmade city. Name what the camera approaches so the movement has a clear destination.","Try: ‘A slow, steady push toward the central tower of an origami metropolis. The camera stays level. Soft afternoon light reveals the folds in the paper.’ Keep the architecture still so the changing perspective reads as camera movement rather than a transforming subject."]},
 {heading:"The lateral track",paragraphs:["Tracking follows a subject or travels beside a surface. It can reveal the depth of a miniature street or make a simple walk feel deliberate. Specify whether the camera follows the subject or lets it move through the frame.","Try: ‘The camera glides sideways past a row of handmade paper buildings, keeping a constant distance and height. Nearer rooftops pass in front of towers in the background.’ Those overlapping layers help communicate depth without changing the scene’s scale."]},
 {heading:"The orbit",paragraphs:["An orbit shows a subject from changing angles. It works best when the subject has a readable shape and there is space around it. For short clips, ask for a gentle partial orbit rather than a full revolution.","Try: ‘A gentle quarter-orbit around a floating polished copper sculpture. The sculpture holds still as broad studio highlights move across its curved surfaces.’ Asking the object to spin at the same time can make the camera’s contribution harder to judge."]},
 {heading:"The still camera",paragraphs:["A locked camera can be the most expressive option. Let the action happen within the composition: amber particles drifting past a stag, paper lanterns swaying, or light moving across a blown-glass flower. The result often feels more natural when only one part of the scene moves.","For a first test, use one movement and a short duration. Review the beginning, middle, and end before adding more instructions. Look for a consistent subject, readable motion, and a frame that still makes sense when paused. A clear shot is usually more useful than a complicated one."]}]},
 {slug:"why-a-video-needs-a-receipt",category:"INSIDE KUNOWORLD",title:"Beautiful work deserves a clear origin.",description:"Why signed receipts belong beside the final frame—and what they can actually prove.",image:"/media/kinetic-orbit.webp",read:"5 min read",sections:[
 {heading:"A file is only part of the story",paragraphs:["When a video arrives, you can see what it looks like. You cannot tell which worker produced it, which profile was requested, or whether a relay changed the file in transit just by watching it. KunoWorld’s protocol pairs the video with a signed receipt to make those questions inspectable.","The receipt records digests and generation metadata. It does not include the plaintext prompt or reference media. A digest acts as a fingerprint: changing the file changes the expected fingerprint."]},
 {heading:"Check before opening",paragraphs:["The SDK checks the downloaded ciphertext against the receipt, verifies the worker’s signature for the expected job, decrypts the video locally, and then checks the plaintext video digest. If these checks fail, the SDK rejects the result.","These checks connect a result to a particular job and signing key. They do not, by themselves, prove that a scene depicts a real event or that every claim made about a model is correct."]},
 {heading:"Trust has a boundary",paragraphs:["Hardware attestation is intended to connect a worker’s keys to an approved confidential environment. The current project tests those bindings using simulated evidence. Real TDX and NVIDIA verification and a production confidential deployment are unfinished.","That distinction matters. A development receipt can demonstrate the protocol without providing production hardware privacy. The studio labels this state, and the privacy page describes the current boundaries."]},
 {heading:"Keep the pair together",paragraphs:["After a generation completes, download both the MP4 and its JSON receipt. The studio keeps each video stored until you delete it. A private video opens only with the key kept in your browser, so back your keys up.","A clear origin makes creative work easier to audit and discuss. It is one part of a trustworthy workflow, alongside honest model documentation, well-understood infrastructure, and careful handling of the creator’s device."]}]},
 ...additionalPosts,
];
