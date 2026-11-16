/**
 * P2-5 smart paste: turn a POST /unfurl result into a block to create.
 * The server classifies the URL (media → video/music, Calendly/Cal.com →
 * booking, images → image, emails → mailto link) and scrapes OG metadata.
 */
import type { CreateBlockInput, UnfurlResult } from "../types";
import { urlError } from "../url";

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
