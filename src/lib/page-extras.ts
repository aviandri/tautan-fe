import type { Announcement as StoredAnnouncement, PageSettings, Profile } from "./types";
import { safeHref, safeImageSrc } from "./safe-url";
import { isColor } from "./theme/resolve";

// P2-7 page extras (SPEC "P2-7 Page extras"). The stored shapes are the shared zod types in types.ts;
// these readers validate them for display, because the values reach scripts and visitor-facing UI.

export { isTempUsername } from "./constants";
export type { PageSettings };

/** An announcement that is safe to show: id present (dismissals key on it), URLs and colours checked. */
export interface Announcement {
  id: string;
  layout: "banner" | "popup" | "card";
  title: string;
  description?: string;
  image_url?: string;
  cta?: { label: string; url?: string; form_block_id?: string };
  bg_color?: string;
  text_color?: string;
}


/** The announcement to show, or null (the BE already returns null outside its schedule). */
export function readAnnouncement(profile: Profile): Announcement | null {
  const a = profile.announcement as Partial<StoredAnnouncement> | null | undefined;
  if (!a || typeof a !== "object" || typeof a.id !== "string" || !a.title?.trim()) return null;
  const layout = a.layout === "popup" || a.layout === "card" ? a.layout : "banner";
  const cta =
    a.cta && typeof a.cta.label === "string" && a.cta.label.trim()
      ? {
          label: a.cta.label.slice(0, 40),
          url: safeHref(a.cta.url),
          form_block_id: typeof a.cta.form_block_id === "string" ? a.cta.form_block_id : undefined,
        }
      : undefined;
  return {
    id: a.id,
    layout,
    title: a.title.slice(0, 100),
    description: typeof a.description === "string" ? a.description.slice(0, 204) : undefined,
    image_url: safeImageSrc(a.image_url),
    cta: cta && (cta.url || cta.form_block_id) ? cta : undefined,
    bg_color: isColor(a.bg_color) ? a.bg_color : undefined,
    text_color: isColor(a.text_color) ? a.text_color : undefined,
  };
}

const GA4 = /^G-[A-Z0-9]{4,20}$/;
const PIXEL = /^\d{5,20}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;

/** Settings with every value checked; IDs that fail their format are dropped (they end up in scripts). */
export function readSettings(profile: Profile): PageSettings {
  const s = (profile.settings ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const out: PageSettings = {};
  if (GA4.test(str(s.ga4_id))) out.ga4_id = str(s.ga4_id);
  if (PIXEL.test(str(s.meta_pixel_id))) out.meta_pixel_id = str(s.meta_pixel_id);
  if (LANG.test(str(s.language))) out.language = str(s.language);
  // Share is on by default (user decision, 2026-11-17): only an explicit false hides it
  if (s.show_share !== false) out.show_share = true;
  if (s.show_save_contact === true) out.show_save_contact = true;
  return out;
}
