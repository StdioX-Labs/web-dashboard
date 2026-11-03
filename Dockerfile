# syntax=docker/dockerfile:1
# Production image: Next.js standalone server on port 3000, non-root.
# Configuration comes from the environment at runtime (see .env.example);
# nothing secret is baked in at build time.

FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat \
 && corepack enable \
 && corepack prepare pnpm@10.34.9 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER 1001
EXPOSE 3000
# Liveness/readiness: GET /api/health (public, no session needed).
CMD ["node", "server.js"]
