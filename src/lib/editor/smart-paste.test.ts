import { describe, expect, it } from "vitest";
import { blockFromUnfurl, looksPasteable } from "./smart-paste";
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
