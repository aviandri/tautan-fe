import { describe, expect, it } from "vitest";
import { guardedTarget } from "./leave-guard";

const here = { origin: "https://tautan.id", pathname: "/dashboard/appearance", search: "" };
const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const a = (href: string, target = "", attrs: string[] = []) => ({ href, target, hasAttribute: (n: string) => attrs.includes(n) });

describe("guardedTarget", () => {
  it("guards plain clicks on in-app links to another page", () => {
    expect(guardedTarget(click, a("https://tautan.id/dashboard"), here)).toBe("/dashboard");
    expect(guardedTarget(click, a("/dashboard/settings?x=1#top"), here)).toBe("/dashboard/settings?x=1#top");
  });
  it("lets through new-tab, modified, download, external, same-page and already-handled clicks", () => {
    expect(guardedTarget({ ...click, metaKey: true }, a("/dashboard"), here)).toBeNull();
    expect(guardedTarget({ ...click, ctrlKey: true }, a("/dashboard"), here)).toBeNull();
    expect(guardedTarget({ ...click, button: 1 }, a("/dashboard"), here)).toBeNull();
    expect(guardedTarget({ ...click, defaultPrevented: true }, a("/dashboard"), here)).toBeNull();
    expect(guardedTarget(click, a("/dashboard", "_blank"), here)).toBeNull();
    expect(guardedTarget(click, a("/file.csv", "", ["download"]), here)).toBeNull();
    expect(guardedTarget(click, a("https://instagram.com/x"), here)).toBeNull();
    expect(guardedTarget(click, a("/dashboard/appearance#fonts"), here)).toBeNull();
    expect(guardedTarget(click, null, here)).toBeNull();
  });
});
