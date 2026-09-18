# kunoworld-platform

KunoWorld's private platform: the **gateway** API that customers, workers and validators talk to, the **website and
studio**, and the **deployment** files that run them. The video models run on miners' GPUs in the Bittensor subnet
(`kunoworld-subnet`). This repo is everything around them that KunoWorld operates itself.

## How the repos fit together

| Repo | What it holds |
|---|---|
| **kunoworld-platform** (this one) | Gateway, website and studio, deployment |
| `kunoworld-subnet` | `kuno-protocol` (schemas, crypto, profiles, prices), `kuno-worker` (the GPU worker and its images), `kuno-validator`, `PROTOCOL.md` |
| `kunoworld-sdk` | Python and JavaScript SDKs, the `kunoworld-mcp` server and the agent skill |
| `kunoworld-dev` | The development workspace: research notes, GPU test scripts, cross-repo integration tests |
| `kunoworld-papers` | The development record (`agent.md`) |

The gateway depends on `kuno-protocol` from `kunoworld-subnet`, and the website links `@kunoworld/sdk` from
`kunoworld-sdk`. So check out the repos side by side, as the dev workspace does:

```
<workspace>/platform   kunoworld-platform
<workspace>/subnet     kunoworld-subnet
<workspace>/sdk        kunoworld-sdk
```

## What's in this repo

| Path | What it is |
|---|---|
| `gateway/` | `kuno-gateway` (FastAPI, SQLAlchemy, Alembic). Accounts and sign-in, API keys, billing and top-ups (Stripe, NOWPayments, TAO and subnet alpha), exact quotes, routing to attested enclaves, and the ciphertext-only job queue for Private mode. Also Standard mode (prompts KunoWorld can read), plans (the Director), storyboards, Elements, shares, moderation and CyberTipline reporting, the C2PA issuing CA, and the feeds validators score miners from. |
| `web/` | The website and studio (Next.js 16, React 19, Node 22.13+). The studio encrypts Private jobs in the browser with `@kunoworld/sdk`. It also holds accounts, billing, the admin console, docs, the API reference and `llms.txt`. |
| `deploy/` | `docker-compose.yml` for a production-like stack on one machine (Postgres, MinIO, gateway, website, one mock-TEE worker), the mock-worker image, and the uv workspace the Python images build from |
| `.github/workflows/ci.yml` | Gateway tests on SQLite and Postgres, web typecheck, lint and build, image builds, optional Playwright |

## Running it

Everything below runs from the dev workspace (`kunoworld-dev` with the other repos checked out inside it), using its
uv environment.

```bash
# A local network: gateway on :8080 and a mock-TEE worker (real encryption, placeholder video)
scripts/dev.sh                         # prints the dev API key; data in ./data

# The website and studio on :3000, against that gateway
cd platform/web && npm ci && npm run dev

# Gateway tests (the full Python suite, including integration tests: `uv run pytest -q` from the workspace root)
uv run pytest platform/gateway -q

# Web checks
cd platform/web && npm run typecheck && npm run lint && npm run build

# Playwright end to end (one gateway, never in parallel): see web/tests/e2e/README.md
cd platform/web && npx playwright test --workers=1
```

The website reads `NEXT_PUBLIC_KUNO_API` (the gateway URL the browser calls), `NEXT_PUBLIC_KUNO_MANIFEST` and
`NEXT_PUBLIC_KUNO_OWNER_PUBLIC_KEY` (what the SDK checks enclaves against), and `KUNO_GATEWAY_URL` for server-side calls.
The gateway takes its settings from `KUNO_*` environment variables (`gateway/src/kuno_gateway/settings.py`).

## Deploying

`deploy/README.md` covers:
- bring-up with Docker Compose;
- migrations, backups and storage keys;
- operators and roles;
- production notes.

Images build from the workspace directory above `platform/`:

| Image | Dockerfile | Needs |
|---|---|---|
| gateway | `platform/gateway/Dockerfile` | platform, subnet |
| mock worker (with `kuno-devkit`) | `platform/deploy/worker.Dockerfile` | platform, subnet |
| web | `platform/web/Dockerfile` | platform, sdk |

The gateway and mock-worker images are pushed to `ghcr.io/concil859856/` (private). They contain private source, so they
never go to Docker Hub. The GPU worker images (`kunoworld-worker`) are built from `kunoworld-subnet`.

## Documentation

| Topic | File |
|---|---|
| Standard mode: what KunoWorld sees, its routes, plans and storyboards | `gateway/STANDARD_MODE.md` |
| Prices, quotes, top-ups and billable USD | `gateway/PAYMENTS.md` |
| Elements (encrypted characters, products, places, styles and voices) | `gateway/ELEMENTS.md` |
| Moderation, operators, reports and strikes | `gateway/MODERATION.md` |
| The C2PA issuing CA and timestamps | `gateway/C2PA_CA.md` |
| Deployment and operations | `deploy/README.md` |
| End-to-end tests | `web/tests/e2e/README.md` |
| The wire protocol (sealed jobs, receipts, attestation, plans) | `kunoworld-subnet/PROTOCOL.md` |

## CI

CI checks out `kunoworld-subnet` and `kunoworld-sdk` beside this repo.
- **Required secret:** `SUBNET_REPO_TOKEN`, a fine-grained read-only token for `kunoworld-subnet` (and for
  `kunoworld-sdk` unless `SDK_REPO_TOKEN` is set).
- **Optional variables:** `SUBNET_REF` and `SDK_REF` pin the branch, tag or commit to test against (default `main`).

## Status

- **Works end to end on the local network and in the Compose stack:** accounts, quotes, Private and Standard jobs,
  storyboards, plans, Elements, moderation. Top-ups are built but not tested against live payment providers.
- **Through a real gateway on rented GPUs, without confidential computing:**
  - LTX-2.5 clips, storyboards, plans in both modes, retakes and audio-to-video;
  - MiniMax H3 and H3 Turbo, including one-GPU Turbo at 10 s and two GPU groups on one server.
- **Not run on live services:** real payments, confidential-computing attestation (TDX and NVIDIA CC), and a production
  deployment.
