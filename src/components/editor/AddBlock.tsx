"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { getMeta, PICKER_ORDER } from "@/lib/editor/block-meta";
import { useCreateBlock } from "@/lib/editor/queries";
import type { Block, BlockDataMap, BlockType, CreateBlockInput } from "@/lib/types";
import { TypeChip } from "./BlockCard";
import { BlockForm } from "./BlockForm";

/** Grid of block types. */
export function BlockPicker({ onPick, onClose }: { onPick: (t: BlockType) => void; onClose: () => void }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-[0_12px_32px_-12px_rgba(0,0,0,.18)]">
      <div className="mb-2 flex items-center justify-between pl-1.5">
        <p className="text-sm font-semibold">Add a block</p>
        <IconButton label="Close" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {PICKER_ORDER.map((t) => {
          const m = getMeta(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => onPick(t)}
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-black/[.035] active:translate-y-px"
            >
              <TypeChip type={t} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="block truncate text-[12px] text-muted">{m.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * For types whose default data the server would reject (a URL is required),
 * collect it in a local draft first, then POST.
 */
export function NewBlockDraft<K extends BlockType>({
  type,
  tabId,
  parentId = null,
  onDone,
}: {
  type: K;
  tabId: string;
  parentId?: string | null;
  onDone: (created?: Block) => void;
}) {
  const meta = getMeta(type);
  const [data, setData] = useState<BlockDataMap[K]>(meta.defaultData());
  const [tried, setTried] = useState(false);
  const create = useCreateBlock();
  const { errors, data: clean } = meta.validate(data);
  const valid = Object.keys(errors).length === 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    create.mutate({ tab_id: tabId, type, data: clean, parent_id: parentId } as CreateBlockInput, {
      onSuccess: (b) => onDone(b),
    });
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand/30 bg-surface p-4 shadow-[0_0_0_4px_rgba(31,92,74,.06)] sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <TypeChip type={type} />
        <p className="text-[15px] font-medium">New {meta.label.toLowerCase()}</p>
      </div>
      <BlockForm type={type} data={data} onChange={setData} errors={tried ? errors : {}} autoFocus />
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onDone()}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          <Plus className="size-4" /> Add {meta.label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

/** Create a block whose default data is already valid. */
export function useQuickCreate() {
  const create = useCreateBlock();
  return {
    pending: create.isPending,
    run: (type: BlockType, tabId: string, parentId: string | null, onCreated: (b: Block) => void) =>
      create.mutate(
        { tab_id: tabId, type, data: getMeta(type).defaultData(), parent_id: parentId } as CreateBlockInput,
        { onSuccess: onCreated },
      ),
  };
}
