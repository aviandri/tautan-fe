/**
 * Payments (b): rules for prices that go through checkout (SPEC.md →
 * "Payments (b)"). Mirrors the API: above zero, IDR or USD, whole rupiah.
 */
export const CHECKOUT_CURRENCIES = ["IDR", "USD"] as const;
export type CheckoutCurrency = (typeof CHECKOUT_CURRENCIES)[number];

export function paidPriceError(price: number | undefined, currency: string | undefined): string | null {
  if (price == null) return "Add a price to sell this";
  if (Number.isNaN(price)) return "Enter an amount, like 85.000";
  if (price <= 0) return "The price must be more than 0";
  const c = currency || "IDR";
  if (!(CHECKOUT_CURRENCIES as readonly string[]).includes(c)) return "Online checkout takes IDR or USD";
  if (c === "IDR" && price % 100 !== 0) return "Use whole rupiah";
  return null;
}

/** Payments (c): a shop's flat shipping fee. Empty or 0 is free shipping. */
export function shippingFeeError(fee: number | undefined, currency: string | undefined): string | null {
  if (fee == null || fee === 0) return null;
  if (Number.isNaN(fee)) return "Enter an amount, like 20.000";
  if (fee < 0) return "The fee can't be negative";
  if ((currency || "IDR") === "IDR" && fee % 100 !== 0) return "Use whole rupiah";
  return null;
}

/** Payments (c): checkout items of one shop go in one cart, so they share a currency. Index of the first odd one out. */
export function mixedCurrencyIndex(items: { currency?: string; action: { kind: string } }[]): number {
  let first: string | undefined;
  for (let i = 0; i < items.length; i++) {
    if (items[i].action.kind !== "checkout") continue;
    const c = items[i].currency || "IDR";
    if (first === undefined) first = c;
    else if (c !== first) return i;
  }
  return -1;
}

/** Our private deliverable uploads (never served at /uploads). */
export function isPrivateUpload(url: string | undefined): boolean {
  return !!url && /\/uploads\/p_[0-9a-f]{32}\.[a-z0-9]{2,5}$/.test(url.split("?")[0]);
}

/** True for files stored by our own API (absolute under apiUrl, or a relative /uploads/ path). */
export function isOwnUpload(url: string | undefined, apiUrl: string): boolean {
  if (!url) return false;
  return url.startsWith("/uploads/") || url.startsWith(`${apiUrl.replace(/\/$/, "")}/uploads/`);
}
