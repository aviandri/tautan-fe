import type { CSSProperties } from "react";
import type { Block, PagePayments, Profile, Tab } from "@/lib/types";
import { isDarkColor, resolvePalette, resolveTheme, themeToCssVars } from "@/lib/theme/resolve";
import { buildTabTree, selectTab, sortTabs, tabQuery } from "@/lib/page-structure";
import { themeFontVariables } from "@/lib/theme/fonts";
import { readAnnouncement, readSettings } from "@/lib/page-extras";
import { BlockList } from "./BlockRenderer";
import { firstImageId } from "@/lib/page-structure";
import { ProfileHeader, SocialRow, displayName } from "./ProfileHeader";
import { AnnouncementView } from "./Announcement";
import { PageActions } from "./PageActions";
import { PageRuntime } from "./PageRuntime";
import type { MediaMap, PageEnv } from "./env";
import { s } from "./cls";
import "./public.css";

export interface PublicPageViewProps {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
  /** The tab to show (from ?tab=). Falls back to the first tab. */
  activeTabSlug?: string | null;
  /** GET /public/{u} `media` (image sizes and ready variants) */
  media?: MediaMap;
  /** GET /public/{u} `payments` (payments b): enables buy buttons on priced cards */
  payments?: PagePayments | null;
  /** Editor live preview: no events, no network, links don't navigate. */
  preview?: boolean;
  /** Preview only (a function can't cross from the server): called instead of navigating to a tab. */
  onTabChange?: (slug: string) => void;
  /** Fill the viewport (public route). Off for the editor's phone frame. */
  fullHeight?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * The public page, stateless and hook-free, so the /[username] route renders it entirely as React
 * Server Components (zero JS per card). PageRuntime is the one small client island that wires up
 * tracking, copy buttons, embeds and the rest by event delegation.
 */
export function PublicPageView({ profile, tabs, blocks, media, payments, activeTabSlug, preview = false, onTabChange, fullHeight = false, className, style }: PublicPageViewProps) {
  const sortedTabs = sortTabs(tabs);
  const tab = selectTab(sortedTabs, activeTabSlug ?? null);
  const tree = buildTabTree(blocks, tab?.id);
  const theme = resolveTheme(profile.theme);
  const announcement = readAnnouncement(profile);
  const settings = readSettings(profile);
  const env: PageEnv = { username: profile.username, preview, tabs: sortedTabs, media, payCurrencies: payments?.currencies ?? [] };
  const pal = resolvePalette(theme);
  const opts = { env, now: Date.now(), priorityId: firstImageId(tree.top), palette: pal ? { mode: pal.mode as "cycle" | "by_type", count: pal.surfaces.length } : undefined };
  const basePath = `/${profile.username}`;
  // dark themes tint the desktop sheet the other way (and the popup CTA flips to light)
  const dark = !isDarkColor(theme.text_color);
  // the editor mounts this inside its own <main>
  const Main = preview ? "div" : "main";

  return (
    <div
      data-tpage=""
      className={[s.page, themeFontVariables, fullHeight && s.fullHeight, theme.bg_desktop && s.desktopBg, dark && s.dark, pal && s.palette, className].filter(Boolean).join(" ")}
      style={{ ...themeToCssVars(theme), ...style }}
      lang={settings.language}
    >
      <div className={s.sheet}>
        <Main className={s.column}>
          {announcement?.layout === "banner" ? <AnnouncementView a={announcement} preview={preview} /> : null}
          <PageActions username={profile.username} name={displayName(profile) || "this page"} share={!!settings.show_share} saveContact={!!settings.show_save_contact} />
          <ProfileHeader profile={profile} theme={theme} preview={preview} media={media} />

          {sortedTabs.length > 1 ? (
            <nav className={s.tabs} aria-label="Page sections">
              {sortedTabs.map((t) => {
                const active = t.id === tab?.id;
                return (
                  <a key={t.id} href={basePath + tabQuery(sortedTabs, t)} data-tab={t.slug} className={active ? s.tabActive : s.tab} aria-current={active ? "page" : undefined}>
                    {t.title}
                  </a>
                );
              })}
            </nav>
          ) : null}

          {announcement && announcement.layout !== "banner" ? <AnnouncementView a={announcement} preview={preview} /> : null}

          {tree.top.length ? <BlockList blocks={tree.top} childrenOf={tree.children} opts={opts} /> : <p className={s.empty}>Nothing here yet.</p>}

          {profile.socials?.length && profile.socials_position === "bottom" ? <SocialRow socials={profile.socials} /> : null}
        </Main>

        <footer className={s.footer}>
          {/* plain <a>: next/link would add its router client code to the public page */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" target={preview ? "_blank" : undefined} rel="noopener" className={s.madeWith}>
            <svg viewBox="0 0 28 28" aria-hidden="true">
              <rect x="2" y="2" width="15" height="15" rx="7.5" fill="#d0106f" />
              <rect x="11" y="11" width="15" height="15" rx="7.5" fill="currentColor" />
            </svg>
            Make your own page with Tautan
          </a>
        </footer>
      </div>
      <PageRuntime username={profile.username} preview={preview} onTabChange={onTabChange} ga4={preview ? undefined : settings.ga4_id} pixel={preview ? undefined : settings.meta_pixel_id} />
    </div>
  );
}
