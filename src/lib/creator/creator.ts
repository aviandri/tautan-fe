/** P3-B helpers: follower counts, community hosts. */
import type { COMMUNITY_PLATFORMS } from "../types";

/**
 * "84.2K" → 84200, "212rb" → 212000, "1,2jt" / "1.2M" → 1200000, "31.000" / "31,000" → 31000.
 * A separator followed by exactly three digits (and no suffix) is a thousands separator.
 * Returns undefined for empty, NaN when unparseable.
 */
export function parseCount(raw: string): number | undefined {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (!s) return undefined;
  const m = s.match(/^([0-9][0-9.,]*)(k|rb|ribu|m|jt|juta|b|mlyr)?$/);
  if (!m) return NaN;
  const mult = { k: 1e3, rb: 1e3, ribu: 1e3, m: 1e6, jt: 1e6, juta: 1e6, b: 1e9, mlyr: 1e9 }[m[2] as "k"] ?? 1;
  let num = m[1];
  if (mult === 1 || /[.,]\d{3}([.,]|$)/.test(num) && !/[.,]\d{1,2}$/.test(num)) {
    // thousands separators only (31.000, 1,234,567), unless a short decimal tail follows a suffix
    if (mult === 1) num = num.replace(/[.,](?=\d{3}(\D|$))/g, "");
  }
  num = num.replace(",", ".");
  if ((num.match(/\./g) ?? []).length > 1) return NaN;
  const n = Number(num) * mult;
  return Number.isFinite(n) ? Math.round(n) : NaN;
}

/** 84200 → "84.2K" (display). */
export function formatCount(n: number): string {
  if (n >= 1e6) return `${+(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en");
}

type Community = (typeof COMMUNITY_PLATFORMS)[number];

export const COMMUNITY_META: Record<Community, { label: string; example: string; test: (u: URL) => boolean }> = {
  whatsapp_group: { label: "WhatsApp group", example: "https://chat.whatsapp.com/…", test: (u) => u.hostname === "chat.whatsapp.com" },
  whatsapp_channel: { label: "WhatsApp channel", example: "https://whatsapp.com/channel/…", test: (u) => /(^|\.)whatsapp\.com$/.test(u.hostname) && u.pathname.startsWith("/channel/") },
  telegram: { label: "Telegram", example: "https://t.me/yourgroup", test: (u) => ["t.me", "telegram.me"].includes(u.hostname) },
  discord: { label: "Discord", example: "https://discord.gg/invite", test: (u) => ["discord.gg", "discord.com", "www.discord.com"].includes(u.hostname) },
  line: { label: "LINE", example: "https://line.me/ti/g2/…", test: (u) => /(^|\.)line\.me$/.test(u.hostname) },
};

function parse(url: string): URL | null {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
  } catch {
    return null;
  }
}

export function detectCommunity(url: string): Community | null {
  const u = parse(url.trim());
  if (!u) return null;
  return (Object.keys(COMMUNITY_META) as Community[]).find((k) => COMMUNITY_META[k].test(u)) ?? null;
}

export function communityUrlError(url: string, platform: Community): string | null {
  const s = url.trim();
  if (!s) return "Add the invite link";
  const u = parse(s);
  if (!u || !/^https:\/\//i.test(s)) return "Use the https:// invite link";
  return COMMUNITY_META[platform].test(u) ? null : `That isn't a ${COMMUNITY_META[platform].label} link`;
}
