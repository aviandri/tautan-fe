import { describe, expect, it } from "vitest";
import { relativeTime } from "./time";

describe("relativeTime", () => {
  const now = Date.parse("2026-11-16T12:00:00Z");
  it.each([
    ["2026-11-16T11:59:30Z", "just now"],
    ["2026-11-16T11:55:00Z", "5 minutes ago"],
    ["2026-11-16T09:00:00Z", "3 hours ago"],
    ["2026-11-15T12:00:00Z", "yesterday"],
  ])("%s → %s", (iso, want) => expect(relativeTime(iso, now)).toBe(want));
  it("falls back to a date after a week", () => expect(relativeTime("2026-10-01T12:00:00Z", now)).toMatch(/2026/));
});
