import { describe, expect, it } from "vitest";
import { isUnverified, resendResult } from "./verify-email";

describe("verify email helpers", () => {
  it("treats a missing flag as unknown, not unverified", () => {
    expect(isUnverified({ email_verified: false })).toBe(true);
    expect(isUnverified({ email_verified: true })).toBe(false);
    expect(isUnverified({})).toBe(false);
    expect(isUnverified(null)).toBe(false);
  });
  it("maps resend outcomes", () => {
    expect(resendResult({ ok: true }).text).toMatch(/Sent/);
    expect(resendResult({ ok: true, already: true }).text).toMatch(/already confirmed/);
    expect(resendResult({ ok: false, code: "rate_limited" })).toMatchObject({ tone: "error", text: expect.stringMatching(/hour/) });
    expect(resendResult({ ok: false }).tone).toBe("error");
  });
});
