/**
 * Per-block-type metadata for the editor: labels, defaults, a one-line summary,
 * and client-side validation that mirrors tautan-be's validateBlockData.
 *
 * Validators PRESERVE fields they don't own (schedule, new optional fields,
 * anything a newer FE adds) and only trim/compact the ones they do.
 */
import {
  AlignLeft,
  AtSign,
  CalendarClock,
  CircleHelp,
  ClipboardList,
  FileDown,
  FolderClosed,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Link2,
  type LucideIcon,
  Mail,
  MailPlus,
  MessageSquareQuote,
  Minus,
  Music2,
  PlaySquare,
  Quote,
  Tag,
  Timer,
} from "lucide-react";
import type { BlockDataMap, BlockType, Schedule } from "../types";
import { prettyUrl, urlError } from "../url";

export type FieldErrors = Record<string, string>;

export interface BlockMeta<K extends BlockType> {
  type: K;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Accent for the type chip (editor only; public page colours come from the theme). */
  tint: string;
  defaultData: () => BlockDataMap[K];
  /** The server rejects the default data (a URL is required), so collect it before POSTing. */
  needsInputFirst: boolean;
  /** Hidden from the "Add block" picker (still editable if present). */
  hidden?: boolean;
  summary: (d: BlockDataMap[K]) => string;
  /** Returns field errors and the data to send. */
  validate: (d: BlockDataMap[K]) => { errors: FieldErrors; data: BlockDataMap[K] };
}

