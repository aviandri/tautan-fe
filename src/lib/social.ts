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
