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

/** Our private deliverable uploads (never served at /uploads). */
export function isPrivateUpload(url: string | undefined): boolean {
  return !!url && /\/uploads\/p_[0-9a-f]{32}\.[a-z0-9]{2,5}$/.test(url.split("?")[0]);
}
