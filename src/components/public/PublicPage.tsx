"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { Block, Profile, Tab } from "@/lib/types";
import { resolveTheme, themeToCssVars } from "@/lib/theme/resolve";
import { buildTabTree, selectTab, sortTabs, tabQuery } from "@/lib/page-structure";
import { safeImageSrc } from "@/lib/safe-url";
import { trackEvent } from "@/lib/track";
import { themeFontVariables } from "@/lib/theme/fonts";
import { PublicContext } from "./context";
import { BlockRenderer } from "./BlockRenderer";
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
  const vars = useMemo(() => themeToCssVars(resolveTheme(profile.theme)), [profile.theme]);

  // one view per page load (the ref guards React StrictMode's double effect in dev)
  const viewed = useRef(false);
  useEffect(() => {
    if (preview || viewed.current) return;
    viewed.current = true;
    trackEvent(profile.username, { kind: "view" });
  }, [preview, profile.username]);

  const ctx = useMemo(() => ({ username: profile.username, preview }), [profile.username, preview]);
  const basePath = `/${profile.username}`;

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
  const avatar = safeImageSrc(profile.avatar_url);
  const name = profile.display_name || profile.username;

  return (
    <PublicContext.Provider value={ctx}>
      <div
        className={[s.page, themeFontVariables, fullHeight && s.fullHeight, className].filter(Boolean).join(" ")}
        style={{ ...vars, ...style }}
      >
        <Main className={s.column}>
          <header className={s.header}>
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={s.avatar} src={avatar} alt="" width={96} height={96} />
            ) : (
              <div className={s.avatarFallback} aria-hidden>
                {name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <h1 className={s.name}>{name}</h1>
            {profile.bio ? <p className={s.bio}>{profile.bio}</p> : null}
          </header>

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
            tree.top.map((b) => <BlockRenderer key={b.id} block={b} childBlocks={tree.children.get(b.id)} />)
          ) : (
            <p className={s.empty}>Nothing here yet.</p>
          )}
        </Main>

        <footer className={s.footer}>
          <Link href="/" target={preview ? "_blank" : undefined} rel="noopener">
            Made with Tautan
          </Link>
        </footer>
      </div>
    </PublicContext.Provider>
  );
}
