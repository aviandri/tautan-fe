import { describe, expect, it } from "vitest";
import { fillTemplate, waLink } from "./wa";
import { composeOrder } from "./order";

describe("waLink", () => {
  it("strips the plus and encodes the text", () => {
    expect(waLink("+6281234567890", "Hi & bye")).toBe("https://wa.me/6281234567890?text=Hi%20%26%20bye");
    expect(waLink("+6281234567890")).toBe("https://wa.me/6281234567890");
    expect(waLink("12")).toBeUndefined();
  });
});

describe("fillTemplate", () => {
  it("fills placeholders and drops bare labels left by empty ones", () => {
    const t = "Hi! I'd like to order:\n{items}\n\nName: {name}\nAddress: {address}";
    expect(fillTemplate(t, { items: "2× Brownies", name: "Sari" })).toBe("Hi! I'd like to order:\n2× Brownies\n\nName: Sari");
  });
  it("keeps literal text and unknown placeholders become empty", () => {
    expect(fillTemplate("Order {name}{variant}.", { name: "Mug", variant: " (Blue)" })).toBe("Order Mug (Blue).");
    expect(fillTemplate("Order {name}{variant}.", { name: "Mug" })).toBe("Order Mug.");
  });
});

describe("composeOrder", () => {
  it("lists chosen lines and totals only when every chosen line is priced", () => {
    const r = composeOrder([
      { name: "Brownies", qty: 2, price: 8500000 },
      { name: "Cookies", qty: 0, price: 5000000 },
    ]);
    expect(r.items).toBe("2× Brownies (Rp 170.000)");
    expect(r.total).toBe("Rp 170.000");
    expect(composeOrder([{ name: "Cake", qty: 1 }, { name: "Brownies", qty: 1, price: 100 }]).total).toBeUndefined();
  });
});
