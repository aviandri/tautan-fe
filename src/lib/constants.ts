/**
 * Runtime constants shared by the editor, renderers and validators. Deliberately zod-free:
 * types.ts builds its zod schemas from these and re-exports them, but client code that only needs a
 * list of values imports them from here so it doesn't pull zod and every schema into its bundle.
 */

export const ONBOARDING_INTENTS = ["local", "sell", "audience", "other"] as const;

export const isTempUsername = (u: string) => u.startsWith("tmp.");

export const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export const BLOCK_TYPES = [
  "link",
  "text",
  "image",
  "video",
  "music",
  "social_icons",
  "folder",
  "faq",
  "testimonial",
  "contact_form",
  // Phase 2 (P2-1)
  "heading",
  "divider",
  "file",
  "discount_code",
  "countdown",
  "booking",
  "quote",
  "email_signup",
  // Phase 2 (P2-3)
  "form",
  // Phase 3 (P3-A Sell)
  "product",
  "shop",
  "marketplace",
  "whatsapp",
  "price_list",
  "store_info",
  "payment",
  "tip_jar",
  "reviews",
  // Phase 3 (P3-B Creators)
  "media_kit",
  "rate_card",
  "brands",
  "post_grid",
  "latest_video",
  "shop_the_look",
  "gallery",
  "events",
  "podcast",
  "community",
  // Phase 3 (P3-C Engage)
  "poll",
  "ask_me",
  "lead_magnet",
  "giveaway",
  // Phase 3 (P3-D Text and layout)
  "spotlight",
  "marquee",
  "timeline",
  "resume",
  "before_after",
  "map",
] as const;

export const TEXT_ALIGNS = ["left", "center", "right"] as const;

export const LINK_LAYOUTS = [
  "button",
  "thumbnail",
  "thumbnail_highlight",
  "grid2",
  "grid3",
  "image_background",
  "carousel",
] as const;

export const FORM_FIELD_TYPES = ["text", "email", "phone", "textarea", "select", "checkbox", "date", "number"] as const;

export const CURRENCIES = ["IDR", "USD", "SGD", "MYR"] as const;

export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

export const MARKETPLACE_PLATFORMS = ["shopee", "tokopedia", "tiktok_shop", "lazada", "blibli", "bukalapak", "etsy", "amazon", "gumroad"] as const;

export const PRODUCT_BADGES = ["new", "best_seller", "pre_order", "sold_out"] as const;

export const WA_ORDER_FIELDS = ["items", "name", "address", "note"] as const;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const COURIERS = ["gosend", "grabexpress", "jne", "jnt", "sicepat", "anteraja", "pos", "shopee_express", "lalamove", "paxel", "pickup"] as const;

export const TIP_PLATFORMS = ["saweria", "trakteer", "kofi", "paypal", "buymeacoffee"] as const;

export const MEDIA_KIT_PLATFORMS = ["instagram", "tiktok", "youtube", "x", "facebook", "threads", "twitch", "linkedin", "spotify", "podcast", "blog"] as const;

export const POST_PLATFORMS = ["instagram", "tiktok", "youtube"] as const;

export const EVENT_STATUSES = ["sold_out", "few_left", "cancelled"] as const;

export const LIVE_PLATFORMS = ["tiktok", "instagram", "youtube", "twitch", "facebook", "shopee", "other"] as const;

export const COMMUNITY_PLATFORMS = ["whatsapp_group", "whatsapp_channel", "telegram", "discord", "line"] as const;

// P3-C/D and gates
export const SUBSCRIBE_MODES = ["everyone", "ask", "none"] as const;

export const SHOW_RESULTS = ["after_vote", "always", "never"] as const;

export const MARQUEE_SPEEDS = ["slow", "normal", "fast"] as const;

export const TEXT_STYLES = ["card", "sticky_note", "speech_bubble", "torn_paper", "chalkboard"] as const;

export const DONATE_PLATFORMS = ["saweria", "trakteer", "kofi", "paypal", "buymeacoffee"] as const;

export const GATE_KINDS = ["password", "email", "age_18", "follow"] as const;

export const ENGAGE_TYPES = ["poll", "ask_me", "lead_magnet", "giveaway"] as const;

export const LAYOUT_TYPES = ["spotlight", "marquee", "timeline", "resume", "before_after", "map"] as const;
