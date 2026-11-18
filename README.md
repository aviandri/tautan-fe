# tautan-fe

Next.js 15 (App Router) frontend for Tautan. See `../SPEC.md` for scope and API contract.

```bash
pnpm install
cp .env.example .env.local   # NEXT_PUBLIC_API_MOCK=1 runs without the Go API
pnpm dev                     # http://localhost:3000
```

Mock login: `demo@tautan.id` / `password123` (public page: `/demo`).

## Layout & ownership

| Path | Owner |
| --- | --- |
| `src/lib/types.ts`, `src/lib/api.ts`, `src/lib/mock/**` | shared (edit with a heads-up) |
| `src/app/(auth)/**`, `src/app/(dashboard)/dashboard/**` (except `analytics`), `src/components/editor/**`, `src/components/dashboard/**` | tautan-fe editor session |
| `src/app/page.tsx`, `src/app/[username]/**`, `src/app/(dashboard)/dashboard/analytics/**`, `src/components/{public,theme,analytics,qr}/**`, `src/lib/theme/**`, `src/lib/embeds.ts` | tautan-c6 |

- API client: `api.*` in `src/lib/api.ts`. Access token in memory, refresh token in an httpOnly cookie; a 401 triggers one refresh and a retry.
- Types: zod schemas + inferred TS types in `src/lib/types.ts`. `Block` is a discriminated union on `type`.

## Deploy

Full guide: [tautan-be `docs/DEPLOY.md`](https://github.com/aviandri/tautan-be/blob/main/docs/DEPLOY.md). Every env var: tautan-be `docs/ENV.md`.

- **Vercel**: import the repo. `vercel.json` pins the functions to `sin1` (Singapore, closest to Jakarta) and pnpm 11. Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SITE_HOST` and `REVALIDATE_SECRET` in Project → Settings → Environment Variables. `POST /api/revalidate` works as is, because `revalidateTag` purges Vercel's data cache across regions.
- **Self-hosted**: `docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com --build-arg NEXT_PUBLIC_SITE_URL=https://example.com --build-arg NEXT_PUBLIC_SITE_HOST=example.com -t tautan-fe .`, then run it with `REVALIDATE_SECRET` (and optionally `API_INTERNAL_URL=http://api:8080`). The image is Next standalone output on node:22-alpine, runs as uid 1001 and listens on :3000. Run **one replica**: the ISR cache is the container's filesystem, so a revalidate only reaches the replica that receives it.
- **CI**: `.github/workflows/image.yml` builds the image on PRs. On `main` and `v*` tags it pushes `ghcr.io/aviandri/tautan-fe:{sha-xxxx,latest}`. It never deploys. Build args come from repository variables `NEXT_PUBLIC_*`.
