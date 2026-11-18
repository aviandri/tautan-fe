/**
 * Payments (b): the creator's orders (SPEC.md → "Payments (b)" → Dashboard).
 * Kept out of api.ts/types.ts so the dashboard page pulls only what it uses.
 */
import { request } from "./api";
import type { Currency } from "./sell/money";

export type OrderStatus = "pending" | "paid" | "expired" | "failed" | "refunded";
/** "to_ship" (payments c): paid orders with items still to ship */
export type OrderFilter = "all" | OrderStatus | "to_ship";

export interface OrderItem {
  block_id: string;
  item_id?: string;
  kind: "file" | "product";
  name: string;
  variant?: string;
  unit_amount: number;
  quantity: number;
  file_name?: string;
  /** payments (c): a physical shop item */
  delivery?: "ship";
}

/** payments (c): the buyer's address; owner-only. */
export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  buyer_email: string;
  buyer_name: string;
  items: OrderItem[];
  amount: number;
  currency: Currency;
  provider: "xendit" | "midtrans" | "stripe" | "fake";
  mode: "sandbox" | "live";
  provider_ref: string | null;
  downloads: number;
  created_at: string;
  expires_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  /** payments (c) */
  shipping_fee: number;
  shipping: ShippingAddress | null;
  fulfilment: "unfulfilled" | "shipped" | null;
  tracking: string;
  shipped_at: string | null;
}

export interface OrdersPage {
  items: Order[];
  next_cursor: string | null;
  counts: Record<OrderFilter, number>;
  /** paid totals per currency, minor units */
  revenue: Partial<Record<Currency, number>>;
}

export interface OrderEvent {
  type: string;
  status: string;
  received_at: string;
}

export interface OrderDetail {
  order: Order;
  events: OrderEvent[];
  /** the buyer's order page (capability link) to resend by hand */
  order_page_url: string;
}

function qs(p: Record<string, string | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** The list/CSV query for a filter tab: "to_ship" is the fulfilment filter, the rest are statuses. */
function filterParams(f: OrderFilter | undefined): Record<string, string | undefined> {
  if (f === "to_ship") return { fulfilment: "unfulfilled" };
  return { status: f === "all" ? undefined : f };
}

export const ordersApi = {
  list: (p: { status?: OrderFilter; q?: string; cursor?: string | null }) =>
    request<OrdersPage>(`/orders${qs({ ...filterParams(p.status), q: p.q, cursor: p.cursor ?? undefined })}`),
  get: (id: string) => request<OrderDetail>(`/orders/${encodeURIComponent(id)}`),
  refresh: (id: string) => request<OrderDetail>(`/orders/${encodeURIComponent(id)}/refresh`, { method: "POST" }),
  csvPath: (p: { status?: OrderFilter; q?: string }) => `/orders.csv${qs({ ...filterParams(p.status), q: p.q })}`,
  ship: (id: string, tracking: string) => request<OrderDetail>(`/orders/${encodeURIComponent(id)}/ship`, { method: "POST", body: { tracking } }),
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  expired: "Expired",
  failed: "Failed",
  refunded: "Refunded",
};

export const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "to_ship", label: "To ship" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export const PROVIDER_NAME = { xendit: "Xendit", midtrans: "Midtrans", stripe: "Stripe", fake: "Fake (dev)" } as const;

/** "Rp 85.000 (Format: EPUB)" style summary of an order's items. */
export function itemsSummary(items: OrderItem[]): string {
  return items.map((it) => `${it.quantity > 1 ? `${it.quantity} × ` : ""}${it.name}${it.variant ? ` (${it.variant})` : ""}`).join(", ");
}

/** Human line for a webhook / status event in the order timeline. */
export function eventLabel(e: OrderEvent): string {
  if (e.status === "amount_mismatch") return "Payment reported with a different amount (ignored)";
  if (e.status === "ignored") return "Notification for an unknown order (ignored)";
  const s = e.status as OrderStatus;
  const what = s in STATUS_LABEL ? STATUS_LABEL[s].toLowerCase() : "update";
  return `Provider reported ${what}${e.type ? ` · ${e.type}` : ""}`;
}

const COUNTRY: Record<string, string> = { ID: "Indonesia", MY: "Malaysia", SG: "Singapore", BN: "Brunei", PH: "Philippines", TH: "Thailand", VN: "Vietnam", TL: "Timor-Leste", AU: "Australia", JP: "Japan", KR: "South Korea", HK: "Hong Kong", TW: "Taiwan", NL: "Netherlands", GB: "United Kingdom", US: "United States" };

/** The address as label lines, ready to copy onto a parcel. */
export function addressLines(a: ShippingAddress): string[] {
  return [a.name, a.phone, a.address, [a.city, a.postal_code].filter(Boolean).join(" "), COUNTRY[a.country] ?? a.country].filter(Boolean);
}

/** Paid and waiting to be shipped. */
export function needsShipping(o: Pick<Order, "status" | "fulfilment">): boolean {
  return o.status === "paid" && o.fulfilment === "unfulfilled";
}
