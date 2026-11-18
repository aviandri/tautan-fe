/**
 * Payments (b), buyer side: what the checkout, order and lookup pages need.
 * Pure functions (no React, no fetch) so they're unit-tested.
 * Query params (block, item, error) are buyer-controlled: they're only used
 * as lookup keys and mapped to fixed messages, never rendered.
 */
import type { Block, PagePayments, ProductData, ShopItem } from "./types";

export type Provider = "xendit" | "midtrans" | "stripe" | "fake";

/** How each provider reads to a buyer (methods, not brand jargon). */
export const PROVIDER_LABEL: Record<Provider, { name: string; methods: string }> = {
  xendit: { name: "Xendit", methods: "QRIS, e-wallets, virtual account, cards" },
  midtrans: { name: "Midtrans", methods: "QRIS, GoPay, ShopeePay, virtual account, cards" },
  stripe: { name: "Stripe", methods: "Card, Apple Pay, Google Pay" },
  fake: { name: "Test checkout", methods: "Development only, no money moves" },
};

/** A provider's buyer-facing label; falls back to its id for a provider this build doesn't know yet. */
export function providerLabel(p: string): { name: string; methods: string } {
  return (PROVIDER_LABEL as Record<string, { name: string; methods: string } | undefined>)[p] ?? { name: p, methods: "Online payment" };
}

export interface Purchasable {
  blockId: string;
  itemId?: string;
  kind: "file" | "product";
  name: string;
  description?: string;
  price: number;
  currency: string;
  image?: string;
  fileName?: string;
  variants: { name: string; options: string[] }[];
}

const ID = /^[a-z0-9_-]{1,40}$/;

/** Finds the card (or shop item) a checkout link points at, when it can be bought. */
export function findPurchasable(blocks: Block[], blockId: string | undefined, itemId?: string): Purchasable | null {
  if (!blockId) return null;
  const b = blocks.find((x) => x.id === blockId);
  if (!b || !b.data || (b as { locked?: boolean }).locked) return null;
  if (b.type === "file") {
    const d = b.data;
    if (d.price == null) return null;
    return { blockId: b.id, kind: "file", name: d.title || d.file_name || "Digital download", price: d.price, currency: d.currency ?? "IDR", fileName: d.file_name, variants: [] };
  }
  let p: ProductData | ShopItem | undefined;
  if (b.type === "product") p = b.data;
  else if (b.type === "shop" && itemId && ID.test(itemId)) p = b.data.items.find((it) => it.id === itemId);
  if (!p || p.action.kind !== "checkout" || p.price == null || p.badge === "sold_out") return null;
  // payments (c): shipped items go through the cart checkout
  if (p.action.delivery === "ship") return null;
  return {
    blockId: b.id,
    itemId: b.type === "shop" ? itemId : undefined,
    kind: "product",
    name: p.name,
    description: p.description,
    price: p.price,
    currency: p.currency ?? "IDR",
    image: p.images[0],
    variants: (p.variants ?? []).filter((v) => v.options.length),
  };
}

/** Providers that can take this currency, in display order. */
export function eligibleProviders(payments: PagePayments | null | undefined, currency: string): Provider[] {
  return (payments?.providers ?? []).filter((p) => p.currencies.includes(currency)).map((p) => p.provider);
}

const CHECKOUT_ERRORS: Record<string, string> = {
  invalid_email: "Check your email address. Your download link and receipt go there.",
  invalid_name: "Your name is too long.",
  invalid_options: "Choose an option for each choice above.",
  provider_required: "Choose how you want to pay.",
  invalid_provider: "That payment option isn't available for this item. Choose another.",
  payments_unavailable: "This seller isn't taking online payments right now.",
  not_for_sale: "This item isn't for sale right now.",
  not_found: "This item isn't on the page any more.",
  locked: "This item is locked. Unlock it on the page first.",
  rate_limited: "Too many tries. Wait a few minutes and try again.",
  checkout_failed: "The payment page couldn't be opened. Try again, or choose another way to pay.",
  invalid_form: "Something went wrong with the form. Try again.",
  invalid_items: "Something in your cart changed. Check it and try again.",
  invalid_quantity: "Check the quantities in your cart.",
  invalid_shipping: "Check the shipping address below.",
  amount_too_small: "The total is below the minimum for paying online. Add something to your cart.",
  amount_too_large: "The total is above what can be paid online in one order. Split it into smaller orders.",
};

