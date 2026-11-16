import { describe, expect, it } from "vitest";
import type { Block, Tab } from "../types";
import { buildTabTree, selectTab, tabQuery } from "../page-structure";
import { safeHref } from "../safe-url";

const tab = (id: string, slug: string, position: number): Tab => ({ id, profile_id: "p", title: slug, slug, position });
const blk = (id: string, position: number, extra: Partial<Block> = {}): Block =>
  ({
    id, profile_id: "p", tab_id: "t1", parent_id: null, position, is_visible: true, created_at: "", updated_at: "",
    type: "link", data: { title: id, url: "https://x.test" }, ...extra,
  }) as Block;

describe("tabs", () => {
  const tabs = [tab("t2", "music", 1), tab("t1", "main", 0)];
  it("selects by slug, falling back to the first by position", () => {
    expect(selectTab(tabs, "music")?.id).toBe("t2");
    expect(selectTab(tabs, "missing")?.id).toBe("t1");
    expect(selectTab(tabs, null)?.id).toBe("t1");
  });
  it("gives the first tab a clean URL", () => {
    expect(tabQuery(tabs, tabs[1])).toBe("");
    expect(tabQuery(tabs, tabs[0])).toBe("?tab=music");
  });
});

describe("buildTabTree", () => {
  it("orders, hides and nests", () => {
    const blocks = [
      blk("b", 2),
      blk("a", 1),
      blk("hidden", 0, { is_visible: false }),
      blk("folder", 3, { type: "folder", data: { title: "F" } } as Partial<Block>),
      blk("c2", 1, { parent_id: "folder" }),
      blk("c1", 0, { parent_id: "folder" }),
      blk("hiddenChild", 2, { parent_id: "folder", is_visible: false }),
      blk("other", 0, { tab_id: "t2" }),
    ];
    const tree = buildTabTree(blocks, "t1");
    expect(tree.top.map((b) => b.id)).toEqual(["a", "b", "folder"]);
    expect(tree.children.get("folder")?.map((b) => b.id)).toEqual(["c1", "c2"]);
  });
});

describe("safeHref", () => {
  it("allows web, mail and tel; blocks script schemes", () => {
    expect(safeHref("https://a.test/x")).toBe("https://a.test/x");
    expect(safeHref("mailto:a@b.test")).toBe("mailto:a@b.test");
    expect(safeHref("example.com/path")).toBe("https://example.com/path");
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
    expect(safeHref(" JaVaScRiPt:alert(1)")).toBeUndefined();
    expect(safeHref("data:text/html,x")).toBeUndefined();
  });
});

import { socialHandle, socialUrl } from "../social";

describe("social handles", () => {
  it("builds URLs from handles and reads them back", () => {
    expect(socialUrl("instagram", "@studio.lempung")).toBe("https://instagram.com/studio.lempung");
    expect(socialUrl("tiktok", "studio")).toBe("https://tiktok.com/@studio");
    expect(socialUrl("whatsapp", "+62 812-3456")).toBe("https://wa.me/628123456");
    expect(socialUrl("email", "hi@x.test")).toBe("mailto:hi@x.test");
    expect(socialUrl("website", "studio.test")).toBe("https://studio.test");
    expect(socialUrl("x", "https://x.com/already")).toBe("https://x.com/already");
    expect(socialHandle("tiktok", "https://www.tiktok.com/@studio")).toBe("studio");
    expect(socialHandle("instagram", "https://instagram.com/studio.lempung/")).toBe("studio.lempung");
    expect(socialHandle("email", "mailto:hi@x.test")).toBe("hi@x.test");
    expect(socialHandle("website", "https://studio.test")).toBe("https://studio.test");
  });
});
