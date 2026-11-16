"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { siblings, useReorderBlocks } from "@/lib/editor/queries";
import type { Block, BlockType, Tab } from "@/lib/types";
import { BlockPicker, NewBlockDraft, useQuickCreate } from "./AddBlock";
import { BlockCard } from "./BlockCard";
import { DeletedBlocks } from "./DeletedBlocks";
import { SortableItem, SortableList } from "./Sortable";

type Adding = { type: BlockType; parentId: string | null } | null;

export function BlockList({ blocks, tab, tabs }: { blocks: Block[]; tab: Tab; tabs: Tab[] }) {
  const top = siblings(blocks, tab.id, null);
  const reorder = useReorderBlocks();
  const quick = useQuickCreate();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState<Adding>(null);

  /** New top-level blocks go first: the server appends, so move it to the front. */
  function placeFirst(b: Block) {
    if (b.parent_id) return;
    const ids = [b.id, ...top.filter((x) => x.id !== b.id).map((x) => x.id)];
    reorder.mutate({ tabId: tab.id, ids });
  }

  function onCreated(b: Block) {
    placeFirst(b);
    setExpanded(b.id);
    setFresh(b.id);
    setAdding(null);
  }

  function pick(type: BlockType, parentId: string | null = null) {
    setPicking(false);
    if (getMeta(type).needsInputFirst) setAdding({ type, parentId });
    else quick.run(type, tab.id, parentId, onCreated);
  }

  const toggle = (id: string) => {
    setExpanded((e) => (e === id ? null : id));
    setFresh(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {picking ? (
        <BlockPicker onPick={(t) => pick(t)} onClose={() => setPicking(false)} />
      ) : adding && !adding.parentId ? null : (
        <Button size="lg" onClick={() => setPicking(true)} loading={quick.pending} className="w-full">
          <Plus className="size-4" /> Add block
        </Button>
      )}

      {adding && !adding.parentId && (
        <NewBlockDraft
          type={adding.type}
          tabId={tab.id}
          tabs={tabs}
          onDone={(b) => (b ? onCreated(b) : setAdding(null))}
        />
      )}

      {top.length === 0 && !adding && !picking && (
        <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
          <p className="text-[15px] font-medium">This tab is empty</p>
          <p className="mt-1 text-sm text-muted">Add a link, some text or a video to get started.</p>
        </div>
      )}

      <SortableList items={top} onReorder={(ids) => reorder.mutate({ tabId: tab.id, ids })}>
        <div className="flex flex-col gap-2.5">
          {top.map((b) => (
            <SortableItem key={b.id} id={b.id}>
              {({ drag, isDragging }) => (
                <BlockCard
                  block={b}
                  tabs={tabs}
                  expanded={expanded === b.id && !isDragging}
                  onToggle={() => toggle(b.id)}
                  drag={drag}
                  isDragging={isDragging}
                  autoFocus={fresh === b.id}
                >
                  {b.type === "folder" && (
                    <FolderChildren
                      folder={b}
                      blocks={blocks}
                      tabs={tabs}
                      adding={adding?.parentId === b.id}
                      onAdd={() => pick("link", b.id)}
                      onAddDone={() => setAdding(null)}
                    />
                  )}
                </BlockCard>
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
  tabs,
  adding,
  onAdd,
  onAddDone,
}: {
  folder: Block;
  blocks: Block[];
  tabs: Tab[];
  adding: boolean;
  onAdd: () => void;
  onAddDone: () => void;
}) {
  const children = siblings(blocks, folder.tab_id, folder.id);
  const reorder = useReorderBlocks();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="mt-6">
      <p className="mb-2 text-[13px] font-medium">
        Links in this folder <span className="font-normal text-muted">({children.length})</span>
      </p>
      <SortableList items={children} onReorder={(ids) => reorder.mutate({ tabId: folder.tab_id, ids })}>
        <div className="flex flex-col gap-2">
          {children.map((c) => (
            <SortableItem key={c.id} id={c.id}>
              {({ drag, isDragging }) => (
                <BlockCard
                  nested
                  block={c}
                  tabs={tabs}
                  expanded={expanded === c.id && !isDragging}
                  onToggle={() => setExpanded((e) => (e === c.id ? null : c.id))}
                  drag={drag}
                  isDragging={isDragging}
                />
              )}
            </SortableItem>
          ))}
        </div>
      </SortableList>
      <div className="mt-2">
        {adding ? (
          <NewBlockDraft
            type="link"
            tabId={folder.tab_id}
            parentId={folder.id}
            tabs={tabs}
            onDone={(b) => {
              onAddDone();
              if (b) setExpanded(null);
            }}
          />
        ) : (
          <Button variant="secondary" size="sm" onClick={onAdd}>
            <Plus className="size-3.5" /> Add link to folder
          </Button>
        )}
      </div>
    </div>
  );
}
