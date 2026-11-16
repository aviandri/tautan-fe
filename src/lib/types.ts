/**
 * Shared API types. Source of truth: /SPEC.md ("Data model" + "REST API").
 * Keep in sync with the Go types in tautan-be. Zod schemas double as runtime
 * validators for forms and API responses; TS types are inferred from them.
 */
import { z } from "zod";

// ---------- Theme ----------

export const ThemeBgSchema = z.object({
  type: z.enum(["color", "gradient", "image"]),
  value: z.string(),
});

export const ButtonStyleSchema = z.enum(["fill", "outline", "shadow"]);

export const ThemeSchema = z.object({
  preset: z.string(),
  bg: ThemeBgSchema,
  button: z.object({
    style: ButtonStyleSchema,
    radius: z.number(),
    color: z.string(),
    text_color: z.string(),
  }),
  font: z.string(),
  text_color: z.string(),
});
export type Theme = z.infer<typeof ThemeSchema>;
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
});
export type Profile = z.infer<typeof ProfileSchema>;

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

// ---------- Analytics ----------

export type AnalyticsRange = "7d" | "30d" | "90d";

export interface AnalyticsSummary {
  views: number;
  clicks: number;
  ctr: number;
  series: { date: string; views: number; clicks: number }[];
  top_links: { block_id: string; title: string; clicks: number }[];
  top_referrers: { referrer: string; count: number }[];
}

// ---------- Contact submissions ----------

export interface ContactSubmission {
  id: string;
  profile_id: string;
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
  >
>;

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
  error: { code: string; message: string };
}
