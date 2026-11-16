// The customiser edits gradients as two stops plus an angle; the stored value is a CSS string.

export interface SimpleGradient {
  angle: number;
  from: string;
  to: string;
}

export const DEFAULT_GRADIENT: SimpleGradient = { angle: 160, from: "#ff7a59", to: "#ffb35c" };

export function toGradientCss(g: SimpleGradient): string {
  return `linear-gradient(${Math.round(g.angle)}deg, ${g.from} 0%, ${g.to} 100%)`;
}

/** Best-effort parse of a linear-gradient with two hex stops; null if it's anything fancier. */
export function parseGradient(css: string | undefined): SimpleGradient | null {
  if (!css) return null;
  const m = css.match(/^linear-gradient\(\s*(-?\d+(?:\.\d+)?)deg\s*,\s*(#[0-9a-f]{3,8})\b[^,]*,\s*(#[0-9a-f]{3,8})\b[^)]*\)$/i);
  if (!m) return null;
  return { angle: Number(m[1]), from: m[2], to: m[3] };
}
