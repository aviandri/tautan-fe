import { describe, expect, it } from "vitest";
import { markVoted, votedToday, visitorId, VID_KEY, type KV } from "./visitor-id";

const mem = (): KV & { m: Map<string, string> } => {
  const m = new Map<string, string>();
  return { m, getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
};

describe("visitor id", () => {
  it("creates a base64url id the BE accepts and keeps it", () => {
    const s = mem();
    const id = visitorId(s);
    expect(id).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(visitorId(s)).toBe(id);
    expect(s.m.get(VID_KEY)).toBe(id);
  });
  it("different browsers get different ids", () => {
    expect(visitorId(mem())).not.toBe(visitorId(mem()));
  });
  it("replaces a tampered id and survives blocked storage", () => {
    const s = mem();
    s.m.set(VID_KEY, "bad id!");
    expect(visitorId(s)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const blocked: KV = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => {} };
    const a = visitorId(blocked);
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(visitorId(null)).toBe(a); // one in-memory id per page load
  });
  it("remembers a vote for the UTC day only", () => {
    const s = mem();
    const day1 = new Date("2026-11-18T10:00:00Z");
    markVoted(s, "b1", day1);
    expect(votedToday(s, "b1", new Date("2026-11-18T23:59:00Z"))).toBe(true);
    expect(votedToday(s, "b2", day1)).toBe(false);
    expect(votedToday(s, "b1", new Date("2026-11-19T00:01:00Z"))).toBe(false);
    expect(s.m.has("tautan:poll:b1")).toBe(false); // stale record cleared
  });
});
