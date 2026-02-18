# syntax=docker/dockerfile:1.7

# Stage 1: build Astro site
FROM node:lts-alpine AS builder

WORKDIR /app

RUN corepack enable
ENV NODE_OPTIONS=--no-deprecation

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile --prefer-offline

COPY . .
RUN pnpm build

# Stage 2: run with Node.js (SSR mode)
FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder /app/src/content ./src/content

ENV HOST=0.0.0.0
ENV PORT=4321

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]

# Add labels for metadata
LABEL org.opencontainers.image.source="https://github.com/melody635/Twilight.git"
LABEL org.opencontainers.image.description="Twilight blog Docker image"
LABEL org.opencontainers.image.licenses="MIT"
