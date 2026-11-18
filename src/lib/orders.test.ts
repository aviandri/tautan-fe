import { describe, expect, it } from "vitest";
import { eventLabel, itemsSummary, ordersApi } from "./orders";

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
