import {
  siInstagram,
  siTiktok,
  siX,
  siThreads,
  siYoutube,
  siFacebook,
  siGithub,
  siSpotify,
  siWhatsapp,
  siTelegram,
  siDiscord,
  siPinterest,
  siTwitch,
  type SimpleIcon,
} from "simple-icons";
import { BriefcaseBusiness, Globe, Mail } from "../icons";
import type { BlockOf } from "@/lib/types";
import { platformLabel } from "@/lib/social";
import { safeHref } from "@/lib/safe-url";
import { track } from "../env";
import { s } from "../cls";

const BRAND: Record<string, SimpleIcon> = {
  instagram: siInstagram,
  tiktok: siTiktok,
  x: siX,
  threads: siThreads,
  youtube: siYoutube,
  facebook: siFacebook,
  github: siGithub,
  spotify: siSpotify,
  whatsapp: siWhatsapp,
  telegram: siTelegram,
  discord: siDiscord,
  pinterest: siPinterest,
  twitch: siTwitch,
};

export function SocialIcon({ platform }: { platform: string }) {
  const brand = BRAND[platform];
  if (brand) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d={brand.path} />
      </svg>
    );
  }
  // LinkedIn asked both simple-icons and lucide to drop its mark, so use a generic glyph
  // (the link's aria-label still names the platform).
  if (platform === "linkedin") return <BriefcaseBusiness aria-hidden />;
  if (platform === "email") return <Mail aria-hidden />;
  return <Globe aria-hidden />;
}

export function SocialIconsBlock({ block }: { block: BlockOf<"social_icons"> }) {
  const items = (block.data.items ?? []).filter((i) => safeHref(i.url));
  if (!items.length) return null;
  return (
    <nav className={s.social} aria-label="Social links">
      {items.map((it, i) => (
        <a
          key={`${it.platform}-${i}`}
          className={s.socialLink}
          href={safeHref(it.url)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={platformLabel(it.platform)}
          {...track(block.id, `social:${it.platform}`.slice(0, 40).replace(/[^a-z0-9_:]/g, "_"))}
        >
          <SocialIcon platform={it.platform} />
        </a>
      ))}
    </nav>
  );
}
