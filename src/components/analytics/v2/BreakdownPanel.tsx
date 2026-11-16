"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { DIMENSIONS, analyticsApi, type AnalyticsQuery, type Dimension } from "@/lib/analytics-api";
import { DIMENSION_LABELS, valueLabel } from "@/lib/analytics-query";
import { fmtInt } from "../format";

// Kartu: "Sources" style rows with a sky bar behind each; selecting a row filters the whole page
// (the active one gets a magenta ring). Percent of visitors, with the exact counts in the title.
const CHIP_LABEL: Partial<Record<Dimension, string>> = { referrer: "Sources", country: "Countries", device: "Devices", channel: "Channels", utm_source: "UTM source", utm_medium: "UTM medium", utm_campaign: "UTM campaign" };

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
  const items = (res.data?.items ?? []).slice(0, 8);
  const total = Math.max(1, (res.data?.items ?? []).reduce((s, i) => s + i.visitors, 0));
  const max = Math.max(1, ...items.map((i) => i.visitors));
  const active = q.filters?.[dimension];

  return (
    <section className="flex flex-col gap-3 rounded-k-l bg-surface p-5 shadow-card" aria-labelledby="breakdown-h">
      <div className="flex items-center gap-2">
        <h2 id="breakdown-h" className="mr-auto text-xl font-bold tracking-[-0.015em] text-foreground">
          Where visits come from
        </h2>
        <button type="button" onClick={onExport} aria-label="Export breakdown CSV" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-foreground">
          <Download className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div role="tablist" aria-label="Breakdown by" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {DIMENSIONS.map((d) => {
          const on = d === dimension;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => onDimension(d)}
              className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${on ? "bg-foreground text-white" : "bg-sunken text-foreground hover:bg-[#e1e1dd]"}`}
            >
              {CHIP_LABEL[d] ?? DIMENSION_LABELS[d]}
              {q.filters?.[d] !== undefined ? <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-label="(filtered)" /> : null}
            </button>
          );
        })}
      </div>

      {res.isError && !res.data ? (
        <p className="py-6 text-center text-sm text-muted">Couldn&apos;t load this breakdown.</p>
      ) : !res.data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-label="Loading" />
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No visits in this period.</p>
      ) : (
        <ul className={`flex flex-col gap-1 transition-opacity ${res.isPlaceholderData ? "opacity-60" : ""}`} aria-label={`${DIMENSION_LABELS[dimension]}: select one to filter the whole page`}>
          {items.map((it) => {
            const selected = active === it.value;
            return (
              <li key={it.value || "(empty)"}>
                <button
                  type="button"
                  onClick={() => onFilter(dimension, it.value)}
                  aria-pressed={selected}
                  title={`${fmtInt(it.visitors)} visitors · ${fmtInt(it.views)} views · ${fmtInt(it.clicks)} taps${selected ? " · filtering by this" : " · select to filter"}`}
                  className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-[14px] px-3 py-[9px] text-left text-sm font-semibold hover:bg-background ${selected ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""}`}
                >
                  <i className="absolute inset-y-0 left-0 rounded-[14px] bg-sky" style={{ width: `${(it.visitors / max) * 100}%` }} aria-hidden />
                  <span className="relative z-[1] min-w-0 flex-1 truncate text-foreground">{valueLabel(dimension, it.value)}</span>
                  <span className="relative z-[1] font-mono tabular-nums">{Math.round((it.visitors / total) * 100)}%</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
