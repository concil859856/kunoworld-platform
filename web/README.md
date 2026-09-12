# KunoWorld

A new video generation website, created independently in `/video-website`. No source from the old website was reused. The standalone KunoWorld JavaScript SDK and model profile definitions are copied from `/video/sdk/js/src` and `/video/subnet/protocol/src/kuno_protocol/profiles.json` to keep this checkout self-contained.

## Run

Node 22.13+ is required.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Build with `npm run build`; check types with `npx tsc --noEmit`. The framework is React + Vinext, with accessible Radix/Shadcn controls and a Cloudflare-compatible build.

## Connect generation

Use **Connect gateway** in the studio. Supply the gateway base URL, a gateway-issued API key, and a trusted golden manifest JSON obtained from the operator. The gateway must allow the site's browser origin in `KUNO_CORS_ORIGINS`. HTTPS is required except for loopback development URLs. A server localhost address is not the same as localhost on a remote visitor's computer.

The browser uses the SDK to route jobs, check worker evidence against the supplied manifest, encrypt prompts and reference frames, submit ciphertext, poll progress, verify receipts and digests, and decrypt output locally. Credentials, output keys, and completed videos stay in memory for the current session. Download both MP4 and receipt before refreshing. There are no accounts or payments in this frontend.

Text-to-video, image-to-video, and first/last-frame workflows are available. Model settings follow the supplied profile definitions; director editing and other advanced modes remain accessible through the SDK rather than this UI. Region/capacity fallback is enforced by the gateway and SDK.

## Current project limitations

The upstream project runs with simulated TEE evidence and a placeholder video renderer for development. Real GPU inference, production Intel TDX/NVIDIA evidence verification, and confidential deployment are not complete. No production hardware privacy guarantee is made by this website. Profile prices are estimates.

## Pages and design

The cinematic website includes a landing page, studio, model catalog, developer guide, documentation, API reference, privacy and about pages, a screening room, a use-cases page, plus a journal with five complete articles. Marketing routes live in `app/(site)`; the connected generation workspace lives at `/studio` in `components/studio.tsx`.

The landing page combines a cinematic hero, distinct imaginative subjects, editorial typography, scroll reveals, immersive parallax, and responsive layouts. Background films have pause controls, pause outside the viewport, and respect reduced-motion preferences. Scene examples open the studio with their prompts prepared. The studio retains its interactive CSS 3D film frames and uses a marine palette.

The visible collection contains **nine distinct subjects with matching stills and silent eight-second 1080p films**. The repeated ocean imagery has been replaced sitewide by a lantern-lit library, a folded-paper city, an ember-lit stag, an iridescent glass flower, and a copper kinetic sculpture. These join neon cinema, chrome product design, an astronaut garden, and a vertical fashion study. GPT Image 2 produced the stills; Veo 3.1 produced the films through OpenRouter.

The latest replacement batch cost **$8.649880**. Actual cumulative generation cost: **$21.020030** of the authorized $50 budget, including the retired ocean assets. No paid retries or outstanding jobs remain. The old ocean media files are retained as historical generation artifacts but are not referenced by any website page, gallery, or studio scene.

Optimized WebP images, H.264 MP4 films, and matching video poster frames are in `public/media`. Videos retain 1080p resolution and use a bounded 3.5 Mbps encoding rate for web delivery. Background media loads near the viewport, pauses offscreen, and respects reduced-motion preferences. The new screening room filters nine films by creative category and opens each in a native video player with its prompt and studio link. Hero film selection is manual, so it never unexpectedly changes while someone is reading.

Requests, prompts, and reported charges are recorded in `design/asset-ledger.json`, `design/showcase-asset-ledger.json`, and `design/unique-asset-ledger.json`; briefs live in the corresponding `*-briefs.json` files. The generator `scripts/assets/generate-showcase.py` accepts an explicit local `.env` path and `--batch unique` for the replacement collection. It reserves cost before paid requests and refuses duplicate submissions. These creative studies are labeled as external-model showcases, not demonstrations of the KunoWorld inference backend.

The OpenRouter key is read from the authorized `/video-website/.env` during asset creation and remains in that ignored local file. It is used only for asset creation and is not included in frontend code or hosting configuration. Website generation still connects to a separately configured KunoWorld gateway. Fonts are self-hosted, with their OFL licenses in `public/fonts`.

## Validation

Page-to-page links use native anchors because the current Vinext production client-navigation handler throws before changing routes. Keep native navigation until a framework upgrade is verified in a production build. `tests/navigation.cjs` checks hydrated link clicks, mobile menus, query and hash destinations, and browser Back. Run it against the built site on port 8787 with an available Playwright installation (`PLAYWRIGHT_MODULE` can supply its module path).

The production build and TypeScript checks pass. Playwright browser checks cover the complete page collection at desktop and mobile widths, image loading, no horizontal overflow, video playback and reduced-motion behavior, studio scene/model deep links, the connection dialog, SDK language tabs and clipboard copy, mobile navigation, and a real 404 for unknown journal articles. No browser page errors were observed.

The studio SDK integration was also exercised against an isolated mock network without modifying the original project. Its optional `stage_video_prompt` WebMCP tool stages a prompt without submitting a job or spending funds.

The SDK source is attributed to KunoWorld (`@kunoworld/sdk`, Apache-2.0 per its package metadata). Model licenses remain independent from this website.

## Local preview and checks

The primary checkout is `/video-website`; its development preview runs on port 5173 and its production preview on port 8787. The originating worktree can run separately on ports 5174 and 8788. Run the production browser suites with `SITE_TEST_ORIGIN=http://127.0.0.1:8787` and `PLAYWRIGHT_MODULE=/video/platform/web/node_modules/playwright` against `tests/navigation.cjs` and `tests/showcase.cjs`. Native links remain intentional until Vinext client navigation is verified after an upgrade.
