import { describe, expect, it } from "vitest";
import { drawToast } from "./giveaway-draw";

const w = { email: "a@example.com", name: "Ani", display: "Ani", drawn_at: "x" };

describe("drawToast", () => {
  it("covers each outcome", () => {
    expect(drawToast({ entries: 1, winner: w, notified: true }, true)).toMatch(/emailed them/);
    expect(drawToast({ entries: 1, winner: w, notified: false }, true)).toMatch(/couldn't email/);
    expect(drawToast({ entries: 1, winner: w, notified: false }, false)).toMatch(/didn't email/);
    expect(drawToast({ entries: 1, winner: w }, true)).toBe("Winner: Ani");
  });
});
