import type { CSSProperties } from "react";
import type { Theme } from "../types";
import { assetUrl } from "../api";
import { findFont, fontStack } from "./fonts-meta";
import { getPreset, type ResolvedTheme } from "./presets";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const FUNC_COLOR = /^(?:rgb|rgba|hsl|hsla)\(\s*[\d.%\s,/+-]+\)$/i;
const GRADIENT = /^(?:repeating-)?(?:linear|radial|conic)-gradient\([#\w\s.,%()-]+\)$/i;

export function isColor(v: unknown): v is string {
  return typeof v === "string" && (HEX.test(v.trim()) || FUNC_COLOR.test(v.trim()));
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
      (type === "gradient" && isGradient(value)) ||
      (type === "image" && isImageUrl(value)))
    ) {
      bg = { type, value: value.trim() };
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
  };
}

function cssUrl(u: string): string {
  return `url("${u.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`;
}

export function backgroundValue(bg: ResolvedTheme["bg"]): string {
  if (bg.type === "image") return `${cssUrl(assetUrl(bg.value) ?? bg.value)} center / cover no-repeat`;
  return bg.value;
}

/** CSS custom properties consumed by components/public. */
export function themeToCssVars(r: ResolvedTheme): CSSProperties {
  const { style, radius, color, text_color } = r.button;
  const vars: Record<string, string> = {
    "--t-bg": backgroundValue(r.bg),
    // a solid colour behind image/gradient grounds for overscroll and fallback
    "--t-bg-solid": r.bg.type === "color" ? r.bg.value : fallbackSolid(r),
    "--t-text": r.text_color,
    "--t-font": fontStack(r.font),
    "--t-btn-radius": `${radius}px`,
    "--t-btn-bg": style === "outline" ? "transparent" : color,
    "--t-btn-text": text_color,
    "--t-btn-border": style === "fill" ? "transparent" : style === "outline" ? color : r.text_color,
    "--t-btn-shadow": style === "shadow" ? `4px 4px 0 ${r.text_color}` : "none",
  };
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
