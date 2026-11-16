import { describe, expect, it } from "vitest";
import { PRESETS, themeFromPreset, hasOverrides, DEFAULT_PRESET } from "../theme/presets";
import { resolveTheme, themeToCssVars, isGradient, isColor } from "../theme/resolve";
import { parseGradient, toGradientCss } from "../theme/gradient";
import { FONT_OPTIONS } from "../theme/fonts-meta";

describe("presets", () => {
  it("has 8 unique presets that each use a curated font", () => {
    expect(PRESETS).toHaveLength(8);
    expect(new Set(PRESETS.map((p) => p.preset)).size).toBe(8);
    for (const p of PRESETS) expect(FONT_OPTIONS.some((f) => f.id === p.font)).toBe(true);
  });

  it("every preset survives its own validation unchanged", () => {
    for (const p of PRESETS) expect(resolveTheme(themeFromPreset(p.preset))).toEqual(themeFromPreset(p.preset));
  });

  it("detects overrides", () => {
    const t = themeFromPreset("malam");
    expect(hasOverrides(t)).toBe(false);
    expect(hasOverrides({ ...t, text_color: "#ffffff" })).toBe(true);
    expect(hasOverrides({ ...t, button: { ...t.button, radius: 0 } })).toBe(true);
  });
});

describe("resolveTheme", () => {
  it("falls back to the default preset for null and unknown presets", () => {
    expect(resolveTheme(null).bg).toEqual(themeFromPreset(DEFAULT_PRESET).bg);
    expect(resolveTheme({ preset: "nope" }).font).toBe(themeFromPreset(DEFAULT_PRESET).font);
  });

  it("keeps valid stored values from a legacy theme (scaffold DEFAULT_THEME)", () => {
    const r = resolveTheme({
      preset: "default",
      bg: { type: "color", value: "#f6f5f1" },
      button: { style: "fill", radius: 14, color: "#111111", text_color: "#ffffff" },
      font: "Inter",
      text_color: "#111111",
    });
    expect(r.preset).toBe("default");
    expect(r.bg.value).toBe("#f6f5f1");
    expect(r.font).toBe("inter");
  });

  it("drops dangerous or malformed values", () => {
    const base = themeFromPreset("kertas");
    const r = resolveTheme({
      preset: "kertas",
      bg: { type: "color", value: "red; background: url(https://evil)" },
      button: { style: "glow" as never, radius: 1e9, color: "javascript:alert(1)", text_color: "#fff" },
      font: "Comic Sans",
      text_color: "expression(alert(1))",
    });
    expect(r.bg).toEqual(base.bg);
    expect(r.button.style).toBe(base.button.style);
    expect(r.button.radius).toBe(999);
    expect(r.button.color).toBe(base.button.color);
    expect(r.button.text_color).toBe("#fff");
    expect(r.font).toBe(base.font);
    expect(r.text_color).toBe(base.text_color);
  });

  it("rejects gradients that smuggle url() and image bgs with bad schemes", () => {
    expect(isGradient("linear-gradient(90deg, #000 0%, #fff 100%)")).toBe(true);
    expect(isGradient("linear-gradient(90deg, url(x), #fff)")).toBe(false);
    expect(resolveTheme({ preset: "batu", bg: { type: "image", value: "javascript:alert(1)" } }).bg.type).toBe("color");
    expect(resolveTheme({ preset: "batu", bg: { type: "image", value: "https://x.test/a.jpg" } }).bg.type).toBe("image");
  });

  it("accepts common colour syntaxes only", () => {
    for (const c of ["#fff", "#ffffff", "#ffffff80", "rgb(1, 2, 3)", "hsl(10 20% 30% / 0.5)"]) expect(isColor(c)).toBe(true);
    for (const c of ["red", "#ggg", "rgb(1,2,3);x:y", "var(--x)"]) expect(isColor(c)).toBe(false);
  });
});

describe("themeToCssVars", () => {
  const vars = (id: string) => themeToCssVars(themeFromPreset(id)) as Record<string, string>;
  it("maps button styles", () => {
    expect(vars("laut")["--t-btn-bg"]).toBe("transparent");
    expect(vars("kunyit")["--t-btn-shadow"]).toContain("4px 4px 0");
    expect(vars("malam")["--t-btn-border"]).toBe("transparent");
  });
  it("uses a gradient's first stop as the solid fallback", () => {
    expect(vars("senja")["--t-bg-solid"]).toBe("#ff7a59");
  });
  it("escapes quotes in image urls", () => {
    const v = themeToCssVars(resolveTheme({ preset: "batu", bg: { type: "image", value: 'https://x.test/a".jpg' } })) as Record<string, string>;
    expect(v["--t-bg"]).not.toContain('a".jpg');
  });
});

describe("gradient", () => {
  it("round-trips", () => {
    const g = { angle: 45, from: "#112233", to: "#aabbcc" };
    expect(parseGradient(toGradientCss(g))).toEqual(g);
  });
  it("returns null for complex gradients", () => {
    expect(parseGradient("radial-gradient(circle, #000, #fff)")).toBeNull();
  });
});
