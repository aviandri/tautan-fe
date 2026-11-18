import { describe, expect, it } from "vitest";
import { addressLines, eventLabel, itemsSummary, needsShipping, ordersApi } from "./orders";

describe("orders helpers", () => {
  it("summarises items", () => {
    expect(itemsSummary([{ block_id: "b", kind: "product", name: "E-book", variant: "Format: EPUB", unit_amount: 1999, quantity: 1 }])).toBe("E-book (Format: EPUB)");
    expect(itemsSummary([{ block_id: "b", kind: "file", name: "Pack", unit_amount: 1, quantity: 2 }])).toBe("2 × Pack");
  });
  it("labels events", () => {
    expect(eventLabel({ type: "checkout.session.completed", status: "paid", received_at: "" })).toBe("Provider reported paid · checkout.session.completed");
    expect(eventLabel({ type: "x", status: "amount_mismatch", received_at: "" })).toMatch(/different amount/);
  });
  it("builds the CSV path without the all filter", () => {
    expect(ordersApi.csvPath({ status: "all" })).toBe("/orders.csv");
    expect(ordersApi.csvPath({ status: "paid", q: "a@b" })).toBe("/orders.csv?status=paid&q=a%40b");
  });
});

describe("shipping (payments c)", () => {
  it("maps the To ship tab to the fulfilment filter", () => {
    expect(ordersApi.csvPath({ status: "to_ship", q: "budi" })).toBe("/orders.csv?fulfilment=unfulfilled&q=budi");
    expect(ordersApi.csvPath({ status: "paid" })).toBe("/orders.csv?status=paid");
    expect(ordersApi.csvPath({ status: "all" })).toBe("/orders.csv");
  });

  it("formats the address as parcel lines", () => {
    const a = { name: "Budi", phone: "081234567890", address: "Jl. Melati 7", city: "Bandung", postal_code: "40115", country: "ID", notes: "" };
    expect(addressLines(a)).toEqual(["Budi", "081234567890", "Jl. Melati 7", "Bandung 40115", "Indonesia"]);
    expect(addressLines({ ...a, country: "FR", postal_code: "" }).slice(-2)).toEqual(["Bandung", "FR"]);
  });

  it("needs shipping only when paid and unfulfilled", () => {
    expect(needsShipping({ status: "paid", fulfilment: "unfulfilled" })).toBe(true);
    expect(needsShipping({ status: "pending", fulfilment: "unfulfilled" })).toBe(false);
    expect(needsShipping({ status: "paid", fulfilment: "shipped" })).toBe(false);
    expect(needsShipping({ status: "paid", fulfilment: null })).toBe(false);
  });
});
