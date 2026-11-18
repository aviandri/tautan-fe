import { describe, expect, it } from "vitest";
import { cartHref, cartLinesIn, checkoutErrorMessage, eligibleProviders, findPurchasable, lookupErrorMessage, parseCartQuery, providersFor, resolveCart, shippingFieldErrors, shouldAutoRefresh } from "./buy";
import type { Block } from "./types";

const base = { profile_id: "p", tab_id: "t", parent_id: null, position: 0, is_visible: true, created_at: "", updated_at: "" };
const file = { ...base, id: "f1", type: "file", data: { title: "Presets", url: "", file_name: "p.zip", price: 8500000, currency: "IDR" } } as unknown as Block;
const freeFile = { ...base, id: "f2", type: "file", data: { title: "Free", url: "https://x/a.pdf" } } as unknown as Block;
const product = {
  ...base,
  id: "p1",
  type: "product",
  data: { name: "E-book", images: ["/uploads/a.jpg"], price: 1999, currency: "USD", variants: [{ name: "Format", options: ["PDF", "EPUB"] }], action: { kind: "checkout" } },
} as unknown as Block;
const shop = {
  ...base,
  id: "s1",
  type: "shop",
  data: { items: [{ id: "i1", name: "Pack", images: [], price: 500000, action: { kind: "checkout" } }, { id: "i2", name: "Mug", images: [], price: 1, action: { kind: "url", url: "https://x" } }] },
} as unknown as Block;
const locked = { ...base, id: "l1", type: "file", data: null, locked: true } as unknown as Block;
const blocks = [file, freeFile, product, shop, locked];

describe("findPurchasable", () => {
  it("finds priced files, checkout products and shop items", () => {
    expect(findPurchasable(blocks, "f1")).toMatchObject({ kind: "file", name: "Presets", price: 8500000, currency: "IDR", fileName: "p.zip" });
    expect(findPurchasable(blocks, "p1")).toMatchObject({ kind: "product", currency: "USD", image: "/uploads/a.jpg", variants: [{ name: "Format" }] });
    expect(findPurchasable(blocks, "s1", "i1")).toMatchObject({ itemId: "i1", name: "Pack", currency: "IDR" });
  });
  it("refuses anything else", () => {
    expect(findPurchasable(blocks, "f2")).toBeNull(); // free
    expect(findPurchasable(blocks, "s1", "i2")).toBeNull(); // not checkout
    expect(findPurchasable(blocks, "s1", "../x")).toBeNull(); // junk item id
    expect(findPurchasable(blocks, "l1")).toBeNull(); // locked
    expect(findPurchasable(blocks, "nope")).toBeNull();
    expect(findPurchasable(blocks, undefined)).toBeNull();
  });
});

describe("eligibleProviders", () => {
  const pay = { providers: [{ provider: "midtrans" as const, currencies: ["IDR"] }, { provider: "stripe" as const, currencies: ["IDR", "USD"] }], currencies: ["IDR", "USD"] };
  it("filters by currency", () => {
    expect(eligibleProviders(pay, "IDR")).toEqual(["midtrans", "stripe"]);
    expect(eligibleProviders(pay, "USD")).toEqual(["stripe"]);
    expect(eligibleProviders(null, "IDR")).toEqual([]);
  });
});

describe("messages", () => {
  it("maps known codes and never echoes unknown ones", () => {
    expect(checkoutErrorMessage("invalid_email")).toMatch(/email/);
    expect(checkoutErrorMessage("<script>alert(1)</script>")).toBe("Something went wrong. Try again.");
    expect(checkoutErrorMessage(undefined)).toBeNull();
    expect(lookupErrorMessage("not_found")).toMatch(/No order/);
    expect(lookupErrorMessage("<b>")).toBe("Something went wrong. Try again.");
  });
});

describe("shouldAutoRefresh", () => {
  const o = { status: "pending", expires_at: "2026-11-18T10:00:00Z" } as Parameters<typeof shouldAutoRefresh>[0];
  it("refreshes while pending, until a while after expiry", () => {
    expect(shouldAutoRefresh(o, Date.parse("2026-11-18T09:00:00Z"))).toBe(true);
    expect(shouldAutoRefresh(o, Date.parse("2026-11-18T10:10:00Z"))).toBe(true);
    expect(shouldAutoRefresh(o, Date.parse("2026-11-18T10:20:00Z"))).toBe(false);
    expect(shouldAutoRefresh({ ...o, status: "paid" }, Date.parse("2026-11-18T09:00:00Z"))).toBe(false);
  });
});

