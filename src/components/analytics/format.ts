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

// ---- Analytics v2 ----

// Three-series palette, validated with the dataviz checker (all pairs; worst protan ΔE 8.5).
// Visitors also draws dashed, so the green/blue pair never relies on colour alone.
export const SERIES_V2 = {
  // Kartu: visitors in ink, taps in magenta (contrast 21:1 and 5.3:1 on the white card, L* gap 46,
  // so the pair stays apart for every colour-vision type). Views is a dashed grey for the table and
  // per-block charts.
  visitors: { label: "Visitors", color: "#000000", dash: undefined },
  views: { label: "Views", color: "#66665f", dash: "5 4" },
  clicks: { label: "Taps", color: "#d0106f", dash: undefined },
} as const;
export type SeriesKey = keyof typeof SERIES_V2;

/** Bucket label: "16 Nov 14:00" (hour), "16 Nov" (day), "w/c 16 Nov" (week). */
export function fmtBucket(t: string, interval: "hour" | "day" | "week", long = false): string {
  if (interval === "hour") {
    const [d, h] = t.split("T");
    return long ? `${fmtDay(d, { weekday: "short", day: "numeric", month: "short" })} ${h}` : h === "00:00" ? fmtDay(d) : h;
  }
  const day = fmtDay(t.slice(0, 10), long ? { weekday: "short", day: "numeric", month: "short" } : undefined);
  return interval === "week" ? `w/c ${day}` : day;
}

export function fmtChange(c: number | null): { text: string; dir: "up" | "down" | "flat" | "new" } {
  if (c === null) return { text: "new", dir: "new" };
  if (c === 0) return { text: "0%", dir: "flat" };
  return { text: `${c > 0 ? "+" : ""}${c.toFixed(1)}%`, dir: c > 0 ? "up" : "down" };
}

/** The BE's range.to is exclusive (midnight after the last day), so show the day before it. */
export function fmtRangeLabel(from: string, toExclusive: string): string {
  const f = from.slice(0, 10);
  const end = new Date(`${toExclusive.slice(0, 10)}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() - 1);
  const t = end.toISOString().slice(0, 10);
  return f === t ? fmtDay(f) : `${fmtDay(f)} – ${fmtDay(t)}`;
}
