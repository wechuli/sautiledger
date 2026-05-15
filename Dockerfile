# syntax=docker/dockerfile:1.7

# ---------- Stage 1: build ----------
FROM node:24-bookworm AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

# Cache mount keeps the npm cache between builds so repeated installs
# only re-download what actually changed in package-lock.json.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --prefer-offline

COPY . .
RUN npm run build

# Drop dev dependencies in place — keeps native modules already compiled
# for this platform, no rebuild needed.
RUN --mount=type=cache,target=/root/.npm \
    npm prune --omit=dev

# ---------- Stage 2: runtime ----------
FROM node:24-bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends tini \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/sautiledger.db \
    SERVE_STATIC_FRONTEND=true

RUN addgroup --system --gid 1001 app \
 && adduser --system --uid 1001 --ingroup app --no-create-home --shell /usr/sbin/nologin app \
 && mkdir -p /data \
 && chown -R app:app /app /data

COPY --chown=app:app --from=build /app/package.json                 ./package.json
COPY --chown=app:app --from=build /app/apps/api/package.json        ./apps/api/package.json
COPY --chown=app:app --from=build /app/apps/web/package.json        ./apps/web/package.json
COPY --chown=app:app --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --chown=app:app --from=build /app/apps/api/dist                ./apps/api/dist
COPY --chown=app:app --from=build /app/apps/web/dist                ./apps/web/dist
COPY --chown=app:app --from=build /app/packages/shared/dist         ./packages/shared/dist
COPY --chown=app:app --from=build /app/node_modules                 ./node_modules

USER app
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/api/dist/server.js"]
