# KunoWorld website and studio

The public website, the studio where customers make videos, account and billing pages, the admin console for
operators, and the developer docs. Next.js 16 with React 19; Node 22.13 or newer.

## Run

```sh
npm ci
npm run dev          # http://localhost:3000
```

The site talks to a KunoWorld gateway. For local work, start one with `scripts/dev.sh` from the dev workspace (gateway on
:8080 and a mock-TEE worker), then set:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_KUNO_API` | The gateway URL the browser calls |
| `KUNO_GATEWAY_URL` | The gateway URL for server-side calls |
| `NEXT_PUBLIC_KUNO_MANIFEST`, `NEXT_PUBLIC_KUNO_OWNER_PUBLIC_KEY` | The golden manifest and owner key the SDK checks enclaves against |

The gateway must allow the site's origin in `KUNO_CORS_ORIGINS` (`dev.sh` already allows :3000 and :3001).

## Check

```sh
npm run typecheck
npm run lint
npm run build
npx playwright test --workers=1     # end to end against a real gateway: tests/e2e/README.md
```

`next dev` and `next build` may rewrite `tsconfig.json` and `next-env.d.ts`. Don't commit those changes unless you meant
to make them.

## Where things are

| Path | What it is |
|---|---|
| `app/(site)` | Marketing pages, docs, the API reference, account, admin, sign-in, verify, showcase |
| `app/studio`, `components/studio.tsx`, `components/studio/` | The studio: text, frames, keyframes, references, edits, storyboards and plans from a brief, Elements |
| `app/api/kuno/[...path]` | The proxy to the gateway, with an allowlist of routes |
| `lib/` | The catalog (`profiles.json`, synced from `kunoworld-subnet`), validation, `llms.txt`, labels for showcase footage |
| `tests/e2e` | Playwright specs |
| `design/` | Briefs and cost ledgers for the site's showcase media |

**Privacy.** Private jobs are sealed in the browser by `@kunoworld/sdk` (linked from `kunoworld-sdk`), so prompts,
inputs and videos reach the gateway only as ciphertext. Standard jobs go through the gateway's `/v1/standard` routes.

**Showcase media.** The stills and films in `public/media` were made with other models (GPT Image, Veo, and others) and
are labelled as such on the site (`lib/reel.ts`, `lib/showcase.ts`). Only a verified certificate may claim that a clip
came from the KunoWorld network.
