// End-to-end journey test for Tautan: owner signs up, onboards, builds a page, a visitor uses it,
// and the owner checks Insights and Audience. Runs against a live FE + BE.
//
//   cd e2e && npm install && npx playwright install chromium
//   HEADED=1 SLOWMO=350 node journey.mjs        # watch it in a real browser window
//   node journey.mjs                            # headless
//
// Env: BASE (default http://localhost:3000), API (default http://localhost:8080/api/v1),
//      HEADED=1 shows the browser, SLOWMO=<ms> slows every action, PAUSE=<ms> pause after each step (headed default 1200).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3000';
const API = process.env.API || 'http://localhost:8080/api/v1';
const HEADED = process.env.HEADED === '1';
const PAUSE = Number(process.env.PAUSE ?? (HEADED ? 1200 : 0));
const SHOTS = new URL('./shots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const results = [];
let stepNo = 0;
const ok = (name, cond, detail = '') => {
  results.push([cond ? 'PASS' : 'FAIL', name, detail]);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${detail ? '  — ' + detail : ''}`);
};

// Shows a banner in the page naming the current step, takes a screenshot, and pauses when headed.
async function step(page, title) {
  stepNo += 1;
  const label = `${String(stepNo).padStart(2, '0')} ${title}`;
  console.log(`\n▶ ${label}`);
  await page.evaluate((t) => {
    let el = document.getElementById('__e2e_banner');
    if (!el) {
      el = document.createElement('div');
      el.id = '__e2e_banner';
      el.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;font:600 14px system-ui;padding:8px 14px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.3);pointer-events:none;max-width:90vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
      document.documentElement.appendChild(el);
    }
    el.textContent = t;
  }, label).catch(() => {});
  if (PAUSE) await page.waitForTimeout(PAUSE);
  await page.screenshot({ path: `${SHOTS}${label.replace(/[^\w-]+/g, '-')}.png` });
}

function watch(page, tag, errs, third) {
  page.on('pageerror', (e) => errs.push(`${tag} pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/401/.test(m.text())) errs.push(`${tag} console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 500) errs.push(`${tag} HTTP ${r.status()} ${r.url()}`); });
  if (third) page.on('request', (q) => {
    const u = new URL(q.url());
    if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) third.push(q.url());
  });
}

const browser = await chromium.launch({ headless: !HEADED, slowMo: Number(process.env.SLOWMO || 0), args: ['--no-sandbox'] });
const errs = [];

// ---------- OWNER: sign up + onboarding (UI)
const oc = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const p = await oc.newPage();
watch(p, 'owner', errs);
const stamp = Date.now().toString().slice(-7);
const email = `nara${stamp}@test.example`, pw = 'e2e-password-123', user = 'nara' + stamp;

await p.goto(BASE + '/');
await step(p, 'Landing page');
ok('Landing page renders', (await p.locator('h1').first().innerText()).length > 5);

await p.goto(BASE + '/signup');
await p.locator('input[type=email]').fill(email);
await p.locator('input[type=password]').first().fill(pw);
await step(p, 'Sign up');
await p.getByRole('button', { name: /create account/i }).click();
await p.waitForURL(/onboarding/, { timeout: 15000 });
ok('Sign up → onboarding', true, email);

await step(p, 'Onboarding: how do you want to start');
await p.getByRole('radio', { name: /^Selling things/ }).click();
await p.getByRole('button', { name: /^continue$/i }).click();
await p.getByLabel('Name').fill('Dapur Nara');
await p.getByLabel('Bio').fill('Home bakery in Kotabaru, Yogyakarta');
await step(p, 'Onboarding: introduce yourself');
await p.getByRole('button', { name: /^continue$/i }).click();
await step(p, 'Onboarding: starter sections');
await p.getByRole('button', { name: /and continue/i }).click();
await p.getByText('Choose a look').waitFor();
await p.getByRole('radio', { name: /^Senja/ }).click({ timeout: 15000 }); // ThemePicker loads on demand
await step(p, 'Onboarding: pick the Senja look');
await p.getByRole('button', { name: /^continue$/i }).click();
await p.getByText('Claim your link').waitFor();
await p.getByLabel('Your page address').fill(user);
await p.waitForTimeout(800);
await step(p, 'Onboarding: claim your address');
await p.getByRole('button', { name: /publish my page/i }).click();
await p.waitForURL(/\/onboarding\/live/, { timeout: 15000 });
await p.getByRole('heading', { name: /your page is live/i }).waitFor();
await step(p, 'Onboarding: your page is live');
ok('Live screen shows heading, username and Copy link',
  (await p.getByRole('heading', { name: /your page is live/i }).count()) > 0 &&
  (await p.locator('body').innerText()).includes(user) &&
  (await p.getByRole('button', { name: /copy link/i }).count()) > 0);
await p.getByRole('link', { name: /go to my dashboard/i }).or(p.getByRole('button', { name: /go to my dashboard/i })).first().click();
await p.waitForURL(/dashboard/, { timeout: 15000 });
await p.waitForTimeout(1200);
await step(p, 'Dashboard after publishing');
ok('Onboarding → published → dashboard', true, user);

const tok = (await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token;
const api = async (m, path, body) => {
  const r = await fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
};
const me = (await api('GET', '/me')).j.profile;
ok('Profile saved from onboarding', me.display_name === 'Dapur Nara' && me.is_published && me.theme?.preset === 'senja');

// ---------- EDITOR: product card through the Add a card dialog
await p.getByRole('button', { name: /^add card$/i }).click();
await p.getByLabel(/search cards/i).fill('produk');
await p.waitForTimeout(500);
await step(p, 'Add a card: search "produk"');
await p.getByRole('dialog', { name: 'Add a card' }).getByRole('button', { name: /^Product:/ }).click();
await p.waitForTimeout(500);
await p.getByLabel('Product name').fill('Fudgy brownies 20×20');
await p.getByLabel('Price', { exact: true }).fill('85000');
await p.getByLabel('Was (optional)').fill('95000');
await p.locator('button, [role=radio], label').filter({ hasText: /^Best seller$/ }).first().click({ timeout: 5000 }).catch(() => {});
await p.getByLabel('WhatsApp number', { exact: true }).fill('081234567890');
await step(p, 'Product form filled');
await p.getByRole('button', { name: /^add product$/i }).click();
await p.waitForTimeout(2000);
await step(p, 'Product card added, live preview');
const ed = (await api('GET', '/profile/editor')).j;
const prod = ed.blocks.find((x) => x.type === 'product');
ok('Product card saved', !!prod && prod.data.price === 8500000 && prod.data.action?.wa_number === '+6281234567890');

// ---------- More cards through the API (their forms are long; the editor forms have their own tests)
const tab = ed.tabs[0].id;
const add = async (type, data, extra = {}) => {
  const r = await api('POST', '/blocks', { tab_id: tab, type, data, ...extra });
  ok(`Create ${type}${extra.gate ? ' (locked)' : ''}`, r.s < 300, r.s >= 300 ? JSON.stringify(r.j).slice(0, 160) : '');
  return r.j;
};
await add('marketplace', { title: 'Also on', stores: [{ platform: 'shopee', url: 'https://shopee.co.id/dapurnara' }, { platform: 'tokopedia', url: 'https://tokopedia.com/dapurnara' }] });
await add('whatsapp', { label: 'Order on WhatsApp', number: '+6281234567890', message_template: 'Hi! Order: {items}. Name: {name}. Address: {address}', order_form: { fields: ['items', 'name', 'address'], items: [{ name: 'Brownies box', price: 8500000 }, { name: 'Cookie jar', price: 6500000 }] } });
await add('store_info', { tz: 'Asia/Jakarta', address: 'Jl. Kotabaru', area: 'Yogyakarta', hours: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ day: d, open: '00:00', close: '23:59' })), couriers: ['gosend', 'pickup'] });
await add('payment', { title: 'Pay by transfer', accounts: [{ bank: 'BCA', name: 'Dapur Nara', number: '7310228841' }], confirm: { kind: 'whatsapp', target: '+6281234567890' } });
await add('media_kit', { updated_at: '2026-11-01', platforms: [{ platform: 'tiktok', handle: '@dapurnara', followers: 120000, avg_views: 40000, engagement: 7.5 }] });
await add('events', { mode: 'weekly', tz: 'Asia/Jakarta', weekly: [{ days: ['fri'], start: '20:00', duration_min: 120, platform: 'tiktok', title: 'Live restock' }] });
await add('poll', { question: 'Which flavour next?', show_results: 'after_vote', options: [{ label: 'Pandan' }, { label: 'Ube' }] });
await add('link', { title: 'Members-only recipe', url: 'https://example.com/recipe' }, { gate: { kind: 'password', password: 'kue12345', message: 'Enter the password from my story' } });
await p.reload();
await p.waitForTimeout(1500);
await step(p, 'Editor with all the new cards');

// ---------- VISITOR on a phone, arriving from Instagram
await new Promise((r) => setTimeout(r, 2500)); // let the revalidate webhook land
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
// the BE bot filter drops HeadlessChrome visits, so present a normal phone browser
const vc = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: IPHONE_UA, extraHTTPHeaders: { referer: 'https://www.instagram.com/' } });
const v = await vc.newPage();
const third = [];
watch(v, 'visitor', errs, third);
const resp = await v.goto(`${BASE}/${user}`);
await v.waitForLoadState('networkidle');
await step(v, 'Visitor: public page (phone)');
ok('Public page loads (200)', resp.status() === 200, String(resp.status()));
const html = await v.content();
const text = async () => v.locator('body').innerText();
ok('Shows name, bio and sections', html.includes('Dapur Nara') && html.includes('Kotabaru'));
ok('Product card with price', /Fudgy brownies/.test(html) && /85[.,]000/.test(html));
const wa = await v.locator('a[href*="wa.me"]').first().getAttribute('href').catch(() => null);
ok('Buy button builds a wa.me link', !!wa && wa.includes('6281234567890'));
ok('Marketplace row (Shopee, Tokopedia)', /Shopee/i.test(html) && /Tokopedia/i.test(html));
ok('Store info says "Open now"', /open now/i.test(await text()));
ok('Payment account number visible', html.includes('7310228841'));
ok('Media kit and live schedule', /120K|120,000|120\.000/i.test(html) && /Live restock/.test(html));
ok('Locked card does not leak its URL', !html.includes('example.com/recipe'));

await v.getByText('Marketplace', { exact: false }).first().scrollIntoViewIfNeeded().catch(() => {});
await v.getByText('Also on').scrollIntoViewIfNeeded();
await step(v, 'Visitor: marketplace and WhatsApp order');
await v.getByText(/open now/i).first().scrollIntoViewIfNeeded();
await step(v, 'Visitor: store hours and payment');

await v.getByText('Which flavour next?').first().scrollIntoViewIfNeeded();
await v.getByText('Pandan', { exact: true }).click();
await v.getByRole('button', { name: /^vote$/i }).click();
await v.waitForTimeout(1500);
await step(v, 'Visitor: voted in the poll');
ok('Poll vote counted', /Thanks for voting/i.test(await text()) && /100%/.test(await text()));

const pwIn = v.locator('input[type=password]').first();
await pwIn.scrollIntoViewIfNeeded();
const box = await pwIn.boundingBox();
ok('Unlock form is usable on a phone (input ≥ 150 px wide)', !!box && box.width >= 150, box ? `input width ${Math.round(box.width)} px` : 'no input');
await pwIn.fill('kue12345');
await step(v, 'Visitor: entering the card password');
await pwIn.press('Enter');
await v.waitForTimeout(2000);
await step(v, 'Visitor: locked card unlocked');
ok('Password unlock reveals the card', (await v.content()).includes('example.com/recipe'));

const em = v.locator('input[type=email]').first();
await em.scrollIntoViewIfNeeded();
await em.fill(`fan${stamp}@test.example`);
await v.getByRole('button', { name: /subscribe|join|sign up/i }).first().click();
await v.waitForTimeout(1500);
await step(v, 'Visitor: subscribed by email');
ok('Email sign-up confirmed', /on the list|thank|subscribed/i.test(await text()));
ok('No third-party requests from the public page', third.length === 0, third.slice(0, 3).join(' | '));

// ---------- OWNER: Insights + Audience
await new Promise((r) => setTimeout(r, 1500));
const ov = (await api('GET', '/analytics/overview?range=7d')).j;
ok('Insights counts the visit', (ov.totals?.views ?? ov.views ?? 0) >= 1);
const au = (await api('GET', '/audience')).j;
ok('Audience has the subscriber', JSON.stringify(au).includes(`fan${stamp}@test.example`));
for (const [path, title, re] of [
  ['/dashboard/analytics', 'Owner: Insights', /visitors|views/i],
  ['/dashboard/audience', 'Owner: Audience', new RegExp(`fan${stamp}`)],
  ['/dashboard/appearance', 'Owner: Design', /theme|Senja/i],
  ['/dashboard/settings', 'Owner: Settings', /username|address|profile/i],
]) {
  await p.goto(BASE + path);
  await p.waitForTimeout(1500);
  await step(p, title);
  ok(`${title.replace('Owner: ', '')} page renders`, re.test(await p.locator('body').innerText()));
}

console.log('\nERRORS:', errs.length ? '\n' + errs.slice(0, 15).join('\n') : 'none');
const passed = results.filter((r) => r[0] === 'PASS').length;
console.log(`\nSUMMARY: ${passed}/${results.length} passed · page /${user} · screenshots in e2e/shots/`);
await browser.close();
process.exit(passed === results.length && errs.length === 0 ? 0 : 1);
