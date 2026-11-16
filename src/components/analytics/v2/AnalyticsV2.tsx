"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, TrendingUp, X } from "lucide-react";
import { RANGES, analyticsApi, browserTz, type AnalyticsQuery, type Dimension, type Interval, type Overview, type Totals } from "@/lib/analytics-api";
import { DIMENSION_LABELS, RANGE_LABELS, allowedIntervals, parseQuery, serializeQuery, valueLabel, withFilter } from "@/lib/analytics-query";
import { SERIES_V2, fmtBucket, fmtChange, fmtInt, fmtPct, fmtRangeLabel } from "../format";
import { SeriesChart } from "./SeriesChart";
import { BreakdownPanel } from "./BreakdownPanel";
import { BlocksPanel } from "./BlocksPanel";

// Kartu "Insights": a plain-language highlight, pastel KPI tiles vs the previous period, the chart,
// and top cards + sources side by side (click a row to filter the whole page). All state is in the URL.

const SEG_RANGES = ["today", "7d", "30d", "90d"] as const;
const SEG_LABEL: Record<(typeof SEG_RANGES)[number], string> = { today: "Today", "7d": "7 days", "30d": "30 days", "90d": "90 days" };

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
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3.5">
      <header className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">
          <h1 className="text-[36px] font-semibold leading-none tracking-[-0.045em] text-foreground">Insights</h1>
          {overview.data ? (
            <p className="mt-1.5 text-sm text-muted">
              {fmtRangeLabel(overview.data.range.from, overview.data.range.to)} · {overview.data.range.tz}
            </p>
          ) : null}
        </div>
        {filters.map(([d, v]) => (
          <button
            key={d}
            type="button"
            onClick={() => go(withFilter(q, d, undefined))}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-sm font-semibold text-brand-hover transition-colors hover:bg-[#f7cfe0]"
            aria-label={`Remove filter ${DIMENSION_LABELS[d]}: ${valueLabel(d, v)}`}
          >
            {DIMENSION_LABELS[d]}: {valueLabel(d, v)}
            <X className="h-3 w-3" strokeWidth={3} aria-hidden />
          </button>
        ))}
        <RangeControl q={q} onChange={go} />
        <button
          type="button"
          onClick={() => exportCsv("series")}
          className="inline-flex h-[38px] items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-foreground shadow-[inset_0_0_0_1px_var(--line-2)] transition hover:shadow-[inset_0_0_0_1px_var(--ink)] active:scale-[0.97]"
        >
          <Download className="h-4 w-4" aria-hidden /> Export CSV
        </button>
      </header>

      {exportError ? (
        <p role="alert" className="text-sm text-danger">
          {exportError}
        </p>
      ) : null}

      {overview.isError && !overview.data ? (
        <div className="rounded-k-l bg-surface py-10 text-center shadow-card">
          <p className="text-sm text-foreground">Couldn&apos;t load your insights.</p>
          <button type="button" onClick={() => overview.refetch()} className="mt-3 inline-flex h-[38px] items-center rounded-full bg-sunken px-4 text-sm font-semibold hover:bg-[#e1e1dd]">
            Try again
          </button>
        </div>
      ) : !overview.data ? (
        <div className="flex animate-pulse flex-col gap-3.5" aria-label="Loading insights">
          <div className="h-[64px] rounded-[24px] bg-sunken" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-[118px] rounded-[24px] bg-sunken" />
            ))}
          </div>
          <div className="h-[380px] rounded-k-l bg-sunken" />
        </div>
      ) : (
        <div className={`flex flex-col gap-3.5 transition-opacity ${overview.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={overview.isFetching}>
          <Highlight data={overview.data} rangeKey={q.range} />
          <Kpis data={overview.data} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="min-w-0 flex-[2_1_600px]">{overview.data ? <SeriesCard data={overview.data} q={q} onChange={go} /> : null}</div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-3">
          <BlocksPanel q={q} onExport={() => exportCsv("blocks")} />
          <BreakdownPanel
            q={q}
            dimension={dimension}
            onDimension={setDimension}
            onFilter={(d, v) => go(withFilter(q, d, q.filters?.[d] === v ? undefined : v))}
            onExport={() => exportCsv("breakdown")}
          />
        </div>
      </div>
    </div>
  );
}

function RangeControl({ q, onChange }: { q: AnalyticsQuery; onChange: (q: AnalyticsQuery) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const set = (range: AnalyticsQuery["range"]) =>
    onChange(range === "custom" ? { ...q, range, from: q.from ?? monthAgo, to: q.to ?? today } : { ...q, range, from: undefined, to: undefined });
  const more = RANGES.filter((r) => !(SEG_RANGES as readonly string[]).includes(r));
  const inMore = more.includes(q.range as (typeof more)[number]);
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="Date range" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-sunken p-1 [scrollbar-width:none]">
        {SEG_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={q.range === r}
            onClick={() => set(r)}
            className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${q.range === r ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:text-foreground"}`}
          >
            {SEG_LABEL[r]}
          </button>
        ))}
        {/* the visible chip sizes to its text; the native select sits on top, transparent, so the
            ▾ stays next to the label (a select is as wide as its longest option) */}
        <label className={`relative inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-full px-4 text-sm font-semibold ${inMore ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2"}`}>
          <span>{inMore ? RANGE_LABELS[q.range] : "More"}</span>
          <span aria-hidden className="text-xs text-muted">
            ▾
          </span>
          <select
            aria-label="More ranges"
            value={inMore ? q.range : ""}
            onChange={(e) => e.target.value && set(e.target.value as AnalyticsQuery["range"])}
            className="absolute inset-0 cursor-pointer appearance-none opacity-0"
          >
            <option value="">More</option>
            {more.map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {q.range === "custom" ? (
        <div className="flex items-center gap-1.5 text-sm">
          <label className="sr-only" htmlFor="from">
            From
          </label>
          <input id="from" type="date" max={q.to ?? today} value={q.from ?? ""} onChange={(e) => e.target.value && onChange({ ...q, from: e.target.value })} className="h-[38px] rounded-k-s bg-background px-3 shadow-[inset_0_0_0_1px_var(--line)]" />
          <span className="text-muted">to</span>
          <label className="sr-only" htmlFor="to">
            To
          </label>
          <input id="to" type="date" min={q.from} max={today} value={q.to ?? ""} onChange={(e) => e.target.value && onChange({ ...q, to: e.target.value })} className="h-[38px] rounded-k-s bg-background px-3 shadow-[inset_0_0_0_1px_var(--line)]" />
        </div>
      ) : null}
    </div>
  );
}

