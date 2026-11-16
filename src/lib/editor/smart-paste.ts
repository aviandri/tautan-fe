/**
 * P2-5 smart paste: turn a POST /unfurl result into a block to create.
 * The server classifies the URL (media → video/music, Calendly/Cal.com →
 * booking, images → image, emails → mailto link) and scrapes OG metadata.
 */
import type { CreateBlockInput, MarketplacePlatform, ProductData, UnfurlResult } from "../types";
import { normalizeUrl, urlError } from "../url";
import { detectMarketplace, isProductUrl, MARKETPLACES } from "../sell/platforms";

const clip = (s: string | undefined, n: number) => {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Does pasted text look like something worth unfurling (URL, domain or email)? */
export function looksPasteable(text: string): boolean {
  const s = text.trim();
  if (!s || s.length > 2048 || /\s/.test(s)) return false;
  return /^(https?:\/\/|mailto:|www\.)/i.test(s) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) || /^([a-z0-9-]+\.)+[a-z]{2,}([/?#].*)?$/i.test(s);
}

/** The block a result suggests, for `tabId` (and optionally inside a folder). */
export function blockFromUnfurl(r: UnfurlResult, tabId: string, parentId: string | null = null): CreateBlockInput {
  const base = { tab_id: tabId, parent_id: parentId };
  const title = clip(r.title || r.site_name, 120);
  // Inside a folder only links are allowed.
  const type = parentId ? "link" : r.suggested_type;
  if (type === "latest_video" && r.youtube_channel_id)
    return { ...base, type: "latest_video", data: { channel_id: r.youtube_channel_id, show: { count: 1 } } };
  switch (type) {
    case "video":
    case "music":
    case "booking":
      return { ...base, type, data: { url: r.url } };
    case "image":
      return { ...base, type: "image", data: { url: r.image_url || r.url, ...(title ? { alt: title } : {}) } };
    default: {
      const thumb = r.image_url && !urlError(r.image_url, false) ? r.image_url : undefined;
      const description = clip(r.description, 300);
      return {
        ...base,
        type: "link",
        data: {
          title,
          url: r.url,
          ...(r.dest_kind === "email" ? { dest_kind: "email" as const } : {}),
          ...(description ? { description } : {}),
          ...(thumb ? { thumbnail_url: thumb } : {}),
        },
      };
    }
  }
}

// ---------- P3-A: marketplace links ----------

/** A pasted link on a known marketplace: the editor asks what to make of it. */
export interface SellSuggestion {
  platform: MarketplacePlatform;
  url: string;
  /** a single product (vs a whole store) */
  isProduct: boolean;
  /** prefill for a product card (from OG tags, best effort) */
  product: Partial<ProductData>;
  /** what the server would otherwise make (a link) */
  unfurl: UnfurlResult | null;
}

/**
 * Turn an /unfurl result (or, when the call failed, just the pasted text) into a sell suggestion.
 * Returns null for links that aren't on a known marketplace.
 */
export function sellSuggestion(r: UnfurlResult | null, pasted: string): SellSuggestion | null {
  const url = r?.url || normalizeUrl(pasted.trim());
  const platform = r?.platform ?? detectMarketplace(url);
  if (!platform) return null;
  const isProduct = r?.suggested_type === "product" || isProductUrl(platform, url);
  const name = clip(r?.title, 100).replace(new RegExp(`\\s*[|·–-]\\s*${MARKETPLACES[platform].label}.*$`, "i"), "");
  const image = r?.image_url && /^https?:\/\//i.test(r.image_url) ? r.image_url : undefined;
  const product: Partial<ProductData> = {
    name,
    images: image ? [image] : [],
    ...(r?.price != null ? { price: r.price, currency: r.currency ?? "IDR" } : {}),
    ...(clip(r?.description, 1000) ? { description: clip(r?.description, 1000) } : {}),
    action: { kind: "marketplace", marketplace: platform, url },
  };
  return { platform, url, isProduct, product, unfurl: r };
}

/** A marketplace card with one store. */
export function marketplaceBlock(s: SellSuggestion, tabId: string): CreateBlockInput {
  return { tab_id: tabId, parent_id: null, type: "marketplace", data: { stores: [{ platform: s.platform, url: s.url }] } };
}

/** A plain link for the same URL (what P2 smart paste made). */
export function linkBlock(s: SellSuggestion, tabId: string): CreateBlockInput {
  if (s.unfurl) return blockFromUnfurl({ ...s.unfurl, suggested_type: "link" }, tabId);
  return { tab_id: tabId, parent_id: null, type: "link", data: { title: MARKETPLACES[s.platform].label, url: s.url } };
}
