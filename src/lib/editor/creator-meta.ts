/**
 * P3-B Creator cards: editor metadata and validation mirroring SPEC "P3-B: implemented (BE)".
 */
import { BadgePercent, CalendarDays, Clapperboard, Handshake, Images, LayoutGrid, MessagesSquare, Mic, ScanSearch, Sparkles } from "lucide-react";
import type { BlockDataMap, BlockType } from "../types";
import { COMMUNITY_PLATFORMS, EVENT_STATUSES, LIVE_PLATFORMS, MEDIA_KIT_PLATFORMS, WEEKDAYS } from "../constants";
import { CHANNEL_ID_RE, communityUrlError, postPlatform } from "../creator/creator";
import { moneyError } from "../sell/money";
import { compact, maxLen, plural, put, required, withSchedule, type BlockMeta, type FieldErrors } from "./meta-core";
import { browserTz, httpUrlError, imageUrlError, validTz } from "./sell-meta";

export const CREATOR_LIMITS = {
  mkPlatforms: 8, age: 8, gender: 4, cities: 10,
  packages: 12, deliverables: 10, logos: 30, posts: 12, spots: 12, images: 30, dates: 50, weekly: 20,
} as const;

const trim = (s: string | undefined) => (s ?? "").trim();
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => DATE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
const intError = (n: number | undefined, what = "a whole number") => (n === undefined ? null : !Number.isFinite(n) || n < 0 || !Number.isInteger(n) ? `Enter ${what}` : null);

/** Drop server-only fields before saving. */
function stripReadOnly<T extends object>(d: T): T {
  const out = { ...d } as T & { resolved?: unknown; computed?: unknown };
  delete out.resolved;
  delete out.computed;
  return out;
}

export type CreatorType = "media_kit" | "rate_card" | "brands" | "post_grid" | "latest_video" | "shop_the_look" | "gallery" | "events" | "podcast" | "community";


/** Local calendar date, YYYY-MM-DD. */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type Slice = { label: string; pct: number };
function slices(e: FieldErrors, key: string, list: Slice[] | undefined, max: number): Slice[] | undefined {
  const out = (list ?? []).map((x) => ({ label: trim(x.label), pct: x.pct })).filter((x) => x.label || Number.isFinite(x.pct));
  if (out.length > max) put(e, key, `Up to ${max}`);
  out.forEach((x, i) => {
    put(e, `${key}.${i}.label`, required(x.label) ? "Add a label" : maxLen(x.label, 40));
    if (!Number.isFinite(x.pct) || x.pct < 0 || x.pct > 100) put(e, `${key}.${i}.pct`, "0 to 100");
  });
  const sum = out.reduce((n, x) => n + (Number.isFinite(x.pct) ? x.pct : 0), 0);
  if (sum > 100.0001) put(e, key, `Adds up to ${Math.round(sum)}%, more than 100%`);
  return out.length ? out : undefined;
}

