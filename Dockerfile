# =============================================================================
# Stage 1: All dependencies (dev + prod) — needed for build tools
# =============================================================================
FROM node:24-alpine AS deps

# pnpm est fourni par corepack, à la version épinglée dans package.json (packageManager)
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: Production dependencies only — no devDependencies
# =============================================================================
FROM node:24-alpine AS prod-deps

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "*.d.ts" -delete

# =============================================================================
# Stage 3: Build — compile TypeScript backend + Vite frontend
# =============================================================================
FROM deps AS build

ARG GIT_SHA=dev
ENV VITE_APP_NAME=Sporty \
    APP_VERSION=${GIT_SHA}

COPY . .
RUN pnpm build

# =============================================================================
# Stage 4: Runtime — minimal image, prod deps only, no pnpm needed
# =============================================================================
FROM node:24-alpine AS runtime

ARG GIT_SHA=dev

WORKDIR /app/build

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    LOG_LEVEL=info \
    APP_NAME=Sporty \
    APP_VERSION=${GIT_SHA} \
    STORAGE_PATH=/app/storage

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/build .
COPY --chown=node:node package.json ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh && \
    mkdir -p /app/storage && chown node:node /app/storage

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
