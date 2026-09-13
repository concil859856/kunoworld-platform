# syntax=docker/dockerfile:1.10
#
# A mock-TEE KunoWorld worker (placeholder renderer, simulated attestation) for the local
# stack in deploy/docker-compose.yml. Not a miner image: real miners build from the subnet
# repo inside a confidential VM.
#
# Build context: the directory holding platform/ and subnet/ side by side.
#     docker build -f platform/deploy/worker.Dockerfile -t kunoworld/mock-worker .
#
# The image also carries `kuno-devkit`, which the stack uses once to create dev keys and
# the golden manifest.

ARG PYTHON_IMAGE=python:3.12-slim-bookworm@sha256:782412e85d0f0984994c290652577d4018aff08145c85b262bb63dc0c7522254
ARG UV_IMAGE=ghcr.io/astral-sh/uv:0.11.19@sha256:b46b03ddfcfbf8f547af7e9eaefdf8a39c8cebcba7c98858d3162bd28cf536f6

FROM ${UV_IMAGE} AS uv

FROM ${PYTHON_IMAGE} AS build
COPY --from=uv /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never UV_PROJECT_ENVIRONMENT=/opt/venv
WORKDIR /src
COPY platform/deploy/workspace/pyproject.toml platform/deploy/workspace/uv.lock ./
COPY subnet/protocol/pyproject.toml subnet/protocol/pyproject.toml
COPY subnet/worker/pyproject.toml subnet/worker/pyproject.toml
COPY platform/gateway/pyproject.toml platform/gateway/pyproject.toml
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --only-group worker --no-install-workspace
COPY subnet/protocol subnet/protocol
COPY subnet/worker subnet/worker
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --only-group worker --no-editable \
 && /opt/venv/bin/python -c "import kuno_worker.main, kuno_protocol.devkit"

FROM ${PYTHON_IMAGE} AS runtime
RUN groupadd --system --gid 10001 kuno \
 && useradd --system --uid 10001 --gid kuno --home-dir /var/lib/kuno --shell /usr/sbin/nologin kuno \
 && mkdir -p /var/lib/kuno/data /tmp/kuno-worker \
 && chown -R kuno:kuno /var/lib/kuno /tmp/kuno-worker
COPY --from=build /opt/venv /opt/venv
ENV PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    KUNO_DATA_DIR=/var/lib/kuno/data \
    KUNO_BACKEND=mock \
    KUNO_TEE=mock \
    KUNO_WORKDIR=/tmp/kuno-worker
WORKDIR /var/lib/kuno
USER 10001:10001
CMD ["kuno-worker"]
