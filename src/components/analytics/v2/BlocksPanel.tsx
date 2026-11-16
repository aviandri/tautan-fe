"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { analyticsApi, type AnalyticsQuery } from "@/lib/analytics-api";
import { fmtInt } from "../format";
import { BLOCK_META } from "@/lib/editor/block-meta";
import type { BlockType } from "@/lib/types";
import { SeriesChart } from "./SeriesChart";

/** Card types a visitor can tap. Others are listed only if they somehow have taps. */
const CLICKABLE = new Set([
  "link", "file", "discount_code", "image", "social_icons", "booking", "video", "music",
  "product", "shop", "marketplace", "whatsapp", "price_list", "store_info", "payment", "tip_jar", "reviews",
  "media_kit", "rate_card", "brands", "post_grid", "latest_video", "shop_the_look", "gallery", "events", "podcast", "community",
]);

/** "marketplace:shopee" → "Shopee", "wa_order" → "WhatsApp order", "buy" → "Buy". */
function actionLabel(a: string): string {
  const [verb, target] = a.split(":");
  const words: Record<string, string> = { wa_order: "WhatsApp order", wa_chat: "WhatsApp chat", view_product: "Opened product", copy: "Copied", buy: "Buy", play: "Played", download: "Downloaded" };
  const t = target ? target.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "";
  return verb === "marketplace" || verb === "tip" || verb === "join" || verb === "post" || verb === "profile" || verb === "social" ? t || verb : (words[verb] ?? verb.replace(/_/g, " ")) + (t ? ` · ${t}` : "");
}

/** A card's name in the list: its title, else its type's display name ("Store info", "Media kit"). */
function cardName(b: { title: string; type: string }): string {
  return b.title?.trim() || BLOCK_META[b.type as BlockType]?.label || b.type.replace(/_/g, " ");
}

export function BlocksPanel({ q, onExport }: { q: AnalyticsQuery; onExport: () => void }) {
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const res = useQuery({ queryKey: ["analytics", "blocks", q], queryFn: () => analyticsApi.blocks(q), placeholderData: (p) => p });
  const all = (res.data?.items ?? []).filter((b) => b.clicks > 0 || CLICKABLE.has(b.type));
  const live = all.filter((b) => b.is_visible && !b.deleted);
  const list = (showAll ? all : live).slice().sort((a, b) => b.clicks - a.clicks);
  const items = showAll ? list : list.slice(0, 6);
  const max = Math.max(1, ...items.map((b) => b.clicks));

  const series = useQuery({
    queryKey: ["analytics", "block-series", selected, q],
    queryFn: () => analyticsApi.blockSeries(q, selected!),
    enabled: !!selected,
    placeholderData: (p) => p,
  });

  return (
    <section className="flex flex-col gap-3 rounded-k-l bg-surface p-5 shadow-card" aria-labelledby="blocks-h">
      <div className="flex items-center gap-2">
        <h2 id="blocks-h" className="mr-auto text-xl font-bold tracking-[-0.015em] text-foreground">
          Top cards
        </h2>
        {all.length > 6 || all.length !== live.length ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[13px] font-bold text-muted hover:text-foreground">
            {showAll ? "Top cards only" : "All cards"}
          </button>
        ) : null}
        <button type="button" onClick={onExport} aria-label="Export cards CSV" className="grid h-9 w-9 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-foreground">
          <Download className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {res.isError && !res.data ? (
        <p className="py-6 text-center text-sm text-muted">Couldn&apos;t load card taps.</p>
      ) : !res.data ? (
        <div className="h-40 animate-pulse rounded-2xl bg-sunken" aria-label="Loading" />
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">No taps in this period.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {items.map((b) => {
            const open = selected === b.block_id;
            const actions = Object.entries(b.actions ?? {}).sort((x, y) => y[1] - x[1]);
            return (
              <li key={b.block_id}>
                <button
                  type="button"
                  onClick={() => setSelected(open ? null : b.block_id)}
                  aria-expanded={open}
                  className={`relative flex w-full items-center gap-2.5 overflow-hidden rounded-[14px] px-3 py-[9px] text-left text-sm font-semibold hover:bg-background ${open ? "bg-background" : ""}`}
                >
                  <i
                    className="absolute inset-y-0 left-0 rounded-[14px] bg-blush"
                    style={{ width: `${Math.max((b.clicks / max) * 100, b.clicks ? 3 : 0)}%`, opacity: b.deleted || !b.is_visible ? 0.5 : 1 }}
                    aria-hidden
                  />
                  <span className="relative z-[1] min-w-0 flex-1 truncate text-foreground">
                    {cardName(b)}
                    {b.deleted ? <span className="font-medium text-muted"> · deleted</span> : !b.is_visible ? <span className="font-medium text-muted"> · hidden</span> : null}
                  </span>
                  <span className="relative z-[1] font-mono tabular-nums">{fmtInt(b.clicks)}</span>
                </button>
                {open ? (
                  <div className="mx-1 mb-2 mt-1 rounded-2xl bg-background p-3">
                    {actions.length ? (
                      <ul className="mb-2 flex flex-wrap gap-1.5" aria-label="Taps by action">
                        {actions.map(([a, n]) => (
                          <li key={a} className="inline-flex h-7 items-center gap-1.5 rounded-full bg-surface px-2.5 text-xs font-semibold shadow-[inset_0_0_0_1px_var(--line)]">
                            {actionLabel(a)} <span className="font-mono text-muted">{fmtInt(n)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mb-1 text-xs text-muted">Taps per {series.data?.range.interval ?? "day"}</div>
                    {series.data ? <SeriesChart data={series.data.series} keys={["clicks"]} interval={series.data.range.interval} height={160} /> : <div className="h-[160px] animate-pulse rounded-xl bg-sunken" />}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
