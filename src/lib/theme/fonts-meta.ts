// Curated Google Fonts. Pure metadata (no next/font import) so theme logic stays testable.
// Each `cssVar` is defined by the matching next/font loader in ./fonts.ts.

export interface FontOption {
  id: string;
  label: string;
  cssVar: string;
  fallback: string;
  category: "sans" | "serif" | "display" | "mono";
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "inter", label: "Inter", cssVar: "--font-inter", fallback: "system-ui, sans-serif", category: "sans" },
  // Kartu's own face; its variable is set on <html> by the root layout (src/app/fonts.ts)
  { id: "urbanist", label: "Urbanist", cssVar: "--font-urbanist", fallback: "system-ui, sans-serif", category: "sans" },
  { id: "dm-sans", label: "DM Sans", cssVar: "--font-dm-sans", fallback: "system-ui, sans-serif", category: "sans" },
  { id: "manrope", label: "Manrope", cssVar: "--font-manrope", fallback: "system-ui, sans-serif", category: "sans" },
  { id: "outfit", label: "Outfit", cssVar: "--font-outfit", fallback: "system-ui, sans-serif", category: "sans" },
  { id: "space-grotesk", label: "Space Grotesk", cssVar: "--font-space-grotesk", fallback: "system-ui, sans-serif", category: "display" },
  { id: "bricolage", label: "Bricolage Grotesque", cssVar: "--font-bricolage", fallback: "system-ui, sans-serif", category: "display" },
  { id: "fraunces", label: "Fraunces", cssVar: "--font-fraunces", fallback: "Georgia, serif", category: "serif" },
  { id: "playfair", label: "Playfair Display", cssVar: "--font-playfair", fallback: "Georgia, serif", category: "serif" },
  { id: "lora", label: "Lora", cssVar: "--font-lora", fallback: "Georgia, serif", category: "serif" },
  { id: "jetbrains-mono", label: "JetBrains Mono", cssVar: "--font-jetbrains-mono", fallback: "ui-monospace, monospace", category: "mono" },
];

export const DEFAULT_FONT = "inter";

/** Match by id or by family name ("Inter"), case-insensitively. */
export function findFont(v: string | undefined | null): FontOption | undefined {
  if (!v) return undefined;
  const k = v.trim().toLowerCase();
  return FONT_OPTIONS.find((o) => o.id === k || o.label.toLowerCase() === k);
}

export function fontStack(id: string | undefined): string {
  const f = findFont(id) ?? findFont(DEFAULT_FONT)!;
  return `var(${f.cssVar}), ${f.fallback}`;
}
