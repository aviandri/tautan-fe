// End-to-end journey test for Tautan: owner signs up, onboards (unverified → draft), confirms their
// email from the link the backend mails, publishes, builds a page; a visitor uses it (poll, gate,
// email sign-up, contact form → owner notification); the owner checks Insights and Audience, sells a
// file through the API's dev-only fake payment provider (buyer pays, downloads, gets a receipt; a
// failed payment too; the owner sees the Orders page), sells from a shop cart (shipped items + a
// download, two-step checkout, owner marks it shipped → email), then resets their password through the
// emailed link. Runs against a live FE + BE started with PAYMENTS_FAKE=1 (dev-only; refused with APP_ENV=production).
//
//   cd e2e && npm install && npx playwright install chromium
//   cd tautan-be && PAYMENTS_FAKE=1 make dev 2>&1 | tee /tmp/tautan-be.log   # BE: log mail driver + fake payment provider
//   BE_LOG=/tmp/tautan-be.log HEADED=1 SLOWMO=350 node journey.mjs  # watch it in a real browser window
//   BE_LOG=/tmp/tautan-be.log node journey.mjs                      # headless
//
// Env: BASE (default http://localhost:3000), API (default http://localhost:8080/api/v1),
//      BE_LOG (required: the backend's log file, where the log mail driver prints confirm/reset links),
//      HEADED=1 shows the browser, SLOWMO=<ms> slows every action, PAUSE=<ms> pause after each step (headed default 1200).
// The FE needs REVALIDATE_SECRET set to the BE's, or published edits show up only after 60 s.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { BE_LOG, logMark, waitForMail } from './mail.mjs';

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

