"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "../api";
import { qk } from "../session";
import type { Block, BlockDataMap, BlockType, CreateBlockInput, EditorResponse, Tab, UpdateBlockInput } from "../types";

// ---------- selectors ----------

export const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/** Siblings in display order: top-level blocks of a tab (parentId null) or one folder's children. */
export function siblings(blocks: Block[], tabId: string, parentId: string | null) {
  return blocks.filter((b) => b.tab_id === tabId && b.parent_id === parentId).sort(byPosition);
}

export function useEditorData() {
  return useQuery({ queryKey: qk.editor, queryFn: api.profile.editor, staleTime: 60_000 });
}

// ---------- cache helpers ----------

type Updater = (e: EditorResponse) => EditorResponse;

function edit(qc: QueryClient, fn: Updater) {
  qc.setQueryData<EditorResponse>(qk.editor, (e) => (e ? fn(e) : e));
}

/** Snapshot → optimistic update → rollback on error, with a readable toast. */
function optimistic<V>(qc: QueryClient, fn: (v: V) => Updater) {
  return {
    onMutate: async (v: V) => {
      await qc.cancelQueries({ queryKey: qk.editor });
      const prev = qc.getQueryData<EditorResponse>(qk.editor);
      edit(qc, fn(v));
      return { prev };
    },
    onError: (err: unknown, _v: V, ctx?: { prev?: EditorResponse }) => {
      if (ctx?.prev) qc.setQueryData(qk.editor, ctx.prev);
      toast.error(errorMessage(err));
      // Order mismatches mean our view is stale; resync.
      if (err instanceof ApiError && (err.code === "order_mismatch" || err.status === 404)) {
        qc.invalidateQueries({ queryKey: qk.editor });
      }
    },
  };
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "slug_taken":
        return "Another tab already uses that slug.";
      case "last_tab":
        return "Your page needs at least one tab.";
      case "order_mismatch":
        return "Your page changed somewhere else. Reloaded the latest version.";
      case "not_found":
        return "That item no longer exists.";
      default:
        return err.message || "Couldn't save. Try again.";
    }
  }
  return "Couldn't reach the server. Check your connection.";
}

const now = () => new Date().toISOString();

// ---------- blocks ----------

export function useCreateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBlockInput) => api.blocks.create(input),
    onSuccess: (block) => edit(qc, (e) => ({ ...e, blocks: [...e.blocks, block] })),
    onError: (err) => toast.error(errorMessage(err)),
  });
}

/** Live local write (no request), so the preview follows every keystroke. */
export function useSetBlockDataLocal() {
  const qc = useQueryClient();
  return <K extends BlockType>(id: string, data: BlockDataMap[K]) =>
    edit(qc, (e) => ({
      ...e,
      blocks: e.blocks.map((b) => (b.id === id ? ({ ...b, data } as Block) : b)),
    }));
}

export function useUpdateBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateBlockInput }) => api.blocks.update(id, patch),
    ...optimistic(qc, ({ id, patch }: { id: string; patch: UpdateBlockInput }) => (e) => {
      const target = e.blocks.find((b) => b.id === id);
      return {
        ...e,
        blocks: e.blocks.map((b) => {
          if (b.id === id) return { ...b, ...patch, updated_at: now() } as Block;
          // Folder children follow their folder to another tab.
          if (patch.tab_id && target?.type === "folder" && b.parent_id === id) return { ...b, tab_id: patch.tab_id };
          return b;
        }),
      };
    }),
    // Keep server-normalised data, but don't clobber newer local typing for data patches.
    onSuccess: (block, { patch }) => {
      if (patch.data === undefined)
        edit(qc, (e) => ({ ...e, blocks: e.blocks.map((b) => (b.id === block.id ? { ...block, data: b.data } as Block : b)) }));
    },
  });
}

export function useDeleteBlock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.blocks.remove(id),
    ...optimistic(qc, (id: string) => (e) => ({
      ...e,
      blocks: e.blocks.filter((b) => b.id !== id && b.parent_id !== id),
    })),
  });
}

export function useReorderBlocks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tabId, ids }: { tabId: string; ids: string[] }) => api.blocks.reorder(tabId, ids),
    ...optimistic(qc, ({ ids }: { tabId: string; ids: string[] }) => (e) => {
      const pos = new Map(ids.map((id, i) => [id, i]));
      return { ...e, blocks: e.blocks.map((b) => (pos.has(b.id) ? { ...b, position: pos.get(b.id)! } : b)) };
    }),
  });
}

/**
 * Move a block to another tab or into/out of a folder. It lands at the end of
 * its new sibling group (the server appends on parent/tab change).
 */
export function useMoveBlock() {
  const update = useUpdateBlock();
  const qc = useQueryClient();
  return (block: Block, to: { tab_id: string; parent_id: string | null }) => {
    const e = qc.getQueryData<EditorResponse>(qk.editor);
    const end = e ? siblings(e.blocks, to.tab_id, to.parent_id).length : 0;
    edit(qc, (x) => ({ ...x, blocks: x.blocks.map((b) => (b.id === block.id ? { ...b, position: end } : b)) }));
    update.mutate({ id: block.id, patch: to });
  };
}

// ---------- tabs ----------

export function useCreateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { title: string }) => api.tabs.create(b),
    onSuccess: (tab) => edit(qc, (e) => ({ ...e, tabs: [...e.tabs, tab] })),
    onError: (err) => toast.error(errorMessage(err)),
  });
}

export function useUpdateTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Tab, "title" | "slug">> }) =>
      api.tabs.update(id, patch),
    ...optimistic(qc, ({ id, patch }: { id: string; patch: Partial<Pick<Tab, "title" | "slug">> }) => (e) => ({
      ...e,
      tabs: e.tabs.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
    onSuccess: (tab) => edit(qc, (e) => ({ ...e, tabs: e.tabs.map((t) => (t.id === tab.id ? tab : t)) })),
  });
}

export function useDeleteTab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.tabs.remove(id),
    ...optimistic(qc, (id: string) => (e) => ({
      ...e,
      tabs: e.tabs.filter((t) => t.id !== id),
      blocks: e.blocks.filter((b) => b.tab_id !== id),
    })),
  });
}

export function useReorderTabs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.tabs.reorder(ids),
    ...optimistic(qc, (ids: string[]) => (e) => {
      const pos = new Map(ids.map((id, i) => [id, i]));
      return { ...e, tabs: e.tabs.map((t) => ({ ...t, position: pos.get(t.id) ?? t.position })) };
    }),
  });
}
