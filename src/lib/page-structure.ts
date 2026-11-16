import type { Block, Tab } from "./types";

export function sortTabs(tabs: Tab[]): Tab[] {
  return [...tabs].sort((a, b) => a.position - b.position);
}

/** The tab matching `slug`, else the first tab by position. */
export function selectTab(tabs: Tab[], slug: string | null | undefined): Tab | undefined {
  const sorted = sortTabs(tabs);
  return (slug && sorted.find((t) => t.slug === slug)) || sorted[0];
}

export interface TabTree {
  top: Block[];
  children: Map<string, Block[]>;
}

/**
 * Visible top-level blocks of a tab in order, plus folder children keyed by folder id.
 * Hidden blocks are dropped (the public API already omits them; the editor preview doesn't).
 * A child whose folder is hidden is dropped with it.
 */
export function buildTabTree(blocks: Block[], tabId: string | undefined): TabTree {
  const byPos = (a: Block, b: Block) => a.position - b.position;
  const visible = blocks.filter((b) => b.is_visible && b.tab_id === tabId);
  const top = visible.filter((b) => !b.parent_id).sort(byPos);
  const children = new Map<string, Block[]>();
  for (const b of visible) {
    if (!b.parent_id) continue;
    const list = children.get(b.parent_id) ?? [];
    list.push(b);
    children.set(b.parent_id, list);
  }
  for (const list of children.values()) list.sort(byPos);
  return { top, children };
}

/** Query string for a tab ("" for the first tab, so the canonical URL stays clean). Prefix with the path. */
export function tabQuery(tabs: Tab[], tab: Tab): string {
  return sortTabs(tabs)[0]?.id === tab.id ? "" : `?tab=${encodeURIComponent(tab.slug)}`;
}
