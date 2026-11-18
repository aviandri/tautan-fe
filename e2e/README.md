# E2E journey

One script that walks the whole product against a running app:
- An owner signs up and onboards. With the email unconfirmed, the page is saved as a draft and publishing is refused.
- The owner confirms the email from the link the backend mails, publishes from the dashboard, and adds cards.
- A phone visitor uses the page: WhatsApp buy link, poll, password unlock, email sign-up, and a contact form, which emails the owner.
- The owner checks Insights, Audience, Design and Settings.
- The owner sells a file using the backend's **dev-only fake payment provider**, so no provider keys are needed:
  - The owner connects "Fake (dev only)" in Settings → Payments and uploads a priced file card.
  - A buyer checks out and lands on the test checkout page, then presses Pay. The order page shows Paid, the download link serves the file, and the receipt email carries the order link.
  - A second attempt presses Fail and gets "not paid" with no download.
  - The owner's Orders API and page show both orders.
  - The fake provider is strictly opt-in: the backend needs `PAYMENTS_FAKE=1` and an `APP_ENV` other than `production`, and refuses to start with both set. Without the flag, the journey stops early with a clear message (tautan-be `docs/ENV.md`, `docs/SPEC.md` → "Dev-only `fake` payment provider").
- The owner adds a shop with two shipped items (one with sizes), a downloadable zine and a Rp 15.000 shipping fee:
  - A buyer adds the items to the cart (the same apron and size twice merges into quantity 2), and the cart bar shows the count and subtotal.
  - On the cart review step, the buyer changes a quantity and presses Update, so the total includes shipping. Then Continue, enter email and shipping address, and pay on the test checkout page.
  - The order page shows Paid, "Preparing your order", a Shipping line and the zine download. The cart is cleared in that browser.
  - The owner sees the order under "to ship" with the address and marks it shipped with a tracking number (through the API; the dashboard button is a separate PR). The buyer gets the "has shipped" email, and the order page shows the tracking number.
- Finally the owner resets their password through the emailed link: the new password works, the old one doesn't, and the link is single-use.

Kept out of the app's package.json on purpose, so it doesn't touch the app's lockfile or bundle.

```bash
# 1. backend (tautan-be), output to a file so the scripts can read the mails it "sends":
#      PAYMENTS_FAKE=1 make dev 2>&1 | tee /tmp/tautan-be.log   → :8080 (MAIL_DRIVER=log is the default;
#      PAYMENTS_FAKE=1 turns on the dev-only fake payment provider the journey pays with)
#    set REVALIDATE_SECRET=<s> here and on the frontend, or published edits take up to 60 s to show
# 2. frontend (this repo): pnpm build && REVALIDATE_SECRET=<s> pnpm start   (NEXT_PUBLIC_API_URL=http://localhost:8080)
cd e2e && npm install && npx playwright install chromium
BE_LOG=/tmp/tautan-be.log npm run journey:watch     # visible browser, slowed down, a banner names each step
BE_LOG=/tmp/tautan-be.log npm run journey           # headless
```

Env:
- `BE_LOG` (**required** for the journey): the backend's log file. With the default log mail driver, the backend prints each email's text there, including the confirm (`/verify-email?token=…`) and reset (`/reset-password?token=…`) links. `mail.mjs` waits for and parses those lines. Production (`APP_ENV=production`) never logs mail bodies, so this only works against a dev backend.
- `BASE` (default `http://localhost:3000`), `API` (default `http://localhost:8080/api/v1`).
- `HEADED=1`, `SLOWMO=<ms>`, `PAUSE=<ms>` (pause after each step; 1200 ms when headed).
- `CSP_STRICT=1`: CSP Report-Only violations (`[Report Only] Refused to …` in the console) fail the run. By default they're warnings, printed at the end grouped by page and directive with counts (`CSP REPORT-ONLY: …`). Run with `CSP_STRICT=1` before switching a policy from report-only to enforced.

A screenshot per step lands in `e2e/shots/`. The exit code is non-zero if any check fails or any page error, console error (CSP report-only messages excepted unless `CSP_STRICT=1`) or 5xx happens. The one expected 400, when the used reset link is opened again, is exempted.

Google sign-in stays off unless the backend has `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URL` set. The journey doesn't cover it, because the OAuth round trip needs a real Google account.

## Onboarding live preview

`node onboarding-preview.mjs` (same setup; it doesn't need `BE_LOG`) checks that the wizard's phone preview mirrors what the owner types and ticks on every step, before anything is saved:
- name, initial and bio;
- each ticked starter section, in order (unticking removes it). Empty FAQ and testimonial starters show their "Add your first question" / "Add a customer quote" hints, which are preview-only;
- pasted links;
- the picked theme;
- the claim step for an unconfirmed email: "Publish now" disabled, the confirm-email notice, and "Finish setup";
- the local starters, including the preview-only "Add your profiles" placeholder.

Screenshots land in `e2e/shots/preview-*.png`.

Last run (2026-11-19, headless, local BE on main `19789a4` with `PAYMENTS_FAKE=1` + FE main `fc7e863` plus this branch): journey **67/67**, onboarding-preview **8/8**, no errors. Without the flag it stops at the start with the PAYMENTS_FAKE message.
