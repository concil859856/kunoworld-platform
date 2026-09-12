# End-to-end tests

These drive a real browser against a real gateway and a mock-TEE worker: every run
encrypts to an attested (simulated) enclave, renders, and decrypts in the page.

## 1. Start the backend

```bash
cd /video
uv run kuno-devkit init --data /tmp/kuno-web-data          # idempotent; writes dev.env
KUNO_DATA_DIR=/tmp/kuno-web-data KUNO_ALLOW_COUNTRY_OVERRIDE=1 \
  KUNO_CORS_ORIGINS=http://localhost:3000,http://localhost:3001 \
  uv run kuno-gateway --port 8080 &
KUNO_DATA_DIR=/tmp/kuno-web-data uv run kuno-worker &
```

`KUNO_ALLOW_COUNTRY_OVERRIDE=1` lets the JP run exercise MiniMax H3; the CORS list
covers both dev servers Playwright starts.

## 2. Run the tests

```bash
cd /video/platform/web
npx playwright install chromium   # once
npm run test:e2e                  # or: npx playwright test --project=unknown-region
```

Playwright starts two dev servers itself, because `NEXT_PUBLIC_*` values are baked in
at compile time:

| Project | Port | Region | Covers |
|---|---|---|---|
| `unknown-region` | 3000 | none (H3 unlicensed) | text-to-video, first+last frame, library reload, H3 → LTX fallback, /verify, 400px, reduced motion |
| `japan` | 3001 | `NEXT_PUBLIC_KUNO_DEV_COUNTRY=JP` | H3 serving directly, "MiniMax H3" attribution on results and certificate |

The API key is read from `/tmp/kuno-web-data/dev.env` (override with `KUNO_DATA_DIR`
or `KUNO_DEV_API_KEY`).

## Notes

- Playwright's bundled Chromium has no H.264 decoder, so tests assert the decrypted
  bytes fetched back from the film's `blob:` URL (an MP4 `ftyp` box) instead of
  playback. In Chrome, Edge or Safari the same films play in the page.
- The mock worker renders test patterns and Ken Burns moves over your frames — the
  pipeline is real, the pictures are placeholders.
- Screenshots from the responsive run land in `test-results/`.
