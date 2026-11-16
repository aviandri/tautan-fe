"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AnalyticsRange, AnalyticsSummary } from "@/lib/types";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { TopList } from "./TopList";
import { SERIES, fmtDay, fmtInt, fmtPct, referrerLabel } from "./format";

const RANGES: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function isRange(v: string | null): v is AnalyticsRange {
  return v === "7d" || v === "30d" || v === "90d";
}

export function AnalyticsDashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const range: AnalyticsRange = isRange(params.get("range")) ? (params.get("range") as AnalyticsRange) : "7d";
  const setRange = (r: AnalyticsRange) => router.replace(r === "7d" ? "?" : `?range=${r}`, { scroll: false });

  const q = useQuery({
    queryKey: ["analytics", "summary", range],
    queryFn: () => api.analytics.summary(range),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted">Visits to your page and clicks on your links.</p>
        </div>
        <RangeControl value={range} onChange={setRange} />
      </header>

      {q.isError && !q.data ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-foreground">Couldn&apos;t load analytics.</p>
            <button
              type="button"
              onClick={() => q.refetch()}
              className="min-h-10 rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:border-muted"
            >
              Try again
            </button>
          </div>
        </Card>
      ) : !q.data ? (
        <Skeleton />
      ) : (
        <Body data={q.data} range={range} stale={q.isFetching && q.isPlaceholderData} />
      )}
    </div>
  );
}

function Body({ data, range, stale }: { data: AnalyticsSummary; range: AnalyticsRange; stale: boolean }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const noData = data.views === 0 && data.clicks === 0;

  return (
    <div className={`flex flex-col gap-6 transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
      <section aria-label="Totals" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Views" value={fmtInt(data.views)} swatch={SERIES.views.color} />
        <Stat label="Clicks" value={fmtInt(data.clicks)} swatch={SERIES.clicks.color} />
        <Stat label="Click-through rate" value={data.views ? fmtPct(data.ctr) : "–"} hint="clicks ÷ views" />
      </section>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Views and clicks per day</h2>
            <p className="text-xs text-muted">Last {days} days, UTC</p>
          </div>
          <div className="flex items-center gap-4">
            <ul className="flex items-center gap-4 text-sm text-muted" aria-label="Legend">
              {(["views", "clicks"] as const).map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="h-0.5 w-4 rounded-full" style={{ background: SERIES[k].color }} aria-hidden />
                  {SERIES[k].label}
                </li>
              ))}
            </ul>
            <div role="radiogroup" aria-label="Display" className="flex rounded-md bg-black/5 p-0.5 text-xs">
              {(["chart", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  onClick={() => setView(v)}
                  className={`min-h-8 rounded px-2.5 font-medium capitalize ${view === v ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
        {noData ? (
          <p className="py-16 text-center text-sm text-muted">
            No visits in this period yet. Share your page link or QR code and visits will show up here.
          </p>
        ) : view === "chart" ? (
          <TimeSeriesChart series={data.series} />
        ) : (
          <SeriesTable series={data.series} />
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-base font-semibold text-foreground">Top links</h2>
          <TopList
            rows={data.top_links.map((l) => ({ key: l.block_id, label: l.title || "Untitled link", value: l.clicks }))}
            color={SERIES.clicks.color}
            unit="clicks"
            empty="No link clicks in this period."
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-base font-semibold text-foreground">Top referrers</h2>
          <TopList
            rows={data.top_referrers.map((r) => ({ key: r.referrer || "direct", label: referrerLabel(r.referrer), value: r.count }))}
            color={SERIES.views.color}
            unit="views"
            empty="No visits in this period."
          />
        </Card>
      </div>
    </div>
  );
}

function RangeControl({ value, onChange }: { value: AnalyticsRange; onChange: (r: AnalyticsRange) => void }) {
  return (
    <div role="radiogroup" aria-label="Date range" className="flex rounded-lg border border-line bg-surface p-1">
      {RANGES.map((r) => (
        <button
          key={r.value}
          type="button"
          role="radio"
          aria-checked={value === r.value}
          onClick={() => onChange(r.value)}
          className={`min-h-9 rounded-md px-3 text-sm font-medium transition ${
            value === r.value ? "bg-foreground text-background" : "text-muted hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-xl border border-line bg-surface p-5">{children}</section>;
}

function Stat({ label, value, swatch, hint }: { label: string; value: string; swatch?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        {swatch ? <span className="h-2 w-2 rounded-full" style={{ background: swatch }} aria-hidden /> : null}
        {label}
        {hint ? <span className="text-xs">({hint})</span> : null}
      </div>
      <div className="mt-2 font-mono text-3xl font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
    </div>
  );
}

function SeriesTable({ series }: { series: AnalyticsSummary["series"] }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
          <tr>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 text-right font-medium">Views</th>
            <th className="py-2 text-right font-medium">Clicks</th>
            <th className="py-2 text-right font-medium">CTR</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {[...series].reverse().map((p) => (
            <tr key={p.date} className="border-t border-line">
              <td className="py-1.5 font-sans">{fmtDay(p.date, { weekday: "short", day: "numeric", month: "short" })}</td>
              <td className="py-1.5 text-right">{fmtInt(p.views)}</td>
              <td className="py-1.5 text-right">{fmtInt(p.clicks)}</td>
              <td className="py-1.5 text-right">{p.views ? fmtPct(p.clicks / p.views) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-label="Loading analytics">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[106px] rounded-xl border border-line bg-surface" />
        ))}
      </div>
      <div className="h-[380px] rounded-xl border border-line bg-surface" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-64 rounded-xl border border-line bg-surface" />
        <div className="h-64 rounded-xl border border-line bg-surface" />
      </div>
    </div>
  );
}
