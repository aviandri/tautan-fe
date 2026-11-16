"use client";

/** Kartu editor, right pane: the selected card's settings (or a new card's draft). */
import { ArrowRightLeft, Check, Loader2, MoreHorizontal, MousePointerClick, Trash2 } from "lucide-react";
import { useState } from "react";
import { IconButton, Switch } from "@/components/ui";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { getMeta } from "@/lib/editor/block-meta";
import { useDeleteBlock, useMoveBlock, useUpdateBlock } from "@/lib/editor/queries";
import { sparkPath, useBlockTrend } from "@/lib/editor/taps";
import { useBlockDraft, type SaveState } from "@/lib/editor/use-block-draft";
import type { Block, Tab } from "@/lib/types";
import { TypeChip } from "./BlockCard";
import { BlockForm } from "./BlockForm";
import dynamic from "next/dynamic";

const GateEditor = dynamic(() => import("./GateEditor").then((m) => m.GateEditor), { ssr: false });

/** Card types visitors can't tap: no tap stats for these. */
const NO_TAPS = new Set(["text", "heading", "divider", "quote", "image", "faq", "testimonial", "reviews", "store_info", "gallery"]);

export function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving" || state === "pending")
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <Loader2 className="size-3.5 animate-spin" aria-hidden /> Saving
      </span>
    );
  if (state === "saved")
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted">
        <Check className="size-3.5 text-ok" aria-hidden /> Saved
      </span>
    );
  if (state === "invalid") return <span className="text-[13px] font-semibold text-danger">Not saved</span>;
  return null;
}

function Actions({ block, tabs, onDeleted }: { block: Block; tabs: Tab[]; onDeleted: () => void }) {
  const meta = getMeta(block.type);
  const remove = useDeleteBlock();
  const move = useMoveBlock();
  const [confirming, setConfirming] = useState(false);
  const otherTabs = tabs.filter((t) => t.id !== block.tab_id);
  return (
    <Menu
      trigger={(p) => (
        <IconButton label="More actions" {...p}>
          <MoreHorizontal className="size-[18px]" />
        </IconButton>
      )}
    >
      {(close) =>
        confirming ? (
          <div className="p-2">
            <p className="text-sm font-semibold">Delete this {meta.label.toLowerCase()}?</p>
            {block.type === "folder" && <p className="mt-0.5 text-[13px] text-muted">Links inside it are deleted too.</p>}
            <p className="mt-0.5 text-[13px] text-muted">You can restore it from Recently deleted for 30 days.</p>
            <div className="mt-3 flex gap-1.5">
              <button
                className="h-9 rounded-full bg-danger px-4 text-[13px] font-semibold text-white hover:brightness-90"
                onClick={() => {
                  remove.mutate(block.id);
                  close();
                  onDeleted();
                }}
              >
                Delete
              </button>
              <button className="h-9 rounded-full px-4 text-[13px] font-semibold hover:bg-sunken" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {otherTabs.length > 0 && !block.parent_id && (
              <>
                <MenuLabel>Move to tab</MenuLabel>
                {otherTabs.map((t) => (
                  <MenuItem
                    key={t.id}
                    onSelect={() => {
                      move(block, { tab_id: t.id, parent_id: null });
                      close();
                    }}
                  >
                    <ArrowRightLeft className="size-3.5 text-muted" /> {t.title}
                  </MenuItem>
                ))}
                <div className="my-1 h-px bg-line" />
              </>
            )}
            {block.parent_id && (
              <MenuItem
                onSelect={() => {
                  move(block, { tab_id: block.tab_id, parent_id: null });
                  close();
                }}
              >
                <ArrowRightLeft className="size-3.5 text-muted" /> Move out of folder
              </MenuItem>
            )}
            <MenuItem tone="danger" onSelect={() => setConfirming(true)}>
              <Trash2 className="size-3.5" /> Delete
            </MenuItem>
          </>
        )
      }
    </Menu>
  );
}

function TapStats({ blockId }: { blockId: string }) {
  const t = useBlockTrend(blockId);
  if (!t.data) return null;
  const { week, change, points } = t.data;
  const d = sparkPath(points, 110, 40);
  if (week === 0 && !change)
    return <p className="border-t border-line pt-4 text-[13px] font-semibold text-muted">No taps yet this week.</p>;
  return (
    <div className="flex items-center gap-3 border-t border-line pt-4">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink-2">This week</p>
        <p className="text-[24px] font-bold tracking-[-0.02em]">
          {week.toLocaleString("en-US")} tap{week === 1 ? "" : "s"}{" "}
          {change !== null && (
            <span className={`font-mono text-[12px] font-medium ${change >= 0 ? "text-ok" : "text-danger"}`}>
              {change >= 0 ? "+" : ""}
              {change}%
            </span>
          )}
        </p>
      </div>
      {d && week > 0 && (
        <svg width="110" height="40" viewBox="0 0 110 40" role="img" aria-label={`Daily taps over the last two weeks${change !== null ? `, ${change >= 0 ? "up" : "down"} ${Math.abs(change)}% on last week` : ""}`}>
          <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

/** The settings for one saved card: autosaving form, visibility, lock and taps. */
export function BlockInspector({ block, tabs, autoFocus, onDeleted }: { block: Block; tabs: Tab[]; autoFocus?: boolean; onDeleted: () => void }) {
  const meta = getMeta(block.type);
  const update = useUpdateBlock();
  const d = useBlockDraft(block);
  return (
    <section aria-label={`${meta.label} settings`} className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <TypeChip type={block.type} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[20px] font-bold tracking-[-0.015em]">{meta.label}</h2>
          <p className="truncate text-[13px] text-muted">{meta.description}</p>
        </div>
        <SaveIndicator state={d.state} />
        <Actions block={block} tabs={tabs} onDeleted={onDeleted} />
      </div>
      <div onBlur={d.flush} className="flex flex-col gap-5">
        <BlockForm
          type={block.type}
          data={d.draft}
          onChange={d.onChange}
          errors={d.errors}
          autoFocus={autoFocus}
          ctx={{ tabs, currentTabId: block.tab_id, blockId: block.id }}
        />
      </div>
      <div className="flex items-center gap-3 rounded-[20px] bg-background px-4 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="font-bold">Show on page</p>
          <p className="text-[13px] text-muted">{block.is_visible ? "Visitors can see this card" : "Hidden from visitors, kept here"}</p>
        </div>
        <Switch label="Show on page" checked={block.is_visible} onChange={(v) => update.mutate({ id: block.id, patch: { is_visible: v } })} />
      </div>
      <GateEditor key={`gate-${block.id}`} block={block} />
      {!NO_TAPS.has(block.type) && <TapStats blockId={block.id} />}
    </section>
  );
}

export function EmptyInspector() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-blush">
        <MousePointerClick className="size-5" aria-hidden />
      </span>
      <p className="text-[17px] font-bold">Pick a card to edit it</p>
      <p className="max-w-[240px] text-sm text-muted">Its settings, schedule and taps show up here. Changes save on their own.</p>
    </div>
  );
}
