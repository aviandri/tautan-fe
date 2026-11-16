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
  {
    preset: "kertas",
    name: "Kertas",
    blurb: "Warm paper, ink outlines, a serif voice",
    bg: { type: "color", value: "#f5efe3" },
    button: { style: "outline", radius: 6, color: "#1c1a17", text_color: "#1c1a17" },
    font: "Fraunces",
    text_color: "#1c1a17",
  },
  {
    preset: "malam",
    name: "Malam",
    blurb: "Midnight navy with amber buttons",
    bg: { type: "color", value: "#0f172a" },
    button: { style: "fill", radius: 12, color: "#f2b544", text_color: "#0f172a" },
    font: "Manrope",
    text_color: "#f3ead8",
  },
  {
    preset: "sawah",
    name: "Sawah",
    blurb: "Soft rice-field green, pill buttons",
    bg: { type: "color", value: "#dde7d3" },
    button: { style: "fill", radius: 100, color: "#2f5d3a", text_color: "#f4f1e6" },
    font: "DM Sans",
    text_color: "#1f3324",
  },
  {
    preset: "senja",
    name: "Senja",
    blurb: "Sunset coral fading into apricot",
    bg: { type: "gradient", value: "linear-gradient(160deg, #ff7a59 0%, #ffb35c 100%)" },
    button: { style: "fill", radius: 16, color: "#fff7ee", text_color: "#3a1608" },
    font: "Outfit",
    text_color: "#2a1208",
  },
  {
    preset: "laut",
    name: "Laut",
    blurb: "Deep sea teal, light outlines",
    bg: { type: "gradient", value: "linear-gradient(180deg, #0f4c5c 0%, #0a2540 100%)" },
    button: { style: "outline", radius: 100, color: "#e6f6f4", text_color: "#e6f6f4" },
    font: "Space Grotesk",
    text_color: "#e6f6f4",
  },
  {
    preset: "arang",
    name: "Arang",
    blurb: "Charcoal, square edges, monospace",
    bg: { type: "color", value: "#121212" },
    button: { style: "fill", radius: 0, color: "#f2f2f2", text_color: "#121212" },
    font: "JetBrains Mono",
    text_color: "#f2f2f2",
  },
  {
    preset: "kunyit",
    name: "Kunyit",
    blurb: "Turmeric yellow with hard shadows",
    bg: { type: "color", value: "#ffd23f" },
    button: { style: "shadow", radius: 4, color: "#ffffff", text_color: "#111111" },
    font: "Bricolage Grotesque",
    text_color: "#111111",
  },
  {
    preset: "batu",
    name: "Batu",
    blurb: "Quiet stone grey, white cards",
    bg: { type: "color", value: "#ebebe8" },
    button: { style: "fill", radius: 14, color: "#ffffff", text_color: "#222222" },
    font: "Inter",
    text_color: "#222222",
  },
];

export const DEFAULT_PRESET = "batu";

export function getPreset(id: string | undefined | null): Preset {
  return PRESETS.find((p) => p.preset === id) ?? PRESETS.find((p) => p.preset === DEFAULT_PRESET)!;
}

/** The stored theme for a preset with no overrides (what the picker writes). */
export function themeFromPreset(id: string): Theme {
  const { preset, bg, button, font, text_color } = getPreset(id);
  return { preset, bg: { ...bg }, button: { ...button }, font, text_color };
}

export const DEFAULT_THEME: Theme = themeFromPreset(DEFAULT_PRESET);

/** True when the stored theme differs from its preset (it has advanced overrides). */
export function hasOverrides(theme: Theme): boolean {
  const p = getPreset(theme.preset);
  if (p.preset !== theme.preset) return true;
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
