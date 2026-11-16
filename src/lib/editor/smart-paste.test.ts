import { describe, expect, it } from "vitest";
import { blockFromUnfurl, linkBlock, looksPasteable, marketplaceBlock, sellSuggestion } from "./smart-paste";
import { BLOCK_META } from "./block-meta";
import type { UnfurlResult } from "../types";

const r = (p: Partial<UnfurlResult>): UnfurlResult => ({
  url: "https://example.com/", suggested_type: "link", fetched: true, title: "", description: "", image_url: "", site_name: "", ...p,
});

describe("looksPasteable", () => {
  it.each(["https://x.io/a", "www.example.com", "example.com/path", "me@x.io", "mailto:me@x.io"])("yes: %s", (s) => expect(looksPasteable(s)).toBe(true));
  it.each(["hello world", "", "just text", "a b.com"])("no: %s", (s) => expect(looksPasteable(s)).toBe(false));
});

describe("blockFromUnfurl", () => {
  it("link with OG title, clipped description and thumbnail; result validates", () => {
    const b = blockFromUnfurl(r({ title: "Shop", description: "x".repeat(400), image_url: "https://cdn.x/og.png" }), "t1");
    expect(b.type).toBe("link");
    if (b.type !== "link") return;
    expect(b.data.title).toBe("Shop");
    expect(b.data.description!.length).toBe(300);
    expect(b.data.thumbnail_url).toBe("https://cdn.x/og.png");
    expect(BLOCK_META.link.validate(b.data).errors).toEqual({});
  });
  it("falls back to site_name and plain link when not fetched", () => {
    const b = blockFromUnfurl(r({ fetched: false, site_name: "example.com" }), "t1");
    expect(b).toMatchObject({ type: "link", data: { title: "example.com", url: "https://example.com/" } });
  });
  it("email → link with dest_kind email", () => {
    const b = blockFromUnfurl(r({ url: "mailto:me@x.io", dest_kind: "email", title: "me@x.io" }), "t1");
    expect(b).toMatchObject({ type: "link", data: { url: "mailto:me@x.io", dest_kind: "email" } });
  });
  it.each(["video", "music", "booking"] as const)("%s → embed block", (t) => {
    expect(blockFromUnfurl(r({ suggested_type: t, url: "https://y.io/v" }), "t1")).toMatchObject({ type: t, data: { url: "https://y.io/v" } });
  });
  it("image uses image_url", () => {
    expect(blockFromUnfurl(r({ suggested_type: "image", image_url: "https://x.io/a.png" }), "t1")).toMatchObject({ type: "image", data: { url: "https://x.io/a.png" } });
  });
  it("inside a folder always makes a link", () => {
    expect(blockFromUnfurl(r({ suggested_type: "video" }), "t1", "f1")).toMatchObject({ type: "link", parent_id: "f1" });
  });
  it("ignores an unusable OG image", () => {
    const b = blockFromUnfurl(r({ image_url: "data:image/png;base64,xx" }), "t1");
    expect(b.type === "link" && b.data.thumbnail_url).toBeFalsy();
  });
});

describe("sellSuggestion", () => {
  it("product page from unfurl: prefilled product with a marketplace buy button", () => {
    const s = sellSuggestion(
      r({ url: "https://www.tokopedia.com/dapurnara/brownies", suggested_type: "product", kind: "marketplace", platform: "tokopedia", title: "Fudgy Brownies 20x20 | Tokopedia", image_url: "https://images.tokopedia.net/a.jpg", price: 8500000, currency: "IDR" }),
      "https://www.tokopedia.com/dapurnara/brownies",
    )!;
    expect(s).toMatchObject({ platform: "tokopedia", isProduct: true });
    expect(s.product).toMatchObject({ name: "Fudgy Brownies 20x20", images: ["https://images.tokopedia.net/a.jpg"], price: 8500000, action: { kind: "marketplace", marketplace: "tokopedia" } });
    const data = { ...BLOCK_META.product.defaultData(), ...s.product };
    expect(BLOCK_META.product.validate(data).errors).toEqual({});
  });
  it("store page: not a product; marketplace and link blocks validate", () => {
    const s = sellSuggestion(r({ url: "https://shopee.co.id/dapurnara", suggested_type: "marketplace", kind: "marketplace", platform: "shopee", fetched: false }), "shopee.co.id/dapurnara")!;
    expect(s.isProduct).toBe(false);
    const m = marketplaceBlock(s, "t1");
    expect(m.type === "marketplace" && BLOCK_META.marketplace.validate(m.data).errors).toEqual({});
    expect(linkBlock(s, "t1").type).toBe("link");
  });
  it("falls back to client host detection when unfurl failed", () => {
    const s = sellSuggestion(null, "shop.tiktok.com/view/product/1729")!;
    expect(s).toMatchObject({ platform: "tiktok_shop", isProduct: true, url: "https://shop.tiktok.com/view/product/1729" });
    expect(linkBlock(s, "t1")).toMatchObject({ type: "link", data: { url: "https://shop.tiktok.com/view/product/1729" } });
  });
  it("ignores non-marketplace links", () => {
    expect(sellSuggestion(r({ url: "https://example.com" }), "example.com")).toBeNull();
    expect(sellSuggestion(null, "https://youtube.com/watch?v=x")).toBeNull();
  });
});
