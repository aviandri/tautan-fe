"use client";

import { Check, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { cx, IconButton, Input } from "@/components/ui";
import { Menu, MenuItem } from "@/components/ui/menu";
import { useCreateTab, useDeleteTab, useReorderTabs, useUpdateTab } from "@/lib/editor/queries";
import type { Block, Tab } from "@/lib/types";
import { SortableItem, SortableList } from "./Sortable";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function TabsBar({
  tabs,
  blocks,
  activeId,
  onSelect,
}: {
  tabs: Tab[];
  blocks: Block[];
  activeId: string;
  onSelect: (tab: Tab) => void;
}) {
  const reorder = useReorderTabs();
  const create = useCreateTab();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return setAdding(false);
    create.mutate(
      { title: t },
      {
        onSuccess: (tab) => {
          onSelect(tab);
          setTitle("");
          setAdding(false);
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted">Tabs</p>
        <p className="text-[12px] text-muted">{tabs.length > 1 ? "Drag to reorder" : "Add tabs to split your page into sections"}</p>
      </div>
      <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        <SortableList items={tabs} axis="x" onReorder={(ids) => reorder.mutate(ids)}>
          <div className="flex items-center gap-1.5">
            {tabs.map((t) => (
              <SortableItem key={t.id} id={t.id}>
                {({ drag, isDragging }) =>
                  editing === t.id ? (
                    <TabEditor tab={t} onClose={() => setEditing(null)} />
                  ) : (
                    <TabChip
                      tab={t}
                      count={blocks.filter((b) => b.tab_id === t.id && !b.parent_id).length}
                      active={t.id === activeId}
                      canDelete={tabs.length > 1}
                      isDragging={isDragging}
                      dragProps={{ ...drag.attributes, ...(drag.listeners as object) }}
                      dragRef={drag.setActivatorNodeRef}
                      onSelect={() => onSelect(t)}
                      onEdit={() => setEditing(t.id)}
                      onDeleted={() => {
                        if (t.id === activeId) onSelect(tabs.find((x) => x.id !== t.id)!);
                      }}
                    />
                  )
                }
              </SortableItem>
            ))}
          </div>
        </SortableList>

        {adding ? (
          <form onSubmit={add} className="flex shrink-0 items-center gap-1">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              placeholder="Tab name"
              maxLength={40}
              className="h-9 w-36 text-sm"
              aria-label="New tab name"
            />
            <IconButton label="Create tab" type="submit" disabled={create.isPending}>
              <Check className="size-4" />
            </IconButton>
            <IconButton label="Cancel" onClick={() => setAdding(false)}>
              <X className="size-4" />
            </IconButton>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 text-sm font-medium text-muted transition-colors hover:border-brand hover:text-brand"
          >
            <Plus className="size-3.5" /> Tab
          </button>
        )}
      </div>
    </div>
  );
}

function TabChip({
  tab,
  count,
  active,
  canDelete,
  isDragging,
  dragProps,
  dragRef,
  onSelect,
  onEdit,
  onDeleted,
}: {
  tab: Tab;
  count: number;
  active: boolean;
  canDelete: boolean;
  isDragging: boolean;
  dragProps: React.HTMLAttributes<HTMLElement>;
  dragRef: (el: HTMLElement | null) => void;
  onSelect: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const del = useDeleteTab();
  const [confirm, setConfirm] = useState(false);
  return (
    <div
      className={cx(
        "flex h-9 shrink-0 items-center rounded-full border text-sm font-medium transition-colors",
        active ? "border-foreground bg-foreground text-background" : "border-line bg-surface hover:border-line-2",
        isDragging && "shadow-lg",
      )}
    >
      <button
        ref={dragRef}
        {...dragProps}
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className="flex h-full cursor-pointer items-center gap-1.5 pl-3.5 pr-1"
      >
        {tab.title}
        <span className={cx("text-[12px] tabular-nums", active ? "text-background/60" : "text-muted")}>{count}</span>
      </button>
      <Menu
        trigger={(p) => (
          <button
            type="button"
            {...p}
            aria-label={`${tab.title} tab options`}
            className={cx(
              "mr-1 flex size-7 items-center justify-center rounded-full",
              active ? "hover:bg-white/15" : "text-muted hover:bg-black/[.05]",
            )}
          >
            <MoreHorizontal className="size-3.5" />
          </button>
        )}
      >
        {(close) =>
          confirm ? (
            <div className="w-56 p-2 text-foreground">
              <p className="text-sm font-medium">Delete “{tab.title}”?</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {count ? `Its ${count} block${count === 1 ? "" : "s"} will be deleted too.` : "This tab is empty."}
              </p>
              <div className="mt-2.5 flex gap-1.5">
                <button
                  className="rounded-lg bg-danger px-2.5 py-1.5 text-[13px] font-medium text-white"
                  onClick={() => {
                    onDeleted();
                    del.mutate(tab.id);
                    close();
                  }}
                >
                  Delete tab
                </button>
                <button className="rounded-lg px-2.5 py-1.5 text-[13px] font-medium hover:bg-black/[.04]" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-foreground">
              <MenuItem
                onSelect={() => {
                  onEdit();
                  close();
                }}
              >
                <Pencil className="size-3.5 text-muted" /> Rename
              </MenuItem>
              <MenuItem tone="danger" disabled={!canDelete} onSelect={() => setConfirm(true)}>
                <Trash2 className="size-3.5" /> {canDelete ? "Delete" : "Can't delete the only tab"}
              </MenuItem>
            </div>
          )
        }
      </Menu>
    </div>
  );
}

function TabEditor({ tab, onClose }: { tab: Tab; onClose: () => void }) {
  const update = useUpdateTab();
  const [title, setTitle] = useState(tab.title);
  const [slug, setSlug] = useState(tab.slug);
  const slugOk = SLUG_RE.test(slug) && slug.length <= 40;

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !slugOk) return;
    const patch: { title?: string; slug?: string } = {};
    if (title.trim() !== tab.title) patch.title = title.trim();
    if (slug !== tab.slug) patch.slug = slug;
    if (Object.keys(patch).length) update.mutate({ id: tab.id, patch });
    onClose();
  }

  return (
    <form
      onSubmit={save}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="flex shrink-0 items-center gap-1 rounded-full border border-brand bg-surface py-0.5 pl-1 pr-0.5"
    >
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Tab name"
        maxLength={40}
        className="h-7 w-28 rounded-full bg-transparent px-2.5 text-sm font-medium outline-none"
      />
      <span className="text-[12px] text-muted">?tab=</span>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        aria-label="Tab slug"
        aria-invalid={!slugOk}
        maxLength={40}
        className={cx("h-7 w-24 bg-transparent text-[13px] outline-none", !slugOk && "text-danger")}
      />
      <IconButton label="Save tab" type="submit" disabled={!slugOk || !title.trim()} className="size-7 rounded-full">
        <Check className="size-3.5" />
      </IconButton>
      <IconButton label="Cancel" onClick={onClose} className="size-7 rounded-full">
        <X className="size-3.5" />
      </IconButton>
    </form>
  );
}
