"use client";

/**
 * Renders a card the visitor just unlocked (or re-opened from a saved token) with the same
 * renderers the server uses. Lazily imported by runtime-p3cd only when a gate opens, so this
 * chunk (renderers + createRoot) never counts toward the page's first-load JS.
 */
import { createRoot } from "react-dom/client";
import type { Block, MediaMap } from "@/lib/types";
import { BlockRenderer } from "./BlockRenderer";

export function renderUnlocked(host: HTMLElement, body: { block: unknown; children: unknown[]; media: Record<string, unknown> }, username: string) {
  const block = body.block as Block;
  const children = (body.children ?? []) as Block[];
  createRoot(host).render(
    <BlockRenderer
      block={block}
      childBlocks={children}
      opts={{ env: { username, preview: false, tabs: [], media: body.media as MediaMap }, now: Date.now() }}
    />,
  );
}