export function checkoutErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  return CHECKOUT_ERRORS[code] ?? "Something went wrong. Try again.";
}

export function lookupErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  if (code === "not_found") return "No order matches that email and code. Check the code in your receipt email.";
  if (code === "rate_limited") return "Too many tries. Wait a few minutes and try again.";
  return "Something went wrong. Try again.";
}

export type OrderStatus = "pending" | "paid" | "expired" | "failed" | "refunded";

export interface BuyerOrder {
  order: {
    id: string;
    code: string;
    status: OrderStatus;
    amount: number;
    currency: string;
    items: { block_id: string; name: string; variant?: string; quantity: number; unit_amount: number; file_name?: string; delivery?: "ship" }[];
    buyer_email: string;
    buyer_name: string;
    provider: Provider;
    mode: "sandbox" | "live";
    created_at: string;
    paid_at: string | null;
    expires_at: string;
    checkout_url: string | null;
    /** payments (c) */
    shipping_fee?: number;
    fulfilment?: "unfulfilled" | "shipped" | null;
    tracking?: string;
    shipped_at?: string | null;
  };
  downloads: { index: number; name: string; file_name: string; url: string; expires_at: string }[];
}

/** Keep auto-refreshing a pending order page for this long after the checkout closes. */
export const REFRESH_GRACE_MS = 15 * 60 * 1000;

export function shouldAutoRefresh(o: BuyerOrder["order"], now = Date.now()): boolean {
  return o.status === "pending" && now < new Date(o.expires_at).getTime() + REFRESH_GRACE_MS;
}

// ---------- payments (c): shop cart ----------

export const MAX_CART_LINES = 20;
export const MAX_SHIP_QTY = 20;

/** One cart line as it travels in URLs and forms: line.N.item, line.N.qty, line.N.option.<name>. */
export interface CartLineIn {
  item: string;
  qty: number;
  options: Record<string, string>;
}

type Query = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads the cart from checkout query params (buyer-controlled: bounded, used only as lookup keys). */
export function parseCartQuery(q: Query): CartLineIn[] {
  const out: CartLineIn[] = [];
  for (let n = 0; n < MAX_CART_LINES; n++) {
    const p = `line.${n}.`;
    const item = first(q[`${p}item`]);
    if (!item || !ID.test(item)) continue;
    const raw = first(q[`${p}qty`]);
    const qty = raw && /^\d{1,2}$/.test(raw) ? Number(raw) : 1;
    const options: Record<string, string> = {};
    for (const [k, v] of Object.entries(q)) {
      const name = k.startsWith(`${p}option.`) ? k.slice(p.length + 7) : "";
      const val = first(v);
      if (name && val && name.length <= 30 && val.length <= 30) options[name] = val;
    }
    out.push({ item, qty, options });
  }
  // a plain "Add to cart" link without JS, or an older ?item= link
  const single = first(q.item);
  if (!out.length && single && ID.test(single)) out.push({ item: single, qty: 1, options: {} });
  return out;
}

/** The checkout URL for a cart (also what the cart island links to). */
export function cartHref(username: string, blockId: string, lines: CartLineIn[], extra: Record<string, string> = {}): string {
  const u = new URLSearchParams({ block: blockId });
  lines.slice(0, MAX_CART_LINES).forEach((l, n) => {
    u.set(`line.${n}.item`, l.item);
    if (l.qty !== 1) u.set(`line.${n}.qty`, String(l.qty));
    for (const [k, v] of Object.entries(l.options)) u.set(`line.${n}.option.${k}`, v);
  });
  for (const [k, v] of Object.entries(extra)) u.set(k, v);
  return `/${username}/checkout?${u.toString()}`;
}

export interface CartLine {
  item: ShopItem;
  qty: number;
  /** the chosen option per variant group; "" when not chosen or not valid */
  options: Record<string, string>;
  ships: boolean;
  unit: number;
  total: number;
  /** "Choose a size" etc.; the line can't be paid until it's empty */
  problem: string | null;
}

export interface Cart {
  blockId: string;
  lines: CartLine[];
  /** item ids in the URL that can't be bought (gone, sold out, not checkout) */
  dropped: number;
  currency: string;
  ships: boolean;
  subtotal: number;
  shippingFee: number;
  total: number;
  ready: boolean;
}

