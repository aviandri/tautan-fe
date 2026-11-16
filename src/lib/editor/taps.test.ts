import { describe, expect, it } from "vitest";
import { sparkPath, trendFrom } from "./taps";

describe("taps", () => {
  it("this week vs last week", () => {
    const s = [...Array(16).fill(0), 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2].map((clicks) => ({ clicks }));
    expect(trendFrom(s)).toEqual({ week: 14, change: 100, points: s.slice(-14).map((x) => x.clicks) });
    expect(trendFrom([{ clicks: 3 }]).change).toBeNull();
  });
  it("sparkline path", () => {
    expect(sparkPath([0, 10], 100, 40)).toBe("M3.0 37.0 L97.0 3.0");
    expect(sparkPath([5], 100, 40)).toBe("");
  });
});
