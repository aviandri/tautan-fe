/** Tap counts for the editor (Kartu: "412 taps" on each card, a weekly trend in the inspector). */
import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "../analytics-api";

/** Clicks per block over the last 7 days. */
export function useTapCounts() {
  return useQuery({
    queryKey: ["analytics", "editor-taps", "7d"],
    queryFn: () => analyticsApi.blocks({ range: "7d" }),
    staleTime: 60_000,
    select: (r) => new Map(r.items.map((i) => [i.block_id, i.clicks])),
    retry: false,
  });
}

export interface Trend {
  week: number;
  /** % vs the 7 days before, null when there were none */
  change: number | null;
  /** last 14 daily counts, oldest first */
  points: number[];
}

/** Split a daily series into this week vs last week (exported for tests). */
export function trendFrom(series: { clicks: number }[]): Trend {
  const days = series.map((s) => s.clicks);
  const last = days.slice(-7);
  const prev = days.slice(-14, -7);
  const week = last.reduce((a, b) => a + b, 0);
  const before = prev.reduce((a, b) => a + b, 0);
  return { week, change: before ? Math.round(((week - before) / before) * 100) : null, points: days.slice(-14) };
}

export function useBlockTrend(blockId: string | undefined) {
  return useQuery({
    queryKey: ["analytics", "editor-trend", blockId],
    enabled: !!blockId,
    queryFn: () => analyticsApi.blockSeries({ range: "30d", interval: "day" }, blockId!),
    staleTime: 60_000,
    select: (r) => trendFrom(r.series),
    retry: false,
  });
}

/** SVG path for a sparkline of `points` in a w×h box. */
export function sparkPath(points: number[], w: number, h: number, pad = 3): string {
  if (points.length < 2) return "";
  const max = Math.max(1, ...points);
  const step = (w - pad * 2) / (points.length - 1);
  return points.map((p, i) => `${i ? "L" : "M"}${(pad + i * step).toFixed(1)} ${(h - pad - (p / max) * (h - pad * 2)).toFixed(1)}`).join(" ");
}
