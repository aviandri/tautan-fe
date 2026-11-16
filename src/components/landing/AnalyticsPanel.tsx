"use client";

import { TimeSeriesChart } from "@/components/analytics/TimeSeriesChart";
import { TopList } from "@/components/analytics/TopList";
import { SERIES, fmtInt, fmtPct } from "@/components/analytics/format";
import s from "./landing.module.css";

// A UI sample for the product shot (not a claim about anyone's results).
const series = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 18 + i));
  const wk = d.getUTCDay() === 0 || d.getUTCDay() === 6;
  const views = Math.round((wk ? 132 : 88) + ((i * 37) % 23) + i * 0.9);
  return { date: d.toISOString().slice(0, 10), views, clicks: Math.round(views * (0.31 + ((i * 13) % 9) / 100)) };
});
const views = series.reduce((a, x) => a + x.views, 0);
const clicks = series.reduce((a, x) => a + x.clicks, 0);

export function AnalyticsPanel() {
  return (
    <div className={`${s.card} flex flex-col gap-5 p-5`} aria-label="Analytics dashboard" role="img">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Views", fmtInt(views), SERIES.views.color],
          ["Clicks", fmtInt(clicks), SERIES.clicks.color],
          ["CTR", fmtPct(clicks / views), undefined],
        ].map(([label, value, color]) => (
          <div key={label} className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted">
              {color ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} /> : null}
              {label}
            </div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="pointer-events-none -mx-2">
        <TimeSeriesChart series={series} />
      </div>
      <TopList
        rows={[
          { key: "ig", label: "instagram.com", value: 1412 },
          { key: "d", label: "Direct or unknown", value: 806 },
          { key: "tt", label: "tiktok.com", value: 529 },
        ]}
        color={SERIES.views.color}
        unit="views"
        empty=""
      />
    </div>
  );
}
