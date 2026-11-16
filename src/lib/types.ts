/**
 * Shared API types. Source of truth: /SPEC.md ("Data model" + "REST API").
 * Keep in sync with the Go types in tautan-be. Zod schemas double as runtime
 * validators for forms and API responses; TS types are inferred from them.
 */
import { z } from "zod";

// ---------- Theme ----------

export const ThemeBgSchema = z.object({
  /** split = the gradient behind the header only; none = plain page (P2-2) */
  type: z.enum(["color", "gradient", "image", "split", "none"]),
  value: z.string(),
});

export const ButtonStyleSchema = z.enum(["fill", "outline", "shadow"]);

export const ThemeColorPairSchema = z.object({ color: z.string(), text_color: z.string() });

export const ThemeSchema = z.object({
  preset: z.string(),
  bg: ThemeBgSchema,
  button: z.object({
    style: ButtonStyleSchema,
    radius: z.number(),
    color: z.string(),
    text_color: z.string(),
  }),
  /** font family name, e.g. "DM Sans" (the BE rejects ids) */
  font: z.string(),
  text_color: z.string(),
  // ---- Theme v2 (P2-2). All optional; the BE stores unknown keys untouched. ----
  /** colour behind the page column on wide screens */
  bg_desktop: z.string().optional(),
  /** gap between blocks, 0–64 px */
  spacing: z.number().optional(),
  block: ThemeColorPairSchema.optional(),
  label: ThemeColorPairSchema.optional(),
  border: z.object({ width: z.number(), color: z.string() }).optional(),
  shadow: z.object({ amount: z.number(), style: z.enum(["soft", "solid"]) }).optional(),
  /** font family names */
  fonts: z.object({ title: z.string().optional(), body: z.string().optional() }).optional(),
  header: z
    .object({ layout: z.enum(["classic", "banner", "headshot", "business"]), banner_image_url: z.string().optional() })
    .optional(),
});
export type Theme = z.infer<typeof ThemeSchema>;
export type HeaderLayout = NonNullable<Theme["header"]>["layout"];
export type ThemeBg = z.infer<typeof ThemeBgSchema>;
export type ButtonStyle = z.infer<typeof ButtonStyleSchema>;

// ---------- SEO ----------

export const SeoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image_url: z.string().optional(),
});
export type Seo = z.infer<typeof SeoSchema>;

// ---------- User / Profile ----------

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  created_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;

/** P2-2: platform is lowercase [a-z0-9_]{1,30}; "divider" is a spacer whose url is ignored. */
export const SocialSchema = z.object({ platform: z.string(), url: z.string() });
export type Social = z.infer<typeof SocialSchema>;

export const ProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  username: z.string(),
  display_name: z.string(),
  bio: z.string(),
  avatar_url: z.string().nullable(),
  theme: ThemeSchema,
  seo: SeoSchema,
  is_published: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  // P2-2 header socials row (the BE always returns them; optional here for older fixtures)
  socials: z.array(SocialSchema).optional(),
  socials_position: z.enum(["top", "bottom"]).optional(),
  // P2-6 / P2-7 (the BE always returns them; optional here for older fixtures)
  onboarding: z.lazy(() => OnboardingSchema).optional(),
  announcement: z.lazy(() => AnnouncementSchema).nullable().optional(),
  settings: z.lazy(() => PageSettingsSchema).optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

// ---------- P2-6 onboarding / P2-7 page extras ----------

export const ONBOARDING_INTENTS = ["local", "sell", "audience", "other"] as const;
export type OnboardingIntent = (typeof ONBOARDING_INTENTS)[number];

export const OnboardingSchema = z.object({
  completed: z.boolean(),
  completed_at: z.string().optional(),
  /** free-form, [a-z_]{1,30} */
  step: z.string().optional(),
  intent: z.enum(ONBOARDING_INTENTS).optional(),
  source: z.enum(["import", "scratch", "instagram"]).optional(),
  /** server-managed */
  username_claimed: z.boolean(),
  /** server-managed */
  suggested_username: z.string().optional(),
});
export type Onboarding = z.infer<typeof OnboardingSchema>;
/** PATCH /profile {onboarding}: merged server-side; username_claimed/suggested_username are read-only. */
export type OnboardingPatch = Partial<Pick<Onboarding, "step" | "intent" | "source" | "completed">>;

