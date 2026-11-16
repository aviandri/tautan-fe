"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { SERIES_V2, fmtBucket, fmtCompact, fmtInt, type SeriesKey } from "../format";

type Point = { t: string } & Partial<Record<SeriesKey, number>>;

/**
 * Lines on one count axis (all series are counts), crosshair tooltip, direct end labels.
 * Used for the overview (visitors, views, clicks) and the per-block series (clicks).
 */
export function SeriesChart({
  data,
  keys,
  interval,
  height = 288,
}: {
  data: Point[];
  keys: SeriesKey[];
  interval: "hour" | "day" | "week";
  height?: number;
}) {
  const last = data[data.length - 1];
  // order end labels by their final value so they stack without overlapping
  const order = [...keys].sort((a, b) => (last?.[b] ?? 0) - (last?.[a] ?? 0));
  const endLabel = (k: SeriesKey) =>
    function EndLabel(props: { index?: number; x?: number | string; y?: number | string }) {
      if (props.index !== data.length - 1 || props.x == null || props.y == null) return null;
      // spread labels 14px apart by rank around the line end, so equal values never overlap
      const rank = order.indexOf(k);
      const dy = 4 + (rank - (keys.length - 1) / 2) * 14;
      return (
        <text x={Number(props.x) + 6} y={Number(props.y) + dy} fontSize={12} fill="var(--ink)">
          {SERIES_V2[k].label}
        </text>
      );
    };

  function Tip({ active, payload }: TooltipContentProps<number, string>) {
    const p = payload?.[0]?.payload as Point | undefined;
    if (!active || !p) return null;
    return (
      <div className="min-w-44 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
        <div className="mb-1.5 font-medium text-foreground">{fmtBucket(p.t, interval, true)}</div>
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-muted">
              <svg width="14" height="4" aria-hidden>
                <line x1="0" y1="2" x2="14" y2="2" stroke={SERIES_V2[k].color} strokeWidth="2" strokeDasharray={SERIES_V2[k].dash} />
              </svg>
              {SERIES_V2[k].label}
            </span>
            <span className="font-mono tabular-nums text-foreground">{fmtInt(p[k] ?? 0)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 64, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="t"
            tickFormatter={(t: string) => fmtBucket(t, interval)}
            interval="preserveStartEnd"
            minTickGap={28}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            tick={{ fill: "var(--ink-3)", fontSize: 12 }}
            tickMargin={8}
          />
          <YAxis tickFormatter={fmtCompact} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--ink-3)", fontSize: 12 }} width={44} />
          <Tooltip
            content={(props) => <Tip {...(props as TooltipContentProps<number, string>)} />}
            cursor={{ stroke: "var(--ink-3)", strokeWidth: 1, strokeDasharray: "3 3" }}
            isAnimationActive={false}
          />
          {keys.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={SERIES_V2[k].label}
              stroke={SERIES_V2[k].color}
              strokeWidth={2}
              strokeDasharray={SERIES_V2[k].dash}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={endLabel(k)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
