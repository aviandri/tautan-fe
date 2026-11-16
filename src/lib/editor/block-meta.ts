/**
 * Per-block-type metadata for the editor: labels, defaults, a one-line summary,
 * and client-side validation that mirrors tautan-be's validateBlockData.
 */
import {
  AlignLeft,
  AtSign,
  FolderClosed,
  Image as ImageIcon,
  Link2,
  type LucideIcon,
  Mail,
  MessageSquareQuote,
  Music2,
  CircleHelp,
  PlaySquare,
} from "lucide-react";
import type { BlockDataMap, BlockType } from "../types";
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
  summary: (d: BlockDataMap[K]) => string;
  /** Returns field errors and the data to send (empty list rows dropped). */
  validate: (d: BlockDataMap[K]) => { errors: FieldErrors; data: BlockDataMap[K] };
}

const ok = <T>(data: T) => ({ errors: {} as FieldErrors, data });
const put = (e: FieldErrors, k: string, v: string | null) => {
  if (v) e[k] = v;
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export const BLOCK_META: { [K in BlockType]: BlockMeta<K> } = {
  link: {
    type: "link",
    label: "Link",
    description: "A button to any URL",
    icon: Link2,
    tint: "#1f5c4a",
    defaultData: () => ({ title: "", url: "" }),
    needsInputFirst: true,
    summary: (d) => d.title || prettyUrl(d.url) || "Untitled link",
    validate: (d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true));
      put(e, "thumbnail_url", urlError(d.thumbnail_url, false));
      const data = { title: d.title, url: d.url.trim(), ...(d.thumbnail_url ? { thumbnail_url: d.thumbnail_url } : {}) };
      return { errors: e, data };
    },
  },
  text: {
    type: "text",
    label: "Text",
    description: "A heading or paragraph",
    icon: AlignLeft,
    tint: "#6b6858",
    defaultData: () => ({ content: "" }),
    needsInputFirst: false,
    summary: (d) => d.content.replace(/[*_#>`]/g, "").split("\n")[0] || "Empty text",
    validate: ok,
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
    validate: (d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true));
      put(e, "link_url", urlError(d.link_url, false));
      return {
        errors: e,
        data: { url: d.url, ...(d.alt ? { alt: d.alt } : {}), ...(d.link_url ? { link_url: d.link_url.trim() } : {}) },
      };
    },
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
    validate: (d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true) ?? embedHint("video", d.url));
      return { errors: e, data: { url: d.url.trim() } };
    },
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
    validate: (d) => {
      const e: FieldErrors = {};
      put(e, "url", urlError(d.url, true) ?? embedHint("music", d.url));
      return { errors: e, data: { url: d.url.trim() } };
    },
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
    validate: (d) => {
      const e: FieldErrors = {};
      const items = d.items.filter((it) => it.platform || it.url.trim());
      d.items.forEach((it, i) => {
        if (!it.platform && !it.url.trim()) return;
        if (!it.platform) e[`items.${i}.platform`] = "Pick a platform";
        put(e, `items.${i}.url`, urlError(it.url, true));
      });
      return { errors: e, data: { items: items.map((it) => ({ platform: it.platform, url: it.url.trim() })) } };
    },
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
    validate: ok,
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
      return n ? plural(n, "question") : "No questions yet";
    },
    validate: (d) => ok({ items: d.items.filter((i) => i.q.trim() || i.a.trim()) }),
  },
  testimonial: {
    type: "testimonial",
    label: "Testimonials",
    description: "Quotes from people you've worked with",
    icon: MessageSquareQuote,
    tint: "#9b4d96",
    defaultData: () => ({ items: [{ quote: "", author: "" }] }),
    needsInputFirst: false,
    summary: (d) => {
      const n = d.items.filter((i) => i.quote.trim()).length;
      return n ? plural(n, "quote") : "No quotes yet";
    },
    validate: (d) => {
      const e: FieldErrors = {};
      d.items.forEach((it, i) => put(e, `items.${i}.avatar_url`, urlError(it.avatar_url, false)));
      const items = d.items
        .filter((i) => i.quote.trim() || i.author.trim())
        .map((i) => ({ quote: i.quote, author: i.author, ...(i.avatar_url ? { avatar_url: i.avatar_url } : {}) }));
      return { errors: e, data: { items } };
    },
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
    validate: ok,
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

/** Ordered for the "Add block" picker. */
export const PICKER_ORDER: BlockType[] = [
  "link",
  "folder",
  "text",
  "image",
  "social_icons",
  "video",
  "music",
  "faq",
  "testimonial",
  "contact_form",
];