export const AnnouncementSchema = z.object({
  /** server-assigned; stable across edits (key dismissals on it) */
  id: z.string().optional(),
  layout: z.enum(["banner", "popup", "card"]).optional(),
  title: z.string().max(100),
  description: z.string().max(204).optional(),
  image_url: z.string().optional(),
  cta: z.object({ label: z.string().max(40), url: z.string().optional(), form_block_id: z.string().optional() }).optional(),
  bg_color: z.string().optional(),
  text_color: z.string().optional(),
  schedule: z.object({ start_at: z.string().optional(), end_at: z.string().optional() }).optional(),
});
export type Announcement = z.infer<typeof AnnouncementSchema>;

/** Replaced wholesale on PATCH; unknown keys are dropped by the BE. */
export const PageSettingsSchema = z.object({
  ga4_id: z.string().optional(),
  meta_pixel_id: z.string().optional(),
  language: z.string().optional(),
  show_share: z.boolean().optional(),
  show_save_contact: z.boolean().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
});
export type PageSettings = z.infer<typeof PageSettingsSchema>;

/** Temporary usernames from username-less signup; can never be claimed. */
export const isTempUsername = (u: string) => u.startsWith("tmp.");

export const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
export const UsernameSchema = z
  .string()
  .regex(USERNAME_RE, "3–30 chars: lowercase letters, numbers, _ or .");

// ---------- Tabs ----------

export const TabSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  title: z.string(),
  slug: z.string(),
  position: z.number(),
});
export type Tab = z.infer<typeof TabSchema>;

// ---------- Blocks ----------

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
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** P2-1: any block may carry a schedule (RFC 3339). Public reads drop blocks outside it. */
export const ScheduleSchema = z.object({
  start_at: z.string().optional(),
  end_at: z.string().optional(),
});
export type Schedule = z.infer<typeof ScheduleSchema>;
const schedule = { schedule: ScheduleSchema.optional() };

