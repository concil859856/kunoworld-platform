# syntax=docker/dockerfile:1.10
#
# KunoWorld website: Next.js standalone server.
#
# Build context: a directory with the platform and sdk checkouts side by side, because
# package.json links "@kunoworld/sdk": "file:../../sdk/js":
#
#     <ctx>/platform   kunoworld-platform
#     <ctx>/sdk        kunoworld-sdk
#
#     cd <ctx> && docker build -f platform/web/Dockerfile \
#       --build-arg NEXT_PUBLIC_KUNO_API=https://api.kunoworld.com -t kunoworld/web .
#
# Requires `output: "standalone"` in next.config.ts. Until that is committed, build with
# --build-arg PATCH_STANDALONE=1, which adds it to the copy inside the build stage only.
#
# NEXT_PUBLIC_* values are compiled into the bundle, so they are build args, not runtime env.
# The site's server also calls the gateway at NEXT_PUBLIC_KUNO_API, so that URL has to be
# reachable from inside the container as well as from browsers.

ARG NODE_IMAGE=node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

# ---------------------------------------------------------------- SDK (dist is not committed)
FROM ${NODE_IMAGE} AS sdk
WORKDIR /src/sdk/js
COPY sdk/js/package.json sdk/js/package-lock.json sdk/js/tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY sdk/js/src ./src
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

# ---------------------------------------------------------------- build
FROM ${NODE_IMAGE} AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Keep the ../../sdk/js relative layout that package.json and package-lock.json expect.
COPY --from=sdk /src/sdk/js/package.json /src/sdk/js/package.json
COPY --from=sdk /src/sdk/js/dist /src/sdk/js/dist
COPY --from=sdk /src/sdk/js/node_modules /src/sdk/js/node_modules
WORKDIR /src/platform/web
COPY platform/web/package.json platform/web/package-lock.json platform/web/.npmrc ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY platform/web ./

ARG NEXT_PUBLIC_KUNO_API=http://localhost:8080
ARG NEXT_PUBLIC_KUNO_DEV_COUNTRY=
ARG PATCH_STANDALONE=0
ENV NEXT_PUBLIC_KUNO_API=${NEXT_PUBLIC_KUNO_API} \
    NEXT_PUBLIC_KUNO_DEV_COUNTRY=${NEXT_PUBLIC_KUNO_DEV_COUNTRY} \
    KUNO_DIST_DIR=.next

RUN if ! grep -Eq "output:[[:space:]]*['\"]standalone['\"]" next.config.ts; then \
      if [ "$PATCH_STANDALONE" = "1" ]; then \
        sed -i 's/^\([[:space:]]*\)reactStrictMode: true,/\1reactStrictMode: true,\n\1output: "standalone",/' next.config.ts \
        && grep -q 'output: "standalone"' next.config.ts; \
      else \
        echo 'next.config.ts must set output: "standalone" (or build with --build-arg PATCH_STANDALONE=1)' >&2; exit 1; \
      fi; \
    fi
RUN npm run build
# outputFileTracingRoot is the directory above platform/, so the standalone tree mirrors
# <ctx>/platform/web and server.js lands in .next/standalone/platform/web.
RUN test -f .next/standalone/platform/web/server.js

# ---------------------------------------------------------------- runtime
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /src/platform/web/.next/standalone ./
COPY --from=build --chown=node:node /src/platform/web/.next/static ./platform/web/.next/static
COPY --from=build --chown=node:node /src/platform/web/public ./platform/web/public
WORKDIR /app/platform/web
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then(r => process.exit(r.status < 500 ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