describe("shop cart (payments c)", () => {
  const shop = {
    id: "s1",
    type: "shop",
    data: {
      shipping_fee: 2000000,
      items: [
        { id: "tee", name: "Tee", price: 15000000, images: [], variants: [{ name: "Size", options: ["S", "M"] }], action: { kind: "checkout", delivery: "ship" } },
        { id: "zine", name: "Zine", price: 5000000, images: [], action: { kind: "checkout" } },
        { id: "gone", name: "Gone", price: 100000, images: [], badge: "sold_out", action: { kind: "checkout", delivery: "ship" } },
        { id: "wa", name: "WA", price: 100000, images: [], action: { kind: "whatsapp" } },
        { id: "usd", name: "USD", price: 500, currency: "USD", images: [], action: { kind: "checkout" } },
      ],
    },
  } as unknown as Block;

  it("parses line.N.* params, bounded, and falls back to ?item=", () => {
    const q = { "line.0.item": "tee", "line.0.qty": "3", "line.0.option.Size": "M", "line.2.item": "zine", "line.3.item": "<x>", "line.4.qty": "9", "line.5.item": "tee", "line.5.qty": "lots" };
    expect(parseCartQuery(q)).toEqual([
      { item: "tee", qty: 3, options: { Size: "M" } },
      { item: "zine", qty: 1, options: {} },
      { item: "tee", qty: 1, options: {} },
    ]);
    expect(parseCartQuery({ item: "zine" })).toEqual([{ item: "zine", qty: 1, options: {} }]);
    expect(parseCartQuery({ "line.0.item": "tee", "line.0.option.Size": "x".repeat(31) })[0].options).toEqual({});
  });

  it("builds the cart link in the same shape", () => {
    const href = cartHref("kopi", "s1", [{ item: "tee", qty: 2, options: { Size: "M" } }, { item: "zine", qty: 1, options: {} }]);
    expect(href).toBe("/kopi/checkout?block=s1&line.0.item=tee&line.0.qty=2&line.0.option.Size=M&line.1.item=zine");
    const back = Object.fromEntries(new URL(href, "https://x").searchParams);
    expect(parseCartQuery(back)).toHaveLength(2);
  });

  it("prices from the card, merges lines, caps quantities and adds shipping once", () => {
    const c = resolveCart([shop], "s1", [
      { item: "tee", qty: 15, options: { Size: "M" } },
      { item: "tee", qty: 9, options: { Size: "M" } },
      { item: "zine", qty: 4, options: {} },
      { item: "zine", qty: 1, options: {} },
      { item: "gone", qty: 1, options: {} },
      { item: "wa", qty: 1, options: {} },
      { item: "usd", qty: 1, options: {} },
    ])!;
    expect(c.lines.map((l) => [l.item.id, l.qty])).toEqual([
      ["tee", 20],
      ["zine", 1],
    ]);
    expect(c.dropped).toBe(3);
    expect(c.subtotal).toBe(20 * 15000000 + 5000000);
    expect(c.total).toBe(c.subtotal + 2000000);
    expect(c.ready).toBe(true);
    expect(cartLinesIn(c)).toEqual([
      { item: "tee", qty: 20, options: { Size: "M" } },
      { item: "zine", qty: 1, options: {} },
    ]);
  });

  it("flags a missing or unknown option and skips shipping for digital-only carts", () => {
    const c = resolveCart([shop], "s1", [{ item: "tee", qty: 1, options: { Size: "XL" } }])!;
    expect(c.ready).toBe(false);
    expect(c.lines[0].problem).toBe("Choose a size");
    const d = resolveCart([shop], "s1", [{ item: "zine", qty: 1, options: {} }])!;
    expect(d.ships).toBe(false);
    expect(d.total).toBe(5000000);
    expect(resolveCart([shop], "nope", [])).toBeNull();
  });

  it("drops providers that can't take the total", () => {
    const payments = { currencies: ["IDR"], providers: [{ provider: "midtrans" as const, currencies: ["IDR"] }, { provider: "stripe" as const, currencies: ["IDR", "USD"] }] };
    expect(providersFor(payments, "IDR", 500000)).toEqual(["midtrans"]); // Rp 5.000: under Stripe's floor
    expect(providersFor(payments, "IDR", 5000000)).toEqual(["midtrans", "stripe"]);
    expect(providersFor(payments, "IDR", 50000)).toEqual([]); // Rp 500
    expect(providersFor(payments, "USD", 50)).toEqual(["stripe"]);
  });

  it("only takes our own shipping field names from ?field=", () => {
    expect([...shippingFieldErrors({ field: ["shipping.phone", "items[0].quantity", "shipping.evil<"] })]).toEqual(["phone"]);
  });
});
