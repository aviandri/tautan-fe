"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block, BlockDataMap, BlockType } from "../types";
import { getMeta, type FieldErrors } from "./block-meta";
import { useSetBlockDataLocal, useUpdateBlock } from "./queries";

export type SaveState = "idle" | "pending" | "saving" | "saved" | "invalid";

/**
 * Local draft for one block's data with debounced autosave.
 * - Every change writes to the editor cache at once, so the phone preview is live.
 * - After `delay` ms of quiet, valid data is PATCHed; invalid data waits (errors shown).
 * - Pending changes flush on unmount (e.g. collapsing the card).
 */
export function useBlockDraft<K extends BlockType>(block: Extract<Block, { type: K }>, delay = 600) {
  const meta = getMeta(block.type as K);
  const [draft, setDraft] = useState<BlockDataMap[K]>(block.data as BlockDataMap[K]);
  const [showErrors, setShowErrors] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const setLocal = useSetBlockDataLocal();
  const update = useUpdateBlock();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<BlockDataMap[K] | null>(null);
  const lastSent = useRef(JSON.stringify(block.data));

  const { errors, data: clean } = useMemo(() => meta.validate(draft), [meta, draft]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    const v = meta.validate(next);
    if (Object.keys(v.errors).length) {
      setShowErrors(true);
      setState("invalid");
      return;
    }
    pending.current = null;
    const body = JSON.stringify(v.data);
    if (body === lastSent.current) return setState("saved");
    lastSent.current = body;
    setState("saving");
    update.mutate(
      { id: block.id, patch: { data: v.data } },
      { onSuccess: () => setState((s) => (s === "saving" ? "saved" : s)), onError: () => setState("idle") },
    );
  }, [block.id, meta, update]);

  const onChange = useCallback(
    (d: BlockDataMap[K]) => {
      setDraft(d);
      setLocal<K>(block.id, d);
      pending.current = d;
      setState("pending");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delay);
    },
    [block.id, delay, flush, setLocal],
  );

  // Flush on unmount; if the draft is invalid, put the last saved data back in
  // the cache so the preview matches what the server has.
  const flushRef = useRef(flush);
  const revertRef = useRef(() => {});
  useEffect(() => {
    flushRef.current = flush;
    revertRef.current = () => {
      if (pending.current) setLocal<K>(block.id, JSON.parse(lastSent.current));
    };
  });
  useEffect(
    () => () => {
      flushRef.current();
      revertRef.current();
    },
    [],
  );

  return {
    draft,
    onChange,
    flush,
    state,
    errors: (showErrors ? errors : {}) as FieldErrors,
    isValid: Object.keys(errors).length === 0,
    clean,
  };
}
