"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, GripVertical, Pause, Play, Plus } from "lucide-react";
import { PublicPage } from "@/components/public";
import { BLOCK_LABELS, SAMPLE_BLOCKS, SAMPLE_TABS, sampleProfile } from "./sample";

const TOP = SAMPLE_BLOCKS.filter((b) => !b.parent_id);
const STEP_MS = 900;
const HOLD_MS = 2400;

/**
 * The hero's product window: the editor's block list beside the live phone preview.
 * Moment: blocks arrive one at a time in both columns, hold, and play again.
 */
export function EditorWindow() {
  const [count, setCount] = useState(TOP.length);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set = () => setReduced(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);

  useEffect(() => {
    if (reduced || !playing) {
      setCount(TOP.length);
      return;
    }
    let n = 1;
    setCount(n);
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      n = n >= TOP.length ? 1 : n + 1;
      setCount(n);
      t = setTimeout(tick, n === TOP.length ? HOLD_MS : STEP_MS);
    };
    t = setTimeout(tick, STEP_MS);
    return () => clearTimeout(t);
  }, [playing, reduced]);

  const shownIds = useMemo(() => new Set(TOP.slice(0, count).map((b) => b.id)), [count]);
  const blocks = useMemo(
    () => SAMPLE_BLOCKS.filter((b) => shownIds.has(b.id) || (b.parent_id && shownIds.has(b.parent_id))),
    [shownIds],
  );
  const profile = useMemo(() => sampleProfile("kertas"), []);

  return (
    <div className="relative mx-auto w-full max-w-[880px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_30px_80px_-30px_rgba(22,21,15,0.35)]">
      {/* window bar */}
      <div className="flex h-10 items-center gap-2 border-b border-line px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="h-2.5 w-2.5 rounded-full bg-line" />
        <span className="ml-3 hidden font-mono text-xs text-muted sm:inline">Editor · Shop tab</span>
        {!reduced ? (
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause the editor animation" : "Play the editor animation"}
            className="ml-auto grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-black/5 hover:text-foreground"
          >
            {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_300px]">
        {/* block list */}
        <div className="hidden flex-col gap-2 border-r border-line bg-background/60 p-4 sm:flex" aria-hidden>
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
            <span className="rounded-full bg-foreground px-2.5 py-1 text-background">Shop</span>
            <span className="rounded-full border border-line px-2.5 py-1">Classes</span>
          </div>
          {TOP.map((b, i) => {
            const shown = i < count;
            const l = BLOCK_LABELS[b.id];
            return (
              <div
                key={b.id}
                className={`flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2.5 transition-all duration-500 ${
                  shown ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
                }`}
              >
                <GripVertical className="h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-muted">{l.kind}</div>
                  <div className="truncate text-sm text-foreground">{l.title}</div>
                </div>
                <Eye className="h-4 w-4 shrink-0 text-muted" />
              </div>
            );
          })}
          <div className="mt-1 flex items-center justify-center gap-2 rounded-lg border border-dashed border-line py-2.5 text-sm text-muted">
            <Plus className="h-4 w-4" /> Add block
          </div>
        </div>

        {/* phone preview: the real renderer */}
        <div className="flex justify-center bg-background/40 p-4">
          <div className="h-[420px] w-full max-w-[268px] overflow-hidden rounded-[28px] border-[6px] border-foreground bg-surface">
            <div className="h-full overflow-hidden" inert>
              <PublicPage profile={profile} tabs={SAMPLE_TABS} blocks={blocks} preview style={{ padding: "28px 14px 20px" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
