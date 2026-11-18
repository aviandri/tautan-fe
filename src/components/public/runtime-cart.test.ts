import { describe, expect, it } from "vitest";
import { addLine, CART_TTL_MS, checkoutUrl, readCart, writeCart, type StoredLine } from "./runtime-cart";

function memKV() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("runtime-cart storage", () => {
  const tee: StoredLine = { i: "tee", q: 1, o: { Size: "M" }, p: 15000000, s: 1 };
  const zine: StoredLine = { i: "zine", q: 1, o: {}, p: 5000000 };

  it("merges: shipped items count up to 20, files stay at 1, different options are new lines", () => {
    let lines: StoredLine[] = [];
    for (let i = 0; i < 25; i++) lines = addLine(lines, tee);
    lines = addLine(addLine(lines, zine), zine);
    lines = addLine(lines, { ...tee, o: { Size: "S" } });
    expect(lines.map((l) => [l.i, l.q, l.o.Size])).toEqual([
      ["tee", 20, "M"],
      ["zine", 1, undefined],
      ["tee", 1, "S"],
    ]);
  });

  it("round-trips, expires after 7 days, and survives junk", () => {
    const kv = memKV();
    writeCart(kv, "k", [tee, zine], 1000);
    expect(readCart(kv, "k", 2000)).toEqual([tee, zine]);
    expect(readCart(kv, "k", 1000 + CART_TTL_MS + 1)).toEqual([]);
    expect(kv.m.has("k")).toBe(false);
    kv.setItem("k", "{nope");
    expect(readCart(kv, "k")).toEqual([]);
    kv.setItem("k", JSON.stringify({ v: 1, at: Date.now(), lines: [{ i: "<script>" }, zine] }));
    expect(readCart(kv, "k")).toEqual([zine]);
    writeCart(kv, "k", []);
    expect(kv.m.has("k")).toBe(false);
    expect(readCart(null, "k")).toEqual([]);
  });

  it("links to the checkout in the page's cart shape", () => {
    expect(checkoutUrl("kopi", "s1", [{ ...tee, q: 2 }, zine])).toBe("/kopi/checkout?block=s1&line.0.item=tee&line.0.qty=2&line.0.option.Size=M&line.1.item=zine");
  });
});
