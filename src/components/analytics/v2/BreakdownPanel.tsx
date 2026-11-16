"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, Filter } from "lucide-react";
import { DIMENSIONS, analyticsApi, type AnalyticsQuery, type Dimension } from "@/lib/analytics-api";
import { DIMENSION_LABELS, valueLabel } from "@/lib/analytics-query";
import { SERIES_V2, fmtInt } from "../format";

export function BreakdownPanel({
  q,
  dimension,
  onDimension,
  onFilter,
  onExport,
}: {
  q: AnalyticsQuery;
  dimension: Dimension;
  onDimension: (d: Dimension) => void;
  onFilter: (d: Dimension, value: string) => void;
  onExport: () => void;
}) {
  const res = useQuery({
    queryKey: ["analytics", "breakdown", dimension, q],
    queryFn: () => analyticsApi.breakdown(q, dimension),
    placeholderData: (prev) => prev,
  });
  const items = res.data?.items ?? [];
  const max = Math.max(1, ...items.map((i) => i.views));
  const active = q.filters?.[dimension];

  return (
    <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="breakdown-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="breakdown-h" className="text-base font-semibold text-foreground">
          Where visits come from
        </h2>
        <button type="button" onClick={onExport} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:bg-black/5 hover:text-foreground">
          <Download className="h-4 w-4" aria-hidden /> CSV
        </button>
      </div>
      <div role="tablist" aria-label="Breakdown by" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1">
        {DIMENSIONS.map((d) => (
          <button
            key={d}
            type="button"
            role="tab"
            aria-selected={d === dimension}
            onClick={() => onDimension(d)}
            className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition ${
              d === dimension ? "bg-foreground text-background" : "text-muted hover:bg-black/5 hover:text-foreground"
            }`}
          >
            {DIMENSION_LABELS[d]}
            {q.filters?.[d] !== undefined ? <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-label="(filtered)" /> : null}
          </button>
        ))}
      </div>

      {res.isError && !res.data ? (
        <p className="py-8 text-center text-sm text-muted">Couldn&apos;t load this breakdown.</p>
      ) : !res.data ? (
        <div className="h-48 animate-pulse rounded-lg bg-black/5" aria-label="Loading" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No visits in this period.</p>
      ) : (
        <div className={`overflow-x-auto transition-opacity ${res.isPlaceholderData ? "opacity-60" : ""}`}>
          <table className="w-full text-sm">
            <caption className="sr-only">
              {DIMENSION_LABELS[dimension]} breakdown. Select a row to filter the whole page by it.
            </caption>
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">{DIMENSION_LABELS[dimension]}</th>
                <th className="py-2 text-right font-medium">Visitors</th>
                <th className="py-2 text-right font-medium">Views</th>
                <th className="py-2 text-right font-medium">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const selected = active === it.value;
                return (
                  <tr key={it.value || "(empty)"} className={`border-t border-line ${selected ? "bg-black/[0.04]" : ""}`}>
                    <td className="py-1.5 pr-3">
                      <button
                        type="button"
                        onClick={() => onFilter(dimension, it.value)}
                        aria-pressed={selected}
                        title={selected ? "Filtering by this" : "Filter the page by this"}
                        className="group flex w-full min-w-40 flex-col gap-1 rounded-md px-1 py-1 text-left hover:bg-black/[0.04]"
                      >
                        <span className="flex items-center gap-1.5 text-foreground">
                          {valueLabel(dimension, it.value)}
                          <Filter className={`h-3 w-3 text-muted ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`} aria-hidden />
                        </span>
                        <span className="h-1 w-full rounded-full bg-black/[0.05]" aria-hidden>
                          <span className="block h-full rounded-full" style={{ width: `${(it.views / max) * 100}%`, background: SERIES_V2.views.color }} />
                        </span>
                      </button>
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtInt(it.visitors)}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtInt(it.views)}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtInt(it.clicks)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