if (!BE_LOG) {
  console.error('BE_LOG is not set. Run the backend with its output in a file (make dev 2>&1 | tee /tmp/tautan-be.log) and pass BE_LOG=/tmp/tautan-be.log');
  process.exit(2);
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

const mark = logMark();
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
await step(p, 'Onboarding: claim your address (email not confirmed yet)');
// Email verification gates publishing (tautan-be #38): an unconfirmed owner finishes as a draft.
const publishSwitch = p.getByRole('switch', { name: /publish now/i });
ok('Unconfirmed owner can\'t publish from onboarding',
  (await publishSwitch.isDisabled().catch(() => false)) && /confirm your email/i.test(await p.locator('body').innerText()));
await p.getByRole('button', { name: /finish setup/i }).click();
await p.waitForURL(/\/dashboard/, { timeout: 15000 });
await p.waitForTimeout(1200);
await step(p, 'Dashboard: draft, confirm-email notice');

const tok = (await (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token;
const api = async (m, path, body) => {
  const r = await fetch(API + path, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { s: r.status, j };
};
// The payments section needs the backend's dev-only fake provider (PAYMENTS_FAKE=1); fail fast with a clear message.
const provsAtStart = (await api('GET', '/payments/providers')).j;
if (!provsAtStart.providers?.some((x) => x.provider === 'fake')) {
  console.error('The backend doesn\'t offer the fake payment provider. Start it with PAYMENTS_FAKE=1 (and APP_ENV not production): PAYMENTS_FAKE=1 make dev');
  await browser.close();
  process.exit(2);
}
let me = (await api('GET', '/me')).j;
ok('Signed up unverified, page saved as a draft', me.user?.email_verified === false && me.profile.is_published === false);
const early = await api('PATCH', '/profile', { is_published: true });
ok('API refuses to publish before the email is confirmed', early.s >= 400 && early.j?.error?.code === 'email_unverified', `${early.s} ${early.j?.error?.code ?? ''}`);

// ---------- confirm the email with the link from the signup mail (BE log mail driver)
const verifyToken = await waitForMail({ to: email, since: mark, re: /verify-email\?token=([A-Za-z0-9_%-]+)/ });
ok('Signup sent a confirmation email', !!verifyToken);
const vp = await oc.newPage();
watch(vp, 'owner', errs);
await vp.goto(`${BASE}/verify-email?token=${verifyToken}`);
await vp.getByRole('heading', { name: /email confirmed/i }).waitFor({ timeout: 15000 });
await step(vp, 'Email confirmed (link from the mail)');
await vp.close();
me = (await api('GET', '/me')).j;
ok('Email is confirmed', me.user?.email_verified === true);

// ---------- publish from the dashboard
await p.bringToFront();
await p.reload();
await p.getByRole('button', { name: /^publish page$/i }).click({ timeout: 15000 });
await p.getByText(/your page is live/i).first().waitFor({ timeout: 15000 });
await step(p, 'Dashboard: published');
me = (await api('GET', '/me')).j;
ok('Published from the dashboard after confirming', me.profile.is_published === true, user);
ok('Profile saved from onboarding', me.profile.display_name === 'Dapur Nara' && me.profile.theme?.preset === 'senja');

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
await add('contact_form', { title: 'Custom cake orders', button_label: 'Send' });
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
// contact form → the owner gets a notification email (tautan-be #40)
const markContact = logMark();
const cf = v.locator('form[aria-label="Custom cake orders"]');
await cf.scrollIntoViewIfNeeded();
await cf.getByLabel('Name').fill('Sari');
await cf.getByLabel('Email').fill(`sari${stamp}@test.example`);
await cf.getByLabel('Message').fill('Can you do a 3-tier pandan cake for 40 people on Saturday?');
await step(v, 'Visitor: contact form filled');
await cf.getByRole('button', { name: /^send$/i }).click();
await v.getByText(/message sent/i).first().waitFor({ timeout: 10000 }).catch(() => {});
await step(v, 'Visitor: message sent');
ok('Contact form confirms the message', /message sent/i.test(await text()));
const note = await waitForMail({ to: email, since: markContact, subject: 'New response', re: /subject="?([^"]+)"?/ }).catch((e) => e.message);
ok('Owner is emailed about the new message', /New response/.test(note), note.slice(0, 90));
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

// ---------- SELL A FILE → BUY → PAY → DOWNLOAD (the API's dev-only fake provider: no provider keys)
await p.goto(BASE + '/dashboard/settings');
const fakePanel = p.getByRole('button', { name: /Fake \(dev only\)/ });
await fakePanel.waitFor({ timeout: 20000 });
await fakePanel.scrollIntoViewIfNeeded();
await fakePanel.click();
await p.getByLabel('Key', { exact: true }).fill('fake_e2e');
const acceptSwitch = p.getByRole('switch', { name: /accept payments with fake/i });
if ((await acceptSwitch.getAttribute('aria-checked')) !== 'true') await acceptSwitch.click(); // on by default for a new provider
await step(p, 'Owner: connect the test payment provider');
await p.getByRole('button', { name: /^connect$/i }).click();
await p.waitForTimeout(1500);
const provs = (await api('GET', '/payments/providers')).j;
ok('Test payment provider connected and on (settings UI)', !!provs.providers?.some((x) => x.provider === 'fake' && x.enabled), JSON.stringify(provs).slice(0, 160));

const pdfText = `%PDF-1.4\n% Tautan e2e ${stamp}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n`;
const fd = new FormData();
fd.append('file', new Blob([pdfText], { type: 'application/pdf' }), 'Resep-Brownies.pdf');
const upRes = await fetch(API + '/uploads?kind=file', { method: 'POST', headers: { authorization: 'Bearer ' + tok }, body: fd });
const up = await upRes.json().catch(() => ({}));
ok('Upload the file to sell', upRes.status === 201 && !!up.url, String(upRes.status));
const fileCard = await add('file', { title: 'Brownies recipe e-book', url: up.url, file_name: 'Resep-Brownies.pdf', price: 2500000 });
await new Promise((r) => setTimeout(r, 2500)); // let the revalidate webhook land

const buyer = `sari${stamp}@test.example`;
const b = await vc.newPage();
watch(b, 'buyer', errs);
await b.goto(`${BASE}/${user}`);
const buyLink = b.locator(`a[href*="/checkout?block=${fileCard?.id}"]`).first();
await buyLink.waitFor({ timeout: 15000 }).catch(() => {});
ok('Public page shows the paid file with a buy button', (await buyLink.count()) > 0);
await buyLink.scrollIntoViewIfNeeded().catch(() => {});
await step(b, 'Buyer: paid file card');
await buyLink.click();
await b.waitForURL(/\/checkout\?/);
await b.locator('input[name=email]').fill(buyer);
await b.locator('input[name=name]').fill('Sari');
await step(b, 'Buyer: checkout');
await b.getByRole('button', { name: /^pay /i }).click();
await b.waitForURL(/\/dev\/fake-checkout\/fk_/, { timeout: 15000 });
await step(b, 'Buyer: test provider checkout page');
ok('Checkout hands off to the provider page with the right total', /Rp\s?25\.000/.test(await b.getByTestId('fake-total').innerText()));
const markReceipt = logMark();
await b.getByTestId('fake-pay').click();
await b.waitForURL(new RegExp(`/${user}/orders/[0-9a-f-]+\\?t=`), { timeout: 15000 });
await b.getByRole('heading', { name: /thanks, sari/i }).waitFor({ timeout: 15000 }).catch(() => {});
await step(b, 'Buyer: paid, download ready');
ok('Order page shows paid with a download', /Paid/.test(await b.locator('.tb-status').innerText().catch(() => '')) && (await b.locator('a.tb-dl').count()) === 1);
const dlHref = await b.locator('a.tb-dl').first().getAttribute('href').catch(() => null);
const dl = dlHref ? await fetch(dlHref) : null;
const dlBody = dl ? await dl.text() : '';
ok('Download link serves the file', !!dl && dl.status === 200 && dlBody.includes(`Tautan e2e ${stamp}`) && /Resep-Brownies\.pdf/.test(dl.headers.get('content-disposition') || ''), dl ? `${dl.status} ${dl.headers.get('content-disposition')}` : 'no link');
const receipt = await waitForMail({ to: buyer, since: markReceipt, re: /(\/orders\/[0-9a-f-]+\?t=[A-Za-z0-9_-]+)/ }).catch((e) => e.message);
ok('Buyer is emailed a receipt with the order link', /^\/orders\//.test(receipt), receipt.slice(0, 90));

// A second attempt where the payment fails: no download, and the order is marked failed.
await b.goto(`${BASE}/${user}/checkout?block=${fileCard?.id}`);
await b.locator('input[name=email]').fill(buyer);
await b.getByRole('button', { name: /^pay /i }).click();
await b.waitForURL(/\/dev\/fake-checkout\/fk_/, { timeout: 15000 });
await b.getByTestId('fake-fail').click();
await b.waitForURL(new RegExp(`/${user}/orders/`), { timeout: 15000 });
await step(b, 'Buyer: payment failed');
ok('A failed payment shows "not paid" and no download', /wasn.t paid/i.test(await b.locator('body').innerText()) && (await b.locator('a.tb-dl').count()) === 0);

// Owner sees both orders.
const orders = (await api('GET', '/orders')).j;
const paidOrder = orders.items?.find((o) => o.status === 'paid' && o.buyer_email === buyer);
ok('Orders API: one paid, one failed, revenue counted', !!paidOrder && orders.counts?.paid === 1 && orders.counts?.failed === 1 && orders.revenue?.IDR === 2500000, JSON.stringify(orders.counts));
await p.goto(BASE + '/dashboard/orders');
await p.getByText(paidOrder?.code ?? '—').first().waitFor({ timeout: 15000 }).catch(() => {});
await step(p, 'Owner: Orders');
ok('Orders page lists the paid order', !!paidOrder && (await p.locator('body').innerText()).includes(paidOrder.code));

// ---------- SHOP CART (payments c): two shipped items + a download, flat shipping fee, two-step checkout
const shopCard = await add('shop', {
  title: 'Dapur Nara merch', shipping_fee: 1500000, items: [
    { id: 'apron', name: 'Apron', price: 9500000, currency: 'IDR', images: [], variants: [{ name: 'Size', options: ['M', 'L'] }], action: { kind: 'checkout', delivery: 'ship' } },
    { id: 'jar', name: 'Cookie jar', price: 6500000, currency: 'IDR', images: [], action: { kind: 'checkout', delivery: 'ship' } },
    { id: 'zine', name: 'Recipe zine (PDF)', price: 2000000, currency: 'IDR', images: [], action: { kind: 'checkout', download: { url: up.url, file_name: 'Resep-Brownies.pdf' } } },
  ],
});
await new Promise((r) => setTimeout(r, 2500)); // let the revalidate webhook land

const cartBuyer = `budi${stamp}@test.example`;
const c = await vc.newPage();
watch(c, 'cart', errs);
await c.goto(`${BASE}/${user}`);
const shopSec = c.locator(`#shop-${shopCard?.id}`);
await shopSec.scrollIntoViewIfNeeded();
const addToCart = async (name, id, option) => {
  await shopSec.getByRole('button', { name: new RegExp('^' + name) }).click();
  const dlg = c.locator(`#shop-${shopCard?.id}-${id}`);
  await dlg.waitFor({ state: 'visible', timeout: 10000 });
  if (option) await dlg.locator('label', { hasText: new RegExp(`^${option}$`) }).click();
  await dlg.locator(`[data-cart-add="${id}"]`).click();
  await dlg.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
};
await addToCart('Apron', 'apron', 'L');
await addToCart('Apron', 'apron', 'L'); // same item and option: quantity 2
await addToCart('Cookie jar', 'jar');
await addToCart('Recipe zine', 'zine');
const cartBar = c.locator(`[data-cart-bar="${shopCard?.id}"]`);
await step(c, 'Buyer: cart bar on the shop');
ok('Cart bar shows 4 items and Rp 275.000', /4 in cart/.test(await cartBar.innerText().catch(() => '')) && /Rp\s?275\.000/.test(await cartBar.innerText().catch(() => '')), await cartBar.innerText().catch((e) => e.message));

await cartBar.locator('[data-cart-go]').click();
await c.getByRole('heading', { name: /your cart/i }).waitFor({ timeout: 15000 });
await c.locator('select[name="line.1.qty"]').selectOption('2'); // the cookie jar
await c.getByRole('button', { name: /^update$/i }).click();
await c.waitForLoadState('load');
await step(c, 'Buyer: cart review (2 aprons, 2 jars, 1 zine)');
const reviewText = await c.locator('body').innerText();
ok('Cart review totals items + shipping (Rp 355.000)', /Rp\s?355\.000/.test(reviewText) && /Rp\s?15\.000/.test(reviewText), reviewText.match(/Total[^\n]*\n?[^\n]*/)?.[0] ?? '');
await c.getByRole('button', { name: /^continue$/i }).click();
await c.locator('input[name=email]').waitFor({ timeout: 15000 });
await c.locator('input[name=email]').fill(cartBuyer);
await c.locator('input[name="shipping.name"]').fill('Budi Santoso');
await c.locator('input[name="shipping.phone"]').fill('0812-3456-7890');
await c.locator('textarea[name="shipping.address"]').fill('Jl. Melati 7, RT 02/RW 05');
await c.locator('input[name="shipping.city"]').fill('Bandung');
await c.locator('input[name="shipping.postal_code"]').fill('40115');
await step(c, 'Buyer: checkout details and shipping address');
await c.getByRole('button', { name: /^pay /i }).click();
await c.waitForURL(/\/dev\/fake-checkout\/fk_/, { timeout: 15000 });
ok('Cart checkout hands off with the full total', /Rp\s?355\.000/.test(await c.getByTestId('fake-total').innerText()));
await c.getByTestId('fake-pay').click();
await c.waitForURL(new RegExp(`/${user}/orders/[0-9a-f-]+\\?t=`), { timeout: 15000 });
await c.getByText(/preparing your order/i).waitFor({ timeout: 15000 }).catch(() => {});
await step(c, 'Buyer: cart order paid, preparing');
const cartOrderText = await c.locator('body').innerText();
ok('Cart order page: paid, preparing, shipping line, zine download', /Paid/.test(cartOrderText) && /preparing your order/i.test(cartOrderText) && /Shipping/.test(cartOrderText) && (await c.locator('a.tb-dl').count()) === 1);
const cartOrderUrl = c.url();
await c.goto(`${BASE}/${user}`);
await c.waitForTimeout(800);
ok('A paid cart is cleared in this browser', await cartBar.isHidden());

// Owner: the order waits in "to ship" with the address; marking it shipped emails the buyer.
const toShip = (await api('GET', '/orders?fulfilment=unfulfilled')).j;
const cartOrder = toShip.items?.find((o) => o.buyer_email === cartBuyer);
ok('Owner sees the cart order to ship, with the address', !!cartOrder && cartOrder.shipping?.city === 'Bandung' && cartOrder.amount === 35500000 && toShip.counts?.to_ship === 1, JSON.stringify(toShip.counts));
const markShip = logMark();
const shipped = await api('POST', `/orders/${cartOrder?.id}/ship`, { tracking: 'JNE123456' });
ok('Owner marks the order shipped', shipped.s === 200 && shipped.j.order?.fulfilment === 'shipped', String(shipped.s));
const shipMail = await waitForMail({ to: cartBuyer, since: markShip, subject: 'has shipped', re: /(JNE123456)/ }).catch((e) => e.message);
ok('Buyer is emailed that it shipped, with tracking', shipMail === 'JNE123456', shipMail.slice(0, 90));
await c.goto(cartOrderUrl);
await c.getByText('JNE123456').waitFor({ timeout: 10000 }).catch(() => {});
await step(c, 'Buyer: order shipped with tracking');
ok('Order page shows shipped with the tracking number', /Shipped/.test(await c.locator('body').innerText()) && (await c.getByText('JNE123456').count()) > 0);

// ---------- RESET PASSWORD (logged out, link from the email)
const rc = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const r = await rc.newPage();
watch(r, 'reset', errs);
const markReset = logMark();
await r.goto(BASE + '/forgot-password');
await r.getByLabel('Email').fill(email);
await step(r, 'Forgot password');
await r.getByRole('button', { name: /send reset link/i }).click();
await r.getByRole('heading', { name: /check your email/i }).waitFor({ timeout: 10000 });
ok('Forgot password says to check your email', true);
const resetToken = await waitForMail({ to: email, since: markReset, re: /reset-password\?token=([A-Za-z0-9_%-]+)/ });
ok('Reset email sent with a link', !!resetToken);
const pw2 = 'e2e-new-password-456';
await r.goto(`${BASE}/reset-password?token=${resetToken}`);
await r.getByRole('heading', { name: /choose a new password/i }).waitFor();
await r.locator('input[autocomplete="new-password"]').nth(0).fill(pw2);
await r.getByLabel('Confirm password').fill(pw2);
await step(r, 'Choose a new password');
await r.getByRole('button', { name: /save and log in/i }).click();
await r.waitForURL(/\/dashboard/, { timeout: 15000 });
await step(r, 'Logged in with the new password');
ok('Reset logs in and lands on the dashboard', true);
const login = async (password) => (await fetch(API + '/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) })).status;
ok('New password works, old one doesn\'t', (await login(pw2)) === 200 && (await login(pw)) === 401);
// reusing the link: the API answers 400 invalid_token, which the browser logs as a console error;
// that one is expected, so it is dropped from the error list below
const errsBeforeReuse = errs.length;
await r.goto(`${BASE}/reset-password?token=${resetToken}`);
await r.locator('input[autocomplete="new-password"]').nth(0).fill('e2e-third-password-789');
await r.getByLabel('Confirm password').fill('e2e-third-password-789');
await r.getByRole('button', { name: /save and log in/i }).click();
await r.getByRole('heading', { name: /link has expired/i }).waitFor({ timeout: 10000 }).catch(() => {});
ok('A reset link works only once', /link has expired/i.test(await r.locator('body').innerText()));
errs.splice(errsBeforeReuse, errs.length - errsBeforeReuse, ...errs.slice(errsBeforeReuse).filter((e) => !/^reset console: .*status of 400/.test(e)));

console.log('\nERRORS:', errs.length ? '\n' + errs.slice(0, 15).join('\n') : 'none');
const passed = results.filter((r) => r[0] === 'PASS').length;
console.log(`\nSUMMARY: ${passed}/${results.length} passed · page /${user} · screenshots in e2e/shots/`);
await browser.close();
process.exit(passed === results.length && errs.length === 0 ? 0 : 1);
