# Golden One API — production image.
#
# Multi-stage so the runtime image carries no compiler, no test tooling and no
# source: what ships is dist/, production dependencies and the Prisma engine.

# ── Build ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

# openssl is required by Prisma's query engine.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# Drop dev dependencies from the tree we are about to copy forward.
RUN npm prune --omit=dev

# ── Runtime ──────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

# Never run the API as root: a container escape should not start as uid 0.
USER node

EXPOSE 4000

# Readiness, not liveness: this container is only "healthy" when it can
# actually reach its database.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:4000/health/ready || exit 1

# Migrations are applied deliberately as a release step (npm run migrate:deploy),
# not on container start — several replicas booting at once must not race to
# migrate the same database.
CMD ["node", "dist/src/server.js"]
