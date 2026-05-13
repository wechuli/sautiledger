# syntax=docker/dockerfile:1.7

# ---------- Stage 1: install all deps (dev + prod) ----------
# better-sqlite3 is a native module — alpine needs python3 + a C++ toolchain
# to compile it from source if no prebuilt binary is available for Node 24.
FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --include=dev

# ---------- Stage 2: build the API + web bundles ----------
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build

# ---------- Stage 3: prod-only node_modules ----------
# Re-resolve workspace deps with --omit=dev so the runtime image is small
# and free of test/build tooling. Native modules are recompiled here so the
# binary matches the runtime stage's libc / Node ABI exactly.
FROM node:24-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ libc6-compat
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev --workspaces --include-workspace-root \
 && npm cache clean --force

# ---------- Stage 4: minimal runtime image ----------
FROM node:24-alpine AS runtime
WORKDIR /app

# tini gives us proper PID 1 signal handling (clean SIGTERM on rolling deploys).
RUN apk add --no-cache tini libstdc++

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/sautiledger.db \
    SERVE_STATIC_FRONTEND=true

# Non-root user owns /app and the SQLite data directory. Kubernetes will
# mount a PersistentVolume at /data; we pre-create it so the container also
# works when run with `docker run` and no volume.
RUN addgroup -S app -g 1001 \
 && adduser  -S app -G app -u 1001 \
 && mkdir -p /data \
 && chown -R app:app /app /data

COPY --chown=app:app --from=build      /app/package.json                 ./package.json
COPY --chown=app:app --from=build      /app/apps/api/package.json        ./apps/api/package.json
COPY --chown=app:app --from=build      /app/apps/web/package.json        ./apps/web/package.json
COPY --chown=app:app --from=build      /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=app:app --from=build      /app/apps/api/dist                ./apps/api/dist
COPY --chown=app:app --from=build      /app/apps/web/dist                ./apps/web/dist
COPY --chown=app:app --from=build      /app/packages/shared/dist         ./packages/shared/dist
COPY --chown=app:app --from=prod-deps  /app/node_modules                 ./node_modules

USER app
EXPOSE 3000
VOLUME ["/data"]

# Liveness probe target. Kubernetes uses HTTP probes directly (see deployment),
# but this also works for plain `docker run` health checks.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/server.js"]
