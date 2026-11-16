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
