"use client";

import { ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button, cx, Spinner } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { useDeletedBlocks, useRestoreBlock } from "@/lib/editor/queries";
import { relativeTime } from "@/lib/time";
import type { Block, Tab } from "@/lib/types";
import { TypeChip } from "./BlockCard";

const PURGE_DAYS = 30;

/** "Recently deleted": soft-deleted blocks (all tabs), restorable for 30 days. */
export function DeletedBlocks({ tabs }: { tabs: Tab[] }) {
  const [open, setOpen] = useState(false);
  const q = useDeletedBlocks();
  const restore = useRestoreBlock();
  const items = q.data ?? [];
  if (!q.isLoading && items.length === 0) return null;

  const tabTitle = (id: string) => tabs.find((t) => t.id === id)?.title ?? "Deleted tab";
  const daysLeft = (b: Block) => {
    if (!b.deleted_at) return PURGE_DAYS;
    return Math.max(0, PURGE_DAYS - Math.floor((Date.now() - Date.parse(b.deleted_at)) / 864e5));
  };

  return (
    <section className="mt-1 rounded-[20px] bg-surface/60 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm font-semibold text-muted hover:text-foreground"
      >
        <Trash2 className="size-4" aria-hidden />
        Recently deleted
        <span className="rounded-full bg-sunken px-2 font-mono text-[12px]">{q.isLoading ? "…" : items.length}</span>
        <ChevronDown className={cx("ml-auto size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t border-line">
          {q.isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {items.map((b) => {
                const meta = getMeta(b.type);
                const summary = (meta.summary as (d: Block["data"]) => string)(b.data);
                return (
                  <li key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                    <TypeChip type={b.type} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{summary}</span>
                      <span className="block text-[12px] text-muted">
                        {meta.label} · {tabTitle(b.tab_id)}
                        {b.deleted_at && ` · deleted ${relativeTime(b.deleted_at)}`} · {daysLeft(b)} days left
                      </span>
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => restore.mutate(b.id)}
                      loading={restore.isPending && restore.variables === b.id}
                    >
                      <RotateCcw className="size-3.5" /> Restore
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-muted">
            Restored blocks go to the end of their tab. Deleted blocks are removed for good after {PURGE_DAYS} days.
          </p>
        </div>
      )}
    </section>
  );
}