const put = (e: FieldErrors, k: string, v: string | null | undefined) => {
  if (v) e[k] = v;
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const maxLen = (v: string | undefined, n: number) => ((v ?? "").length > n ? `At most ${n} characters` : null);
const required = (v: string | undefined) => ((v ?? "").trim() ? null : "Required");

/** Drop optional keys that are "", undefined or null, so we don't store noise. */
function compact<T extends object>(d: T, keys: (keyof T)[]): T {
  const out = { ...d };
  for (const k of keys) {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
  }
  return out;
}

/** schedule: drop when empty; end must be after start (mirrors checkSchedule). */
export function validateSchedule(s: Schedule | undefined): { error: string | null; value: Schedule | undefined } {
  if (!s) return { error: null, value: undefined };
  const value = compact(s, ["start_at", "end_at"]);
  if (!value.start_at && !value.end_at) return { error: null, value: undefined };
  if (value.start_at && value.end_at && Date.parse(value.end_at) <= Date.parse(value.start_at))
    return { error: "End must be after start", value };
  return { error: null, value };
}

/** Wrap a type's validator with shared schedule handling. */
function withSchedule<K extends BlockType>(
  fn: (d: BlockDataMap[K]) => { errors: FieldErrors; data: BlockDataMap[K] },
) {
  return (d: BlockDataMap[K]) => {
    const r = fn(d);
    const sched = validateSchedule((d as { schedule?: Schedule }).schedule);
    const data = { ...r.data } as BlockDataMap[K] & { schedule?: Schedule };
    if (sched.value) data.schedule = sched.value;
    else delete data.schedule;
    if (sched.error) r.errors.schedule = sched.error;
    return { errors: r.errors, data: data as BlockDataMap[K] };
  };
}

const keep = <T>(d: T) => ({ errors: {} as FieldErrors, data: d });

const EMOJI_MAX = 8;
function iconError(icon: string | undefined): string | null {
  const s = (icon ?? "").trim();
  if (!s) return null;
  if (/^(https?:|\/uploads\/)/.test(s)) return urlError(s, false);
  return [...s].length > EMOJI_MAX ? "Use one emoji or an image" : null;
}

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;
export const BOOKING_HOSTS = ["calendly.com", "cal.com", "app.cal.com"];

export const BLOCK_META: { [K in BlockType]: BlockMeta<K> } = {
  link: {
    type: "link",
    label: "Link",
    description: "A button to a site, email, file or tab",
    icon: Link2,
    tint: "#1f5c4a",
    defaultData: () => ({ title: "", url: "" }),
    needsInputFirst: true,
    summary: (d) => d.title || prettyUrl(d.url) || "Untitled link",
    validate: withSchedule<"link">((d) => {
      const e: FieldErrors = {};
      const kind = d.dest_kind ?? "url";
      let url = d.url.trim();
      if (kind === "email") {
        const addr = url.replace(/^mailto:/, "");
        if (!EMAIL_RE.test(addr)) e.url = addr ? "Enter an email address" : "Required";
        else url = `mailto:${addr}`;
      } else if (kind === "tab") {
        if (!d.tab_id) e.tab_id = "Pick a tab";
        put(e, "url", urlError(url, false));
      } else {
        put(e, "url", urlError(url, true));
      }
      put(e, "thumbnail_url", urlError(d.thumbnail_url, false));
      put(e, "icon", iconError(d.icon));
      put(e, "label", maxLen(d.label, 24));
      put(e, "description", maxLen(d.description, 300));
      const data = compact({ ...d, url, title: d.title }, [
        "thumbnail_url",
        "description",
        "icon",
        "label",
        "layout",
        "text_align",
      ]);
      if (kind === "url") delete data.dest_kind;
      if (kind !== "tab") delete data.tab_id;
      if (data.layout === "button") delete data.layout;
      return { errors: e, data };
    }),
  },
  heading: {
    type: "heading",
    label: "Heading",
    description: "A section title",
    icon: HeadingIcon,
    tint: "#3a3a33",
    defaultData: () => ({ title: "New section" }),
    needsInputFirst: false,
    summary: (d) => d.title || "Untitled heading",
    validate: withSchedule<"heading">((d) => {
      const e: FieldErrors = {};
      put(e, "title", maxLen(d.title, 120));
      return { errors: e, data: compact(d, ["text_align"]) };
    }),
  },
  text: {
    type: "text",
    label: "Text",
    description: "A paragraph, with simple formatting",
    icon: AlignLeft,
    tint: "#6b6858",
    defaultData: () => ({ content: "" }),
    needsInputFirst: false,
    summary: (d) => d.content.replace(/[*_#>`]/g, "").split("\n")[0] || "Empty text",
    validate: withSchedule<"text">(keep),
  },
  image: {
    type: "image",
    label: "Image",
    description: "A photo, optionally linked",
    icon: ImageIcon,
    tint: "#b26a2e",
    defaultData: () => ({ url: "" }),
    needsInputFirst: true,
    summary: (d) => d.alt || (d.url ? "Image" : "No image yet"),
    validate: withSchedule<"image">((d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true));
      put(e, "link_url", urlError(d.link_url, false));
      const data = compact({ ...d, link_url: d.link_url?.trim() }, ["alt", "link_url"]);
      if (!data.full_bleed) delete data.full_bleed;
      if (!data.lightbox) delete data.lightbox;
      return { errors: e, data };
    }),
  },
  video: {
    type: "video",
    label: "Video",
    description: "YouTube or Vimeo",
    icon: PlaySquare,
    tint: "#c0392b",
    defaultData: () => ({ url: "" }),
    needsInputFirst: true,
    summary: (d) => prettyUrl(d.url) || "No video yet",
    validate: withSchedule<"video">((d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true) ?? embedHint("video", d.url));
      return { errors: e, data: { ...d, url: d.url.trim() } };
    }),
  },
  music: {
    type: "music",
    label: "Music",
    description: "Spotify or SoundCloud",
    icon: Music2,
    tint: "#1d9a55",
    defaultData: () => ({ url: "" }),
    needsInputFirst: true,
    summary: (d) => prettyUrl(d.url) || "No track yet",
    validate: withSchedule<"music">((d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true) ?? embedHint("music", d.url));
      return { errors: e, data: { ...d, url: d.url.trim() } };
    }),
  },
  social_icons: {
    type: "social_icons",
    label: "Social icons",
    description: "A row of profile icons",
    icon: AtSign,
    tint: "#4b5bd6",
    defaultData: () => ({ items: [] }),
    needsInputFirst: false,
    summary: (d) => (d.items.length ? d.items.map((i) => i.platform).join(", ") : "No icons yet"),
    validate: withSchedule<"social_icons">((d) => {
      const e: FieldErrors = {};
      d.items.forEach((it, i) => {
        if (!it.platform && !it.url.trim()) return;
        if (!it.platform) e[`items.${i}.platform`] = "Pick a platform";
        put(e, `items.${i}.url`, urlError(it.url, true));
      });
      const items = d.items
        .filter((it) => it.platform || it.url.trim())
        .map((it) => ({ ...it, url: it.url.trim() }));
      return { errors: e, data: { ...d, items } };
    }),
  },
  folder: {
    type: "folder",
    label: "Folder",
    description: "Group links under one button",
    icon: FolderClosed,
    tint: "#8a6d1f",
    defaultData: () => ({ title: "New folder" }),
    needsInputFirst: false,
    summary: (d) => d.title || "Untitled folder",
    validate: withSchedule<"folder">((d) => keep(compact(d, ["style"]))),
  },
  file: {
    type: "file",
    label: "File",
    description: "A PDF, ZIP, audio or video to download",
    icon: FileDown,
    tint: "#5b6b7a",
    defaultData: () => ({ title: "", url: "" }),
    needsInputFirst: true,
    summary: (d) => d.title || d.file_name || "No file yet",
    validate: withSchedule<"file">((d) => {
      const e: FieldErrors = {};
      put(e, "url", d.url ? urlError(d.url, true) : "Upload a file");
      put(e, "title", required(d.title));
      put(e, "file_name", maxLen(d.file_name, 200));
      return { errors: e, data: compact({ ...d, title: d.title.trim() }, ["file_name", "size"]) };
    }),
  },
  discount_code: {
    type: "discount_code",
    label: "Discount code",
    description: "A code visitors can copy",
    icon: Tag,
    tint: "#c2410c",
    defaultData: () => ({ code: "", button_label: "Copy code" }),
    needsInputFirst: false,
    summary: (d) => d.code || d.discount || d.brand || "No code needed",
    validate: withSchedule<"discount_code">((d) => {
      const e: FieldErrors = {};
      put(e, "code", maxLen(d.code, 40));
      put(e, "description", maxLen(d.description, 300));
      put(e, "discount", maxLen(d.discount, 24));
      put(e, "url", urlError(d.url, false));
      return {
        errors: e,
        data: compact({ ...d, code: d.code.trim(), url: d.url?.trim() }, ["description", "brand", "discount", "url", "button_label"]),
      };
    }),
  },
  countdown: {
    type: "countdown",
    label: "Countdown",
    description: "A timer to a launch or event",
    icon: Timer,
    tint: "#7c3aed",
    defaultData: () => ({
      ends_at: new Date(Date.now() + 7 * 864e5).toISOString(),
      label: "Launching in",
    }),
    needsInputFirst: false,
    summary: (d) => {
      const t = Date.parse(d.ends_at);
      if (Number.isNaN(t)) return "No end date";
      return `${d.label ? `${d.label} · ` : ""}${new Date(t).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}`;
    },
    validate: withSchedule<"countdown">((d) => {
      const e: FieldErrors = {};
      if (!d.ends_at || Number.isNaN(Date.parse(d.ends_at))) e.ends_at = "Pick an end date and time";
      put(e, "label", maxLen(d.label, 120));
      const data = compact(d, ["label", "description", "ended_message"]);
      if (!data.hide_after_end) delete data.hide_after_end;
      return { errors: e, data };
    }),
  },
  booking: {
    type: "booking",
    label: "Booking",
    description: "Calendly or Cal.com scheduler",
    icon: CalendarClock,
    tint: "#0e7490",
    defaultData: () => ({ url: "" }),
    needsInputFirst: true,
    summary: (d) => prettyUrl(d.url) || "No booking link yet",
    validate: withSchedule<"booking">((d) => {
      const e: FieldErrors = {};
      const url = d.url.trim();
      const base = urlError(url, true);
      if (base) e.url = base;
      else {
        try {
          const u = new URL(url);
          const host = u.hostname.toLowerCase().replace(/^www\./, "");
          if (u.protocol !== "https:" || !BOOKING_HOSTS.includes(host)) e.url = "Paste an https Calendly or Cal.com link";
        } catch {
          e.url = "Paste an https Calendly or Cal.com link";
        }
      }
      return { errors: e, data: { ...d, url } };
    }),
  },
  quote: {
    type: "quote",
    label: "Quote",
    description: "A highlighted quote",
    icon: Quote,
    tint: "#9b4d96",
    defaultData: () => ({ quote: "" }),
    needsInputFirst: true,
    summary: (d) => (d.quote ? `“${d.quote}”` : "Empty quote"),
    validate: withSchedule<"quote">((d) => {
      const e: FieldErrors = {};
      put(e, "quote", required(d.quote) ?? maxLen(d.quote, 1000));
      return { errors: e, data: compact(d, ["name", "role", "heading"]) };
    }),
  },
  faq: {
    type: "faq",
    label: "FAQ",
    description: "Questions and answers",
    icon: CircleHelp,
    tint: "#2a7fa8",
    defaultData: () => ({ items: [{ q: "", a: "" }] }),
    needsInputFirst: false,
    summary: (d) => {
      const n = d.items.filter((i) => i.q.trim()).length;
      return d.heading || (n ? plural(n, "question") : "No questions yet");
    },
    validate: withSchedule<"faq">((d) =>
      keep(compact({ ...d, items: d.items.filter((i) => i.q.trim() || i.a.trim()) }, ["heading", "description"])),
    ),
  },
  testimonial: {
    type: "testimonial",
    label: "Testimonials",
    description: "Quotes from people you've worked with",
    icon: MessageSquareQuote,
    tint: "#b0478f",
    defaultData: () => ({ items: [{ quote: "", author: "" }] }),
    needsInputFirst: false,
    summary: (d) => {
      const n = d.items.filter((i) => i.quote.trim()).length;
      return d.heading || (n ? plural(n, "quote") : "No quotes yet");
    },
    validate: withSchedule<"testimonial">((d) => {
      const e: FieldErrors = {};
      d.items.forEach((it, i) => {
        put(e, `items.${i}.avatar_url`, urlError(it.avatar_url, false));
        put(e, `items.${i}.url`, urlError(it.url, false));
      });
      const items = d.items
        .filter((i) => i.quote.trim() || i.author.trim())
        .map((i) => compact({ ...i, url: i.url?.trim() }, ["avatar_url", "role", "url"]));
      return { errors: e, data: compact({ ...d, items }, ["heading", "description"]) };
    }),
  },
  email_signup: {
    type: "email_signup",
    label: "Email signup",
    description: "Collect emails into your Audience",
    icon: MailPlus,
    tint: "#15803d",
    defaultData: () => ({ title: "Get updates", button_label: "Subscribe", placeholder: "you@example.com" }),
    needsInputFirst: false,
    summary: (d) => d.title || "Email signup",
    validate: withSchedule<"email_signup">((d) =>
      keep(compact(d, ["title", "description", "placeholder", "button_label", "success_message"])),
    ),
  },
  contact_form: {
    type: "contact_form",
    label: "Contact form",
    description: "Visitors send you a message",
    icon: Mail,
    tint: "#d0602a",
    defaultData: () => ({ title: "Get in touch", button_label: "Send" }),
    needsInputFirst: false,
    summary: (d) => d.title || "Contact form",
    validate: withSchedule<"contact_form">(keep),
  },
  divider: {
    type: "divider",
    label: "Divider",
    description: "A line or space between blocks",
    icon: Minus,
    tint: "#8b887a",
    defaultData: () => ({ style: "solid" }),
    needsInputFirst: false,
    summary: (d) => (d.style === "none" ? "Spacer" : `${d.style ?? "solid"} line`.replace(/^./, (c) => c.toUpperCase())),
    validate: withSchedule<"divider">(keep),
  },
  form: {
    // Full form builder lands with P2-3; until then forms are editable but not addable.
    type: "form",
    label: "Form",
    description: "A form with your own fields",
    icon: ClipboardList,
    tint: "#be123c",
    defaultData: () => ({
      title: "Get in touch",
      fields: [
        { id: "name", type: "text", label: "Name", required: true },
        { id: "email", type: "email", label: "Email", required: true },
      ],
    }),
    needsInputFirst: false,
    hidden: true,
    summary: (d) => `${d.title || "Form"} · ${plural(d.fields.length, "field")}`,
    validate: withSchedule<"form">(keep),
  },
};

