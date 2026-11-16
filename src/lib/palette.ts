/**
 * Which palette surface each card gets (themes v3). Pure, so the server renderer, the editor preview
 * and tests all agree. Cards are wrapped in a `display: contents` element with class tp-sN (the surface)
 * and, for cards that are themselves buttons, tp-sb (the button takes the surface too).
 */
export type PaletteMode = "cycle" | "by_type";

/** Cards that sit straight on the page ground, with no surface (and don't advance the cycle). */
const NO_SURFACE = new Set(["heading", "text", "divider", "image", "video", "music", "social_icons", "marquee", "before_after"]);

/** Cards whose whole body is a button: they take the surface as their button colour. */
const BUTTONISH = new Set(["link", "file", "booking", "folder"]);

/** by_type: card families → surface index (0-based; wraps when the palette has fewer surfaces). */
const FAMILY: Record<string, number> = {
  link: 0, file: 0, booking: 0, folder: 0,
  product: 1, shop: 1, marketplace: 1, whatsapp: 1, price_list: 1, store_info: 1, payment: 1, tip_jar: 1, reviews: 1, discount_code: 1,
  media_kit: 2, rate_card: 2, brands: 2, post_grid: 2, latest_video: 2, shop_the_look: 2, gallery: 2, events: 2, podcast: 2, community: 2,
  poll: 3, ask_me: 3, lead_magnet: 3, giveaway: 3, form: 3, email_signup: 3, contact_form: 3, countdown: 3,
  faq: 4, testimonial: 4, quote: 4, timeline: 4, resume: 4, spotlight: 4, map: 4,
};

export interface SurfaceAssignment {
  /** 1-based surface number (tp-s1 … tp-s6) */
  index: number;
  /** the card is a button and takes the surface as its button colour */
  button: boolean;
}

/** A stateful assigner for one page render: call it for each card in order. */
export function makeSurfacer(mode: PaletteMode, count: number): (type: string) => SurfaceAssignment | null {
  let i = 0;
  const n = Math.max(1, Math.min(6, count));
  return (type) => {
    if (NO_SURFACE.has(type)) return null;
    const idx = mode === "by_type" ? (FAMILY[type] ?? 4) % n : i++ % n;
    return { index: idx + 1, button: BUTTONISH.has(type) };
  };
}
