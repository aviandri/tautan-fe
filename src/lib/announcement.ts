/** P2-7 announcement: editor draft ↔ API shape, with checks mirroring tautan-be normalizeAnnouncement. */
import type { Announcement, Block } from "./types";
import { urlError } from "./url";

export const ANN_TITLE_MAX = 100;
export const ANN_DESC_MAX = 204;
export const ANN_CTA_MAX = 40;

export type AnnouncementLayout = NonNullable<Announcement["layout"]>;
export type CtaKind = "none" | "link" | "form";

export interface AnnouncementDraft {
  layout: AnnouncementLayout;
  title: string;
  description: string;
  image_url: string;
  cta_kind: CtaKind;
  cta_label: string;
  cta_url: string;
  form_block_id: string;
  bg_color: string;
  text_color: string;
  schedule?: Announcement["schedule"];
}

export const EMPTY_DRAFT: AnnouncementDraft = {
  layout: "banner",
  title: "",
  description: "",
  image_url: "",
  cta_kind: "none",
  cta_label: "",
  cta_url: "",
  form_block_id: "",
  bg_color: "",
  text_color: "",
};

export function toDraft(a: Announcement | null | undefined): AnnouncementDraft {
  if (!a) return { ...EMPTY_DRAFT };
  return {
    layout: a.layout ?? "banner",
    title: a.title ?? "",
    description: a.description ?? "",
    image_url: a.image_url ?? "",
    cta_kind: !a.cta ? "none" : a.cta.form_block_id ? "form" : "link",
    cta_label: a.cta?.label ?? "",
    cta_url: a.cta?.url ?? "",
    form_block_id: a.cta?.form_block_id ?? "",
    bg_color: a.bg_color ?? "",
    text_color: a.text_color ?? "",
    ...(a.schedule && (a.schedule.start_at || a.schedule.end_at) ? { schedule: a.schedule } : {}),
  };
}

/** Draft → PATCH body (id omitted: the server keeps it stable). */
export function fromDraft(d: AnnouncementDraft): Announcement {
  const t = (s: string) => s.trim();
  const out: Announcement = { layout: d.layout, title: t(d.title) };
  if (t(d.description)) out.description = t(d.description);
  if (t(d.image_url)) out.image_url = t(d.image_url);
  if (d.cta_kind === "link") out.cta = { label: t(d.cta_label), url: t(d.cta_url) };
  if (d.cta_kind === "form") out.cta = { label: t(d.cta_label), form_block_id: d.form_block_id };
  if (t(d.bg_color)) out.bg_color = t(d.bg_color);
  if (t(d.text_color)) out.text_color = t(d.text_color);
  const s = d.schedule;
  if (s && (s.start_at || s.end_at)) {
    out.schedule = {};
    if (s.start_at) out.schedule.start_at = s.start_at;
    if (s.end_at) out.schedule.end_at = s.end_at;
  }
  return out;
}

const HEX_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNC_RE = /^(rgb|rgba|hsl|hsla)\([0-9.,%\s/a-z]+\)$/;
const NAMED_RE = /^[a-z]{3,20}$/;
export function colorError(v: string): string | undefined {
  const s = v.trim();
  if (!s || HEX_RE.test(s) || FUNC_RE.test(s) || NAMED_RE.test(s)) return undefined;
  return "Use a colour like #1f2937";
}

/** Blocks a CTA can scroll to (rendered with id="block-{id}"). */
export const CTA_FORM_TYPES = ["form", "contact_form", "email_signup"] as const;
export function ctaTargets(blocks: Block[]): Block[] {
  return blocks.filter((b) => (CTA_FORM_TYPES as readonly string[]).includes(b.type) && !b.deleted_at);
}

export type AnnouncementErrors = Partial<Record<"title" | "description" | "image_url" | "cta_label" | "cta_url" | "form_block_id" | "bg_color" | "text_color" | "schedule", string>>;

export function announcementErrors(d: AnnouncementDraft, targets?: Block[]): AnnouncementErrors {
  const e: AnnouncementErrors = {};
  const title = d.title.trim();
  if (!title) e.title = "Add a title";
  else if ([...title].length > ANN_TITLE_MAX) e.title = `Up to ${ANN_TITLE_MAX} characters`;
  if ([...d.description.trim()].length > ANN_DESC_MAX) e.description = `Up to ${ANN_DESC_MAX} characters`;
  const img = urlError(d.image_url, false);
  if (img) e.image_url = img;
  if (d.cta_kind !== "none") {
    const label = d.cta_label.trim();
    if (!label) e.cta_label = "Add button text";
    else if ([...label].length > ANN_CTA_MAX) e.cta_label = `Up to ${ANN_CTA_MAX} characters`;
  }
  if (d.cta_kind === "link") {
    const u = urlError(d.cta_url, true);
    if (u) e.cta_url = u === "Required" ? "Add a link" : u;
  }
  if (d.cta_kind === "form") {
    if (!d.form_block_id) e.form_block_id = "Pick a form";
    else if (targets && !targets.some((b) => b.id === d.form_block_id)) e.form_block_id = "That form was deleted. Pick another.";
  }
  const bg = colorError(d.bg_color);
  if (bg) e.bg_color = bg;
  const tc = colorError(d.text_color);
  if (tc) e.text_color = tc;
  const s = d.schedule;
  if (s?.start_at && s?.end_at && Date.parse(s.end_at) <= Date.parse(s.start_at)) e.schedule = "End must be after start";
  return e;
}
