"use client";

/** Kartu editor, left pane: tabs, paste/add, the sortable card list and recently deleted. */
import { Clock, EyeOff, GripVertical, Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button, cx, Switch } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { siblings, useReorderBlocks, useUpdateBlock } from "@/lib/editor/queries";
import type { SellSuggestion } from "@/lib/editor/smart-paste";
import { useTapCounts } from "@/lib/editor/taps";
import type { Block, Schedule, Tab } from "@/lib/types";
import { TypeChip, type DragHandleProps } from "./BlockCard";
import { DeletedBlocks } from "./DeletedBlocks";
import { scheduleState } from "./fields-extra";
import { GateBadge } from "./gate-badge";
import { SmartPaste } from "./SmartPaste";
import { SortableItem, SortableList } from "./Sortable";
import { TabsBar } from "./TabsBar";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function Meta({ block, taps }: { block: Block; taps?: number }) {
  const meta = getMeta(block.type);
  const sched = (block.data as { schedule?: Schedule }).schedule;
  const state = scheduleState(sched);
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
      <span className="shrink-0">{meta.label}</span>
      {!block.is_visible ? (
        <span className="inline-flex shrink-0 items-center gap-1">
          · <EyeOff className="size-3" aria-hidden /> Hidden
        </span>
      ) : taps ? (
        <span className="shrink-0">
          · <b className="font-semibold text-foreground">{taps.toLocaleString("en-US")}</b> {taps === 1 ? "tap" : "taps"}
        </span>
      ) : null}
      {state && (
        <span className={cx("inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 font-mono text-[11px]", state === "ended" ? "bg-danger/10 text-danger" : "bg-peach text-accent-ink")}>
          <Clock className="size-3" aria-hidden />
          {state === "scheduled" && sched?.start_at ? `Shows ${fmtDay(sched.start_at)}` : state === "ended" ? "Ended" : sched?.end_at ? `Hides ${fmtDay(sched.end_at)}` : "Scheduled"}
        </span>
      )}
      <GateBadge gate={block.gate} />
    </span>
  );
}

