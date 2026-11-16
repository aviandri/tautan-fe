"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { Block, Profile, Tab } from "@/lib/types";
import { resolveTheme, themeToCssVars } from "@/lib/theme/resolve";
import { buildTabTree, selectTab, sortTabs, tabQuery } from "@/lib/page-structure";
import { trackEvent } from "@/lib/track";
import { themeFontVariables } from "@/lib/theme/fonts";
import { PublicContext } from "./context";
import { BlockList } from "./BlockRenderer";
import { ProfileHeader, SocialRow } from "./ProfileHeader";
import s from "./public.module.css";

export interface PublicPageProps {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
  /** Initial tab (from ?tab=). Falls back to the first tab. */
  activeTabSlug?: string | null;
  /** Editor live preview: no events, no contact POST, links don't navigate, no URL updates. */
  preview?: boolean;
  onTabChange?: (slug: string) => void;
  /** Fill the viewport (public route). Off for the editor's phone frame. */
  fullHeight?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function PublicPage({
  profile,
  tabs,
  blocks,
  activeTabSlug,
  preview = false,
  onTabChange,
  fullHeight = false,
  className,
  style,
}: PublicPageProps) {
  const sortedTabs = useMemo(() => sortTabs(tabs), [tabs]);
  const [slug, setSlug] = useState(activeTabSlug ?? null);
  useEffect(() => setSlug(activeTabSlug ?? null), [activeTabSlug]);

  const tab = selectTab(sortedTabs, slug);
  const tree = useMemo(() => buildTabTree(blocks, tab?.id), [blocks, tab?.id]);
  const theme = useMemo(() => resolveTheme(profile.theme), [profile.theme]);
  const vars = useMemo(() => themeToCssVars(theme), [theme]);

  // one view per page load (the ref guards React StrictMode's double effect in dev)
  const viewed = useRef(false);
  useEffect(() => {
    if (preview || viewed.current) return;
    viewed.current = true;
    trackEvent(profile.username, { kind: "view" });
  }, [preview, profile.username]);

  const basePath = `/${profile.username}`;
  const ctx = useMemo(
    () => ({
      username: profile.username,
      preview,
      selectTab: (tabId: string) => {
        const t = sortedTabs.find((x) => x.id === tabId);
        if (!t) return;
        setSlug(t.slug);
        onTabChange?.(t.slug);
        if (!preview) window.history.replaceState(null, "", basePath + tabQuery(sortedTabs, t));
        window.scrollTo({ top: 0 });
      },
      tabHref: (tabId: string) => {
        const t = sortedTabs.find((x) => x.id === tabId);
        return t ? basePath + tabQuery(sortedTabs, t) : undefined;
      },
    }),
    [profile.username, preview, sortedTabs, basePath, onTabChange],
  );

  function onTabClick(e: MouseEvent, t: Tab) {
    // plain <a href> keeps tabs working without JS; with JS we swap in place
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    setSlug(t.slug);
    onTabChange?.(t.slug);
    if (!preview) window.history.replaceState(null, "", basePath + tabQuery(sortedTabs, t));
  }

  // the editor mounts this inside its own <main>
  const Main = preview ? "div" : "main";

  return (
    <PublicContext.Provider value={ctx}>
      <div
        className={[s.page, themeFontVariables, fullHeight && s.fullHeight, theme.bg_desktop && s.desktopBg, className].filter(Boolean).join(" ")}
        style={{ ...vars, ...style }}
      >
        <div className={s.sheet}>
        <Main className={s.column}>
          <ProfileHeader profile={profile} theme={theme} />

          {sortedTabs.length > 1 ? (
            <nav className={s.tabs} aria-label="Page sections">
              {sortedTabs.map((t) => {
                const active = t.id === tab?.id;
                return (
                  <a
                    key={t.id}
                    href={basePath + tabQuery(sortedTabs, t)}
                    className={active ? s.tabActive : s.tab}
                    aria-current={active ? "page" : undefined}
                    onClick={(e) => onTabClick(e, t)}
                  >
                    {t.title}
                  </a>
                );
              })}
            </nav>
          ) : null}

          {tree.top.length ? (
            <BlockList blocks={tree.top} childrenOf={tree.children} />
          ) : (
            <p className={s.empty}>Nothing here yet.</p>
          )}

          {profile.socials?.length && profile.socials_position === "bottom" ? <SocialRow socials={profile.socials} /> : null}
        </Main>

        <footer className={s.footer}>
          <Link href="/" target={preview ? "_blank" : undefined} rel="noopener">
            Made with Tautan
          </Link>
        </footer>
        </div>
      </div>
    </PublicContext.Provider>
  );
}
