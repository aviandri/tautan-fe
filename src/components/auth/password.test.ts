import { describe, expect, it } from "vitest";
import { passwordScore } from "./PasswordField";

describe("passwordScore", () => {
  it.each([
    ["", 0], ["abc", 0], ["abcdefg", 0], ["abcdefgh", 1], ["abcdefg1", 2], ["pastelstickers", 2], ["pastelstickers1", 3], ["Pastel-stickers1", 4],
  ] as const)("%s → %d", (pw, n) => expect(passwordScore(pw)).toBe(n));
});
