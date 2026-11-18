import "server-only";
import { unstable_cache } from "next/cache";
import { API_BASE, ApiError, USE_MOCK, api } from "./api";
import type { PublicPageResponse } from "./types";

export type PublicPageResult =
  | { kind: "page"; data: PublicPageResponse }
  | { kind: "moved"; to: string }
  | { kind: "missing" };

/**
 * Base URL for this server-side read. API_INTERNAL_URL (server-only, optional) lets a self-hosted
 * FE reach the API over the private network (e.g. http://api:8080 in docker-compose) instead of
 * going out through the public hostname, CDN and TLS. Browsers always use NEXT_PUBLIC_API_URL.
 */
export const SERVER_API_BASE = process.env.API_INTERNAL_URL
  ? `${process.env.API_INTERNAL_URL.replace(/\/$/, "")}/api/v1`
  : API_BASE;

/** Cache tag for one page; POST /api/revalidate (the BE's publish/edit webhook) calls revalidateTag on it. */
export const profileTag = (username: string) => `profile:${username.toLowerCase()}`;

/** Seconds a cached page is served before a background refresh (matches the BE's s-maxage). */
export const PAGE_REVALIDATE = 60;

/**
 * The cached read the ISR route uses. unstable_cache stores our own result union, so a rename (301 →
 * "moved") or an unpublish (404 → "missing") is cached and revalidated exactly like a page: the
 * plain fetch data cache would instead keep serving the last 200 when a refresh came back 301.
 */
export function getPublicPageCached(username: string): Promise<PublicPageResult> {
  const u = username.toLowerCase();
  return unstable_cache(() => getPublicPage(u), ["public-page", u], { tags: [profileTag(u)], revalidate: PAGE_REVALIDATE })();
}

/**
 * GET /public/{username} for the SSR route. Uses redirect:"manual" because a renamed page answers
 * 301 + {redirect_to}, and the route must send the browser to /{new} rather than silently render
 * the new page under the old URL (which a following fetch would do).
 */
export async function getPublicPage(username: string): Promise<PublicPageResult> {
  if (USE_MOCK) {
    try {
      return { kind: "page", data: await api.public.page(username) };
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return { kind: "missing" };
      throw e;
    }
  }
  const res = await fetch(`${SERVER_API_BASE}/public/${encodeURIComponent(username)}`, {
    redirect: "manual",
    headers: { Accept: "application/json" },
    // caching happens one level up (getPublicPageCached), around the whole result
    cache: "no-store",
  });
  if (res.status === 301 || res.status === 308) {
    const body = (await res.json().catch(() => null)) as { redirect_to?: string } | null;
    const fromLocation = res.headers.get("location")?.match(/\/public\/([^/?#]+)/)?.[1];
    const to = body?.redirect_to || (fromLocation ? decodeURIComponent(fromLocation) : "");
    if (/^[a-z0-9_.]{1,40}$/i.test(to)) return { kind: "moved", to };
    return { kind: "missing" };
  }
  if (res.status === 404) return { kind: "missing" };
  if (!res.ok) throw new ApiError(res.status, `http_${res.status}`, `GET /public/${username} failed`);
  return { kind: "page", data: (await res.json()) as PublicPageResponse };
}
