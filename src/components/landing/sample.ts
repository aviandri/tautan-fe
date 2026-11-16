import type { Block, BlockDataMap, BlockType, Profile, Tab } from "@/lib/types";
import { themeFromPreset } from "@/lib/theme/presets";

// The page shown inside the landing page's product window. A UI sample, rendered with the real
// public renderer, so what visitors see here is exactly what a Tautan page looks like.

const now = "2026-11-01T00:00:00Z";
const tabs: Tab[] = [
  { id: "t1", profile_id: "p", title: "Shop", slug: "shop", position: 0 },
  { id: "t2", profile_id: "p", title: "Classes", slug: "classes", position: 1 },
];

let pos = 0;
function block<K extends BlockType>(id: string, type: K, data: BlockDataMap[K], extra: Partial<Block> = {}): Block {
  return {
    id,
    profile_id: "p",
    tab_id: "t1",
    parent_id: null,
    position: pos++,
    is_visible: true,
    created_at: now,
    updated_at: now,
    type,
    data,
    ...extra,
  } as Block;
}

export const SAMPLE_BLOCKS: Block[] = [
  block("s1", "social_icons", {
    items: [
      { platform: "instagram", url: "https://instagram.com" },
      { platform: "tiktok", url: "https://tiktok.com" },
      { platform: "whatsapp", url: "https://wa.me" },
    ],
  }),
  block("s2", "link", { title: "Order stoneware plates", url: "https://example.com/order" }),
  block("s3", "link", { title: "Saturday wheel class", url: "https://example.com/class" }),
  block("s4", "folder", { title: "Glaze care guides" }),
  block("s4a", "link", { title: "Washing matte glazes", url: "https://example.com/a" }, { parent_id: "s4" }),
  block("s5", "faq", { items: [{ q: "Do you ship outside Java?", a: "Yes, packed in rice husk. Allow a week." }] }),
];

export const SAMPLE_TABS = tabs;

export function sampleProfile(preset = "kertas"): Profile {
  return {
    id: "p",
    user_id: "u",
    username: "studiolempung",
    display_name: "Studio Lempung",
    bio: "Handmade stoneware from Bandung. Wheel classes on Saturdays.",
    avatar_url: null,
    theme: themeFromPreset(preset),
    seo: {},
    is_published: true,
    created_at: now,
    updated_at: now,
  };
}

/** Labels for the editor list in the window, one per top-level sample block. */
export const BLOCK_LABELS: Record<string, { kind: string; title: string }> = {
  s1: { kind: "Social icons", title: "Instagram, TikTok, WhatsApp" },
  s2: { kind: "Link", title: "Order stoneware plates" },
  s3: { kind: "Link", title: "Saturday wheel class" },
  s4: { kind: "Folder", title: "Glaze care guides" },
  s5: { kind: "FAQ", title: "Do you ship outside Java?" },
};
