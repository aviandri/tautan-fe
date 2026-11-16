/** P2-7 page settings: client-side checks mirroring tautan-be normalizeSettings. */
import type { PageSettings } from "./types";

export const GA4_RE = /^G-[A-Z0-9]{4,15}$/;
export const PIXEL_RE = /^[0-9]{6,20}$/;
export const LANG_RE = /^[a-z]{2,3}(-[A-Z]{2})?$/;
const PHONE_RE = /^[0-9+()\-.\s]{4,32}$/;
const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;

export const LANGUAGES: { code: string; label: string }[] = [
  { code: "id", label: "Bahasa Indonesia" },
  { code: "en", label: "English" },
  { code: "ms", label: "Bahasa Melayu" },
  { code: "jv", label: "Basa Jawa" },
  { code: "su", label: "Basa Sunda" },
  { code: "tl", label: "Filipino" },
  { code: "th", label: "ไทย (Thai)" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "zh-CN", label: "中文 (简体)" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
  { code: "pt-BR", label: "Português (Brasil)" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "nl", label: "Nederlands" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
];

export function settingsErrors(s: Partial<Record<keyof PageSettings, string | boolean>>): Partial<Record<keyof PageSettings, string>> {
  const e: Partial<Record<keyof PageSettings, string>> = {};
  const str = (k: keyof PageSettings) => String(s[k] ?? "").trim();
  if (str("ga4_id") && !GA4_RE.test(str("ga4_id").toUpperCase())) e.ga4_id = "Looks like G-XXXXXXXXXX";
  if (str("meta_pixel_id") && !PIXEL_RE.test(str("meta_pixel_id"))) e.meta_pixel_id = "Digits only, 6 to 20 of them";
  if (str("language") && !LANG_RE.test(str("language"))) e.language = "Use a code like id, en or pt-BR";
  if (str("contact_email") && !EMAIL_RE.test(str("contact_email"))) e.contact_email = "Enter a valid email";
  if (str("contact_phone") && !PHONE_RE.test(str("contact_phone"))) e.contact_phone = "Digits, spaces and + ( ) - only";
  return e;
}

/** Trim, uppercase the GA4 id, drop empty strings and false toggles (except show_share, always explicit). */
export function compactSettings(s: PageSettings): PageSettings {
  const out: PageSettings = {};
  const t = (v?: string) => (v ?? "").trim();
  if (t(s.ga4_id)) out.ga4_id = t(s.ga4_id).toUpperCase();
  if (t(s.meta_pixel_id)) out.meta_pixel_id = t(s.meta_pixel_id);
  if (t(s.language)) out.language = t(s.language);
  // Share is on by default: always store an explicit boolean so "off" differs from "never set".
  out.show_share = s.show_share !== false;
  if (s.show_save_contact) out.show_save_contact = true;
  if (t(s.contact_email)) out.contact_email = t(s.contact_email);
  if (t(s.contact_phone)) out.contact_phone = t(s.contact_phone);
  return out;
}
