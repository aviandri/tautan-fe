// Social platforms the social_icons block supports. `platform` values are stored in block data,
// so never rename an id; add new ones instead. The editor uses this list for its dropdown.

export interface SocialPlatform {
  id: string;
  label: string;
  /** Prefix hint for the editor's URL field. */
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { id: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname" },
  { id: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname" },
  { id: "x", label: "X", placeholder: "https://x.com/yourname" },
  { id: "threads", label: "Threads", placeholder: "https://threads.net/@yourname" },
  { id: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourname" },
  { id: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourname" },
  { id: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourname" },
  { id: "github", label: "GitHub", placeholder: "https://github.com/yourname" },
  { id: "spotify", label: "Spotify", placeholder: "https://open.spotify.com/artist/…" },
  { id: "whatsapp", label: "WhatsApp", placeholder: "https://wa.me/628…" },
  { id: "telegram", label: "Telegram", placeholder: "https://t.me/yourname" },
  { id: "discord", label: "Discord", placeholder: "https://discord.gg/…" },
  { id: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/yourname" },
  { id: "twitch", label: "Twitch", placeholder: "https://twitch.tv/yourname" },
  { id: "email", label: "Email", placeholder: "mailto:you@example.com" },
  { id: "website", label: "Website", placeholder: "https://yoursite.com" },
];

export function platformLabel(id: string): string {
  return SOCIAL_PLATFORMS.find((p) => p.id === id)?.label ?? id;
}

// ---------- handle <-> URL (P2-2 header socials: "the FE builds the url from a handle") ----------

const TEMPLATES: Record<string, string> = {
  instagram: "https://instagram.com/{h}",
  tiktok: "https://tiktok.com/@{h}",
  x: "https://x.com/{h}",
  threads: "https://threads.net/@{h}",
  youtube: "https://youtube.com/@{h}",
  facebook: "https://facebook.com/{h}",
  linkedin: "https://linkedin.com/in/{h}",
  github: "https://github.com/{h}",
  telegram: "https://t.me/{h}",
  pinterest: "https://pinterest.com/{h}",
  twitch: "https://twitch.tv/{h}",
};

/** What the editor's input asks for, per platform. */
export function handleHint(platform: string): string {
  if (platform === "email") return "you@example.com";
  if (platform === "whatsapp") return "Phone with country code, e.g. 62812…";
  if (TEMPLATES[platform]) return "username";
  return "https://…";
}

/** Turn what the owner typed (a handle, @handle, number, email or full URL) into the URL to store. */
export function socialUrl(platform: string, input: string): string {
  const v = input.trim();
  if (!v) return "";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (platform === "email") return `mailto:${v}`;
  if (platform === "whatsapp") return `https://wa.me/${v.replace(/\D/g, "")}`;
  const t = TEMPLATES[platform];
  if (t) return t.replace("{h}", encodeURIComponent(v.replace(/^@/, "").replace(/\/+$/, "")));
  return /^[\w-]+(\.[\w-]+)+/.test(v) ? `https://${v}` : v;
}

/** The handle to show in the editor for a stored URL (falls back to the URL itself). */
export function socialHandle(platform: string, url: string): string {
  if (!url) return "";
  if (platform === "email") return url.replace(/^mailto:/i, "");
  if (platform === "whatsapp") return url.replace(/^https?:\/\/wa\.me\//i, "");
  const t = TEMPLATES[platform];
  if (t) {
    const [pre] = t.split("{h}");
    const bare = (u: string) => u.replace(/^https?:\/\/(www\.)?/i, "");
    if (bare(url).toLowerCase().startsWith(bare(pre).toLowerCase())) return decodeURIComponent(bare(url).slice(bare(pre).length).replace(/\/+$/, ""));
  }
  return url;
}
