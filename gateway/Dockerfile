# syntax=docker/dockerfile:1.10
#
# KunoWorld gateway.
#
# Build context: a directory with the platform and subnet checkouts side by side, e.g. the
# dev workspace (/video) or CI's checkout root:
#
#     <ctx>/platform   kunoworld-platform
#     <ctx>/subnet     kunoworld-subnet     (kuno-protocol lives here)
#
#     cd <ctx> && docker build -f platform/gateway/Dockerfile -t kunoworld/gateway .
#
# The uv workspace root is platform/deploy/workspace/{pyproject.toml,uv.lock}, so the dev
# workspace repo is not needed. platform/gateway/Dockerfile.dockerignore limits the context.
#
# Start-up runs the Alembic migrations: GatewayState upgrades the database before serving.
# With several replicas, run the one-shot migrate command first (see deploy/README.md).

ARG PYTHON_IMAGE=python:3.12-slim-bookworm@sha256:782412e85d0f0984994c290652577d4018aff08145c85b262bb63dc0c7522254
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.19@sha256:b46b03ddfcfbf8f547af7e9eaefdf8a39c8cebcba7c98858d3162bd28cf536f6

FROM ${UV_IMAGE} AS uv

# ---------------------------------------------------------------- build
FROM ${PYTHON_IMAGE} AS build
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /src

# Dependencies first: this layer is reused until the lockfile or a member's pyproject changes.
COPY platform/deploy/workspace/pyproject.toml platform/deploy/workspace/uv.lock ./
COPY subnet/protocol/pyproject.toml subnet/protocol/pyproject.toml
COPY subnet/worker/pyproject.toml subnet/worker/pyproject.toml
COPY platform/gateway/pyproject.toml platform/gateway/pyproject.toml
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --only-group gateway --no-install-workspace

# Then the workspace packages, installed as wheels (not editable) so the venv stands alone.
COPY subnet/protocol subnet/protocol
COPY platform/gateway platform/gateway
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --only-group gateway --no-editable \
 && /opt/venv/bin/python -c "import kuno_gateway.app, kuno_protocol, psycopg, boto3, prometheus_client, sentry_sdk"

# ---------------------------------------------------------------- runtime
FROM ${PYTHON_IMAGE} AS runtime
RUN groupadd --system --gid 10001 kuno \
 && useradd --system --uid 10001 --gid kuno --home-dir /var/lib/kuno --shell /usr/sbin/nologin kuno \
 && mkdir -p /var/lib/kuno/data \
 && chown -R kuno:kuno /var/lib/kuno
COPY --from=build /opt/venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    KUNO_DATA_DIR=/var/lib/kuno/data \
    KUNO_PORT=8080
WORKDIR /var/lib/kuno
USER 10001:10001
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=3 \
  CMD ["python", "-c", "import os, sys, urllib.request; r = urllib.request.urlopen('http://127.0.0.1:%s/healthz' % os.environ.get('KUNO_PORT', '8080'), timeout=2); sys.exit(0 if r.status == 200 else 1)"]

# The CLI binds 127.0.0.1 unless told otherwise; in a container it has to listen on all
# interfaces. There is no env var for the host today, so pass --host.
CMD ["sh", "-c", "exec kuno-gateway --host 0.0.0.0 --port \"${KUNO_PORT}\""]
