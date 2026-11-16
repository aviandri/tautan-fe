import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sign, verify } from "../revalidate";
import { checkContact } from "../contact-validate";
import { firstImageId } from "../page-structure";
import { mediaFor, tabHref } from "@/components/public/env";
import type { Block, Tab } from "../types";

describe("revalidate webhook signature", () => {
  const body = '{"usernames":["alice"]}';
  const now = 1_800_000_000;
  const ts = String(now);
  it("accepts a fresh, correct signature", () => {
    expect(verify("s3cret", ts, body, sign("s3cret", ts, body), now)).toBe(true);
  });
  it("rejects a wrong secret, a changed body, a stale timestamp and garbage", () => {
    expect(verify("s3cret", ts, body, sign("other", ts, body), now)).toBe(false);
    expect(verify("s3cret", ts, '{"usernames":["mallory"]}', sign("s3cret", ts, body), now)).toBe(false);
    expect(verify("s3cret", ts, body, sign("s3cret", ts, body), now + 301)).toBe(false);
    expect(verify("s3cret", "nope", body, "sha256=00", now)).toBe(false);
  });
  it("uses the documented format", () => {
    expect(sign("k", "1", "b")).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});

describe("checkContact (zod-free contact form validation)", () => {
  it("trims and accepts a valid message", () => {
    expect(checkContact({ name: " Sari ", email: "s@example.com", message: " hi " })).toEqual({ ok: true, data: { name: "Sari", email: "s@example.com", message: "hi" } });
  });
  it("reports each bad field", () => {
    const r = checkContact({ name: "", email: "nope", message: "x".repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["email", "message", "name"]);
  });
});

describe("public page helpers", () => {
  const b = (id: string, type: string) => ({ id, type }) as unknown as Block;
  it("picks the first image or video poster within the first viewport as the LCP candidate", () => {
    expect(firstImageId([b("1", "heading"), b("2", "link"), b("3", "video"), b("4", "image")])).toBe("3");
    expect(firstImageId([1, 2, 3, 4, 5, 6].map((i) => b(String(i), "link")).concat(b("7", "image")))).toBeUndefined();
  });
  it("looks up media by pathname for absolute and relative upload URLs", () => {
    const env = { media: { "/uploads/a.jpg": { width: 800, height: 600, widths: [160, 320] } } };
    expect(mediaFor(env, "http://api.example/uploads/a.jpg")?.width).toBe(800);
    expect(mediaFor(env, "/uploads/a.jpg")?.height).toBe(600);
    expect(mediaFor(env, "/uploads/b.jpg")).toBeUndefined();
  });
  it("builds tab hrefs in the ?tab= form (the first tab has none)", () => {
    const tabs = [
      { id: "t1", slug: "home", position: 0 },
      { id: "t2", slug: "shop", position: 1 },
    ] as Tab[];
    const env = { username: "alice", preview: false, tabs };
    expect(tabHref(env, "t2")).toEqual({ href: "/alice?tab=shop", slug: "shop" });
    expect(tabHref(env, "t1")?.href).toBe("/alice");
  });
});
