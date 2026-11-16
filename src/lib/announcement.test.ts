import { describe, expect, it } from "vitest";
import { announcementErrors, colorError, ctaTargets, EMPTY_DRAFT, fromDraft, toDraft } from "./announcement";
import type { Announcement, Block } from "./types";

const block = (id: string, type: string, extra: Partial<Block> = {}) =>
  ({ id, type, data: { title: id }, tab_id: "t", parent_id: null, position: 0, is_visible: true, profile_id: "p", created_at: "", updated_at: "", ...extra }) as Block;

describe("announcement draft", () => {
  it("round-trips a full announcement, dropping the server id", () => {
    const a: Announcement = {
      id: "abc",
      layout: "popup",
      title: "Sale",
      description: "50% off",
      image_url: "/uploads/x.png",
      cta: { label: "Join", form_block_id: "11111111-1111-1111-1111-111111111111" },
      bg_color: "#111",
      text_color: "white",
      schedule: { start_at: "2026-01-01T00:00:00Z" },
    };
    const { id, ...rest } = a;
    expect(id).toBe("abc");
    expect(fromDraft(toDraft(a))).toEqual(rest);
  });

  it("trims and omits empty optionals; link CTA has no form id", () => {
    const out = fromDraft({ ...EMPTY_DRAFT, title: "  Hi ", description: " ", cta_kind: "link", cta_label: " Go ", cta_url: "https://x.io", form_block_id: "stale" });
    expect(out).toEqual({ layout: "banner", title: "Hi", cta: { label: "Go", url: "https://x.io" } });
  });

  it("no CTA when kind is none, even with leftover fields", () => {
    expect(fromDraft({ ...EMPTY_DRAFT, title: "x", cta_label: "a", cta_url: "b" }).cta).toBeUndefined();
  });

  it("defaults missing layout to banner", () => {
    expect(toDraft({ title: "x" }).layout).toBe("banner");
    expect(toDraft(null)).toEqual(EMPTY_DRAFT);
  });
});

describe("announcementErrors", () => {
  it("requires a title and caps lengths", () => {
    expect(announcementErrors(EMPTY_DRAFT).title).toBeDefined();
    expect(announcementErrors({ ...EMPTY_DRAFT, title: "x".repeat(101) }).title).toBeDefined();
    expect(announcementErrors({ ...EMPTY_DRAFT, title: "x", description: "y".repeat(205) }).description).toBeDefined();
    expect(announcementErrors({ ...EMPTY_DRAFT, title: "x" })).toEqual({});
  });

  it("checks CTA label, link and form target", () => {
    const base = { ...EMPTY_DRAFT, title: "x" };
    expect(announcementErrors({ ...base, cta_kind: "link" })).toMatchObject({ cta_label: expect.any(String), cta_url: expect.any(String) });
    expect(announcementErrors({ ...base, cta_kind: "link", cta_label: "a".repeat(41), cta_url: "javascript:alert(1)" })).toMatchObject({
      cta_label: expect.any(String),
      cta_url: expect.any(String),
    });
    expect(announcementErrors({ ...base, cta_kind: "form", cta_label: "Go" }).form_block_id).toBe("Pick a form");
    const targets = [block("f1", "form")];
    expect(announcementErrors({ ...base, cta_kind: "form", cta_label: "Go", form_block_id: "gone" }, targets).form_block_id).toMatch(/deleted/);
    expect(announcementErrors({ ...base, cta_kind: "form", cta_label: "Go", form_block_id: "f1" }, targets)).toEqual({});
  });

  it("checks colours and schedule order", () => {
    const base = { ...EMPTY_DRAFT, title: "x" };
    expect(announcementErrors({ ...base, bg_color: "#12", text_color: "url(x)" })).toMatchObject({ bg_color: expect.any(String), text_color: expect.any(String) });
    expect(
      announcementErrors({ ...base, schedule: { start_at: "2026-02-01T00:00:00Z", end_at: "2026-01-01T00:00:00Z" } }).schedule,
    ).toBeDefined();
  });
});

describe("helpers", () => {
  it("colorError mirrors the BE colour rules", () => {
    for (const ok of ["", "#fff", "#ffff", "#a1b2c3", "#a1b2c3d4", "rgb(0, 0, 0)", "hsla(10, 50%, 50%, .5)", "tomato"]) expect(colorError(ok)).toBeUndefined();
    for (const bad of ["#ff", "12ab", "Red", "var(--x)", "rgb(0;0;0)"]) expect(colorError(bad)).toBeDefined();
  });

  it("ctaTargets keeps live form-like blocks only", () => {
    const bs = [block("a", "form"), block("b", "contact_form"), block("c", "email_signup"), block("d", "link"), block("e", "form", { deleted_at: "x" })];
    expect(ctaTargets(bs).map((b) => b.id)).toEqual(["a", "b", "c"]);
  });
});
