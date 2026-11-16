import { cache } from "react";
import { preload } from "react-dom";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { PublicPageView } from "@/components/public/PublicPageView";
import { getPublicPageCached } from "@/lib/get-public-page";
import { resolveTheme } from "@/lib/theme/resolve";
import { selectTab, tabQuery } from "@/lib/page-structure";
import { safeImageSrc } from "@/lib/safe-url";
import { findFont } from "@/lib/theme/fonts-meta";
import { latinFontUrl } from "@/lib/font-preload";

// Shared by /[username] and /[username]/t/[tab] (the middleware rewrites ?tab=… to the latter),
// so each tab is its own statically cached (ISR) page and the route never reads searchParams.

const USERNAME = /^[a-z0-9_.]{1,40}$/i;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// shared by generateMetadata, generateViewport and the page within one render
const loadResult = cache(async (raw: string) => {
  const username = decodeURIComponent(raw);
  if (!USERNAME.test(username)) return { kind: "missing" as const };
  return getPublicPageCached(username);
});
const load = async (raw: string) => {
  const r = await loadResult(raw);
  return r.kind === "page" ? r.data : null;
};

export async function pageMetadata(rawUsername: string, tabSlug: string | null): Promise<Metadata> {
  const data = await load(rawUsername);
  if (!data) return { title: "Page not found", robots: { index: false } };

  const { profile, tabs } = data;
  const tab = tabSlug ? selectTab(tabs, tabSlug) : undefined;
  const name = profile.display_name || profile.username;
  const seoTitle = profile.seo?.title?.trim();
  // a custom SEO title is used exactly as written
  const title = seoTitle || `${name} · Tautan`;
  const description = profile.seo?.description?.trim() || profile.bio?.trim() || `${name}'s links on Tautan.`;
  const image = safeImageSrc(profile.seo?.image_url) ?? safeImageSrc(profile.avatar_url);
  const url = `${SITE_URL}/${profile.username}`;
  const absImage = image ? new URL(image, SITE_URL).toString() : undefined;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      title,
      description,
      url: tab ? url + tabQuery(tabs, tab) : url,
      siteName: "Tautan",
      images: absImage ? [{ url: absImage }] : undefined,
      username: profile.username,
    },
    twitter: {
      card: absImage && profile.seo?.image_url ? "summary_large_image" : "summary",
      title,
      description,
      images: absImage ? [absImage] : undefined,
    },
  };
}

export async function pageViewport(rawUsername: string): Promise<Viewport> {
  const data = await load(rawUsername);
  if (!data) return {};
  const t = resolveTheme(data.profile.theme);
  const solid = t.bg.type === "color" ? t.bg.value : t.bg.value.match(/#[0-9a-f]{3,8}\b/i)?.[0];
  return solid ? { themeColor: solid } : {};
}

export async function renderPage(rawUsername: string, tabSlug: string | null) {
  const result = await loadResult(rawUsername);
  if (result.kind === "moved") {
    // renamed page: the old name redirects permanently to the new one (keeping the tab)
    permanentRedirect(`/${result.to}${tabSlug ? `?tab=${encodeURIComponent(tabSlug)}` : ""}`);
  }
  if (result.kind !== "page") notFound();
  const data = result.data;
  // the theme's body font is otherwise found only after the CSS is parsed
  const t = resolveTheme(data.profile.theme);
  const font = latinFontUrl(findFont(t.fonts?.body ?? t.font)?.label);
  if (font) preload(font, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <>
      <PublicPageView
        profile={data.profile}
        tabs={data.tabs}
        blocks={data.blocks}
        media={data.media}
        activeTabSlug={tabSlug}
        fullHeight
      />
    </>
  );
}
