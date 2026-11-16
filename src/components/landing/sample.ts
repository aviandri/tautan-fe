import type { Block, BlockDataMap, BlockType, Profile, Tab, Theme } from "@/lib/types";
import { themeFromPreset } from "@/lib/theme/presets";

// The pages shown in the landing page's phones. UI samples rendered with the real public renderer,
// so what visitors see here is exactly what a Tautan page looks like.

const now = "2026-11-01T00:00:00Z";
export const SAMPLE_TABS: Tab[] = [
  { id: "t1", profile_id: "p", title: "Shop", slug: "shop", position: 0 },
  { id: "t2", profile_id: "p", title: "Classes", slug: "classes", position: 1 },
];

let pos = 0;
function block<K extends BlockType>(id: string, type: K, data: BlockDataMap[K], extra: Partial<Block> = {}): Block {
  return { id, profile_id: "p", tab_id: "t1", parent_id: null, position: pos++, is_visible: true, created_at: now, updated_at: now, type, data, ...extra } as Block;
}

export const SAMPLE_BLOCKS: Block[] = [
  block("s2", "link", { title: "Order stoneware plates", url: "https://example.com/order" }),
  block("s3", "link", { title: "Saturday wheel class", url: "https://example.com/class" }),
  block("s6", "link", { title: "Glaze notes", url: "https://example.com/notes", layout: "grid2" }),
  block("s7", "link", { title: "Kiln tour", url: "https://example.com/tour", layout: "grid2" }),
  block("s8", "discount_code", { code: "LEMPUNG15", description: "15% off your first order" }),
];

/** Kartu's look as a theme: blush ground, white pill cards, Urbanist. */
export const KARTU_THEME: Theme = {
  ...themeFromPreset("kertas"),
  bg: { type: "color", value: "#f8d9e6" },
  text_color: "#000000",
  font: "Urbanist",
  button: { style: "fill", radius: 100, color: "#ffffff", text_color: "#000000" },
  block: { color: "#ffffff", text_color: "#000000" },
};

export function sampleProfile(preset?: string): Profile {
  return {
    id: "p",
    user_id: "u",
    username: "studiolempung",
    display_name: "Studio Lempung",
    bio: "Handmade stoneware from Bandung · wheel classes on Saturdays",
    avatar_url: null,
    theme: preset ? themeFromPreset(preset) : KARTU_THEME,
    seo: {},
    is_published: true,
    created_at: now,
    updated_at: now,
  };
}
