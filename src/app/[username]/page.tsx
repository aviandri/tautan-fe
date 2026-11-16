import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { PublicPage } from "@/components/public";
import { ApiError, api } from "@/lib/api";
import { resolveTheme } from "@/lib/theme/resolve";
import { selectTab, tabQuery } from "@/lib/page-structure";
import { safeImageSrc } from "@/lib/safe-url";

type Params = Promise<{ username: string }>;
type Search = Promise<{ tab?: string | string[] }>;

const USERNAME = /^[a-z0-9_.]{1,40}$/i;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

// shared by generateMetadata and the page within one request
const load = cache(async (raw: string) => {
  const username = decodeURIComponent(raw);
  if (!USERNAME.test(username)) return null;
  try {
    return await api.public.page(username.toLowerCase(), {
      next: { revalidate: 15, tags: [`public:${username.toLowerCase()}`] },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params, searchParams }: { params: Params; searchParams: Search }): Promise<Metadata> {
  const { username } = await params;
  const data = await load(username);
  if (!data) return { title: "Page not found", robots: { index: false } };

  const { profile, tabs } = data;
  const sp = await searchParams;
  const tab = selectTab(tabs, typeof sp.tab === "string" ? sp.tab : undefined);
  const name = profile.display_name || profile.username;
  const seoTitle = profile.seo?.title?.trim();
  // a custom SEO title is used exactly as written; otherwise the layout template adds " · Tautan"
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

export async function generateViewport({ params }: { params: Params }): Promise<Viewport> {
  const data = await load((await params).username);
  if (!data) return {};
  const t = resolveTheme(data.profile.theme);
  const solid = t.bg.type === "color" ? t.bg.value : t.bg.value.match(/#[0-9a-f]{3,8}\b/i)?.[0];
  return solid ? { themeColor: solid } : {};
}

export default async function UsernamePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { username } = await params;
  const data = await load(username);
  if (!data) notFound();
  const sp = await searchParams;
  return (
    <PublicPage
      profile={data.profile}
      tabs={data.tabs}
      blocks={data.blocks}
      activeTabSlug={typeof sp.tab === "string" ? sp.tab : null}
      fullHeight
    />
  );
}
