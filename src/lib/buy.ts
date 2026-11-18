/**
 * Payments (b), buyer side: what the checkout, order and lookup pages need.
 * Pure functions (no React, no fetch) so they're unit-tested.
 * Query params (block, item, error) are buyer-controlled: they're only used
 * as lookup keys and mapped to fixed messages, never rendered.
 */
import type { Block, PagePayments, ProductData, ShopItem } from "./types";

export type Provider = "xendit" | "midtrans" | "stripe";

/** How each provider reads to a buyer (methods, not brand jargon). */
export const PROVIDER_LABEL: Record<Provider, { name: string; methods: string }> = {
  xendit: { name: "Xendit", methods: "QRIS, e-wallets, virtual account, cards" },
  midtrans: { name: "Midtrans", methods: "QRIS, GoPay, ShopeePay, virtual account, cards" },
  stripe: { name: "Stripe", methods: "Card, Apple Pay, Google Pay" },
};

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
    items: { name: string; variant?: string; quantity: number; unit_amount: number; file_name?: string }[];
    buyer_email: string;
    buyer_name: string;
    provider: Provider;
    mode: "sandbox" | "live";
    created_at: string;
    paid_at: string | null;
    expires_at: string;
    checkout_url: string | null;
  };
  downloads: { index: number; name: string; file_name: string; url: string; expires_at: string }[];
}

/** Keep auto-refreshing a pending order page for this long after the checkout closes. */
export const REFRESH_GRACE_MS = 15 * 60 * 1000;

export function shouldAutoRefresh(o: BuyerOrder["order"], now = Date.now()): boolean {
  return o.status === "pending" && now < new Date(o.expires_at).getTime() + REFRESH_GRACE_MS;
}
