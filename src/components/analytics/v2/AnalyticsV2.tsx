"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Download, X } from "lucide-react";
import { RANGES, analyticsApi, browserTz, type AnalyticsQuery, type Dimension, type Interval, type Overview, type Totals } from "@/lib/analytics-api";
import { DIMENSION_LABELS, RANGE_LABELS, allowedIntervals, parseQuery, serializeQuery, valueLabel, withFilter } from "@/lib/analytics-query";
import { SERIES_V2, fmtBucket, fmtChange, fmtInt, fmtPct, fmtRangeLabel } from "../format";
import { SeriesChart } from "./SeriesChart";
import { BreakdownPanel } from "./BreakdownPanel";
import { BlocksPanel } from "./BlocksPanel";

export function AnalyticsV2() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const base = useMemo(() => parseQuery(new URLSearchParams(params.toString())), [params]);
  const q: AnalyticsQuery = useMemo(() => ({ ...base, tz: browserTz() }), [base]);
  const [dimension, setDimension] = useState<Dimension>("referrer");
  const [exportError, setExportError] = useState<string | null>(null);

  const go = (next: AnalyticsQuery) => {
    // keep the interval only if the new range still allows it
    if (next.interval && !allowedIntervals(next).includes(next.interval)) next = { ...next, interval: undefined };
    router.replace(`${pathname}${serializeQuery(next)}`, { scroll: false });
  };

  const overview = useQuery({ queryKey: ["analytics", "overview", q], queryFn: () => analyticsApi.overview(q), placeholderData: (p) => p });

  async function exportCsv(type: "series" | "breakdown" | "blocks") {
    setExportError(null);
    try {
      await analyticsApi.exportCsv(q, type, type === "breakdown" ? dimension : undefined);
    } catch {
      setExportError("Couldn't export the CSV. Try again.");
    }
  }

  const filters = Object.entries(q.filters ?? {}) as [Dimension, string][];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            {overview.data ? `${fmtRangeLabel(overview.data.range.from, overview.data.range.to)} · ${overview.data.range.tz}` : "Visits, clicks and where they come from."}
          </p>
        </div>
        <Toolbar q={q} onChange={go} onExport={() => exportCsv("series")} interval={overview.data?.range.interval} />
      </header>

      {exportError ? (
        <p role="alert" className="text-sm text-danger">
          {exportError}
        </p>
      ) : null}

      {filters.length ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          <span className="text-sm text-muted">Filtered by</span>
          {filters.map(([d, v]) => (
            <button
              key={d}
              type="button"
              onClick={() => go(withFilter(q, d, undefined))}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm text-foreground hover:border-muted"
              aria-label={`Remove filter ${DIMENSION_LABELS[d]}: ${valueLabel(d, v)}`}
            >
              <span className="text-muted">{DIMENSION_LABELS[d]}:</span> {valueLabel(d, v)}
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ))}
          <button type="button" onClick={() => go({ ...q, filters: undefined })} className="min-h-8 px-2 text-sm text-muted underline-offset-2 hover:underline">
            Clear all
          </button>
        </div>
      ) : null}

      {overview.isError && !overview.data ? (
        <div className="rounded-xl border border-line bg-surface py-10 text-center">
          <p className="text-sm text-foreground">Couldn&apos;t load analytics.</p>
          <button type="button" onClick={() => overview.refetch()} className="mt-3 min-h-10 rounded-lg border border-line px-4 text-sm font-medium hover:border-muted">
            Try again
          </button>
        </div>
      ) : !overview.data ? (
        <div className="flex animate-pulse flex-col gap-6" aria-label="Loading analytics">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[104px] rounded-xl border border-line bg-surface" />
            ))}
          </div>
          <div className="h-[380px] rounded-xl border border-line bg-surface" />
        </div>
      ) : (
        <div className={`flex flex-col gap-6 transition-opacity ${overview.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={overview.isFetching}>
          <Kpis data={overview.data} />
          <SeriesCard data={overview.data} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BreakdownPanel
          q={q}
          dimension={dimension}
          onDimension={setDimension}
          onFilter={(d, v) => go(withFilter(q, d, q.filters?.[d] === v ? undefined : v))}
          onExport={() => exportCsv("breakdown")}
        />
        <BlocksPanel q={q} onExport={() => exportCsv("blocks")} />
      </div>
    </div>
  );
}

function Toolbar({
  q,
  onChange,
  onExport,
  interval,
}: {
  q: AnalyticsQuery;
  onChange: (q: AnalyticsQuery) => void;
  onExport: () => void;
  interval?: Interval;
}) {
  const allowed = allowedIntervals(q);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="range">
        Date range
      </label>
      <select
        id="range"
        value={q.range}
        onChange={(e) => {
          const range = e.target.value as AnalyticsQuery["range"];
          onChange(range === "custom" ? { ...q, range, from: q.from ?? monthAgo, to: q.to ?? today } : { ...q, range, from: undefined, to: undefined });
        }}
        className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium"
      >
        {RANGES.map((r) => (
          <option key={r} value={r}>
            {RANGE_LABELS[r]}
          </option>
        ))}
      </select>
      {q.range === "custom" ? (
        <div className="flex items-center gap-1.5 text-sm">
          <label className="sr-only" htmlFor="from">
            From
          </label>
          <input id="from" type="date" max={q.to ?? today} value={q.from ?? ""} onChange={(e) => e.target.value && onChange({ ...q, from: e.target.value })} className="min-h-10 rounded-lg border border-line bg-surface px-2" />
          <span className="text-muted">to</span>
          <label className="sr-only" htmlFor="to">
            To
          </label>
          <input id="to" type="date" min={q.from} max={today} value={q.to ?? ""} onChange={(e) => e.target.value && onChange({ ...q, to: e.target.value })} className="min-h-10 rounded-lg border border-line bg-surface px-2" />
        </div>
      ) : null}
      <div role="radiogroup" aria-label="Interval" className="flex rounded-lg border border-line bg-surface p-1">
        {(["hour", "day", "week"] as Interval[]).map((i) => {
          const on = (q.interval ?? interval) === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={!allowed.includes(i)}
              onClick={() => onChange({ ...q, interval: i })}
              className={`min-h-8 rounded-md px-2.5 text-sm font-medium capitalize transition disabled:opacity-30 ${on ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {i}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onExport} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-medium hover:border-muted">
        <Download className="h-4 w-4" aria-hidden /> Export CSV
      </button>
    </div>
  );
}

