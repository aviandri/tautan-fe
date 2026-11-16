# Public page performance

Budget (SPEC "Performance budget for the public page"): LCP ≤ 1.8 s, TBT ≤ 150 ms, CLS ≤ 0.05,
first-load JS ≤ 110 kB gzip, Lighthouse ≥ 90 (mobile, simulated throttling).

## Measure against the real seed (preferred)

```bash
# BE: tautan-be main
make dev            # or ADDR=:8081 … for a private copy
make seed-heavy     # /heavy: 13 baseline blocks + the 9 sell cards, images with AVIF/WebP variants
# FE
NEXT_PUBLIC_API_URL=http://localhost:8080 pnpm build && pnpm start
npx @lhci/cli@0.14 autorun          # uses lighthouserc.json (http://localhost:3000/heavy)
```

## Without a backend

`perf/mock-api.mjs` serves `perf/fixtures/heavy.json` (every pre-P3 card type, with a `media` map) and its
images on :8097. Regenerate with `python3 perf/make-fixture.py` (needs Pillow).

```bash
node perf/mock-api.mjs &
NEXT_PUBLIC_API_URL=http://localhost:8097 NEXT_PUBLIC_API_MOCK=0 pnpm build && pnpm start
```

The fixture serves originals for `?w=` (no variants), so image numbers are pessimistic.

## How the page stays inside the budget

- `/[username]` renders as React Server Components (`PublicPageView`). Cards are hook-free and emit
  HTML with `data-*` hooks. `PageRuntime` is a ~0.3 kB client stub that imports `runtime-core.ts`
  after hydration; the core wires everything up by event delegation (`data-b`/`data-a` click
  tracking via sendBeacon, `data-copy`, `data-embed` facades, `data-lightbox`, `data-countdown`,
  `data-dismiss`, `data-share`, `data-open-dialog`, `dialog[data-popup]`, and `submit`/`input` on
  `[data-x]` for the P3-C/D cards via `runtime-p3cd.ts`). Rarely used code is in `runtime-extras.ts`.
- Styles are a global `public.css` with `tp-` prefixed classes, referenced as `s.foo` through
  `cls.ts`. Next ships the class map of every CSS module on a route as JS, global CSS ships none.
  New card CSS goes in `public.css` (or a global sheet with its own prefix), not a CSS module.
- Cards that need React state are `React.lazy` islands (`islands.tsx`), outside first-load JS.
- ISR: `revalidate = 60` plus `revalidateTag("profile:<u>")` from `POST /api/revalidate` (the BE
  webhook). `?tab=` is rewritten by `src/middleware.ts` to `/[username]/t/[tab]`.
- Images: `Img` uses the BE `media` map for width/height and a `?w=` srcset; the first image or
  video poster in the first viewport gets `fetchpriority=high` and a preload.
- No third-party request before interaction: embeds are facades with re-hosted posters, and
  GA4/Pixel load on first interaction or 3 s after load.
- The public route has its own layout: no Tailwind utilities, no React Query, no Geist preload.

## CI budget check

`pnpm check:budget` (scripts/check-public-budget.mjs) fails when `/[username]` first-load JS goes over
110 kB gzip; run it after `pnpm build`. `perf/ci.example.yml` is a ready GitHub Actions workflow
(typecheck, lint, test, build, budget). Copy it to `.github/workflows/ci.yml` to enable it; pushing
workflow files needs a token with the `workflow` scope.
