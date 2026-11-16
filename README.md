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
