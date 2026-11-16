import type { Block, BlockOf, Tab } from "./types";

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

type GroupLayout = "grid2" | "grid3" | "carousel";
const GROUPED = new Set<string>(["grid2", "grid3", "carousel"]);

export type ListItem =
  | { kind: "block"; block: Block }
  | { kind: "group"; layout: GroupLayout; blocks: BlockOf<"link">[] };

/** Adjacent links sharing a grid2 / grid3 / carousel layout become one group. */
export function groupBlocks(blocks: Block[]): ListItem[] {
  const out: ListItem[] = [];
  for (const b of blocks) {
    const layout = b.type === "link" ? b.data.layout : undefined;
    if (b.type === "link" && layout && GROUPED.has(layout)) {
      const last = out[out.length - 1];
      if (last?.kind === "group" && last.layout === layout) last.blocks.push(b);
      else out.push({ kind: "group", layout: layout as GroupLayout, blocks: [b] });
    } else out.push({ kind: "block", block: b });
  }
  return out;
}

/**
 * The LCP candidate: the first image or video poster among the cards that fit in a phone's first
 * viewport (header + about six cards). It loads eagerly with fetchpriority=high and a preload.
 */
export function firstImageId(top: Block[]): string | undefined {
  return top.slice(0, 6).find((b) => b.type === "image" || b.type === "video" || (b.type === "product" && b.data.images.length > 0))?.id;
}
