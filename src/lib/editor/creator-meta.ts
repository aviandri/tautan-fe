/**
 * P3-B Creator cards: editor metadata. Stubs (hidden, no validation) until
 * their forms land; see SPEC "P3-B: implemented (BE)".
 */
import { BadgePercent, CalendarDays, Clapperboard, Handshake, Images, LayoutGrid, MessagesSquare, Mic, ScanSearch, Sparkles, type LucideIcon } from "lucide-react";
import type { BlockDataMap, BlockType } from "../types";
import { keep, plural, type BlockMeta } from "./meta-core";

export type CreatorType = "media_kit" | "rate_card" | "brands" | "post_grid" | "latest_video" | "shop_the_look" | "gallery" | "events" | "podcast" | "community";

function stub<K extends CreatorType>(type: K, label: string, description: string, icon: LucideIcon, tint: string, defaultData: () => BlockDataMap[K], summary: (d: BlockDataMap[K]) => string): BlockMeta<K> {
  return { type, label, description, icon, tint, defaultData, needsInputFirst: true, hidden: true, summary, validate: keep };
}

const today = () => new Date().toISOString().slice(0, 10);

export const CREATOR_META: { [K in CreatorType]: BlockMeta<K> } = {
  media_kit: stub("media_kit", "Media kit", "Followers, engagement and audience for brands", BadgePercent, "#7c3aed", () => ({ platforms: [], updated_at: today() }), (d) => plural(d.platforms.length, "platform")),
  rate_card: stub("rate_card", "Rate card", "Collab packages with prices and a request button", Handshake, "#7c3aed", () => ({ packages: [{ name: "", deliverables: [] }], currency: "IDR" }), (d) => plural(d.packages.length, "package")),
  brands: stub("brands", "Brands", "A “Worked with” logo wall", Sparkles, "#7c3aed", () => ({ logos: [] }), (d) => plural(d.logos.length, "logo")),
  post_grid: stub("post_grid", "Post grid", "Pinned Instagram, TikTok or YouTube posts", LayoutGrid, "#db2777", () => ({ posts: [] }), (d) => plural(d.posts.length, "post")),
  latest_video: stub("latest_video", "Latest video", "Your newest YouTube upload, always up to date", Clapperboard, "#db2777", () => ({ channel_id: "", show: { count: 1 } }), (d) => d.resolved?.channel_title || "YouTube channel"),
  shop_the_look: stub("shop_the_look", "Shop the look", "A photo with tappable product tags", ScanSearch, "#db2777", () => ({ image_url: "", spots: [] }), (d) => plural(d.spots.length, "tag")),
  gallery: stub("gallery", "Gallery", "A photo grid or carousel", Images, "#db2777", () => ({ images: [], layout: "grid" }), (d) => plural(d.images.length, "photo")),
  events: stub("events", "Events and live", "Tour dates or a weekly live schedule", CalendarDays, "#7c3aed", () => ({ mode: "dates", tz: "Asia/Jakarta", dates: [] }), (d) => (d.mode === "weekly" ? plural(d.weekly?.length ?? 0, "live slot") : plural(d.dates?.length ?? 0, "date"))),
  podcast: stub("podcast", "Podcast", "Latest episodes from your RSS feed", Mic, "#db2777", () => ({ feed_url: "", count: 3 }), (d) => d.resolved?.title || "Podcast feed"),
  community: stub("community", "Community", "Join your WhatsApp group, Telegram or Discord", MessagesSquare, "#1d7a4a", () => ({ platform: "whatsapp_group", url: "", title: "" }), (d) => d.title || "Community"),
};

export const isCreatorType = (t: BlockType): t is CreatorType => t in CREATOR_META;
