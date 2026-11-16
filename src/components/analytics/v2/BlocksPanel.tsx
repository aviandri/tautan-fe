"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { analyticsApi, type AnalyticsQuery } from "@/lib/analytics-api";
import { SERIES_V2, fmtInt } from "../format";
import { SeriesChart } from "./SeriesChart";

const TYPE_LABEL: Record<string, string> = {
  link: "Link",
  file: "File",
  discount_code: "Discount code",
  image: "Image",
  social_icons: "Social icons",
  booking: "Booking",
  email_signup: "Email signup",
  form: "Form",
  folder: "Folder",
  heading: "Heading",
  divider: "Divider",
  text: "Text",
  video: "Video",
  music: "Music",
  faq: "FAQ",
  testimonial: "Testimonials",
  contact_form: "Contact form",
  countdown: "Countdown",
  quote: "Quote",
};
/** Blocks a visitor can click. Others are listed only if they somehow have clicks. */
const CLICKABLE = new Set(["link", "file", "discount_code", "image", "social_icons", "booking"]);

export function BlocksPanel({ q, onExport }: { q: AnalyticsQuery; onExport: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const res = useQuery({ queryKey: ["analytics", "blocks", q], queryFn: () => analyticsApi.blocks(q), placeholderData: (p) => p });
  const all = (res.data?.items ?? []).filter((b) => CLICKABLE.has(b.type) || b.clicks > 0);
  const items = showAll ? all : all.filter((b) => b.is_visible && !b.deleted);
  const hiddenCount = all.length - all.filter((b) => b.is_visible && !b.deleted).length;
  const max = Math.max(1, ...items.map((b) => b.clicks));
  const current = all.find((b) => b.block_id === selected);

  const series = useQuery({
    queryKey: ["analytics", "block-series", selected, q],
    queryFn: () => analyticsApi.blockSeries(q, selected!),
    enabled: !!selected,
    placeholderData: (p) => p,
  });

  return (
    <section className="rounded-xl border border-line bg-surface p-5" aria-labelledby="blocks-h">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="blocks-h" className="text-base font-semibold text-foreground">
          Clicks by block
        </h2>
        <div className="flex items-center gap-3">
          {hiddenCount > 0 ? (
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
              Show hidden and deleted ({hiddenCount})
            </label>
          ) : null}
          <button type="button" onClick={onExport} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted hover:bg-black/5 hover:text-foreground">
            <Download className="h-4 w-4" aria-hidden /> CSV
          </button>
        </div>
      </div>

      {res.isError && !res.data ? (
        <p className="py-8 text-center text-sm text-muted">Couldn&apos;t load block clicks.</p>
      ) : !res.data ? (
        <div className="h-40 animate-pulse rounded-lg bg-black/5" aria-label="Loading" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No clicks in this period.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((b) => (
            <li key={b.block_id}>
              <button
                type="button"
                onClick={() => setSelected(selected === b.block_id ? null : b.block_id)}
                aria-expanded={selected === b.block_id}
                className={`flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-black/[0.03] ${selected === b.block_id ? "bg-black/[0.05]" : ""}`}
              >
                <span className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-foreground">{b.title || "Untitled"}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {TYPE_LABEL[b.type] ?? b.type}
                      {b.deleted ? " · deleted" : !b.is_visible ? " · hidden" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-foreground">{fmtInt(b.clicks)}</span>
                </span>
                <span className="h-1.5 w-full rounded-full bg-black/[0.05]" aria-hidden>
                  <span className="block h-full rounded-full" style={{ width: `${Math.max((b.clicks / max) * 100, b.clicks ? 2 : 0)}%`, background: SERIES_V2.clicks.color, opacity: b.deleted || !b.is_visible ? 0.45 : 1 }} />
                </span>
              </button>
              {selected === b.block_id ? (
                <div className="mx-2 mb-2 mt-1 rounded-lg border border-line p-3">
                  <div className="mb-2 text-xs text-muted">
                    Clicks on {current?.title || "this block"} per {series.data?.range.interval ?? "day"}
                  </div>
                  {series.data ? (
                    <SeriesChart data={series.data.series} keys={["clicks"]} interval={series.data.range.interval} height={180} />
                  ) : (
                    <div className="h-[180px] animate-pulse rounded bg-black/5" />
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
