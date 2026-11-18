import type { Tab } from "@/lib/types";
import { tabQuery } from "@/lib/page-structure";

/**
 * What the shared (server-or-client) renderers need to know about the page they're on. Plain data,
 * passed as a prop: the public route renders these as React Server Components, where context
 * doesn't exist.
 */
export interface PageEnv {
  username: string;
  /** Editor live preview: no events, no network, links don't navigate (enforced by PageRuntime). */
  preview: boolean;
  /** sorted */
  tabs: Tab[];
  /** GET /public/{u} `media`: pixel size and ready ?w= variants per upload path */
  media?: MediaMap;
  /** payments (b): currencies buyers can pay in right now ([] = no checkout) */
  payCurrencies?: string[];
}

/** BE "Performance: implemented" 2b: keyed by the upload's pathname ("/uploads/x.jpg"). */
export type { MediaMap } from "@/lib/types";
import type { MediaMap } from "@/lib/types";
export type MediaInfo = MediaMap[string];

export const NO_ENV: PageEnv = { username: "", preview: true, tabs: [] };

/** Look up an image's stored size and variants (absolute or relative upload URLs). */
export function mediaFor(env: Pick<PageEnv, "media"> | undefined, src: string | undefined): MediaInfo | undefined {
  if (!src || !env?.media) return undefined;
  let path = src;
  try {
    path = new URL(src, "http://x").pathname;
  } catch {
    return undefined;
  }
  const m = env.media[path];
  return m && m.width > 0 && m.height > 0 ? m : undefined;
}

export function tabHref(env: PageEnv, tabId: string): { href: string; slug: string } | undefined {
  const t = env.tabs.find((x) => x.id === tabId);
  return t ? { href: `/${env.username}${tabQuery(env.tabs, t)}`, slug: t.slug } : undefined;
}

/**
 * Attributes PageRuntime reads off the server HTML (event delegation, so cards need no JS of their own):
 * - data-b: block id → a click records {kind:"click", block_id}
 * - data-a: meta.action for that click ("buy", "copy", "wa_order", "marketplace:shopee", …)
 */
export function track(blockId: string, action?: string): Record<string, string> {
  return action ? { "data-b": blockId, "data-a": action } : { "data-b": blockId };
}

/** payments (b): can a priced card in this currency be bought on this page now? */
export function canCheckout(env: PageEnv, currency: string | undefined): boolean {
  return !!env.payCurrencies?.includes(currency || "IDR");
}

/** payments (b): the FE checkout page for a card (or a shop item). Plain link, no JS. */
export function checkoutHref(env: PageEnv, blockId: string, itemId?: string): string {
  return `/${env.username}/checkout?block=${encodeURIComponent(blockId)}${itemId ? `&item=${encodeURIComponent(itemId)}` : ""}`;
}
