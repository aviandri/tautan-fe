"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { AnalyticsSummary } from "@/lib/types";
import { SERIES, fmtCompact, fmtDay, fmtInt, fmtPct } from "./format";

type Point = AnalyticsSummary["series"][number];

function ChartTooltip({ active, payload }: TooltipContentProps<number, string>) {
  const p = payload?.[0]?.payload as Point | undefined;
  if (!active || !p) return null;
  return (
    <div className="min-w-40 rounded-lg border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <div className="mb-1.5 font-medium text-foreground">{fmtDay(p.date, { weekday: "short", day: "numeric", month: "short" })}</div>
      {(["views", "clicks"] as const).map((k) => (
        <div key={k} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-0.5 w-3 rounded-full" style={{ background: SERIES[k].color }} aria-hidden />
            {SERIES[k].label}
          </span>
          <span className="font-mono tabular-nums text-foreground">{fmtInt(p[k])}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between gap-6 border-t border-line pt-1">
        <span className="text-muted">CTR</span>
        <span className="font-mono tabular-nums text-foreground">{p.views ? fmtPct(p.clicks / p.views) : "–"}</span>
      </div>
    </div>
  );
}

/** Views and clicks share one count axis (same unit), so one chart, never two y-scales. */
export function TimeSeriesChart({ series }: { series: Point[] }) {
  const n = series.length;
  // direct labels at the line ends; the series that ends higher gets its label above the point
  const last = series[n - 1];
  const viewsOnTop = !last || last.views >= last.clicks;
  const endLabel = (k: "views" | "clicks") =>
    function EndLabel(props: { index?: number; x?: number | string; y?: number | string }) {
      if (props.index !== n - 1 || props.x == null || props.y == null) return null;
      const above = (k === "views") === viewsOnTop;
      return (
        <text x={Number(props.x) + 6} y={Number(props.y) + (above ? -6 : 14)} fontSize={12} fill="var(--foreground)">
          {SERIES[k].label}
        </text>
      );
    };
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 16, right: 56, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => fmtDay(d)}
            // width-aware: recharts drops ticks that would sit closer than minTickGap
            interval="preserveStartEnd"
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickMargin={8}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={fmtCompact}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            width={44}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...(props as TooltipContentProps<number, string>)} />}
            cursor={{ stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "3 3" }}
            isAnimationActive={false}
          />
          {(["views", "clicks"] as const).map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              name={SERIES[k].label}
              stroke={SERIES[k].color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
              label={endLabel(k)}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
