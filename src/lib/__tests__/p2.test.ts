import { describe, expect, it } from "vitest";
import type { Block, FormField } from "../types";
import { validateAnswers } from "../form-validate";
import { groupBlocks } from "../page-structure";
import { bookingEmbedSrc } from "../embeds";
import { formatBytes } from "../format";

const link = (id: string, layout?: string): Block =>
  ({ id, profile_id: "p", tab_id: "t", parent_id: null, position: 0, is_visible: true, created_at: "", updated_at: "", type: "link", data: { title: id, url: "https://x.test", layout } }) as Block;

describe("groupBlocks", () => {
  it("groups adjacent links with the same grid/carousel layout only", () => {
    const g = groupBlocks([link("a"), link("b", "grid2"), link("c", "grid2"), link("d", "grid3"), link("e", "carousel"), link("f", "carousel"), link("g", "grid2")]);
    expect(g.map((x) => (x.kind === "group" ? `${x.layout}:${x.blocks.map((b) => b.id).join("")}` : x.block.id))).toEqual([
      "a",
      "grid2:bc",
      "grid3:d",
      "carousel:ef",
      "grid2:g",
    ]);
  });
});

describe("validateAnswers", () => {
  const fields: FormField[] = [
    { id: "name", type: "text", label: "Name", required: true },
    { id: "email", type: "email", label: "Email", required: true },
    { id: "age", type: "number", label: "Age" },
    { id: "day", type: "date", label: "Day" },
    { id: "size", type: "select", label: "Size", options: ["S", "M"] },
    { id: "ok", type: "checkbox", label: "I agree", required: true },
    { id: "note", type: "textarea", label: "Note" },
  ];
  it("reports each problem under its field", () => {
    const r = validateAnswers(fields, { name: " ", email: "nope", age: "abc", day: "2026-13-45", size: "XL", ok: false, note: "x".repeat(5001) });
    expect(Object.keys(r.errors).sort()).toEqual(["age", "day", "email", "name", "note", "ok", "size"]);
    expect(r.ok).toBe(false);
  });
  it("coerces numbers and booleans and skips empty optional fields", () => {
    const r = validateAnswers(fields, { name: "Rani", email: "rani@example.com", age: "31", ok: true, size: "M" });
    expect(r.ok).toBe(true);
    expect(r.answers).toEqual({ name: "Rani", email: "rani@example.com", age: 31, size: "M", ok: true });
  });
});

describe("bookingEmbedSrc", () => {
  it("allows calendly and cal.com over https only", () => {
    expect(bookingEmbedSrc("https://calendly.com/studio/30min")).toContain("hide_gdpr_banner=1");
    expect(bookingEmbedSrc("https://cal.com/studio/intro")).toBe("https://cal.com/studio/intro?embed=true");
    expect(bookingEmbedSrc("https://app.cal.com/studio")).toContain("embed=true");
    expect(bookingEmbedSrc("http://calendly.com/x")).toBeNull();
    expect(bookingEmbedSrc("https://calendly.com.evil.test/x")).toBeNull();
    expect(bookingEmbedSrc("https://calendly.com/")).toBeNull();
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
    expect(formatBytes(undefined)).toBeNull();
  });
});
