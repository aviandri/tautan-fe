"use client";

import { Check, ChevronDown, Clock, EyeOff, GripVertical, Loader2, MoreHorizontal, Trash2, ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { cx, IconButton, Switch } from "@/components/ui";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { getMeta } from "@/lib/editor/block-meta";
import { useDeleteBlock, useMoveBlock, useUpdateBlock } from "@/lib/editor/queries";
import { useBlockDraft, type SaveState } from "@/lib/editor/use-block-draft";
import type { Block, BlockType, Schedule, Tab } from "@/lib/types";
import { scheduleState } from "./fields-extra";
import { BlockForm } from "./BlockForm";

export interface DragHandleProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

export function TypeChip({ type, size = "md" }: { type: BlockType; size?: "sm" | "md" }) {
  const meta = getMeta(type);
  const Icon = meta.icon;
  return (
    <span
      className={cx("flex shrink-0 items-center justify-center rounded-lg", size === "md" ? "size-8" : "size-7")}
      style={{ backgroundColor: `${meta.tint}14`, color: meta.tint }}
    >
      <Icon className={size === "md" ? "size-4" : "size-3.5"} aria-hidden />
    </span>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving" || state === "pending")
    return <Loader2 className="size-3.5 animate-spin text-muted" aria-label="Saving" />;
  if (state === "saved") return <Check className="size-3.5 text-brand" aria-label="Saved" />;
  if (state === "invalid") return <span className="text-[12px] font-medium text-danger">Not saved</span>;
  return null;
}

export function BlockCard({
  block,
  tabs,
  expanded,
  onToggle,
  drag,
  isDragging,
  autoFocus,
  nested,
  children,
}: {
  block: Block;
  tabs: Tab[];
  expanded: boolean;
  onToggle: () => void;
  drag?: DragHandleProps;
  isDragging?: boolean;
  autoFocus?: boolean;
  nested?: boolean;
  /** Extra body content (folder children). */
  children?: React.ReactNode;
}) {
  const meta = getMeta(block.type);
  const update = useUpdateBlock();
  const remove = useDeleteBlock();
  const move = useMoveBlock();
  const [confirming, setConfirming] = useState(false);
  const otherTabs = tabs.filter((t) => t.id !== block.tab_id);
  const summary = (meta.summary as (d: Block["data"]) => string)(block.data);
  const sched = scheduleState((block.data as { schedule?: Schedule }).schedule);

  return (
    <div
      className={cx(
        "group/card rounded-2xl border bg-surface transition-[box-shadow,border-color,opacity]",
        isDragging ? "border-brand/40 shadow-[0_16px_40px_-12px_rgba(0,0,0,.25)]" : "border-line",
        expanded && !isDragging && "shadow-[0_2px_10px_-4px_rgba(0,0,0,.08)]",
      )}
    >
      <div className={cx("flex items-center gap-2 pr-2", nested ? "py-1.5 pl-1" : "py-2 pl-1.5")}>
        {drag ? (
          <button
            ref={drag.setActivatorNodeRef}
            {...drag.attributes}
            {...(drag.listeners as React.HTMLAttributes<HTMLButtonElement>)}
            type="button"
            aria-label={`Reorder ${summary}`}
            className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-[#b3af9f] hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        ) : (
          <span className="w-1" />
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={cx("flex min-w-0 flex-1 items-center gap-3 rounded-lg py-0.5 text-left", !block.is_visible && "opacity-55")}
        >
          <TypeChip type={block.type} size={nested ? "sm" : "md"} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium leading-tight">{summary}</span>
            <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
              {meta.label}
              {!block.is_visible && (
                <span className="inline-flex items-center gap-1">
                  · <EyeOff className="size-3" aria-hidden /> Hidden
                </span>
              )}
              {sched && (
                <span className={cx("inline-flex items-center gap-1", sched === "ended" ? "text-danger" : "text-[#9a4a1d]")}>
                  · <Clock className="size-3" aria-hidden />
                  {sched === "scheduled" ? "Scheduled" : sched === "ended" ? "Schedule ended" : "Scheduled, live now"}
                </span>
              )}
            </span>
          </span>
        </button>

        <Switch
          label={block.is_visible ? `Hide ${summary}` : `Show ${summary}`}
          checked={block.is_visible}
          onChange={(v) => update.mutate({ id: block.id, patch: { is_visible: v } })}
        />

        <Menu
          trigger={(p) => (
            <IconButton label="More actions" {...p}>
              <MoreHorizontal className="size-4" />
            </IconButton>
          )}
        >
          {(close) =>
            confirming ? (
              <div className="p-2">
                <p className="text-sm font-medium">Delete this {meta.label.toLowerCase()}?</p>
                {block.type === "folder" && <p className="mt-0.5 text-[13px] text-muted">Links inside it are deleted too.</p>}
                <div className="mt-2.5 flex gap-1.5">
                  <button
                    className="rounded-lg bg-danger px-2.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#962a1a]"
                    onClick={() => {
                      remove.mutate(block.id);
                      close();
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium hover:bg-black/[.04]"
                    onClick={() => setConfirming(false)}
                  >
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

        <IconButton label={expanded ? "Collapse" : "Edit"} onClick={onToggle}>
          <ChevronDown className={cx("size-4 transition-transform duration-200", expanded && "rotate-180")} />
        </IconButton>
      </div>

      {expanded && (
        <div className="border-t border-line px-4 pb-4 pt-4 sm:px-5">
          <DraftForm key={block.id} block={block} tabs={tabs} autoFocus={autoFocus} />
          {children}
        </div>
      )}
    </div>
  );
}

function DraftForm({ block, tabs, autoFocus }: { block: Block; tabs: Tab[]; autoFocus?: boolean }) {
  const d = useBlockDraft(block);
  return (
    <div onBlur={d.flush} className="relative">
      <div className="absolute -top-2.5 right-0 flex h-4 items-center">
        <SaveIndicator state={d.state} />
      </div>
      <BlockForm type={block.type} data={d.draft} onChange={d.onChange} errors={d.errors} autoFocus={autoFocus} ctx={{ tabs, currentTabId: block.tab_id }} />
    </div>
  );
}
