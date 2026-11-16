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
    // Kartu: an ink card with white text, series in their colours (magenta lightened for contrast on ink)
    return (
      <div className="min-w-44 rounded-2xl bg-foreground px-3.5 py-3 text-[13px] text-white shadow-lift">
        <div className="mb-1 text-sm font-bold">{fmtBucket(p.t, interval, true)}</div>
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between gap-6" style={k === "clicks" ? { color: "#f8d9e6" } : undefined}>
            <span>{SERIES_V2[k].label}</span>
            <b className="font-mono tabular-nums">{fmtInt(p[k] ?? 0)}</b>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 64, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#ebebe8" />
          <XAxis
            dataKey="t"
            tickFormatter={(t: string) => fmtBucket(t, interval)}
            interval="preserveStartEnd"
            minTickGap={28}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            tick={{ fill: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-dm-mono)" }}
            tickMargin={8}
          />
          <YAxis tickFormatter={fmtCompact} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--ink-3)", fontSize: 11, fontFamily: "var(--font-dm-mono)" }} width={44} />
          <Tooltip
            content={(props) => <Tip {...(props as TooltipContentProps<number, string>)} />}
            cursor={{ stroke: "var(--ink)", strokeWidth: 1, strokeDasharray: "3 4" }}
            isAnimationActive={false}
          />
          {keys.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={SERIES_V2[k].label}
              stroke={SERIES_V2[k].color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={SERIES_V2[k].dash}
              dot={false}
              activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 3 }}
              isAnimationActive={false}
              label={endLabel(k)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