export const CREATOR_META: { [K in CreatorType]: BlockMeta<K> } = {
  media_kit: {
    type: "media_kit",
    label: "Media kit",
    description: "Followers, engagement and audience for brands",
    icon: BadgePercent,
    tint: "#7c3aed",
    defaultData: () => ({ platforms: [{ platform: "instagram", handle: "", followers: 0 }], updated_at: today() }),
    needsInputFirst: true,
    summary: (d) => d.platforms.map((p) => p.platform).join(", ") || "No platforms yet",
    validate: withSchedule<"media_kit">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.platforms.length) put(e, "platforms", "Add at least one platform");
      if (d.platforms.length > CREATOR_LIMITS.mkPlatforms) put(e, "platforms", `Up to ${CREATOR_LIMITS.mkPlatforms} platforms`);
      const platforms = d.platforms.map((p, i) => {
        const o = { ...p, handle: trim(p.handle).replace(/^@/, ""), url: trim(p.url) };
        if (!MEDIA_KIT_PLATFORMS.includes(o.platform)) put(e, `platforms.${i}.platform`, "Pick a platform");
        put(e, `platforms.${i}.handle`, required(o.handle) ? "Add your handle" : maxLen(o.handle, 60));
        put(e, `platforms.${i}.followers`, intError(o.followers, "your follower count"));
        put(e, `platforms.${i}.avg_views`, intError(o.avg_views));
        if (o.engagement !== undefined && (!Number.isFinite(o.engagement) || o.engagement < 0 || o.engagement > 100)) put(e, `platforms.${i}.engagement`, "A percentage, 0 to 100");
        put(e, `platforms.${i}.url`, httpUrlError(o.url, false));
        return compact(o, ["avg_views", "engagement", "url"]);
      });
      const age = slices(e, "audience.age", d.audience?.age, CREATOR_LIMITS.age);
      const gender = slices(e, "audience.gender", d.audience?.gender, CREATOR_LIMITS.gender);
      const cities = slices(e, "audience.cities", d.audience?.cities, CREATOR_LIMITS.cities);
      const audience = age || gender || cities ? compact({ age, gender, cities }, ["age", "gender", "cities"]) : undefined;
      if (!validDate(d.updated_at)) put(e, "updated_at", "Pick a date");
      const pdf_url = trim(d.pdf_url);
      put(e, "pdf_url", imageUrlError(pdf_url));
      return { errors: e, data: compact({ ...d, title, platforms, audience, pdf_url }, ["title", "audience", "pdf_url"]) };
    }),
  },
  rate_card: {
    type: "rate_card",
    label: "Rate card",
    description: "Collab packages with prices and a request button",
    icon: Handshake,
    tint: "#7c3aed",
    defaultData: () => ({ packages: [{ name: "", deliverables: [] }], currency: "IDR" }),
    needsInputFirst: true,
    summary: (d) => plural(d.packages.length, "package"),
    validate: withSchedule<"rate_card">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.packages.length) put(e, "packages", "Add at least one package");
      if (d.packages.length > CREATOR_LIMITS.packages) put(e, "packages", `Up to ${CREATOR_LIMITS.packages} packages`);
      const packages = d.packages.map((p, i) => {
        const o = { ...p, name: trim(p.name), turnaround: trim(p.turnaround), deliverables: p.deliverables.map((x) => x.trim()).filter(Boolean) };
        put(e, `packages.${i}.name`, required(o.name) ? "Name this package" : maxLen(o.name, 80));
        put(e, `packages.${i}.price_from`, moneyError(o.price_from));
        if (!o.deliverables.length) put(e, `packages.${i}.deliverables`, "Add what's included");
        else if (o.deliverables.length > CREATOR_LIMITS.deliverables) put(e, `packages.${i}.deliverables`, `Up to ${CREATOR_LIMITS.deliverables}`);
        else if (o.deliverables.some((x) => x.length > 100)) put(e, `packages.${i}.deliverables`, "Each item can be up to 100 characters");
        put(e, `packages.${i}.turnaround`, maxLen(o.turnaround, 40));
        return compact(o, ["price_from", "turnaround"]);
      });
      const note = trim(d.note);
      const button_label = trim(d.button_label);
      put(e, "note", maxLen(note, 300));
      put(e, "button_label", maxLen(button_label, 40));
      return { errors: e, data: compact({ ...d, title, packages, note, button_label }, ["title", "note", "button_label", "form_block_id"]) };
    }),
  },
  brands: {
    type: "brands",
    label: "Brands",
    description: "A “Worked with” logo wall",
    icon: Sparkles,
    tint: "#7c3aed",
    defaultData: () => ({ title: "Brands I've worked with", logos: [] }),
    needsInputFirst: true,
    summary: (d) => d.logos.map((l) => l.name).filter(Boolean).slice(0, 3).join(", ") || "No logos yet",
    validate: withSchedule<"brands">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.logos.length) put(e, "logos", "Add at least one logo");
      if (d.logos.length > CREATOR_LIMITS.logos) put(e, "logos", `Up to ${CREATOR_LIMITS.logos} logos`);
      const logos = d.logos.map((l, i) => {
        const o = { image_url: trim(l.image_url), name: trim(l.name), url: trim(l.url) };
        put(e, `logos.${i}.image_url`, o.image_url ? imageUrlError(o.image_url) : "Upload the logo");
        put(e, `logos.${i}.name`, required(o.name) ? "Brand name" : maxLen(o.name, 60));
        put(e, `logos.${i}.url`, httpUrlError(o.url, false));
        return compact(o, ["url"]);
      });
      return { errors: e, data: compact({ ...d, title, logos }, ["title"]) };
    }),
  },
  post_grid: {
    type: "post_grid",
    label: "Post grid",
    description: "Pinned Instagram, TikTok or YouTube posts",
    icon: LayoutGrid,
    tint: "#db2777",
    defaultData: () => ({ posts: [{ url: "" }] }),
    needsInputFirst: true,
    summary: (d) => plural(d.posts.length, "post"),
    validate: withSchedule<"post_grid">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.posts.length) put(e, "posts", "Add at least one post");
      if (d.posts.length > CREATOR_LIMITS.posts) put(e, "posts", `Up to ${CREATOR_LIMITS.posts} posts`);
      const posts = d.posts.map((p, i) => {
        const url = trim(p.url);
        const caption = trim(p.caption);
        const platform = postPlatform(url);
        const ue = httpUrlError(url, true);
        put(e, `posts.${i}.url`, ue ?? (platform ? null : "Use an Instagram post or reel, a TikTok video or a YouTube video link"));
        put(e, `posts.${i}.caption`, maxLen(caption, 200));
        return compact({ url, caption, ...(platform ? { platform } : {}) }, ["caption"]);
      });
      return { errors: e, data: compact({ ...d, title, posts }, ["title"]) };
    }),
  },
  latest_video: {
    type: "latest_video",
    label: "Latest video",
    description: "Your newest YouTube upload, always up to date",
    icon: Clapperboard,
    tint: "#db2777",
    defaultData: () => ({ channel_id: "", show: { count: 1 } }),
    needsInputFirst: true,
    summary: (d) => d.resolved?.channel_title || d.title || "YouTube channel",
    validate: withSchedule<"latest_video">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      const channel_id = trim(d.channel_id);
      put(e, "title", maxLen(title, 60));
      put(e, "channel_id", !channel_id ? "Add your channel" : CHANNEL_ID_RE.test(channel_id) ? null : "That isn't a YouTube channel id");
      const count = d.show?.count ?? 1;
      if (!Number.isInteger(count) || count < 1 || count > 3) put(e, "show.count", "1 to 3 videos");
      return { errors: e, data: compact({ ...d, title, channel_id, show: { count } }, ["title"]) };
    }),
  },
  shop_the_look: {
    type: "shop_the_look",
    label: "Shop the look",
    description: "A photo with tappable product tags",
    icon: ScanSearch,
    tint: "#db2777",
    defaultData: () => ({ image_url: "", spots: [], currency: "IDR" }),
    needsInputFirst: true,
    summary: (d) => plural(d.spots.length, "tag"),
    validate: withSchedule<"shop_the_look">((d) => {
      const e: FieldErrors = {};
      const image_url = trim(d.image_url);
      const alt = trim(d.alt);
      put(e, "image_url", image_url ? imageUrlError(image_url) : "Upload a photo");
      put(e, "alt", maxLen(alt, 200));
      if (image_url && !d.spots.length) put(e, "spots", "Tap the photo to add a tag");
      if (d.spots.length > CREATOR_LIMITS.spots) put(e, "spots", `Up to ${CREATOR_LIMITS.spots} tags`);
      const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n * 10) / 10));
      const spots = d.spots.map((sp, i) => {
        const o = { ...sp, x: clamp(sp.x), y: clamp(sp.y), title: trim(sp.title), url: trim(sp.url), code: trim(sp.code) };
        put(e, `spots.${i}.title`, required(o.title) ? "Name this item" : maxLen(o.title, 80));
        put(e, `spots.${i}.price`, moneyError(o.price));
        put(e, `spots.${i}.url`, httpUrlError(o.url, true));
        put(e, `spots.${i}.code`, maxLen(o.code, 40));
        return compact(o, ["price", "code"]);
      });
      return { errors: e, data: compact({ ...d, image_url, alt, spots }, ["alt"]) };
    }),
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "A photo grid or carousel",
    icon: Images,
    tint: "#db2777",
    defaultData: () => ({ images: [], layout: "grid" }),
    needsInputFirst: true,
    summary: (d) => `${plural(d.images.length, "photo")} · ${d.layout === "carousel" ? "carousel" : "grid"}`,
    validate: withSchedule<"gallery">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.images.length) put(e, "images", "Add at least one photo");
      if (d.images.length > CREATOR_LIMITS.images) put(e, "images", `Up to ${CREATOR_LIMITS.images} photos`);
      const images = d.images.map((im, i) => {
        const o = { url: trim(im.url), alt: trim(im.alt), link_url: trim(im.link_url) };
        put(e, `images.${i}.url`, imageUrlError(o.url));
        put(e, `images.${i}.alt`, maxLen(o.alt, 200));
        put(e, `images.${i}.link_url`, httpUrlError(o.link_url, false));
        return compact(o, ["alt", "link_url"]);
      });
      return { errors: e, data: compact({ ...d, title, images }, ["title"]) };
    }),
  },
  events: {
    type: "events",
    label: "Events and live",
    description: "Tour dates or a weekly live schedule",
    icon: CalendarDays,
    tint: "#7c3aed",
    defaultData: () => ({ mode: "dates", tz: browserTz(), dates: [{ date: "" }] }),
    needsInputFirst: true,
    summary: (d) => (d.mode === "weekly" ? plural(d.weekly?.length ?? 0, "live slot") : plural(d.dates?.length ?? 0, "date")),
    validate: withSchedule<"events">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!validTz(d.tz)) put(e, "tz", "Pick a time zone");
      const out = stripReadOnly({ ...d, title }) as BlockDataMap["events"];
      if (d.mode === "weekly") {
        const weekly = (d.weekly ?? []).map((w, i) => {
          const days = WEEKDAYS.filter((x) => w.days.includes(x));
          const o = { ...w, days, title: trim(w.title), url: trim(w.url) };
          if (!days.length) put(e, `weekly.${i}.days`, "Pick at least one day");
          if (!HHMM.test(o.start)) put(e, `weekly.${i}.start`, "Use a time like 20:00");
          if (!Number.isInteger(o.duration_min) || o.duration_min < 5 || o.duration_min > 720) put(e, `weekly.${i}.duration_min`, "5 minutes to 12 hours");
          put(e, `weekly.${i}.title`, maxLen(o.title, 80));
          if (o.platform && !LIVE_PLATFORMS.includes(o.platform)) put(e, `weekly.${i}.platform`, "Pick a platform");
          put(e, `weekly.${i}.url`, httpUrlError(o.url, false));
          return compact(o, ["title", "url", "platform"]);
        });
        if (!weekly.length) put(e, "weekly", "Add a live slot");
        if (weekly.length > CREATOR_LIMITS.weekly) put(e, "weekly", `Up to ${CREATOR_LIMITS.weekly} slots`);
        out.weekly = weekly;
        delete out.dates;
      } else {
        const dates = (d.dates ?? []).map((x, i) => {
          const o = { ...x, time: trim(x.time), title: trim(x.title), city: trim(x.city), venue: trim(x.venue), url: trim(x.url) };
          if (!validDate(o.date)) put(e, `dates.${i}.date`, "Pick a date");
          if (o.time && !HHMM.test(o.time)) put(e, `dates.${i}.time`, "Use a time like 19:00");
          put(e, `dates.${i}.title`, maxLen(o.title, 80));
          put(e, `dates.${i}.city`, maxLen(o.city, 60));
          put(e, `dates.${i}.venue`, maxLen(o.venue, 100));
          put(e, `dates.${i}.url`, httpUrlError(o.url, false));
          if (o.status && !EVENT_STATUSES.includes(o.status)) put(e, `dates.${i}.status`, "Pick a status");
          return compact(o, ["time", "title", "city", "venue", "url", "status"]);
        });
        if (!dates.length) put(e, "dates", "Add a date");
        if (dates.length > CREATOR_LIMITS.dates) put(e, "dates", `Up to ${CREATOR_LIMITS.dates} dates`);
        out.dates = dates;
        delete out.weekly;
      }
      return { errors: e, data: compact(out, ["title"]) };
    }),
  },
  podcast: {
    type: "podcast",
    label: "Podcast",
    description: "Latest episodes from your RSS feed",
    icon: Mic,
    tint: "#db2777",
    defaultData: () => ({ feed_url: "", count: 3 }),
    needsInputFirst: true,
    summary: (d) => d.resolved?.title || d.title || "Podcast feed",
    validate: withSchedule<"podcast">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      const feed_url = trim(d.feed_url);
      put(e, "title", maxLen(title, 60));
      const fe = httpUrlError(feed_url, true);
      put(e, "feed_url", fe === "Add the link" ? "Add your RSS feed link" : fe);
      const count = d.count ?? 3;
      if (!Number.isInteger(count) || count < 1 || count > 10) put(e, "count", "1 to 10 episodes");
      return { errors: e, data: compact({ ...d, title, feed_url, count }, ["title"]) };
    }),
  },
  community: {
    type: "community",
    label: "Community",
    description: "Join your WhatsApp group, Telegram or Discord",
    icon: MessagesSquare,
    tint: "#1d7a4a",
    defaultData: () => ({ platform: "whatsapp_group", url: "", title: "" }),
    needsInputFirst: true,
    summary: (d) => d.title || "Community",
    validate: withSchedule<"community">((d) => {
      const e: FieldErrors = {};
      const o = { ...d, url: trim(d.url), title: trim(d.title), members_note: trim(d.members_note), button_label: trim(d.button_label) };
      if (!COMMUNITY_PLATFORMS.includes(o.platform)) put(e, "platform", "Pick a platform");
      else put(e, "url", communityUrlError(o.url, o.platform));
      put(e, "title", required(o.title) ? "Add a title" : maxLen(o.title, 80));
      put(e, "members_note", maxLen(o.members_note, 60));
      put(e, "button_label", maxLen(o.button_label, 40));
      return { errors: e, data: compact(o, ["members_note", "button_label"]) };
    }),
  },
};

export const isCreatorType = (t: BlockType): t is CreatorType => t in CREATOR_META;
