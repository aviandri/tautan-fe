import type { CSSProperties } from "react";
import type { Theme } from "../types";
import { assetUrl } from "../api";
import { findFont, fontStack } from "./fonts-meta";
import { getPreset, type ResolvedTheme } from "./presets";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/+-]+\)$/i;
const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\([#\w\s.,%()-]+\)$/i;

/** CSS colour names (the BE accepts them). Letters only, so nothing can escape the property. */
const NAMED = /^[a-z]{3,20}$/i;

export function isColor(v: unknown): v is string {
  return typeof v === "string" && (HEX.test(v.trim()) || FUNC_COLOR.test(v.trim()) || NAMED.test(v.trim()));
}

export function isGradient(v: unknown): v is string {
  return typeof v === "string" && GRADIENT.test(v.trim()) && !/url\s*\(/i.test(v);
}

export function isImageUrl(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 2048) return false;
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  // blob: is what a just-picked upload looks like in the editor (and in the mock API)
  if (v.startsWith("blob:")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/**
 * Validate a stored theme field by field, falling back to its preset. Invalid override values are dropped
 * silently (fall back to the preset), so a bad row can never break a page.
 */
export function resolveTheme(theme: DeepPartial<Theme> | null | undefined): ResolvedTheme {
  const p = getPreset(theme?.preset);
  const t: DeepPartial<Theme> = theme ?? { preset: p.preset };

  let bg = p.bg;
  if (t.bg) {
    const { type, value } = t.bg;
    if (
      typeof value === "string" &&
      ((type === "color" && isColor(value)) ||
      ((type === "gradient" || type === "split") && isGradient(value)) ||
      (type === "image" && isImageUrl(value)))
    ) {
      bg = { type, value: value.trim() };
    } else if (type === "none") {
      bg = { type, value: "" };
    }
  }

  const b = t.button ?? {};
  const radius =
    typeof b.radius === "number" && Number.isFinite(b.radius) ? Math.min(Math.max(Math.round(b.radius), 0), 100) : p.button.radius;

  return {
    // keep the stored preset id (e.g. a legacy "default") so the picker shows what was saved
    preset: typeof t.preset === "string" && t.preset ? t.preset : p.preset,
    bg,
    button: {
      style: b.style === "fill" || b.style === "outline" || b.style === "shadow" ? b.style : p.button.style,
      radius,
      color: isColor(b.color) ? b.color : p.button.color,
      text_color: isColor(b.text_color) ? b.text_color : p.button.text_color,
    },
    // stored as the family name (the BE rejects ids like "dm-sans"); older ids still resolve
    font: findFont(t.font)?.label ?? p.font,
    text_color: isColor(t.text_color) ? t.text_color : p.text_color,
    ...resolveV2(t),
  };
}

const clamp = (n: unknown, lo: number, hi: number) =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(Math.max(n, lo), hi) : undefined;

function pair(v: DeepPartial<Theme>["block"]) {
  return v && isColor(v.color) && isColor(v.text_color) ? { color: v.color, text_color: v.text_color } : undefined;
}

/** Theme v2 keys: each is kept only when valid, otherwise left out (the page uses its v1 look). */
function resolveV2(t: DeepPartial<Theme>): Partial<Theme> {
  const out: Partial<Theme> = {};
  if (isColor(t.bg_desktop)) out.bg_desktop = t.bg_desktop;
  const spacing = clamp(t.spacing, 0, 64);
  if (spacing !== undefined) out.spacing = spacing;
  const block = pair(t.block);
  if (block) out.block = block;
  const label = pair(t.label);
  if (label) out.label = label;
  const bw = clamp(t.border?.width, 0, 12);
  if (bw !== undefined && isColor(t.border?.color)) out.border = { width: bw, color: t.border!.color! };
  const sa = clamp(t.shadow?.amount, 0, 100);
  if (sa !== undefined && (t.shadow?.style === "soft" || t.shadow?.style === "solid")) out.shadow = { amount: sa, style: t.shadow.style };
  const title = findFont(t.fonts?.title)?.label;
  const body = findFont(t.fonts?.body)?.label;
  if (title || body) out.fonts = { ...(title ? { title } : {}), ...(body ? { body } : {}) };
  const layout = t.header?.layout;
  if (layout === "classic" || layout === "banner" || layout === "headshot" || layout === "business") {
    const banner = isImageUrl(t.header?.banner_image_url) ? t.header!.banner_image_url : undefined;
    out.header = { layout, ...(banner ? { banner_image_url: banner } : {}) };
  }
  return out;
}

function cssUrl(u: string): string {
  return `url("${u.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`;
}

export function backgroundValue(bg: ResolvedTheme["bg"], solid = "transparent"): string {
  if (bg.type === "image") return `${cssUrl(assetUrl(bg.value) ?? bg.value)} center / cover no-repeat`;
  // split: the gradient sits behind the header only, the rest of the page is plain
  if (bg.type === "split") return `${bg.value} top / 100% 340px no-repeat, ${solid}`;
  if (bg.type === "none") return solid;
  return bg.value;
}

export function assetCssUrl(u: string): string {
  return cssUrl(assetUrl(u) ?? u);
}

/** CSS custom properties consumed by components/public. */
export function themeToCssVars(r: ResolvedTheme): CSSProperties {
  const { style, radius, color, text_color } = r.button;
  const solid = r.bg.type === "color" ? r.bg.value : fallbackSolid(r);
  const vars: Record<string, string> = {
    "--t-bg": backgroundValue(r.bg, solid),
    // a solid colour behind image/gradient grounds for overscroll and fallback
    "--t-bg-solid": solid,
    "--t-text": r.text_color,
    "--t-font": fontStack(r.fonts?.body ?? r.font),
    "--t-font-title": fontStack(r.fonts?.title ?? r.fonts?.body ?? r.font),
    "--t-btn-radius": `${radius}px`,
    "--t-btn-bg": style === "outline" ? "transparent" : color,
    "--t-btn-text": text_color,
    "--t-btn-border": style === "fill" ? "transparent" : style === "outline" ? color : r.text_color,
    "--t-btn-shadow": style === "shadow" ? `4px 4px 0 ${r.text_color}` : "none",
  };
  // ---- Theme v2 ----
  if (r.block) {
    vars["--t-block-bg"] = r.block.color;
    vars["--t-block-text"] = r.block.text_color;
  }
  if (r.label) {
    vars["--t-label-bg"] = r.label.color;
    vars["--t-label-text"] = r.label.text_color;
  }
  if (r.border) {
    vars["--t-btn-bw"] = `${r.border.width}px`;
    vars["--t-card-bw"] = `${r.border.width}px`;
    vars["--t-btn-border"] = r.border.width ? r.border.color : "transparent";
    vars["--t-card-bc"] = r.border.width ? r.border.color : "transparent";
  }
  if (r.shadow && r.shadow.amount > 0) {
    const a = r.shadow.amount;
    const sh =
      r.shadow.style === "solid"
        ? `${Math.max(1, Math.round(a / 12))}px ${Math.max(1, Math.round(a / 12))}px 0 ${r.border?.color ?? r.text_color}`
        : `0 ${Math.round(a / 8)}px ${Math.round(a / 3)}px rgba(0, 0, 0, ${(a / 300).toFixed(2)})`;
    vars["--t-btn-shadow"] = sh;
    vars["--t-card-shadow"] = sh;
  }
  if (r.spacing !== undefined) vars["--t-gap"] = `${r.spacing}px`;
  if (r.bg_desktop) vars["--t-bg-desktop"] = r.bg_desktop;
  return vars as CSSProperties;
}

function fallbackSolid(r: ResolvedTheme): string {
  // a gradient's first colour stop, else a neutral that contrasts the text
  const m = r.bg.type === "gradient" ? r.bg.value.match(/#[0-9a-f]{3,8}\b/i) : null;
  if (m) return m[0];
  return isDarkColor(r.text_color) ? "#f5f5f4" : "#111111";
}

/** Rough sRGB luminance check for hex colours; non-hex counts as not dark. */
export function isDarkColor(c: string): boolean {
  const h = c.replace("#", "");
  if (!/^[0-9a-f]+$/i.test(h) || (h.length !== 3 && h.length !== 6 && h.length !== 4 && h.length !== 8)) return false;
  const full = h.length <= 4 ? h.slice(0, 3).split("").map((x) => x + x).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}

// ---------- palettes (themes v3) ----------

function lin(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
/** WCAG relative luminance of a hex colour (null for non-hex). */
export function luminance(c: string): number | null {
  const h = c.replace("#", "");
  if (!/^[0-9a-f]+$/i.test(h) || ![3, 4, 6, 8].includes(h.length)) return null;
  const full = h.length <= 4 ? h.slice(0, 3).split("").map((x) => x + x).join("") : h.slice(0, 6);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a: string, b: string): number {
  const la = luminance(a) ?? 0;
  const lb = luminance(b) ?? 1;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
/** Text for a surface: the preferred ink when it passes 4.5:1, else whichever of near-black/white reads better. */
export function textOn(surface: string, ink?: string): string {
  if (ink && contrast(ink, surface) >= 4.5) return ink;
  return contrast("#111111", surface) >= contrast("#ffffff", surface) ? "#111111" : "#ffffff";
}

export interface ResolvedPalette {
  surfaces: { bg: string; text: string }[];
  accent: { bg: string; text: string };
  ink: string;
  mode: "cycle" | "by_type" | "mono";
}

/** Validated palette, or null when the theme has none (single-colour behaviour, unchanged). */
export function resolvePalette(t: Theme): ResolvedPalette | null {
  const p = t.palette;
  if (!p || t.palette_mode === "mono") return null;
  const surfaces = (p.surfaces ?? []).filter(isColor).slice(0, 6);
  const accent = (p.accents ?? []).find(isColor);
  if (surfaces.length < 4 || !accent) return null;
  const ink = isColor(p.ink) ? p.ink : t.text_color;
  return {
    surfaces: surfaces.map((bg) => ({ bg, text: textOn(bg, ink) })),
    accent: { bg: accent, text: textOn(accent, isColor(p.ink_on_accent) ? p.ink_on_accent : undefined) },
    ink,
    mode: t.palette_mode === "by_type" ? "by_type" : "cycle",
  };
}

/** CSS variables for a palette: --t-surface-N(-text), accent for inner buttons, and the header band. */
export function paletteCssVars(pal: ResolvedPalette): Record<string, string> {
  const v: Record<string, string> = {};
  pal.surfaces.forEach((s, i) => {
    v[`--t-surface-${i + 1}`] = s.bg;
    v[`--t-surface-${i + 1}-text`] = s.text;
  });
  v["--t-accent"] = pal.accent.bg;
  v["--t-accent-text"] = pal.accent.text;
  v["--t-hero"] = `linear-gradient(160deg, ${pal.surfaces[0].bg}, ${pal.surfaces[1].bg})`;
  v["--t-hero-text"] = pal.surfaces[0].text;
  return v;
}
