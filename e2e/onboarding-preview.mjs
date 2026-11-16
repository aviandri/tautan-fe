// Onboarding live preview: the phone preview must mirror what the owner types and ticks on every
// step, before anything is saved. Runs against a live FE + BE, like journey.mjs.
//
//   cd e2e && npm install && npx playwright install chromium
//   node onboarding-preview.mjs            # headless;  HEADED=1 to watch
//
// Env: BASE (default http://localhost:3000), HEADED=1, SLOWMO=<ms>.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3000";
const SHOTS = new URL("./shots/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ headless: process.env.HEADED !== "1", slowMo: Number(process.env.SLOWMO || 0), args: ["--no-sandbox"] });
const results = [];
const errs = [];
let page;

async function check(name, fn) {
  try {
    await fn();
    results.push(true);
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push(false);
    console.log(`FAIL ${name}  — ${String(e).split("\n")[0]}`);
    await page?.screenshot({ path: `${SHOTS}preview-fail.png` }).catch(() => {});
  }
}
const preview = () => page.getByRole("complementary", { name: "Live preview" });
const shot = (n) => page.screenshot({ path: `${SHOTS}preview-${n}.png` });

async function signup(tag) {
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Email").fill(`${tag}${Date.now().toString().slice(-7)}@test.example`);
  await page.getByLabel("Password").fill("e2e-password-123");
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL(/onboarding/, { timeout: 30000 });
}

await signup("prev");
await page.getByRole("radio", { name: /^Selling things/ }).click();
await page.getByRole("button", { name: /^continue$/i }).click();

await check("Profile: the preview shows the typed name, its initial and the bio before Continue", async () => {
  await page.getByRole("heading", { name: "Introduce yourself" }).waitFor();
  await preview().getByText("Your name").waitFor({ timeout: 30000 });
  await page.getByLabel("Name").fill("Toko Avi");
  await page.getByLabel("Bio").fill("Handmade cups and plates");
  await preview().getByText("Toko Avi").waitFor({ timeout: 2000 });
  await preview().getByText("Handmade cups and plates").waitFor({ timeout: 2000 });
  await preview().getByText("T", { exact: true }).first().waitFor({ timeout: 2000 });
  if (await preview().getByText("Your name").count()) throw new Error("placeholder still shown");
  await shot("1-profile");
});
await check("Profile: clearing the name brings the placeholder back", async () => {
  await page.getByLabel("Name").fill("");
  await preview().getByText("Your name").waitFor({ timeout: 2000 });
  await page.getByLabel("Name").fill("Toko Avi");
});
await page.getByRole("button", { name: /^continue$/i }).click();

await check("Cards: every ticked section shows in the preview, in order", async () => {
  await page.getByRole("heading", { name: "Pick your starting sections" }).waitFor();
  const titles = ["Shop", "What customers say", "Be first to hear about new drops", "Good to know"];
  for (const t of titles) await preview().getByText(t).first().waitFor({ timeout: 5000 });
  if (await preview().getByText("Nothing here yet").count()) throw new Error('"Nothing here yet" shown');
  const text = await preview().innerText();
  const pos = titles.map((t) => text.indexOf(t));
  if (pos.some((p, i) => p < 0 || (i > 0 && p < pos[i - 1]))) throw new Error(`order ${pos}`);
  await shot("2-cards");
});
await check("Cards: unticking removes the section at once, ticking brings it back", async () => {
  await page.getByRole("checkbox", { name: /FAQ/ }).uncheck();
  await preview().getByText("Good to know").waitFor({ state: "detached", timeout: 2000 });
  await page.getByRole("checkbox", { name: /FAQ/ }).check();
  await preview().getByText("Good to know").waitFor({ timeout: 2000 });
});
await check("Cards: a pasted link appears as a card", async () => {
  await page.getByLabel("Paste a link, video or email").fill("https://example.com/shop");
  await page.keyboard.press("Enter");
  await page.getByText("1 link on your page").waitFor({ timeout: 20000 });
  await preview().getByText(/example\.com|Example Domain/).first().waitFor({ timeout: 10000 });
});
await page.getByRole("button", { name: /and continue/i }).click();

await check("Look: the picked theme and its colour palette apply to the preview immediately", async () => {
  await page.getByRole("radio", { name: /^Malam/ }).click({ timeout: 30000 });
  // Malam's ground (#0e1420) and its palette: the header band and cards take the tonal surfaces
  await page.waitForFunction(() => [...document.querySelectorAll("aside *")].some((n) => getComputedStyle(n).backgroundColor === "rgb(14, 20, 32)"), null, { timeout: 3000 });
  await page.waitForFunction(() => !!document.querySelector("aside .tp-palette"), null, { timeout: 3000 });
  await shot("3-look");
});
await page.close();

await signup("local");
await page.getByRole("radio", { name: /^A local business/ }).click();
await page.getByRole("button", { name: /^continue$/i }).click();
await page.getByLabel("Name").fill("Warung Bu Sri");
await page.getByRole("button", { name: /^continue$/i }).click();
await check('Local starters render, including the "Add your profiles" placeholder', async () => {
  await page.getByRole("heading", { name: "Pick your starting sections" }).waitFor();
  for (const t of ["Request a booking", "Good to know", "Ask us anything", "Add your profiles"]) await preview().getByText(t).first().waitFor({ timeout: 8000 });
  await shot("4-local-cards");
});

await browser.close();
const passed = results.filter(Boolean).length;
console.log(`\nERRORS: ${errs.length ? errs.join("\n") : "none"}\nSUMMARY: ${passed}/${results.length} passed · screenshots in e2e/shots/preview-*.png`);
process.exit(passed === results.length && !errs.length ? 0 : 1);
