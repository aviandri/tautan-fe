import { describe, expect, it } from "vitest";
import { checkoutErrorMessage, eligibleProviders, findPurchasable, lookupErrorMessage, shouldAutoRefresh } from "./buy";
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