export const TEXT_ALIGNS = ["left", "center", "right"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

export const LINK_LAYOUTS = [
  "button",
  "thumbnail",
  "thumbnail_highlight",
  "grid2",
  "grid3",
  "image_background",
  "carousel",
] as const;
export type LinkLayout = (typeof LINK_LAYOUTS)[number];

export const LinkDataSchema = z.object({
  title: z.string(),
  url: z.string(),
  thumbnail_url: z.string().optional(),
  // P2-1
  description: z.string().max(300).optional(),
  layout: z.enum(LINK_LAYOUTS).optional(),
  /** emoji (≤8 chars) or an image URL */
  icon: z.string().optional(),
  label: z.string().max(24).optional(),
  text_align: z.enum(TEXT_ALIGNS).optional(),
  dest_kind: z.enum(["url", "email", "file", "tab"]).optional(),
  /** required when dest_kind = "tab" */
  tab_id: z.string().optional(),
  ...schedule,
});
export const TextDataSchema = z.object({ content: z.string(), ...schedule });
export const ImageDataSchema = z.object({
  url: z.string(),
  alt: z.string().optional(),
  link_url: z.string().optional(),
  full_bleed: z.boolean().optional(),
  lightbox: z.boolean().optional(),
  ...schedule,
});
export const VideoDataSchema = z.object({ url: z.string(), ...schedule });
export const MusicDataSchema = z.object({ url: z.string(), ...schedule });
export const SocialIconsDataSchema = z.object({
  items: z.array(z.object({ platform: z.string(), url: z.string() })),
  ...schedule,
});
export const FolderDataSchema = z.object({
  title: z.string(),
  style: z.enum(["collapsible", "inline"]).optional(),
  ...schedule,
});
export const FaqDataSchema = z.object({
  items: z.array(z.object({ q: z.string(), a: z.string() })),
  heading: z.string().optional(),
  description: z.string().optional(),
  ...schedule,
});
export const TestimonialDataSchema = z.object({
  items: z.array(
    z.object({
      quote: z.string(),
      author: z.string(),
      avatar_url: z.string().optional(),
      role: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
  heading: z.string().optional(),
  description: z.string().optional(),
  ...schedule,
});
export const ContactFormDataSchema = z.object({
  title: z.string(),
  button_label: z.string(),
  ...schedule,
});

// ---- P2-1 new block types ----
export const HeadingDataSchema = z.object({ title: z.string(), text_align: z.enum(TEXT_ALIGNS).optional(), ...schedule });
export const DividerDataSchema = z.object({
  style: z.enum(["solid", "dashed", "dotted", "double", "none"]).optional(),
  ...schedule,
});
export const FileDataSchema = z.object({
  title: z.string(),
  url: z.string(),
  file_name: z.string().optional(),
  /** bytes */
  size: z.number().optional(),
  ...schedule,
});
export const DiscountCodeDataSchema = z.object({
  /** "" = no code needed */
  code: z.string().max(40),
  description: z.string().optional(),
  brand: z.string().optional(),
  discount: z.string().optional(),
  url: z.string().optional(),
  button_label: z.string().optional(),
  ...schedule,
});
export const CountdownDataSchema = z.object({
  /** RFC 3339 */
  ends_at: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
  ended_message: z.string().optional(),
  hide_after_end: z.boolean().optional(),
  ...schedule,
});
/** https on calendly.com, cal.com or app.cal.com only (validated by the BE) */
export const BookingDataSchema = z.object({ url: z.string(), ...schedule });
export const QuoteDataSchema = z.object({
  quote: z.string(),
  name: z.string().optional(),
  role: z.string().optional(),
  heading: z.string().optional(),
  ...schedule,
});
// ---- P2-3 form block ----
export const FORM_FIELD_TYPES = ["text", "email", "phone", "textarea", "select", "checkbox", "date", "number"] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];
export const FormFieldSchema = z.object({
  /** [a-z0-9_-]{1,40}, unique within the form */
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  type: z.enum(FORM_FIELD_TYPES),
  label: z.string(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  /** select only, 1–50 */
  options: z.array(z.string()).optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;
export const FormDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  button_label: z.string().optional(),
  success_message: z.string().optional(),
  hide_labels: z.boolean().optional(),
  /** default true */
  create_contacts: z.boolean().optional(),
  /** default "none" */
  subscribe: z.enum(["everyone", "ask", "none"]).optional(),
  /** 1–30 */
  fields: z.array(FormFieldSchema),
  ...schedule,
});

export const EmailSignupDataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
  button_label: z.string().optional(),
  success_message: z.string().optional(),
  ...schedule,
});


// ---------- Phase 3 (P3-A Sell) ----------
// Money is an integer in minor units of `currency` (ISO 4217, default "IDR"): Rp 85.000 → 8500000.
// Phone numbers for WhatsApp are E.164 with the plus ("+6281234567890").

export const CURRENCIES = ["IDR", "USD", "SGD", "MYR"] as const;
const money = z.number().int().nonnegative();
const currency = z.enum(CURRENCIES).optional();
/** E.164: + then 8–15 digits */
export const E164_RE = /^\+[1-9][0-9]{7,14}$/;

export const MARKETPLACE_PLATFORMS = ["shopee", "tokopedia", "tiktok_shop", "lazada", "blibli", "bukalapak", "etsy", "amazon", "gumroad"] as const;
export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];

export const PRODUCT_BADGES = ["new", "best_seller", "pre_order", "sold_out"] as const;

export const ProductActionSchema = z.object({
  kind: z.enum(["url", "whatsapp", "marketplace"]),
  /** kind=url, and kind=marketplace (the listing URL) */
  url: z.string().optional(),
  /** kind=whatsapp: E.164 */
  wa_number: z.string().optional(),
  /** kind=whatsapp: placeholders {name} (product), {variant}, {price} */
  wa_template: z.string().max(500).optional(),
  /** kind=marketplace */
  marketplace: z.enum(MARKETPLACE_PLATFORMS).optional(),
  /** button text; renderer default per kind ("Order on WhatsApp", "Buy on Shopee", "Buy") */
  label: z.string().max(40).optional(),
});
export type ProductAction = z.infer<typeof ProductActionSchema>;

export const ProductVariantSchema = z.object({
  /** "Size", "Flavour" ≤30 */
  name: z.string().max(30),
  /** 1–20 options, each ≤30 */
  options: z.array(z.string().max(30)),
});

export const ProductDataSchema = z.object({
  /** 0–8 image URLs (uploads), first is the cover */
  images: z.array(z.string()),
  name: z.string().max(100),
  description: z.string().max(1000).optional(),
  price: money.optional(),
  currency,
  /** shown struck through; must be > price */
  compare_at: money.optional(),
  badge: z.enum(PRODUCT_BADGES).optional(),
  /** 0–3 variant groups */
  variants: z.array(ProductVariantSchema).optional(),
  /** "12 left", "Ships in 3 days" ≤60 */
  stock_note: z.string().max(60).optional(),
  action: ProductActionSchema,
  ...schedule,
});
export type ProductData = z.infer<typeof ProductDataSchema>;

/** A product inside a shop: product data plus a stable id and an optional category. */
export const ShopItemSchema = ProductDataSchema.omit({ schedule: true }).extend({
  /** client-generated, [a-z0-9_-]{1,40}; stable across edits */
  id: z.string(),
  /** one of shop.categories */
  category: z.string().optional(),
});
export type ShopItem = z.infer<typeof ShopItemSchema>;

export const ShopDataSchema = z.object({
  title: z.string().max(100).optional(),
  /** 0–12 category names ≤30 */
  categories: z.array(z.string().max(30)).optional(),
  /** 1–60 */
  items: z.array(ShopItemSchema),
  ...schedule,
});

export const MarketplaceDataSchema = z.object({
  title: z.string().max(60).optional(),
  /** 1–9, one per platform */
  stores: z.array(z.object({ platform: z.enum(MARKETPLACE_PLATFORMS), url: z.string() })),
  ...schedule,
});

export const WA_ORDER_FIELDS = ["items", "name", "address", "note"] as const;
export const WhatsAppDataSchema = z.object({
  label: z.string().max(40),
  /** E.164 */
  number: z.string(),
  /** placeholders {items} (one line per item with qty), {name}, {address}, {note}, {total}; ≤1000 */
  message_template: z.string().max(1000),
  order_form: z
    .object({
      /** which inputs the visitor fills, in order */
      fields: z.array(z.enum(WA_ORDER_FIELDS)),
      /** the menu for the "items" field (qty steppers), 1–30 */
      items: z.array(z.object({ name: z.string().max(80), price: money.optional() })).optional(),
      currency,
    })
    .optional(),
  ...schedule,
});

export const PriceListItemSchema = z.object({
  name: z.string().max(80),
  desc: z.string().max(200).optional(),
  price: money.optional(),
  /** shows "from Rp …" */
  price_from: z.boolean().optional(),
  image_url: z.string().optional(),
});
export const PriceListDataSchema = z.object({
  /** 1–10 sections, each 1–40 items */
  sections: z.array(z.object({ title: z.string().max(60), items: z.array(PriceListItemSchema) })),
  currency,
  note: z.string().max(300).optional(),
  /** optional "ask" button under the list */
  ask: z.object({ label: z.string().max(40), kind: z.enum(["whatsapp", "url"]), target: z.string() }).optional(),
  ...schedule,
});

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const COURIERS = ["gosend", "grabexpress", "jne", "jnt", "sicepat", "anteraja", "pos", "shopee_express", "lalamove", "paxel", "pickup"] as const;
export const StoreInfoDataSchema = z.object({
  /** 0–21 slots; several per day allowed; close < open means past midnight. Days not listed are closed. */
  hours: z.array(z.object({ day: z.enum(WEEKDAYS), open: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/), close: z.string().regex(/^([01][0-9]|2[0-4]):[0-5][0-9]$/) })),
  /** IANA zone, e.g. "Asia/Jakarta" */
  tz: z.string(),
  address: z.string().max(200).optional(),
  /** "Sumur Bandung, Bandung" ≤100 */
  area: z.string().max(100).optional(),
  couriers: z.array(z.enum(COURIERS)).optional(),
  delivery_note: z.string().max(300).optional(),
  ...schedule,
});
export type StoreInfoData = z.infer<typeof StoreInfoDataSchema>;

