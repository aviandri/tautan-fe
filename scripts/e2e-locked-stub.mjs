#!/usr/bin/env node
/**
 * Layout check for P3-C/D form rows (input + button) at phone width, on a real FE + BE:
 * the gate stubs (password, email), the lead magnet and the giveaway.
 * Asserts the input takes ≥ 60% of the card's width and the button stays inside the card.
 *
 *   API=http://localhost:8091 FE=http://localhost:3091 \
 *   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core CHROME_PATH=/path/to/chrome \
 *   node scripts/e2e-locked-stub.mjs
 *
 * No dependency is added to the repo: point PLAYWRIGHT_CORE at any playwright-core install.
 * It creates its own user and page on the BE (dev data only).
 */
import { createRequire } from "node:module";

const API = (process.env.API ?? "http://localhost:8080").replace(/\/$/, "") + "/api/v1";
const FE = (process.env.FE ?? "http://localhost:3000").replace(/\/$/, "");
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_CORE ?? "playwright-core");

const user = "stub" + Date.now().toString(36).slice(-6);
let failures = 0;
const check = (ok, msg) => {
  if (!ok) failures++;
  console.log(ok ? "ok:" : "FAIL:", msg);
};

async function api(path, body, tok, method = "POST") {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", ...(tok ? { Authorization: `Bearer ${tok}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

const tok = (await api("/auth/signup", { email: `${user}@example.com`, password: "e2e-password-123", username: user })).access_token;
await api(
  "/profile",
  {
    onboarding: { completed: true },
    is_published: true,
    theme: {
      preset: "senja",
      bg: { type: "gradient", value: "linear-gradient(160deg, #ff7a59 0%, #ffb35c 100%)" },
      button: { style: "fill", radius: 16, color: "#fff7ee", text_color: "#3a1608" },
      font: "Outfit",
      text_color: "#2a1208",
    },
  },
  tok,
  "PATCH",
);
const tab = (await api("/profile/editor", null, tok, "GET")).tabs[0].id;
const mk = (type, data, gate) => api("/blocks", { tab_id: tab, type, data, ...(gate ? { gate } : {}) }, tok);
const cards = {
  "password gate": await mk("link", { title: "VIP", url: "https://example.com/vip" }, { kind: "password", password: "kue12345", message: "Enter the password from my story" }),
  "email gate": await mk("text", { content: "Secret recipe" }, { kind: "email", subscribe: "ask" }),
  "lead magnet": await mk("lead_magnet", { title: "Free guide", file_url: "https://example.com/g.pdf", button_label: "Send me the guide" }),
  giveaway: await mk("giveaway", { title: "Win", prize: "Tote", ends_at: new Date(Date.now() + 864e5).toISOString(), steps: [] }),
};

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(`${FE}/${user}`, { waitUntil: "networkidle" });

for (const [name, b] of Object.entries(cards)) {
  const card = page.locator(`#block-${b.id}`);
  const row = card.locator('[data-p="row"]').first();
  const [cb, ib, bb] = await Promise.all([
    card.boundingBox(),
    row.locator('[data-p="input"]').first().boundingBox(),
    row.locator('[data-p="submit"]').first().boundingBox(),
  ]);
  const share = ib.width / cb.width;
  check(share >= 0.6, `${name}: input is ${Math.round(ib.width)}px = ${Math.round(share * 100)}% of the ${Math.round(cb.width)}px card (≥ 60%)`);
  check(bb.x + bb.width <= cb.x + cb.width + 0.5, `${name}: button stays inside the card (right edge ${Math.round(bb.x + bb.width)} ≤ ${Math.round(cb.x + cb.width)})`);
  const beside = bb.x >= ib.x + ib.width - 0.5;
  const below = bb.y >= ib.y + ib.height - 0.5;
  check(beside || below, `${name}: button ${below ? "wraps below" : "sits beside"} the input, no overlap`);
}
const docW = await page.evaluate(() => document.documentElement.scrollWidth);
check(docW <= 390, `no horizontal page scroll (scrollWidth ${docW})`);

await browser.close();
console.log(failures ? `\n${failures} FAILURE(S)` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
