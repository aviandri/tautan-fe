// Series colours, validated with the dataviz validator against the light card surface
// (lightness band, chroma, CVD ΔE 8.5, contrast >= 3:1). Brand green and accent orange are too
// dark or grey for marks, so these are lighter steps of the same hues. Views is always green and
// clicks always orange, wherever they appear.
export const SERIES = {
  views: { label: "Views", color: "#24876a" },
  clicks: { label: "Clicks", color: "#cf5d26" },
} as const;

const nf = new Intl.NumberFormat("en");
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf.format(Math.round(n));
export const fmtCompact = (n: number) => (Math.abs(n) >= 10_000 ? compact.format(n) : nf.format(Math.round(n)));
export const fmtPct = (r: number) => `${(r * 100).toFixed(r > 0 && r < 0.1 ? 1 : 0)}%`;

/** "2026-11-16" -> "16 Nov" without timezone drift (dates are UTC days). */
export function fmtDay(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(d);
}

export function referrerLabel(r: string): string {
  if (!r || r === "direct") return "Direct or unknown";
  return r.replace(/^www\./, "");
}
