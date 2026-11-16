/**
 * Phase 3-C (Engage), 3-D (Text and layout) and card-level gates.
 * Mirrors SPEC "P3-C/D: implemented (BE)" and "Card-level gates: implemented (BE)".
 * No imports from ./types (only ./constants) so types.ts can re-export it without a cycle.
 */
import { z } from "zod";
import { SUBSCRIBE_MODES, SHOW_RESULTS, MARQUEE_SPEEDS, TEXT_STYLES, GATE_KINDS } from "./constants";

const ScheduleSchema = z.object({ start_at: z.string().optional(), end_at: z.string().optional() });
const schedule = { schedule: ScheduleSchema.optional() };

export type SubscribeMode = (typeof SUBSCRIBE_MODES)[number];

// ---------- P3-C Engage ----------

export type ShowResults = (typeof SHOW_RESULTS)[number];

export const PollResultsSchema = z.object({ counts: z.record(z.string(), z.number()), total: z.number() });
export type PollResults = z.infer<typeof PollResultsSchema>;

export const PollDataSchema = z.object({
  question: z.string(),
  /** id is assigned by the server when empty; send it back on edits so votes stay attached. */
  options: z.array(z.object({ id: z.string(), label: z.string() })),
  show_results: z.enum(SHOW_RESULTS).optional(),
  ends_at: z.string().optional(),
  // read-only (page reads)
  closed: z.boolean().optional(),
  results: PollResultsSchema.optional(),
  ...schedule,
});

export const AskMeAnswerSchema = z.object({ question: z.string(), answer: z.string(), answered_at: z.string() });
export const AskMeDataSchema = z.object({
  prompt: z.string(),
  public_answers: z.boolean(),
  placeholder: z.string().optional(),
  button_label: z.string().optional(),
  // read-only: pinned answered questions
  answers: z.array(AskMeAnswerSchema).optional(),
  ...schedule,
});

export const LeadMagnetDataSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** Absent in public reads. */
  file_url: z.string().optional(),
  cover_url: z.string().optional(),
  button_label: z.string().optional(),
  success_message: z.string().optional(),
  subscribe: z.enum(SUBSCRIBE_MODES).optional(),
  ...schedule,
});

export const GiveawayDataSchema = z.object({
  title: z.string(),
  prize: z.string(),
  ends_at: z.string(),
  steps: z.array(z.object({ label: z.string(), url: z.string() })),
  rules_url: z.string().optional(),
  subscribe: z.enum(SUBSCRIBE_MODES).optional(),
  // read-only
  ended: z.boolean().optional(),
  entry_count: z.number().optional(),
  winner: z.object({ display: z.string(), drawn_at: z.string() }).optional(),
  ...schedule,
});

// ---------- P3-D Text and layout ----------

export const SpotlightDataSchema = z.object({
  image_url: z.string().optional(),
  eyebrow: z.string().optional(),
  headline: z.string(),
  text: z.string().optional(),
  button: z.object({ label: z.string(), url: z.string() }).optional(),
  align: z.enum(["left", "center"]).optional(),
  ...schedule,
});

export const MarqueeDataSchema = z.object({
  text: z.string(),
  separator: z.string().optional(),
  speed: z.enum(MARQUEE_SPEEDS).optional(),
  direction: z.enum(["left", "right"]).optional(),
  style: z.enum(["ribbon", "plain"]).optional(),
  ...schedule,
});

export const TimelineItemSchema = z.object({
  eyebrow: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  badge: z.string().optional(),
  highlight: z.boolean().optional(),
});
export const TimelineDataSchema = z.object({
  title: z.string().optional(),
  style: z.enum(["numbered", "dotted"]).optional(),
  items: z.array(TimelineItemSchema),
  ...schedule,
});

export const ResumeItemSchema = z.object({
  role: z.string(),
  company: z.string(),
  company_url: z.string().optional(),
  /** YYYY-MM */
  start: z.string(),
  end: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
});
export const ResumeDataSchema = z.object({ title: z.string().optional(), items: z.array(ResumeItemSchema), ...schedule });

export const BeforeAfterDataSchema = z.object({
  before_url: z.string(),
  after_url: z.string(),
  before_label: z.string().optional(),
  after_label: z.string().optional(),
  alt: z.string().optional(),
  start_pct: z.number().optional(),
  ...schedule,
});

export const MapDataSchema = z.object({
  label: z.string().optional(),
  address: z.string().optional(),
  area: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  zoom: z.number().optional(),
  /** Built by the server; read-only. */
  links: z.object({ google: z.string(), apple: z.string(), osm: z.string() }).optional(),
  ...schedule,
});

// ---------- additions to existing types (merged in types.ts) ----------

export type TextStyle = (typeof TEXT_STYLES)[number];

export const DiscountCodeEntrySchema = z.object({
  code: z.string(),
  description: z.string().optional(),
  discount: z.string().optional(),
  url: z.string().optional(),
  ends_at: z.string().optional(),
});
export type DiscountCodeEntry = z.infer<typeof DiscountCodeEntrySchema>;


// ---------- card-level gates ----------

export type GateKind = (typeof GATE_KINDS)[number];

/** What reads return (`block.gate`). The editor also gets subscribe and has_password. */
export const GateViewSchema = z.object({
  kind: z.enum(GATE_KINDS),
  message: z.string().optional(),
  follow: z.object({ platform: z.string(), url: z.string() }).optional(),
  subscribe: z.enum(SUBSCRIBE_MODES).optional(),
  has_password: z.boolean().optional(),
});
export type GateView = z.infer<typeof GateViewSchema>;

/** What create/patch send. Omit `password` on a password gate to keep the current one. */
export type GateInput =
  | { kind: "password"; password?: string; message?: string }
  | { kind: "email"; subscribe?: SubscribeMode; message?: string }
  | { kind: "age_18"; message?: string }
  | { kind: "follow"; follow: { platform: string; url: string }; message?: string };

// ---------- owner / public API shapes ----------

export interface Question {
  id: string;
  block_id: string;
  question: string;
  answer: string;
  answered_at: string | null;
  pinned: boolean;
  created_at: string;
}

export interface GiveawayWinner {
  email: string;
  name: string;
  display: string;
  drawn_at: string;
}

export interface GiveawayState {
  entries: number;
  winner: GiveawayWinner | null;
}

export const P3CD_SCHEMAS = {
  poll: PollDataSchema,
  ask_me: AskMeDataSchema,
  lead_magnet: LeadMagnetDataSchema,
  giveaway: GiveawayDataSchema,
  spotlight: SpotlightDataSchema,
  marquee: MarqueeDataSchema,
  timeline: TimelineDataSchema,
  resume: ResumeDataSchema,
  before_after: BeforeAfterDataSchema,
  map: MapDataSchema,
} as const;

