# syntax=docker/dockerfile:1
# Self-hosted production image: Next standalone output (server.js + traced node_modules only).
#
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so they are build args,
# not runtime env. Rebuild the image to change them. Runtime env: REVALIDATE_SECRET (enables
# POST /api/revalidate) and optional API_INTERNAL_URL (server-side API reads over a private network).
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@11.5.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_HOST=localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SITE_HOST=$NEXT_PUBLIC_SITE_HOST \
    NEXT_PUBLIC_API_MOCK=0 \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
# The whole .next tree belongs to the runtime user: ISR writes regenerated pages and the
# unstable_cache entries that POST /api/revalidate invalidates under .next/ at runtime.
# (There is no public/ directory; add `COPY --from=build /app/public ./public` if one appears.)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=4s --start-period=20s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]
