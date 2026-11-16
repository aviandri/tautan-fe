"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { useCreateBlock } from "@/lib/editor/queries";
import type { Block, BlockDataMap, BlockType, CreateBlockInput, Tab } from "@/lib/types";
import { TypeChip } from "./BlockCard";
import { BlockForm } from "./BlockForm";

/**
 * For types whose default data the server would reject (a URL is required),
 * collect it in a local draft first, then POST.
 */
export function NewBlockDraft<K extends BlockType>({
  type,
  tabId,
  parentId = null,
  tabs = [],
  initialData,
  onDone,
}: {
  type: K;
  tabId: string;
  parentId?: string | null;
  tabs?: Tab[];
  /** Prefill (smart paste). */
  initialData?: Partial<BlockDataMap[K]>;
  onDone: (created?: Block) => void;
}) {
  const meta = getMeta(type);
  const [data, setData] = useState<BlockDataMap[K]>({ ...meta.defaultData(), ...initialData } as BlockDataMap[K]);
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
      <BlockForm type={type} data={data} onChange={setData} errors={tried ? errors : {}} autoFocus ctx={{ tabs, currentTabId: tabId }} />
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