const KPI: { key: keyof Totals; label: string; fmt: (n: number) => string; swatch?: string; hint?: string }[] = [
  { key: "visitors", label: "Visitors", fmt: fmtInt, swatch: SERIES_V2.visitors.color },
  { key: "views", label: "Views", fmt: fmtInt, swatch: SERIES_V2.views.color },
  { key: "clicks", label: "Clicks", fmt: fmtInt, swatch: SERIES_V2.clicks.color },
  { key: "ctr", label: "Click-through", fmt: fmtPct, hint: "clicks ÷ views" },
  { key: "engagement", label: "Engagement", fmt: fmtPct, hint: "visitors who clicked" },
];

function Kpis({ data }: { data: Overview }) {
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {KPI.map((k) => {
        const ch = fmtChange(data.change[k.key]);
        return (
          <div key={k.key} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center gap-1.5 text-sm text-muted" title={k.hint}>
              {k.swatch ? <span className="h-2 w-2 rounded-full" style={{ background: k.swatch }} aria-hidden /> : null}
              {k.label}
            </div>
            <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground">{k.fmt(data.totals[k.key])}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted">
              {ch.dir === "up" ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : ch.dir === "down" ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> : null}
              <span className="font-mono tabular-nums text-foreground">{ch.text}</span>
              <span>vs previous {k.fmt(data.previous[k.key])}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function SeriesCard({ data }: { data: Overview }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const keys = ["visitors", "views", "clicks"] as const;
  const empty = data.totals.views === 0 && data.totals.clicks === 0;
  return (
    <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="series-h">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="series-h" className="text-base font-semibold text-foreground">
            Visitors, views and clicks
          </h2>
          <p className="text-xs text-muted">
            Per {data.range.interval}
            {data.top_link ? ` · top link: ${data.top_link.title} (${fmtInt(data.top_link.clicks)} clicks)` : ""}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <ul className="flex items-center gap-4 text-sm text-muted" aria-label="Legend">
            {keys.map((k) => (
              <li key={k} className="flex items-center gap-2">
                <svg width="16" height="4" aria-hidden>
                  <line x1="0" y1="2" x2="16" y2="2" stroke={SERIES_V2[k].color} strokeWidth="2" strokeDasharray={SERIES_V2[k].dash} />
                </svg>
                {SERIES_V2[k].label}
              </li>
            ))}
          </ul>
          <div role="radiogroup" aria-label="Display" className="flex rounded-md bg-black/5 p-0.5 text-xs">
            {(["chart", "table"] as const).map((v) => (
              <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)} className={`min-h-8 rounded px-2.5 font-medium capitalize ${view === v ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      {empty ? (
        <p className="py-16 text-center text-sm text-muted">No visits in this period yet. Share your page link or QR code and visits will show up here.</p>
      ) : view === "chart" ? (
        <SeriesChart data={data.series} keys={[...keys]} interval={data.range.interval} />
      ) : (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">Time</th>
                <th className="py-2 text-right font-medium">Visitors</th>
                <th className="py-2 text-right font-medium">Views</th>
                <th className="py-2 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {[...data.series].reverse().map((p) => (
                <tr key={p.t} className="border-t border-line">
                  <td className="py-1.5 font-sans">{fmtBucket(p.t, data.range.interval, true)}</td>
                  <td className="py-1.5 text-right">{fmtInt(p.visitors)}</td>
                  <td className="py-1.5 text-right">{fmtInt(p.views)}</td>
                  <td className="py-1.5 text-right">{fmtInt(p.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
