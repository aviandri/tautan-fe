import { describe, expect, it } from "vitest";
import { googleErrorMessage, landingAfterGoogle, loginErrorMessage, parseCallbackParams, PASSWORD_REMOVED_LANDING, rememberNext, takeNext } from "./google-auth";

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe("parseCallbackParams", () => {
  it("reads code and state", () => {
    expect(parseCallbackParams(new URLSearchParams("code=abc&state=xyz&scope=openid"))).toEqual({ kind: "ok", code: "abc", state: "xyz" });
  });
  it("prefers an error from Google or the API", () => {
    expect(parseCallbackParams(new URLSearchParams("error=access_denied&state=xyz"))).toEqual({ kind: "error", code: "access_denied" });
    expect(parseCallbackParams(new URLSearchParams("error=provider_error"))).toEqual({ kind: "error", code: "provider_error" });
  });
  it("flags a half-empty redirect", () => {
    expect(parseCallbackParams(new URLSearchParams("code=abc"))).toEqual({ kind: "error", code: "missing_params" });
    expect(parseCallbackParams(new URLSearchParams(""))).toEqual({ kind: "error", code: "missing_params" });
  });
});

describe("googleErrorMessage", () => {
  it("has specific copy for known codes and a fallback", () => {
    expect(googleErrorMessage("access_denied").title).toMatch(/cancelled/);
    expect(googleErrorMessage("email_not_verified").title).toMatch(/verified/);
    expect(googleErrorMessage("invalid_state").title).toBe(googleErrorMessage("invalid_code").title);
    expect(googleErrorMessage("provider_error").title).toMatch(/respond/);
    expect(googleErrorMessage("weird").title).toMatch(/Couldn't sign you in/);
  });
});

describe("next round trip", () => {
  it("remembers once and only same-origin paths", () => {
    const s = memStore();
    rememberNext("/dashboard/analytics", s);
    expect(takeNext(s)).toBe("/dashboard/analytics");
    expect(takeNext(s)).toBeNull();
    rememberNext("//evil.example", s);
    expect(takeNext(s)).toBe("/dashboard");
    rememberNext(null, s);
    expect(takeNext(s)).toBeNull();
  });
  it("survives blocked storage", () => {
    const broken = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => {} };
    expect(() => rememberNext("/x", broken)).not.toThrow();
    expect(takeNext(broken)).toBeNull();
  });
});

describe("landingAfterGoogle", () => {
  const done = { onboarding: { completed: true } };
  it("sends new or unfinished accounts to onboarding", () => {
    expect(landingAfterGoogle({ is_new_user: true, profile: done }, "/dashboard/x")).toBe("/onboarding");
    expect(landingAfterGoogle({ profile: { onboarding: { completed: false } } }, null)).toBe("/onboarding");
  });
  it("explains a removed password in Settings, unless onboarding comes first", () => {
    expect(landingAfterGoogle({ password_removed: true, profile: done }, "/dashboard/x")).toBe(PASSWORD_REMOVED_LANDING);
    expect(landingAfterGoogle({ password_removed: true, profile: { onboarding: { completed: false } } }, null)).toBe("/onboarding");
  });
  it("otherwise honours next", () => {
    expect(landingAfterGoogle({ is_new_user: false, profile: done }, "/dashboard/analytics")).toBe("/dashboard/analytics");
    expect(landingAfterGoogle({ profile: done }, null)).toBe("/dashboard");
  });
});

describe("loginErrorMessage", () => {
  it("points Google-only accounts at the Google button", () => {
    expect(loginErrorMessage(401, "password_not_set", "x")).toMatch(/signs in with Google/);
    expect(loginErrorMessage(401, "invalid_credentials", "x")).toMatch(/don't match/);
    expect(loginErrorMessage(429, "rate_limited", "Slow down")).toBe("Slow down");
  });
});