export function getMeta<K extends BlockType>(type: K): BlockMeta<K> {
  return BLOCK_META[type];
}

/** Soft check that a video/music URL is from a provider we can embed. */
function embedHint(kind: "video" | "music", url: string): string | null {
  const host = (() => {
    try {
      return new URL(url.trim()).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const okHosts =
    kind === "video"
      ? ["youtube.com", "m.youtube.com", "youtu.be", "vimeo.com", "player.vimeo.com"]
      : ["open.spotify.com", "soundcloud.com", "on.soundcloud.com", "m.soundcloud.com"];
  if (okHosts.includes(host)) return null;
  return kind === "video" ? "Paste a YouTube or Vimeo link" : "Paste a Spotify or SoundCloud link";
}

/** The "Add block" picker, grouped. */
export const PICKER_GROUPS: { title: string; types: BlockType[] }[] = [
  { title: "Links", types: ["link", "folder", "file", "social_icons"] },
  { title: "Content", types: ["heading", "text", "image", "quote", "divider", "faq", "testimonial"] },
  { title: "Media", types: ["video", "music"] },
  { title: "Grow", types: ["email_signup", "contact_form", "booking", "discount_code", "countdown"] },
];

export const PICKER_ORDER: BlockType[] = PICKER_GROUPS.flatMap((g) => g.types);
