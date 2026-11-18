import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRESETS, themeFromPreset, hasOverrides, DEFAULT_PRESET } from "../theme/presets";
import { resolveTheme, themeToCssVars, isGradient, isColor } from "../theme/resolve";
import { contrast, resolvePalette, textOn, innerTile, isDarkTheme, INNER_KEEP_DARK, INNER_KEEP_LIGHT } from "../theme/resolve";
import { makeSurfacer } from "../palette";
import { parseGradient, toGradientCss } from "../theme/gradient";
import { FONT_OPTIONS, findFont } from "../theme/fonts-meta";

describe("presets", () => {
  it("has 8 unique presets that each use a curated font", () => {
    expect(PRESETS).toHaveLength(8);
    expect(new Set(PRESETS.map((p) => p.preset)).size).toBe(8);
    for (const p of PRESETS) {
      expect(FONT_OPTIONS.some((f) => f.label === p.font)).toBe(true);
      // what the BE accepts (fontNameRE in tautan-be theme.go)
      expect(p.font).toMatch(/^[A-Za-z0-9 ]{1,40}$/);
      expect(p.button.radius).toBeLessThanOrEqual(100);
    }
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
    expect(r.font).toBe("Inter");
    expect(resolveTheme({ preset: "batu", font: "dm-sans" }).font).toBe("DM Sans");
    expect(findFont("space grotesk")?.label).toBe("Space Grotesk");
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
    expect(r.button.radius).toBe(100);
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
    // CSS colour names are allowed (the P2 BE accepts them); letters only, so nothing can escape
    for (const c of ["#fff", "#ffffff", "#ffffff80", "rgb(1, 2, 3)", "hsl(10 20% 30% / 0.5)", "red", "rebeccapurple"]) expect(isColor(c)).toBe(true);
    for (const c of ["#ggg", "rgb(1,2,3);x:y", "var(--x)", "red;x", "url(a)"]) expect(isColor(c)).toBe(false);
  });
});