/** Resolves a cart against the shop card on the page, as the API will: same merging, same caps. */
export function resolveCart(blocks: Block[], blockId: string | undefined, lines: CartLineIn[]): Cart | null {
  if (!blockId) return null;
  const b = blocks.find((x) => x.id === blockId);
  if (!b || b.type !== "shop" || !b.data || (b as { locked?: boolean }).locked) return null;
  const out: CartLine[] = [];
  let dropped = 0;
  let currency = "";
  for (const l of lines.slice(0, MAX_CART_LINES)) {
    const it = b.data.items.find((x) => x.id === l.item);
    if (!it || it.action.kind !== "checkout" || it.price == null || it.badge === "sold_out") {
      dropped++;
      continue;
    }
    const cur = it.currency ?? "IDR";
    if (currency && cur !== currency) {
      dropped++;
      continue;
    }
    currency = cur;
    const ships = it.action.delivery === "ship";
    const options: Record<string, string> = {};
    let problem: string | null = null;
    for (const v of (it.variants ?? []).filter((g) => g.options.length)) {
      const chosen = l.options[v.name];
      options[v.name] = chosen && v.options.includes(chosen) ? chosen : "";
      if (!options[v.name] && !problem) problem = `Choose a ${v.name.toLowerCase()}`;
    }
    const qty = ships ? Math.min(Math.max(l.qty, 1), MAX_SHIP_QTY) : 1;
    const key = `${it.id}|${JSON.stringify(options)}`;
    const same = out.find((x) => `${x.item.id}|${JSON.stringify(x.options)}` === key);
    if (same) {
      if (ships) {
        same.qty = Math.min(same.qty + qty, MAX_SHIP_QTY);
        same.total = same.unit * same.qty;
      }
      continue;
    }
    out.push({ item: it, qty, options, ships, unit: it.price, total: it.price * qty, problem });
  }
  const ships = out.some((l) => l.ships);
  const subtotal = out.reduce((n, l) => n + l.total, 0);
  const shippingFee = ships ? (b.data.shipping_fee ?? 0) : 0;
  return {
    blockId: b.id,
    lines: out,
    dropped,
    currency: currency || "IDR",
    ships,
    subtotal,
    shippingFee,
    total: subtotal + shippingFee,
    ready: out.length > 0 && out.every((l) => !l.problem),
  };
}

/** The cart back in URL/form shape (after merging), e.g. for remove links. */
export function cartLinesIn(cart: Cart): CartLineIn[] {
  return cart.lines.map((l) => ({ item: l.item.id, qty: l.qty, options: Object.fromEntries(Object.entries(l.options).filter(([, v]) => v)) }));
}

/**
 * What each provider's hosted checkout takes per order (minor units). Mirrors payments.AmountRange
 * in the API (SPEC "Payments (c)"), so the page can say so before the buyer types anything.
 */
export function amountRange(p: Provider, currency: string): [number, number] {
  if (currency === "IDR") return p === "stripe" ? [1_000_000, 999_999_999_999] : [100_000, 100_000_000_000];
  if (currency === "USD") return p === "stripe" ? [50, 99_999_999] : [100, 99_999_999];
  return [1, 0];
}

/** Providers that take this currency and this total. */
export function providersFor(payments: PagePayments | null | undefined, currency: string, amount: number): Provider[] {
  return eligibleProviders(payments, currency).filter((p) => {
    const [min, max] = amountRange(p, currency);
    return amount >= min && amount <= max;
  });
}

/** Errors that belong to the details step (contact, address, payment); the rest send the buyer back to the cart. */
export const DETAILS_ERRORS = new Set(["invalid_email", "invalid_name", "invalid_shipping", "provider_required", "invalid_provider", "checkout_failed", "rate_limited", "invalid_form"]);

/** A shipping field from ?field= (only our own keys), for highlighting. */
export function shippingFieldErrors(q: Query): Set<string> {
  const v = q.field;
  const list = Array.isArray(v) ? v : v ? [v] : [];
  return new Set(list.filter((f) => /^shipping\.(name|phone|address|city|postal_code|country|notes)$/.test(f)).map((f) => f.slice(9)));
}