/** One plain-language line about the period: the best bucket and where taps went. */
export function highlightText(data: Overview, rangeKey: string): string {
  if (!data.totals.views && !data.totals.clicks) return "No visits in this period yet. Share your page link or QR code and the first ones will show up here.";
  const best = data.series.reduce<Overview["series"][number] | null>((b, p) => (!b || p.visitors > b.visitors ? p : b), null);
  const interval = data.range.interval;
  const unit = interval === "hour" ? "hour" : interval === "week" ? "week" : "day";
  let when = "";
  if (best && best.visitors > 0) {
    if (interval === "hour") when = fmtBucket(best.t, "hour", true);
    else if (interval === "week") when = `The week of ${fmtBucket(best.t, "day")}`;
    else if (rangeKey === "7d" || rangeKey === "today" || rangeKey === "yesterday")
      when = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${best.t.slice(0, 10)}T00:00:00Z`));
    else when = fmtBucket(best.t, "day", true);
  }
  const head = when ? `${when} was your best ${unit}: ${fmtInt(best!.visitors)} visitor${best!.visitors === 1 ? "" : "s"} and ${fmtInt(best!.clicks)} tap${best!.clicks === 1 ? "" : "s"}.` : `${fmtInt(data.totals.visitors)} visitors so far.`;
  const tail = data.top_link && data.top_link.clicks > 0 ? ` Most taps went to “${data.top_link.title}”.` : "";
  return head + tail;
}

function Highlight({ data, rangeKey }: { data: Overview; rangeKey: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[24px] bg-foreground px-5 py-4 text-white">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand" aria-hidden>
        <TrendingUp className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <p className="flex-1 text-base font-semibold">{highlightText(data, rangeKey)}</p>
    </div>
  );
}

const KPI: { key: keyof Totals; label: string; fmt: (n: number) => string; tile: string; hint?: string; points?: boolean }[] = [
  { key: "visitors", label: "Unique visitors", fmt: fmtInt, tile: "bg-blush" },
  { key: "views", label: "Page views", fmt: fmtInt, tile: "bg-sky" },
  { key: "clicks", label: "Card taps", fmt: fmtInt, tile: "bg-butter" },
  { key: "ctr", label: "Tap rate", fmt: fmtPct, tile: "bg-mint", hint: "taps ÷ page views", points: true },
  { key: "engagement", label: "Visitors who tapped", fmt: fmtPct, tile: "bg-peach", hint: "share of visitors who tapped a card", points: true },
];

function Kpis({ data }: { data: Overview }) {
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      {KPI.map((k) => {
        const prev = data.previous[k.key];
        // rates read better as a change in points ("+3.1 pts") than as a % of a %
        const ch = k.points ? pointsChange(data.totals[k.key], prev) : fmtChange(data.change[k.key]);
        const tone = ch.dir === "up" ? "text-ok" : ch.dir === "down" ? "text-[#a3392b]" : "text-ink-2";
        return (
          <div key={k.key} className={`flex flex-col gap-1 rounded-[24px] p-[18px] ${k.tile}`} title={k.hint}>
            <span className="text-[13px] font-semibold text-ink-2">{k.label}</span>
            <b className="text-[36px] font-bold leading-[1.1] tracking-[-0.035em] text-foreground tabular-nums">{k.fmt(data.totals[k.key])}</b>
            <span className={`font-mono text-xs font-medium ${tone}`}>
              {ch.text}
              <span className="text-ink-2"> vs {k.fmt(prev)}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
}

function pointsChange(now: number, prev: number): { text: string; dir: "up" | "down" | "flat" | "new" } {
  const d = (now - prev) * 100;
  if (Math.abs(d) < 0.05) return { text: "±0 pts", dir: "flat" };
  return { text: `${d > 0 ? "+" : ""}${d.toFixed(1)} pts`, dir: d > 0 ? "up" : "down" };
}

function SeriesCard({ data, q, onChange }: { data: Overview; q: AnalyticsQuery; onChange: (q: AnalyticsQuery) => void }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const keys = ["visitors", "clicks"] as const;
  const empty = data.totals.views === 0 && data.totals.clicks === 0;
  const allowed = allowedIntervals(q);
  const interval = q.interval ?? data.range.interval;
  return (
    <section className="flex h-full flex-col gap-3 rounded-k-l bg-surface p-5 shadow-card" aria-labelledby="series-h">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="series-h" className="mr-auto text-xl font-bold tracking-[-0.015em] text-foreground">
          Visitors and taps per {data.range.interval}
        </h2>
        <ul className="flex items-center gap-3.5 text-[13px] font-semibold" aria-label="Legend">
          {keys.map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <i className="h-[3px] w-3.5 rounded-full" style={{ background: SERIES_V2[k].color }} aria-hidden />
              {SERIES_V2[k].label}
            </li>
          ))}
        </ul>
        <div role="radiogroup" aria-label="Interval" className="inline-flex gap-1 rounded-full bg-sunken p-1">
          {(["hour", "day", "week"] as Interval[])
            .filter((i) => allowed.includes(i))
            .map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={interval === i}
                onClick={() => onChange({ ...q, interval: i })}
                className={`h-8 rounded-full px-3.5 text-[13px] font-semibold capitalize ${interval === i ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2"}`}
              >
                {i}
              </button>
            ))}
        </div>
        <button type="button" onClick={() => setView(view === "chart" ? "table" : "chart")} className="text-[13px] font-bold text-muted hover:text-foreground" aria-pressed={view === "table"}>
          {view === "chart" ? "Show table" : "Show chart"}
        </button>
      </div>
      {empty ? (
        <p className="py-16 text-center text-sm text-muted">No visits in this period yet. Share your page link or QR code and visits will show up here.</p>
      ) : view === "chart" ? (
        <SeriesChart data={data.series} keys={[...keys]} interval={data.range.interval} height={420} />
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-semibold">Time</th>
                <th className="py-2 text-right font-semibold">Visitors</th>
                <th className="py-2 text-right font-semibold">Page views</th>
                <th className="py-2 text-right font-semibold">Taps</th>
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
