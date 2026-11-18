import { describe, expect, it } from "vitest";
import { checkEmailChange, linkErrorMessage, requestErrorMessage } from "./email-change";

describe("checkEmailChange", () => {
  const base = { email: "new@example.com", password: "pw", current: "old@example.com", needsPassword: true };
  it("accepts a new valid address", () => expect(checkEmailChange(base)).toEqual({}));
  it("rejects invalid and unchanged addresses", () => {
    expect(checkEmailChange({ ...base, email: "nope" }).email).toBeTruthy();
    expect(checkEmailChange({ ...base, email: " OLD@example.com " }).email).toMatch(/already/);
  });
  it("needs the password only when the account has one", () => {
    expect(checkEmailChange({ ...base, password: "" }).password).toBeTruthy();
    expect(checkEmailChange({ ...base, password: "", needsPassword: false })).toEqual({});
  });
});

describe("error copy", () => {
  it("maps request errors to fields", () => {
    expect(requestErrorMessage("email_taken").field).toBe("email");
    expect(requestErrorMessage("invalid_password").field).toBe("password");
    expect(requestErrorMessage("rate_limited").field).toBe("form");
    expect(requestErrorMessage(undefined).field).toBe("form");
  });
  it("explains dead links per kind", () => {
    expect(linkErrorMessage("confirm", "invalid_token").body).toMatch(/24 hours/);
    expect(linkErrorMessage("revert", "invalid_token").body).toMatch(/7 days/);
    expect(linkErrorMessage("confirm", "email_taken").title).toMatch(/taken/);
  });
});
