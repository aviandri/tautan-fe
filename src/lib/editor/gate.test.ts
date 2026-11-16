import { describe, expect, it } from "vitest";
import { validateGate } from "./gate";

const f = { message: "", password: "", subscribe: "ask" as const, followPlatform: "instagram", followUrl: "" };

describe("validateGate", () => {
  it("none removes the gate", () => {
    expect(validateGate("none", f, false)).toEqual({ errors: {}, gate: null });
  });
  it("password: required when new, optional when one is set, min length", () => {
    expect(validateGate("password", f, false).errors["gate.password"]).toBeTruthy();
    const keep = validateGate("password", f, true);
    expect(keep.errors).toEqual({});
    expect(keep.gate).toEqual({ kind: "password" });
    expect(validateGate("password", { ...f, password: "abc" }, false).errors["gate.password"]).toBeTruthy();
    expect(validateGate("password", { ...f, password: "open sesame", message: " VIP " }, false).gate).toEqual({ kind: "password", password: "open sesame", message: "VIP" });
  });
  it("follow needs a web link; email carries subscribe", () => {
    expect(validateGate("follow", { ...f, followUrl: "javascript:x" }, false).errors["gate.follow.url"]).toBeTruthy();
    expect(validateGate("follow", { ...f, followUrl: "https://instagram.com/me" }, false).gate).toEqual({ kind: "follow", follow: { platform: "instagram", url: "https://instagram.com/me" } });
    expect(validateGate("email", { ...f, subscribe: "everyone" }, false).gate).toEqual({ kind: "email", subscribe: "everyone" });
  });
});
