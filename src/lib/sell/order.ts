import { formatMoney, type Currency } from "./money";

export interface OrderLine {
  name: string;
  qty: number;
  /** minor units */
  price?: number;
}

/** "2× Brownies (Rp 170.000)" one per line, and the total only when every chosen line has a price. */
export function composeOrder(lines: OrderLine[], currency?: Currency): { items: string; total?: string } {
  const chosen = lines.filter((l) => l.qty > 0);
  const items = chosen.map((l) => `${l.qty}× ${l.name}${l.price != null ? ` (${formatMoney(l.price * l.qty, currency)})` : ""}`).join("\n");
  const priced = chosen.length > 0 && chosen.every((l) => l.price != null);
  const total = priced ? formatMoney(chosen.reduce((s, l) => s + (l.price ?? 0) * l.qty, 0), currency) : undefined;
  return { items, total };
}