describe("themeToCssVars", () => {
  it("maps button styles (single-colour themes)", () => {
    const v = (style: "fill" | "outline" | "shadow") =>
      themeToCssVars(resolveTheme({ preset: "batu", palette_mode: "mono", button: { style, radius: 8, color: "#123456", text_color: "#ffffff" } })) as Record<string, string>;
    expect(v("outline")["--t-btn-bg"]).toBe("transparent");
    expect(v("shadow")["--t-btn-shadow"]).toContain("4px 4px 0");
    expect(v("fill")["--t-btn-border"]).toBe("transparent");
  });
  it("uses a gradient's first stop as the solid fallback", () => {
    const v = themeToCssVars(resolveTheme({ preset: "batu", bg: { type: "gradient", value: "linear-gradient(160deg, #ff7a59 0%, #ffb35c 100%)" } })) as Record<string, string>;
    expect(v["--t-bg-solid"]).toBe("#ff7a59");
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

describe("theme v2", () => {
  const base = themeFromPreset("batu");
  it("keeps valid v2 keys and drops invalid ones", () => {
    const r = resolveTheme({
      ...base,
      spacing: 200,
      block: { color: "#fff", text_color: "#111" },
      label: { color: "javascript:x", text_color: "#fff" },
      border: { width: 3, color: "#000" },
      shadow: { amount: 40, style: "glow" as never },
      fonts: { title: "Fraunces", body: "Comic Sans" },
      header: { layout: "banner", banner_image_url: "javascript:alert(1)" },
      bg_desktop: "#eee",
    });
    expect(r.spacing).toBe(64);
    expect(r.block).toEqual({ color: "#fff", text_color: "#111" });
    expect(r.label).toBeUndefined();
    expect(r.border).toEqual({ width: 3, color: "#000" });
    expect(r.shadow).toBeUndefined();
    expect(r.fonts).toEqual({ title: "Fraunces" });
    expect(r.header).toEqual({ layout: "banner" });
    expect(r.bg_desktop).toBe("#eee");
  });
  it("maps v2 keys to CSS variables", () => {
    const v = themeToCssVars(
      resolveTheme({ ...base, spacing: 24, border: { width: 2, color: "#000" }, shadow: { amount: 60, style: "solid" }, fonts: { title: "Fraunces" } }),
    ) as Record<string, string>;
    expect(v["--t-gap"]).toBe("24px");
    expect(v["--t-btn-bw"]).toBe("2px");
    expect(v["--t-card-shadow"]).toBe("5px 5px 0 #000");
    expect(v["--t-font-title"]).toContain("--font-fraunces");
  });
  it("renders split and none backgrounds over a plain page", () => {
    const split = themeToCssVars(resolveTheme({ ...base, bg: { type: "split", value: "linear-gradient(90deg, #f00 0%, #00f 100%)" } })) as Record<string, string>;
    expect(split["--t-bg"]).toContain("340px no-repeat");
    const none = themeToCssVars(resolveTheme({ ...base, bg: { type: "none", value: "" } })) as Record<string, string>;
    expect(none["--t-bg"]).toBe(none["--t-bg-solid"]);
  });
  it("counts v2 keys as overrides", () => {
    expect(hasOverrides({ ...base, spacing: 20 })).toBe(true);
  });
});


describe("palettes (themes v3)", () => {
  it("every preset passes WCAG 4.5:1 for text on the ground, each surface and the accent", () => {
    for (const p of PRESETS) {
      const t = resolveTheme(themeFromPreset(p.preset));
      const pal = resolvePalette(t)!;
      expect(pal, p.preset).not.toBeNull();
      expect(contrast(t.text_color, (t.bg as { value: string }).value), `${p.preset} ground`).toBeGreaterThanOrEqual(4.5);
      for (const s of pal.surfaces) expect(contrast(s.text, s.bg), `${p.preset} ${s.bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(pal.accent.text, pal.accent.bg), `${p.preset} accent`).toBeGreaterThanOrEqual(4.5);
      expect(pal.surfaces.length).toBeGreaterThanOrEqual(4);
    }
  });
  it("uses no violet/lavender hues in preset surfaces", () => {
    const hue = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      if (d < 0.04) return null; // grey
      const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return (h * 60 + 360) % 360;
    };
    for (const p of PRESETS) for (const c of [...p.palette!.surfaces, ...p.palette!.accents]) {
      const h = hue(c);
      if (h !== null) expect(h < 250 || h > 320, `${p.preset} ${c} hue ${h}`).toBe(true);
    }
  });
  it("leaves themes without a palette exactly as before (no surface vars)", () => {
    const legacy = themeToCssVars(resolveTheme({ preset: "kunyit", bg: { type: "color", value: "#ffd23f" }, button: { style: "shadow", radius: 4, color: "#ffffff", text_color: "#111111" }, font: "Inter", text_color: "#111111" })) as Record<string, string>;
    expect(legacy["--t-surface-1"]).toBeUndefined();
    expect(legacy["--t-btn-bg"]).toBe("#ffffff");
    const mono = themeToCssVars(resolveTheme({ ...themeFromPreset("senja"), palette_mode: "mono" })) as Record<string, string>;
    expect(mono["--t-surface-1"]).toBeUndefined();
  });
  it("computes readable text when the ink fails on a surface", () => {
    expect(textOn("#111111", "#222222")).toBe("#ffffff");
    expect(textOn("#fbe49a", "#2a2208")).toBe("#2a2208");
  });
  it("assigns surfaces by cycle or by card type, skipping text/media cards", () => {
    const cyc = makeSurfacer("cycle", 5);
    expect(["link", "heading", "link", "product", "image", "faq"].map((t) => cyc(t)?.index ?? null)).toEqual([1, null, 2, 3, null, 4]);
    expect(makeSurfacer("cycle", 5)("link")?.button).toBe(true);
    const byType = makeSurfacer("by_type", 5);
    expect(["link", "product", "media_kit", "poll", "faq"].map((t) => byType(t)?.index)).toEqual([1, 2, 3, 4, 5]);
    expect(makeSurfacer("by_type", 4)("faq")?.index).toBe(1);
  });

  it("a locked (gated) button card keeps its surface but not button-ish, so its unlock button stays on the accent", () => {
    for (const type of ["link", "file", "booking", "folder"]) {
      const cyc = makeSurfacer("cycle", 5);
      expect(cyc(type)).toEqual({ index: 1, button: true });
      expect(cyc(type, true)).toEqual({ index: 2, button: false }); // still advances the cycle
    }
    expect(makeSurfacer("by_type", 5)("link", true)).toEqual({ index: 1, button: false });
  });

  it("every preset's accent stands out from each card surface (the gate/giveaway buttons)", () => {
    for (const p of PRESETS) {
      const pal = resolvePalette(resolveTheme(themeFromPreset(p.preset)))!;
      for (const s of pal.surfaces) expect(contrast(pal.accent.bg, s.bg), `${p.preset} accent on ${s.bg}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("inner tiles (shop items, marketplace/order rows, rate card, events, podcast, media kit)", () => {
  it("every preset's inner tile keeps its card text at WCAG 4.5:1 on every surface", () => {
    const fails: string[] = [];
    for (const p of PRESETS) {
      const t = resolveTheme(themeFromPreset(p.preset));
      const pal = resolvePalette(t)!;
      const keep = isDarkTheme(t.text_color) ? INNER_KEEP_DARK : INNER_KEEP_LIGHT;
      expect(themeToCssVars(t)["--t-inner-keep" as keyof ReturnType<typeof themeToCssVars>]).toBe(`${keep}%`);
      pal.surfaces.forEach((s, i) => {
        const tile = innerTile(s.bg, keep);
        const c = contrast(s.text, tile);
        if (c < 4.5) fails.push(`${p.preset} surface ${i + 1}: ${s.text} on ${tile} = ${c.toFixed(2)}:1`);
      });
    }
    expect(fails).toEqual([]);
  });

  it("matches CSS color-mix toward white", () => {
    expect(innerTile("#1c2a3d", 100)).toBe("#1c2a3d");
    expect(innerTile("#1c2a3d", 0)).toBe("#ffffff");
    // the old light-theme mix on Malam's first surface: the ~1.7:1 tile from the E2E report
    expect(contrast("#f3ead8", innerTile("#1c2a3d", 35))).toBeLessThan(2);
  });

  it("public.css draws every inner tile from the token, never a fixed mix", () => {
    const css = readFileSync(join(process.cwd(), "src/components/public/public.css"), "utf8");
    expect(css).not.toMatch(/color-mix\(in srgb, var\(--t-block-bg\) \d+%, #fff\)/);
    expect(css.match(/background: var\(--t-inner-mix\)/g)?.length).toBeGreaterThanOrEqual(11);
  });
});

describe("onboarding look step default (E2E finding #6)", () => {
  it("pre-selects the default preset for a non-preset theme", async () => {
    const { lookStepDraft, DEFAULT_PRESET, isPresetId } = await import("../theme/presets");
    expect(lookStepDraft({ preset: "classic" } as never)?.preset).toBe(DEFAULT_PRESET);
    expect(lookStepDraft(undefined)?.preset).toBe(DEFAULT_PRESET);
    expect(isPresetId(DEFAULT_PRESET)).toBe(true);
  });
  it("keeps a theme that already is a preset", async () => {
    const { lookStepDraft, themeFromPreset } = await import("../theme/presets");
    expect(lookStepDraft(themeFromPreset("kertas"))).toBeNull();
  });
});
