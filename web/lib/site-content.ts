import { additionalPosts } from "./editorial-posts";
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