export function CardRow({
  block,
  selected,
  onSelect,
  drag,
  isDragging,
  taps,
  nested,
  scrollIntoView,
}: {
  block: Block;
  /** a freshly added card: bring it into view */
  scrollIntoView?: boolean;
  selected: boolean;
  onSelect: () => void;
  drag?: DragHandleProps;
  isDragging?: boolean;
  taps?: number;
  nested?: boolean;
}) {
  const meta = getMeta(block.type);
  const update = useUpdateBlock();
  const summary = (meta.summary as (d: Block["data"]) => string)(block.data);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollIntoView) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [scrollIntoView]);
  return (
    <div
      ref={ref}
      className={cx(
        "flex items-center gap-2 rounded-[20px] bg-surface py-2 pr-2.5 transition-[transform,box-shadow] duration-200 ease-k",
        nested ? "pl-2" : "pl-1",
        selected
          ? "shadow-[0_0_0_2px_var(--accent),0_18px_34px_-20px_rgba(208,16,111,.55)]"
          : isDragging
            ? "shadow-lift"
            : "shadow-card hover:-translate-y-px hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,.3),0_0_0_1px_rgba(0,0,0,.05)]",
      )}
    >
      {drag ? (
        <button
          ref={drag.setActivatorNodeRef}
          {...drag.attributes}
          {...(drag.listeners as React.HTMLAttributes<HTMLButtonElement>)}
          type="button"
          aria-label={`Reorder ${summary}`}
          className="flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-line-2 hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Edit ${summary} (${meta.label})`}
        className={cx("flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-0.5 text-left", !block.is_visible && "opacity-60")}
      >
        <TypeChip type={block.type} size={nested ? "sm" : "md"} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold leading-tight">{summary}</span>
          <Meta block={block} taps={taps} />
        </span>
      </button>
      <Switch
        label={block.is_visible ? `Hide ${summary}` : `Show ${summary}`}
        checked={block.is_visible}
        onChange={(v) => update.mutate({ id: block.id, patch: { is_visible: v } })}
      />
    </div>
  );
}

export function CardList({
  blocks,
  tab,
  tabs,
  selectedId,
  scrollToId,
  onSelect,
  onSelectTab,
  onAdd,
  onAddToFolder,
  onCreated,
  onSell,
  adding,
}: {
  blocks: Block[];
  tab: Tab;
  tabs: Tab[];
  selectedId?: string;
  scrollToId?: string;
  onSelect: (b: Block) => void;
  onSelectTab: (t: Tab) => void;
  onAdd: () => void;
  onAddToFolder: (folder: Block) => void;
  onCreated: (b: Block) => void;
  onSell: (s: SellSuggestion) => void;
  adding?: boolean;
}) {
  const top = siblings(blocks, tab.id, null);
  const reorder = useReorderBlocks();
  const taps = useTapCounts().data;

  return (
    <div className="flex flex-col gap-3">
      <TabsBar tabs={tabs} blocks={blocks} activeId={tab.id} onSelect={onSelectTab} />
      <SmartPaste tabId={tab.id} onCreated={onCreated} onSell={onSell} />
      <Button size="lg" onClick={onAdd} loading={adding} className="w-full">
        <Plus className="size-4" /> Add card
      </Button>

      {top.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-line-2 px-6 py-10 text-center">
          <p className="text-[15px] font-bold">This tab is empty</p>
          <p className="mt-1 text-sm text-muted">Add a link, a product or a video to get started.</p>
        </div>
      )}

      <SortableList items={top} onReorder={(ids) => reorder.mutate({ tabId: tab.id, ids })}>
        <div className="flex flex-col gap-2">
          {top.map((b) => (
            <SortableItem key={b.id} id={b.id}>
              {({ drag, isDragging }) => (
                <div className="flex flex-col gap-2">
                  <CardRow block={b} selected={selectedId === b.id} scrollIntoView={scrollToId === b.id} onSelect={() => onSelect(b)} drag={drag} isDragging={isDragging} taps={taps?.get(b.id)} />
                  {b.type === "folder" && !isDragging && (
                    <FolderChildren folder={b} blocks={blocks} selectedId={selectedId} onSelect={onSelect} onAdd={() => onAddToFolder(b)} taps={taps} />
                  )}
                </div>
              )}
            </SortableItem>
          ))}
        </div>
      </SortableList>

      <DeletedBlocks tabs={tabs} />
    </div>
  );
}

function FolderChildren({
  folder,
  blocks,
  selectedId,
  onSelect,
  onAdd,
  taps,
}: {
  folder: Block;
  blocks: Block[];
  selectedId?: string;
  onSelect: (b: Block) => void;
  onAdd: () => void;
  taps?: Map<string, number>;
}) {
  const children = siblings(blocks, folder.tab_id, folder.id);
  const reorder = useReorderBlocks();
  return (
    <div className="ml-7 flex flex-col gap-2" aria-label={`Links in ${getMeta("folder").summary(folder.data as never)}`}>
      <SortableList items={children} onReorder={(ids) => reorder.mutate({ tabId: folder.tab_id, ids })}>
        <div className="flex flex-col gap-2">
          {children.map((c) => (
            <SortableItem key={c.id} id={c.id}>
              {({ drag, isDragging }) => <CardRow nested block={c} selected={selectedId === c.id} onSelect={() => onSelect(c)} drag={drag} isDragging={isDragging} taps={taps?.get(c.id)} />}
            </SortableItem>
          ))}
        </div>
      </SortableList>
      <button type="button" onClick={onAdd} className="inline-flex h-9 w-fit items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink-2 hover:bg-sunken hover:text-foreground">
        <Plus className="size-3.5" aria-hidden /> Add link to folder
      </button>
    </div>
  );
}