export const PaymentDataSchema = z.object({
  title: z.string().max(60).optional(),
  qris_image_url: z.string().optional(),
  /** 0–6; bank or e-wallet name ≤40, holder ≤60, number ≤40 */
  accounts: z.array(z.object({ bank: z.string().max(40), name: z.string().max(60), number: z.string().max(40) })),
  note: z.string().max(300).optional(),
  /** "I've paid" button: whatsapp → E.164, url → https, form → a form block id */
  confirm: z.object({ kind: z.enum(["whatsapp", "url", "form"]), target: z.string(), label: z.string().max(40).optional() }).optional(),
  ...schedule,
});

export const TIP_PLATFORMS = ["saweria", "trakteer", "kofi", "paypal", "buymeacoffee"] as const;
export const TipJarDataSchema = z.object({
  title: z.string().max(100),
  description: z.string().max(300).optional(),
  /** 0–4 suggested amounts (display only, no checkout) */
  amounts: z.array(money).optional(),
  currency,
  /** 1–5 */
  platforms: z.array(z.object({ platform: z.enum(TIP_PLATFORMS), url: z.string() })),
  ...schedule,
});

export const ReviewsDataSchema = z.object({
  title: z.string().max(60).optional(),
  /** 0–5, one decimal */
  average: z.number().min(0).max(5).optional(),
  count: z.number().int().nonnegative().optional(),
  /** counts for 5★,4★,3★,2★,1★ */
  distribution: z.array(z.number().int().nonnegative()).length(5).optional(),
  /** "Shopee", "Google" ≤40, shown as "from 312 Shopee reviews" */
  source: z.string().max(40).optional(),
  /** 0–20 */
  items: z.array(z.object({ stars: z.number().int().min(1).max(5), quote: z.string().max(500), author: z.string().max(60), source_url: z.string().optional() })),
  ...schedule,
});

