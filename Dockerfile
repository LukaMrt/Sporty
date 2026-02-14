# =============================================================================
# Stage 1: All dependencies (dev + prod) — needed for build tools
# =============================================================================
FROM node:25-alpine AS deps

RUN npm install -g pnpm@latest && npm cache clean --force

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: Production dependencies only — no devDependencies
# =============================================================================
FROM node:25-alpine AS prod-deps

RUN apk add --no-cache curl && \
    curl -sf https://gobinaries.com/tj/node-prune | sh && \
    npm install -g pnpm@latest && npm cache clean --force

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile && \
    node-prune && \
    find node_modules -name "*.map" -delete && \
    find node_modules -name "*.d.ts" -delete

# =============================================================================
# Stage 3: Build — compile TypeScript backend + Vite frontend
# =============================================================================
FROM deps AS build

COPY . .
RUN pnpm build

# =============================================================================
# Stage 4: Runtime — minimal image, prod deps only, no pnpm needed
# =============================================================================
FROM node:25-alpine AS runtime

WORKDIR /app/build

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build .
COPY package.json ./
COPY docker/entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r//' /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["/entrypoint.sh"]
