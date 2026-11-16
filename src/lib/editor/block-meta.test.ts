import { describe, expect, it } from "vitest";
import { normalizeUrl, urlError } from "../url";
import { BLOCK_META } from "./block-meta";
import { BLOCK_TYPES, BlockDataSchemas } from "../types";

describe("urlError (mirrors tautan-be checkURL)", () => {
  it.each([
    ["https://example.com", null],
    ["http://x.io/path?q=1", null],
    ["mailto:a@b.co", null],
    ["tel:+62812", null],
    ["/uploads/abc.png", null],
  ])("accepts %s", (u, want) => expect(urlError(u, true)).toBe(want));

  it.each(["javascript:alert(1)", "ftp://x.io", "example.com", "https://", "data:image/png;base64,xx"])(
    "rejects %s",
    (u) => expect(urlError(u, true)).not.toBeNull(),
  );

  it("treats empty as required/optional", () => {
    expect(urlError("", true)).toBe("Required");
    expect(urlError("  ", false)).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["www.example.com/a", "https://www.example.com/a"],
    ["me@example.com", "mailto:me@example.com"],
    ["+62 812-3456-789", "tel:+628123456789"],
    ["https://x.io", "https://x.io"],
    ["/uploads/a.png", "/uploads/a.png"],
    ["hello world", "hello world"],
  ])("%s → %s", (a, b) => expect(normalizeUrl(a)).toBe(b));
});

describe("block meta", () => {
  it("covers every block type and default data matches the shared zod schema", () => {
    for (const t of BLOCK_TYPES) {
      const meta = BLOCK_META[t];
      expect(meta.type).toBe(t);
      expect(BlockDataSchemas[t].safeParse(meta.defaultData()).success).toBe(true);
    }
  });

  it("types whose defaults the server rejects are flagged needsInputFirst", () => {
    for (const t of BLOCK_TYPES) {
      const meta = BLOCK_META[t] as (typeof BLOCK_META)["link"];
      if (meta.hidden) continue; // P3 stubs: no validator yet
      const invalid = Object.keys(meta.validate(meta.defaultData() as never).errors).length > 0;
      expect(meta.needsInputFirst, t).toBe(invalid);
    }
  });

  it("link: requires a valid URL, drops empty optional thumbnail", () => {
    const v = BLOCK_META.link.validate({ title: "Shop", url: " https://x.io ", thumbnail_url: "" });
    expect(v.errors).toEqual({});
    expect(v.data).toEqual({ title: "Shop", url: "https://x.io" });
    expect(BLOCK_META.link.validate({ title: "", url: "nope" }).errors.url).toBeTruthy();
  });

  it("social_icons: drops empty rows, flags half-filled ones", () => {
    const v = BLOCK_META.social_icons.validate({
      items: [
        { platform: "instagram", url: "https://instagram.com/a" },
        { platform: "", url: "" },
        { platform: "x", url: "" },
      ],
    });
    expect(v.data.items).toHaveLength(2);
    expect(v.errors["items.2.url"]).toBe("Required");
  });

  it("video/music: hints when the provider can't be embedded", () => {
    expect(BLOCK_META.video.validate({ url: "https://youtu.be/abc" }).errors).toEqual({});
    expect(BLOCK_META.video.validate({ url: "https://example.com/v" }).errors.url).toMatch(/YouTube/);
    expect(BLOCK_META.music.validate({ url: "https://open.spotify.com/track/1" }).errors).toEqual({});
  });

  it("faq/testimonial: empty rows are dropped", () => {
    expect(BLOCK_META.faq.validate({ items: [{ q: "", a: "" }, { q: "Q", a: "" }] }).data.items).toHaveLength(1);
    expect(BLOCK_META.testimonial.validate({ items: [{ quote: "", author: "" }] }).data.items).toHaveLength(0);
  });
});

describe("P2-1 validators", () => {
  const sched = { start_at: "2026-12-01T00:00:00.000Z", end_at: "2026-12-31T00:00:00.000Z" };

  it("preserve schedule and fields they don't own", () => {
    const d = { title: "Shop", url: "https://x.io", layout: "grid2" as const, label: "New", schedule: sched, future_field: 1 };
    const v = BLOCK_META.link.validate(d as never);
    expect(v.errors).toEqual({});
    expect(v.data).toMatchObject({ layout: "grid2", label: "New", schedule: sched, future_field: 1 });
  });

  it("drop empty optionals and the default button layout", () => {
    const v = BLOCK_META.link.validate({ title: "a", url: "https://x.io", layout: "button", label: "", description: "" });
    expect(v.data).toEqual({ title: "a", url: "https://x.io" });
  });

  it("schedule: end must be after start; empty schedule removed", () => {
    const bad = BLOCK_META.text.validate({ content: "x", schedule: { start_at: sched.end_at, end_at: sched.start_at } });
    expect(bad.errors.schedule).toBeTruthy();
    const empty = BLOCK_META.text.validate({ content: "x", schedule: { start_at: "", end_at: "" } } as never);
    expect(empty.data).toEqual({ content: "x" });
  });

  it("link dest_kind email stores mailto:, tab needs tab_id", () => {
    const e = BLOCK_META.link.validate({ title: "Mail", url: "me@x.io", dest_kind: "email" });
    expect(e.errors).toEqual({});
    expect(e.data.url).toBe("mailto:me@x.io");
    expect(BLOCK_META.link.validate({ title: "", url: "nope", dest_kind: "email" }).errors.url).toBeTruthy();
    expect(BLOCK_META.link.validate({ title: "T", url: "", dest_kind: "tab" }).errors.tab_id).toBeTruthy();
    const t = BLOCK_META.link.validate({ title: "T", url: "", dest_kind: "tab", tab_id: "abc" });
    expect(t.errors).toEqual({});
  });

  it("link icon: one emoji or an image URL", () => {
    expect(BLOCK_META.link.validate({ title: "a", url: "https://x.io", icon: "🔥" }).errors).toEqual({});
    expect(BLOCK_META.link.validate({ title: "a", url: "https://x.io", icon: "toolongtext" }).errors.icon).toBeTruthy();
  });

  it("booking only allows https calendly/cal.com", () => {
    expect(BLOCK_META.booking.validate({ url: "https://calendly.com/me/30min" }).errors).toEqual({});
    expect(BLOCK_META.booking.validate({ url: "https://app.cal.com/me" }).errors).toEqual({});
    expect(BLOCK_META.booking.validate({ url: "http://calendly.com/me" }).errors.url).toBeTruthy();
    expect(BLOCK_META.booking.validate({ url: "https://evil.com/calendly.com" }).errors.url).toBeTruthy();
  });

  it("file needs an upload and a title; quote needs text; countdown needs a date", () => {
    expect(Object.keys(BLOCK_META.file.validate({ title: "", url: "" }).errors).sort()).toEqual(["title", "url"]);
    expect(BLOCK_META.quote.validate({ quote: "  " }).errors.quote).toBe("Required");
    expect(BLOCK_META.countdown.validate({ ends_at: "" }).errors.ends_at).toBeTruthy();
  });

  it("discount_code keeps an empty code (no code needed)", () => {
    const v = BLOCK_META.discount_code.validate({ code: "", discount: "20% off" });
    expect(v.errors).toEqual({});
    expect(v.data).toEqual({ code: "", discount: "20% off" });
  });
});