export const BlockDataSchemas = {
  link: LinkDataSchema,
  text: TextDataSchema,
  image: ImageDataSchema,
  video: VideoDataSchema,
  music: MusicDataSchema,
  social_icons: SocialIconsDataSchema,
  folder: FolderDataSchema,
  faq: FaqDataSchema,
  testimonial: TestimonialDataSchema,
  contact_form: ContactFormDataSchema,
  heading: HeadingDataSchema,
  divider: DividerDataSchema,
  file: FileDataSchema,
  discount_code: DiscountCodeDataSchema,
  countdown: CountdownDataSchema,
  booking: BookingDataSchema,
  quote: QuoteDataSchema,
  email_signup: EmailSignupDataSchema,
  form: FormDataSchema,
  product: ProductDataSchema,
  shop: ShopDataSchema,
  marketplace: MarketplaceDataSchema,
  whatsapp: WhatsAppDataSchema,
  price_list: PriceListDataSchema,
  store_info: StoreInfoDataSchema,
  payment: PaymentDataSchema,
  tip_jar: TipJarDataSchema,
  reviews: ReviewsDataSchema,
} satisfies Record<BlockType, z.ZodType>;

export type BlockDataMap = {
  [K in BlockType]: z.infer<(typeof BlockDataSchemas)[K]>;
};
export type LinkData = BlockDataMap["link"];
export type TextData = BlockDataMap["text"];
export type ImageData = BlockDataMap["image"];
export type VideoData = BlockDataMap["video"];
export type MusicData = BlockDataMap["music"];
export type SocialIconsData = BlockDataMap["social_icons"];
export type FolderData = BlockDataMap["folder"];
export type FaqData = BlockDataMap["faq"];
export type TestimonialData = BlockDataMap["testimonial"];
export type ContactFormData = BlockDataMap["contact_form"];
export type HeadingData = BlockDataMap["heading"];
export type DividerData = BlockDataMap["divider"];
export type FileData = BlockDataMap["file"];
export type DiscountCodeData = BlockDataMap["discount_code"];
export type CountdownData = BlockDataMap["countdown"];
export type BookingData = BlockDataMap["booking"];
export type QuoteData = BlockDataMap["quote"];
export type EmailSignupData = BlockDataMap["email_signup"];
/** Named FormBlockData so it never shadows the DOM FormData. */
export type FormBlockData = BlockDataMap["form"];

interface BlockBase {
  id: string;
  profile_id: string;
  tab_id: string;
  /** Set for links inside a folder. */
  parent_id: string | null;
  position: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  /** P2-1 soft delete: set on blocks from GET /blocks/deleted */
  deleted_at?: string;
}

/** Discriminated union on `type`: narrowing `block.type` narrows `block.data`. */
export type Block = {
  [K in BlockType]: BlockBase & { type: K; data: BlockDataMap[K] };
}[BlockType];

