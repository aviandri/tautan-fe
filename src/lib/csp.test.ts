import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, summarizeReport } from "./csp";

describe("contentSecurityPolicy", () => {
  const p = contentSecurityPolicy("https://api.tautan.id/some/path");
  const dir = (name: string) => p.split("; ").find((d) => d.startsWith(name + " ")) ?? "";
  it("allows the API origin, analytics and embeds, and nothing loose", () => {
    expect(dir("connect-src")).toContain("https://api.tautan.id");
    expect(dir("connect-src")).not.toContain("/some/path");
    expect(dir("script-src")).toContain("https://www.googletagmanager.com");
    expect(dir("script-src")).toContain("https://connect.facebook.net");
    expect(dir("script-src")).not.toContain("unsafe-eval");
    expect(dir("frame-src")).toContain("https://www.youtube-nocookie.com");
    expect(dir("form-action")).toContain("https://checkout.stripe.com");
    expect(dir("object-src")).toBe("object-src 'none'");
    expect(dir("base-uri")).toBe("base-uri 'none'");
  });
  it("adds unsafe-eval and websockets only in dev", () => {
    const d = contentSecurityPolicy("http://localhost:8080", true);
    expect(d).toContain("'unsafe-eval'");
    expect(d).toContain("ws:");
  });
});

describe("summarizeReport", () => {
  it("reads both report shapes and strips queries", () => {
    expect(summarizeReport({ "csp-report": { "violated-directive": "script-src", "blocked-uri": "https://evil.example/x.js?a=1", "document-uri": "https://tautan.id/a/orders/1?t=secret" } })).toBe(
      "csp-report-only script-src blocked=https://evil.example/x.js page=https://tautan.id/a/orders/1",
    );
    const line = summarizeReport([{ type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "data", documentURL: "https://tautan.id/a#x" } }]);
    expect(line).toBe("csp-report-only img-src blocked=data page=https://tautan.id/a");
    expect(summarizeReport({ nope: 1 })).toBeNull();
    expect(summarizeReport([{ type: "deprecation", body: {} }])).toBeNull();
  });
});
