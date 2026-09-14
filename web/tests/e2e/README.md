# End-to-end tests

These drive a real browser against a real gateway and a mock-TEE worker: every run
encrypts to an attested (simulated) enclave, renders, and decrypts in the page.

## 1. Start the backend

```bash
cd /video
KUNO_DATA_DIR=/tmp/kuno-web-data KUNO_ALLOW_COUNTRY_OVERRIDE=1 ./scripts/dev.sh
```

`dev.sh` runs `kuno-devkit init`, the gateway and one mock-TEE worker, and already
allows both dev-server origins through CORS. `KUNO_ALLOW_COUNTRY_OVERRIDE=1` is what
lets the Japan run exercise MiniMax H3.

## 2. Run the tests

```bash
cd /video/platform/web
npx playwright install chromium   # once
npm run test:e2e                  # or: npx playwright test --project=unknown-region
```

`ffmpeg` must be on `PATH`: `tests/e2e/fixtures.ts` builds the input clips and audio
with it and caches them under `$TMPDIR/kuno-e2e-media`.

Playwright starts two dev servers itself, because `NEXT_PUBLIC_*` values are baked in
at compile time. Specs named `h3-*.spec.ts` run against the Japan one; everything else
runs against the plain one.

| Project | Port | Region | Specs |
|---|---|---|---|
| `unknown-region` | 3000 | none (H3 unlicensed) | `studio`, `modes`, `actions`, `validation`, `verify`, `responsive` |
| `japan` | 3001 | `NEXT_PUBLIC_KUNO_DEV_COUNTRY=JP` | `h3-region`, `h3-director` |

The studio has no API key: specs sign in through the gateway's email-link API and give the
browser only the HttpOnly `kw_session` cookie (`connect()` and `signInWithCookie()` in
`helpers.ts`), once per email per run. Credit goes through `creditAccount()`, which uses the
break-glass `KUNO_ADMIN_TOKEN` from `/tmp/kuno-web-data/dev.env` (the dev gateway runs with
`KUNO_ALLOW_ADMIN_TOKEN=1`) and otherwise an admin's session. Operator roles are granted with the
gateway's CLI, `uv run kuno-gateway grant-role --email <e> --role moderator|admin` with
`KUNO_DATA_DIR` set (`grantRole()`); the run's admin is `KUNO_E2E_ADMIN_EMAIL`, default
`e2e-admin@example.com`. `KUNO_DEV_API_KEY` is still read by one test that proves a page-supplied key is ignored.

### `@needs-session-gateway`

Tests tagged `@needs-session-gateway` need a gateway whose job API accepts the web session
(`Authorization: Bearer <session>` from the site's `/api/kuno` proxy), serves
`DELETE /v1/videos/{id}`, lists roles on `GET /v1/me` and takes operator sessions on `/admin/v1`.
Every spec that renders a film is tagged, because rendering now goes through the session. On an
older gateway run the rest:

```bash
npx playwright test --workers=1 --grep-invert @needs-session-gateway
```

and the tagged ones once the gateway is current:

```bash
npx playwright test --workers=1 --grep @needs-session-gateway
```

## What each spec covers

- **studio** — text to video, first + last frame, library reload, H3 → LTX fallback.
- **modes** — keyframes pinned to their own times, retake of a window, audio to video.
- **h3-director** — references with the 9 / 3 / 3 / 12 caps and the "audio needs a
  visual" rule, edit, extend, and audio to video on the Ref2VA checkpoint.
- **actions** — cancel a running take, remove one, "Use last frame", reuse settings,
  and the film-key backup / forget / restore round trip.
- **validation** — the client-side rules from `kuno_protocol/profiles.py`: why the
  Generate button is off, prompt length, seed range, per-role caps, duration/fps/size
  sets, negative-prompt and enhancer availability, and the retake window.
- **verify**, **responsive** — the certificate page, 400 px layouts, reduced motion.
- **account** — email-link sign-in, API keys, a video charged to your own balance.
- **payments** — the account page's top-up methods as the gateway's payment config
  switches them on, payment history, the return-from-checkout notices, linking coldkeys
  through a stand-in browser wallet and a btcli-style signature (wrong key, coldkey
  already on another account, unlink), the webhook secret's reveal / copy / rotate, and
  no sideways scroll at 320 / 375 / 768 px.

- **session-studio** — no key or token in the page (storage, cookies, HTML, request headers,
  no direct gateway calls), the proxy refusing a missing session, a page-supplied key, paths
  outside its allow-list and cross-site calls; the key-backup panel and its sentence; the NSFW
  `content_policy` message; generating then deleting a private and a standard take (tagged).
- **admin** — the operator console is a 404 for visitors and customers; a moderator granted
  through the gateway sees reports and the queue but not admin pages, gets the "can't be opened"
  note, resolves a report, and fits 320 / 375 / 768 px; an admin changes roles (tagged).
- **privacy-modes** — the per-take Private / Standard choice and that it persists, refused
  private takes (not eligible, restricted until when) and a blocked standard upload (those
  errors are stood in with `page.route`), the report page (links, prefill, validation), and no
  sideways scroll at 320 / 375 / 768 px. Tests tagged `@needs-standard-gateway` need the
  endpoints in `platform/gateway/STANDARD_MODE.md`: a report reaching the gateway, a standard
  take that renders, plays, lists beside private takes and deletes, and the account page's
  private-mode block for a new account before and after credit. Run the rest with
  `--grep-invert @needs-standard-gateway` on a gateway that predates them.

## Notes

- Input clips are VP8/WebM and audio is WAV so Chromium can decode them: the studio
  probes every file it is given, and the tests rely on the probed duration (the retake
  window, the reference-clip length warnings).
- Films come back as H.264 MP4. This Chromium build decodes them, so "Use last frame"
  really grabs a frame; the other tests still assert the decrypted bytes fetched back
  from the film's `blob:` URL, because that also proves the decryption worked.
- The mock worker renders test patterns and Ken Burns moves over your frames — the
  pipeline is real, the pictures are placeholders.
- Screenshots from the responsive run land in `test-results/`.
