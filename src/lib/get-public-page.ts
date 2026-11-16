import "server-only";
import { API_BASE, ApiError, USE_MOCK, api } from "./api";
import type { PublicPageResponse } from "./types";

export type PublicPageResult =
  | { kind: "page"; data: PublicPageResponse }
  | { kind: "moved"; to: string }
  | { kind: "missing" };

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
  const res = await fetch(`${API_BASE}/public/${encodeURIComponent(username)}`, {
    redirect: "manual",
    headers: { Accept: "application/json" },
    // no data cache: Next keeps serving a cached 200 when the refresh comes back as a 301, so a
    // renamed (or unpublished) page would stay up under its old URL. The route renders per request
    // anyway (it reads ?tab), and the API read is one indexed query.
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
