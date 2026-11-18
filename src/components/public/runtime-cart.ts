import { localStore, type KV } from "@/lib/visitor-id";
import { formatMoney, type Currency } from "@/lib/sell/money";

/**
 * Payments (c): the shop cart, loaded by runtime-core on the first "Add to cart" click (or when a
 * saved cart exists). Vanilla DOM, no React. The cart lives in this browser only (localStorage,
 * per page and shop card, for 7 days); the checkout page re-prices everything from the stored card,
 * so nothing here is trusted. The shop's [data-cart-bar] links to the server-rendered checkout.
 */

export const CART_TTL_MS = 7 * 24 * 3600 * 1000;
const MAX_LINES = 20;
const MAX_QTY = 20;

/** i: shop item id, q: quantity, o: chosen options, p: unit price when added (display only), s: ships */
export interface StoredLine {
  i: string;
  q: number;
  o: Record<string, string>;
  p: number;
  s?: 1;
}
interface Stored {
  v: 1;
  at: number;
  lines: StoredLine[];
}

export const cartKey = (username: string, blockId: string) => `tautan-cart:${username}:${blockId}`;

export function readCart(kv: KV | null, key: string, now = Date.now()): StoredLine[] {
  try {
    const raw = kv?.getItem(key);
    if (!raw) return [];
    const c = JSON.parse(raw) as Stored;
    if (c?.v !== 1 || !Array.isArray(c.lines) || now - c.at > CART_TTL_MS) {
      kv?.removeItem(key);
      return [];
    }
    return c.lines.filter((l) => typeof l?.i === "string" && /^[a-z0-9_-]{1,40}$/.test(l.i)).slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export function writeCart(kv: KV | null, key: string, lines: StoredLine[], now = Date.now()): void {
  try {
    if (!lines.length) kv?.removeItem(key);
    else kv?.setItem(key, JSON.stringify({ v: 1, at: now, lines } satisfies Stored));
  } catch {
    /* storage full or blocked: the cart just doesn't persist */
  }
}

/** Adds one of an item: same item and options merge (shipped items count up, files stay at 1). */
export function addLine(lines: StoredLine[], add: StoredLine): StoredLine[] {
  const same = (l: StoredLine) => l.i === add.i && JSON.stringify(l.o) === JSON.stringify(add.o);
  const found = lines.find(same);
  if (found) return lines.map((l) => (same(l) && l.s ? { ...l, q: Math.min(l.q + 1, MAX_QTY) } : l));
  return lines.length >= MAX_LINES ? lines : [...lines, add];
}

/** The checkout URL for the stored cart (the same shape as lib/buy cartHref). */
export function checkoutUrl(username: string, blockId: string, lines: StoredLine[]): string {
  const u = new URLSearchParams({ block: blockId });
  lines.forEach((l, n) => {
    u.set(`line.${n}.item`, l.i);
    if (l.q !== 1) u.set(`line.${n}.qty`, String(l.q));
    for (const [k, v] of Object.entries(l.o)) u.set(`line.${n}.option.${k}`, v);
  });
  return `/${username}/checkout?${u.toString()}`;
}

function render(bar: HTMLElement, username: string, lines: StoredLine[]) {
  const blockId = bar.dataset.cartBar!;
  bar.hidden = !lines.length;
  if (!lines.length) return;
  const n = lines.reduce((k, l) => k + l.q, 0);
  const total = lines.reduce((k, l) => k + l.p * l.q, 0);
  const count = bar.querySelector("[data-cart-n]");
  const sum = bar.querySelector("[data-cart-total]");
  if (count) count.textContent = String(n);
  if (sum) sum.textContent = formatMoney(total, (bar.dataset.cartCurrency ?? "IDR") as Currency);
  bar.querySelector<HTMLAnchorElement>("[data-cart-go]")?.setAttribute("href", checkoutUrl(username, blockId, lines));
}

/** "Add to cart" clicked: store the line (with the options chosen in its card), update the bar. */
export function add(btn: HTMLElement, username: string): void {
  const shop = btn.closest("section");
  const bar = shop?.querySelector<HTMLElement>("[data-cart-bar]");
  if (!bar) {
    location.href = btn.getAttribute("href") ?? location.href;
    return;
  }
  const key = cartKey(username, bar.dataset.cartBar!);
  const o: Record<string, string> = {};
  btn
    .closest("[data-product]")
    ?.querySelectorAll<HTMLInputElement>("input[data-variant]:checked")
    .forEach((r) => {
      if (r.dataset.variant) o[r.dataset.variant] = r.value;
    });
  const kv = localStore();
  const lines = addLine(readCart(kv, key), { i: btn.dataset.cartAdd!, q: 1, o, p: Number(btn.dataset.cartPrice) || 0, ...(btn.dataset.cartShip ? { s: 1 as const } : {}) });
  writeCart(kv, key, lines);
  render(bar, username, lines);
  const label = btn.textContent;
  btn.textContent = "Added ✓";
  setTimeout(() => (btn.textContent = label), 1200);
  setTimeout(() => btn.closest("dialog")?.close(), 350);
}

/** On load: show the bar for every shop with a saved cart. */
export function restore(root: HTMLElement, username: string): void {
  const kv = localStore();
  root.querySelectorAll<HTMLElement>("[data-cart-bar]").forEach((bar) => render(bar, username, readCart(kv, cartKey(username, bar.dataset.cartBar!))));
}
