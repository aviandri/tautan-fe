import { describe, expect, it } from "vitest";
import { checkNewPassword, resetErrorMessage, SENT_COPY } from "./password-reset";

describe("password reset helpers", () => {
  it("maps API errors", () => {
    expect(resetErrorMessage("invalid_token", "x")).toMatch(/expired or was already used/);
    expect(resetErrorMessage("invalid_password", "x")).toMatch(/8 to 72/);
    expect(resetErrorMessage("rate_limited", "x")).toMatch(/Too many/);
    expect(resetErrorMessage("internal", "Server error")).toBe("Server error");
  });
  it("checks the new password like the API does", () => {
    expect(checkNewPassword("short", "short").password).toBeDefined();
    expect(checkNewPassword("x".repeat(73), "x".repeat(73)).password).toBeDefined();
    expect(checkNewPassword("long-enough", "long-enoug").confirm).toBeDefined();
    expect(checkNewPassword("long-enough", "long-enough")).toEqual({});
  });
  it("never says whether the account exists", () => {
    expect(SENT_COPY("a@b.c")).toMatch(/^If a@b\.c has a Tautan account/);
  });
});
