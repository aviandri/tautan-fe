# E2E journey

One script that walks the whole product against a running app: an owner signs up, onboards,
adds cards and publishes; a phone visitor uses the page (WhatsApp buy link, poll, password unlock,
email sign-up); the owner checks Insights, Audience, Design and Settings.

Kept out of the app's package.json on purpose so it doesn't touch the app's lockfile or bundle.

```bash
# 1. backend (tautan-be): make dev            → :8080
# 2. frontend (this repo): pnpm build && pnpm start   (NEXT_PUBLIC_API_URL=http://localhost:8080)
cd e2e && npm install && npx playwright install chromium
npm run journey:watch     # visible browser, slowed down, a banner names each step
npm run journey           # headless
```

Env: `BASE` (default `http://localhost:3000`), `API` (default `http://localhost:8080/api/v1`),
`HEADED=1`, `SLOWMO=<ms>`, `PAUSE=<ms>` (pause after each step, 1200 ms when headed).
A screenshot per step lands in `e2e/shots/`. Exit code is non-zero if any check fails or any
page error / 5xx happens.

## Onboarding live preview

`node onboarding-preview.mjs` (same setup and env) checks that the wizard's phone preview mirrors
what the owner types and ticks on every step, before anything is saved: name, initial and bio;
each ticked starter section in order (untick removes it); pasted links; the picked theme; and the
local starters including the preview-only "Add your profiles" placeholder. Screenshots land in
`e2e/shots/preview-*.png`.
