import type { Theme } from "../types";

/** A fully specified, validated theme: every field the renderer needs. */
export type ResolvedTheme = Theme;

export interface Preset extends ResolvedTheme {
  name: string;
  /** One line for the picker. */
  blurb: string;
}

// Eight original presets, named in Indonesian to match the product name.
// `font` is a font family name and radius is 0–100 (100 = pill): the BE validates both.
export const PRESETS: Preset[] = [
  // Themes v3: every preset is a calm ground + 5 coordinated card surfaces + a strong accent for
  // primary buttons. Cards cycle through the surfaces; text on each surface is computed (WCAG 4.5:1).
  // `button` is the single-colour fallback (palette_mode "mono") and equals the accent.
  {
    preset: "kertas",
    name: "Kertas",
    blurb: "Warm paper with pastel cards and a magenta accent",
    bg: { type: "color", value: "#f6f3ec" },
    button: { style: "fill", radius: 12, color: "#d0106f", text_color: "#ffffff" },
    font: "Fraunces",
    text_color: "#1c1a17",
    palette: { surfaces: ["#d4ecd8", "#d6e6f7", "#f6e6a8", "#f8d3dc", "#fcd9bf"], accents: ["#d0106f"], ink: "#1c1a17", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
  {
    preset: "malam",
    name: "Malam",
    blurb: "Midnight with deep tonal cards and amber buttons",
    bg: { type: "color", value: "#0e1420" },
    button: { style: "fill", radius: 12, color: "#f2b544", text_color: "#1a1405" },
    font: "Manrope",
    text_color: "#f3ead8",
    palette: { surfaces: ["#1c2a3d", "#1d3336", "#33301f", "#3a2629", "#213328"], accents: ["#f2b544"], ink: "#f3ead8", ink_on_accent: "#1a1405" },
    palette_mode: "cycle",
  },
  {
    preset: "sawah",
    name: "Sawah",
    blurb: "Rice-field greens and straw, pill buttons",
    bg: { type: "color", value: "#f2f6ee" },
    button: { style: "fill", radius: 100, color: "#2f6b3a", text_color: "#ffffff" },
    font: "DM Sans",
    text_color: "#1c3322",
    palette: { surfaces: ["#cfe6c3", "#e6f0b0", "#c6e8da", "#f0e0b2", "#dbeccf"], accents: ["#2f6b3a"], ink: "#1c3322", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
  {
    preset: "senja",
    name: "Senja",
    blurb: "Sunset peach, apricot and rose with terracotta",
    bg: { type: "color", value: "#fff5ee" },
    button: { style: "fill", radius: 16, color: "#c2410c", text_color: "#ffffff" },
    font: "Outfit",
    text_color: "#3a1a0c",
    palette: { surfaces: ["#ffcfb8", "#ffe0a3", "#f7c6cf", "#fde0c6", "#f1d2b0"], accents: ["#c2410c"], ink: "#3a1a0c", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
  {
    preset: "laut",
    name: "Laut",
    blurb: "Sea blues and aqua on a light shore",
    bg: { type: "color", value: "#eef6f9" },
    button: { style: "fill", radius: 100, color: "#0b5c8f", text_color: "#ffffff" },
    font: "Space Grotesk",
    text_color: "#0c2a3a",
    palette: { surfaces: ["#c6e2f3", "#bfe7e1", "#d7e6f8", "#cfe0ec", "#f1e6c8"], accents: ["#0b5c8f"], ink: "#0c2a3a", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
  {
    preset: "arang",
    name: "Arang",
    blurb: "Charcoal tones, square edges, an ember accent",
    bg: { type: "color", value: "#141414" },
    button: { style: "fill", radius: 0, color: "#e8743b", text_color: "#141414" },
    font: "JetBrains Mono",
    text_color: "#f2f0eb",
    palette: { surfaces: ["#2a2724", "#22292c", "#2b2a21", "#2e2526", "#232a25"], accents: ["#e8743b"], ink: "#f2f0eb", ink_on_accent: "#141414" },
    palette_mode: "cycle",
  },
  {
    preset: "kunyit",
    name: "Kunyit",
    blurb: "Turmeric, sand and sage with hard shadows",
    bg: { type: "color", value: "#fffaea" },
    button: { style: "shadow", radius: 4, color: "#1d1d1b", text_color: "#ffffff" },
    font: "Bricolage Grotesque",
    text_color: "#2a2208",
    palette: { surfaces: ["#fbe49a", "#f6dab6", "#dcefd8", "#fde1cd", "#e9eccd"], accents: ["#1d1d1b"], ink: "#2a2208", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
  {
    preset: "batu",
    name: "Batu",
    blurb: "Quiet stones, slate buttons",
    bg: { type: "color", value: "#f1f1ee" },
    button: { style: "fill", radius: 14, color: "#2f3437", text_color: "#ffffff" },
    font: "Inter",
    text_color: "#1f2123",
    palette: { surfaces: ["#deded8", "#d6e0e4", "#e6ddcf", "#d9e3d5", "#e9dedb"], accents: ["#2f3437"], ink: "#1f2123", ink_on_accent: "#ffffff" },
    palette_mode: "cycle",
  },
];

export const DEFAULT_PRESET = "batu";

export function getPreset(id: string | undefined | null): Preset {
  return PRESETS.find((p) => p.preset === id) ?? PRESETS.find((p) => p.preset === DEFAULT_PRESET)!;
}

/** The stored theme for a preset with no overrides (what the picker writes). */
export function themeFromPreset(id: string): Theme {
  const { preset, bg, button, font, text_color, palette, palette_mode } = getPreset(id);
  return {
    preset,
    bg: { ...bg },
    button: { ...button },
    font,
    text_color,
    ...(palette ? { palette: { ...palette, surfaces: [...palette.surfaces], accents: [...palette.accents] } } : {}),
    ...(palette_mode ? { palette_mode } : {}),
  };
}

export const DEFAULT_THEME: Theme = themeFromPreset(DEFAULT_PRESET);

/** True when id is one of the presets the picker shows. */
export const isPresetId = (id: string | undefined | null) => PRESETS.some((p) => p.preset === id);

/**
 * Onboarding's Look step pre-selects a tile: a theme that isn't one of the
 * presets (new accounts start with the API's "classic") becomes the default
 * preset, saved on Continue. Returns null when the stored theme already is one.
 */
export function lookStepDraft(theme: Theme | undefined | null): Theme | null {
  return isPresetId(theme?.preset) ? null : themeFromPreset(DEFAULT_PRESET);
}

/** True when the stored theme differs from its preset (it has advanced overrides). */
export function hasOverrides(theme: Theme): boolean {
  const p = getPreset(theme.preset);
  if (p.preset !== theme.preset) return true;
  const v2: (keyof Theme)[] = ["bg_desktop", "spacing", "block", "label", "border", "shadow", "fonts", "header"];
  if (v2.some((k) => theme[k] !== undefined)) return true;
  // palette: an override only when it differs from the preset's
  if (JSON.stringify(theme.palette ?? null) !== JSON.stringify(p.palette ?? null)) return true;
  if ((theme.palette_mode ?? p.palette_mode) !== p.palette_mode) return true;
  const eq = (a: string | number, b: string | number) => String(a).toLowerCase() === String(b).toLowerCase();
  return !(
    eq(theme.bg.type, p.bg.type) &&
    eq(theme.bg.value, p.bg.value) &&
    eq(theme.button.style, p.button.style) &&
    eq(theme.button.radius, p.button.radius) &&
    eq(theme.button.color, p.button.color) &&
    eq(theme.button.text_color, p.button.text_color) &&
    eq(theme.font, p.font) &&
    eq(theme.text_color, p.text_color)
  );
}
