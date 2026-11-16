import type { Profile, Theme } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { platformLabel } from "@/lib/social";
import { isTempUsername } from "@/lib/page-extras";
import { SocialIcon } from "./blocks/SocialIconsBlock";
import { Img } from "./Img";
import { mediaFor, type MediaMap } from "./env";
import { s } from "./cls";

/** Header socials row (profile.socials). "divider" entries are spacers. */
export function SocialRow({ socials }: { socials: NonNullable<Profile["socials"]> }) {
  const items = socials.filter((x) => x.platform === "divider" || safeHref(x.url));
  if (!items.some((x) => x.platform !== "divider")) return null;
  return (
    <nav className={s.social} aria-label="Social profiles">
      {items.map((it, i) =>
        it.platform === "divider" ? (
          <span key={`d-${i}`} className={s.socialSpacer} aria-hidden />
        ) : (
          <a
            key={`${it.platform}-${i}`}
            className={s.socialLink}
            href={safeHref(it.url)}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={platformLabel(it.platform)}
          >
            <SocialIcon platform={it.platform} />
          </a>
        ),
      )}
    </nav>
  );
}

/** display_name, else the username, but never a temporary "tmp.…" name from username-less signup. */
export function displayName(profile: Profile): string {
  return profile.display_name?.trim() || (isTempUsername(profile.username) ? "" : profile.username);
}

export function ProfileHeader({ profile, theme, preview, media }: { profile: Profile; theme: Theme; preview: boolean; media?: MediaMap }) {
  const layout = theme.header?.layout ?? "classic";
  const avatar = safeImageSrc(profile.avatar_url);
  const banner = safeImageSrc(theme.header?.banner_image_url);
  const real = displayName(profile);
  // a brand-new account in the editor preview has neither a name nor a claimed username yet
  const name = real || (preview ? "Your name" : "");
  const socialsTop = profile.socials?.length && (profile.socials_position ?? "top") === "top";

  const avatarEl = avatar ? (
    <Img className={s.avatar} src={avatar} alt="" media={mediaFor({ media }, avatar)} width={96} height={96} sizes="96px" priority={layout !== "headshot"} />
  ) : (
    <div className={s.avatarFallback} aria-hidden>
      {(name || "?").slice(0, 1).toUpperCase()}
    </div>
  );
  const text = (
    <>
      {name ? <h1 className={`${s.name} ${real ? "" : s.placeholder}`}>{name}</h1> : null}
      {profile.bio ? <p className={s.bio}>{profile.bio}</p> : null}
    </>
  );
  const socials = socialsTop ? <SocialRow socials={profile.socials!} /> : null;

  if (layout === "banner") {
    return (
      <header className={`${s.header} ${s.headerBanner}`}>
        <div className={s.banner} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {banner ? <img src={banner} alt="" /> : null}
        </div>
        <div className={s.bannerAvatar}>{avatarEl}</div>
        {text}
        {socials}
      </header>
    );
  }

  if (layout === "headshot") {
    return (
      <header className={`${s.header} ${s.headerHeadshot}`}>
        {avatar ? (
          <Img className={s.headshot} src={avatar} alt="" media={mediaFor({ media }, avatar)} width={320} height={400} sizes="320px" priority />
        ) : (
          avatarEl
        )}
        {text}
        {socials}
      </header>
    );
  }

  if (layout === "business") {
    return (
      <header className={`${s.header} ${s.headerBusiness}`}>
        <div className={s.businessRow}>
          {avatarEl}
          <div className={s.businessText}>{text}</div>
        </div>
        {socials}
      </header>
    );
  }

  return (
    <header className={s.header}>
      {avatarEl}
      {text}
      {socials}
    </header>
  );
}