export type BlockOf<K extends BlockType> = Extract<Block, { type: K }>;

const BlockBaseSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  tab_id: z.string(),
  parent_id: z.string().nullable(),
  position: z.number(),
  is_visible: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().optional(),
});

export const BlockSchema = z.discriminatedUnion(
  "type",
  BLOCK_TYPES.map((t) =>
    BlockBaseSchema.extend({ type: z.literal(t), data: BlockDataSchemas[t] }),
  ) as unknown as [z.ZodObject, ...z.ZodObject[]],
) as unknown as z.ZodType<Block>;

// ---------- Contact submissions ----------

export interface ContactSubmission {
  id: string;
  profile_id: string;
  /** null when the form block was deleted */
  block_id: string | null;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

// ---------- Events ----------

export type EventKind = "view" | "click";

// ---------- API request / response shapes ----------

export interface AuthResponse {
  access_token: string;
  user: User;
  profile: Profile;
}
export interface MeResponse {
  user: User;
  profile: Profile;
}
export interface PageResponse {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
}
/** GET /profile/editor — includes hidden blocks. */
export type EditorResponse = PageResponse;
/** GET /public/{username} — published page, visible blocks only. */
export type PublicPageResponse = PageResponse;

export type ProfilePatch = Partial<
  Pick<
    Profile,
    | "display_name"
    | "bio"
    | "avatar_url"
    | "theme"
    | "seo"
    | "is_published"
    | "username"
    | "socials"
    | "socials_position"
    | "announcement"
    | "settings"
  >
> & { onboarding?: OnboardingPatch };

export type CreateBlockInput = {
  [K in BlockType]: {
    tab_id: string;
    type: K;
    data: BlockDataMap[K];
    parent_id?: string | null;
  };
}[BlockType];

export interface UpdateBlockInput {
  data?: BlockDataMap[BlockType];
  is_visible?: boolean;
  tab_id?: string;
  parent_id?: string | null;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: Record<string, string> };
}

// ---------- Phase 2 API shapes owned by the editor session (uploads, unfurl, forms, audience) ----------

/** POST /uploads[?kind=file] */
export interface UploadResult {
  url: string;
  file_name?: string;
  size?: number;
  content_type?: string;
}

/** POST /unfurl (P2-5). fetched=false means the site was unreachable: fall back to a plain link. */
export interface UnfurlResult {
  url: string;
  suggested_type: "link" | "video" | "music" | "booking" | "image";
  dest_kind?: "url" | "email" | "file" | "tab";
  fetched: boolean;
  title: string;
  description: string;
  image_url: string;
  site_name: string;
}

/** GET /forms */
export interface FormSummary {
  block_id: string;
  type: "form" | "email_signup";
  title: string;
  tab_id: string;
  is_visible: boolean;
  responses: number;
  last_response_at: string | null;
}

/** Stored answer; label and type are snapshotted at submit time. */
export interface FormAnswer {
  field_id: string;
  label: string;
  type: string;
  value: unknown;
}

/** GET /forms/{block_id}/submissions */
export interface FormSubmission {
  id: string;
  block_id: string | null;
  contact_id: string | null;
  answers: FormAnswer[];
  created_at: string;
}

export type AudienceStatus = "all" | "subscribed" | "unsubscribed";

export interface Contact {
  id: string;
  email: string;
  name: string;
  subscribed: boolean;
  subscribed_at: string | null;
  sources: { block_id: string; type: string; title: string }[];
  responses: number;
  first_seen_at: string;
  last_activity_at: string;
}

/** GET /audience */
export interface AudienceList extends Paginated<Contact> {
  counts: { all: number; subscribed: number; unsubscribed: number };
}

/** GET /audience/{id} */
export interface ContactDetail {
  contact: Contact;
  activity: {
    kind: "form" | "contact";
    block_id: string | null;
    answers?: FormAnswer[];
    message?: string;
    created_at: string;
  }[];
}

/** POST /import (P2-6) */
export interface ImportPreview {
  source_url: string;
  profile: { display_name: string; bio: string; avatar_url: string };
  links: { title: string; url: string }[];
  socials: { platform: string; url: string }[];
}
export interface ImportResponse {
  preview: ImportPreview;
  applied?: { links: number; socials: number; display_name: boolean; bio: boolean; avatar: boolean };
  profile?: Profile;
}
