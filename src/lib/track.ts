import type { EventKind } from "./types";

// Standalone on purpose (no import of api.ts): this runs on every public page view, and api.ts
// brings the session/refresh machinery the visitor never needs.
const API_BASE = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "")}/api/v1`;
const USE_MOCK = process.env.NEXT_PUBLIC_API_MOCK === "1";

export interface TrackPayload {
  kind: EventKind;
  block_id?: string;
  /** P3: what a click did, e.g. "buy", "copy", "wa_order", "marketplace:shopee" (BE regex ^[a-z][a-z_]{0,23}(:[a-z0-9_]{1,32})?$) */
  action?: string;
}

/**
 * Fire-and-forget view/click event from the public page.
 *
 * - navigator.sendBeacon with a text/plain body: survives the navigation a click starts, and is a
 *   CORS "simple" request (no preflight). The BE decodes the JSON whatever the Content-Type.
 *   Falls back to fetch(keepalive) where sendBeacon is missing or refuses the payload.
 * - no credentials: a visitor has no session.
 * - `referrer` in the body: the request's own Referer is the Tautan page, so only document.referrer
 *   says where the visitor came from.
 * - `page_url` (location.href): cross-origin requests cut the Referer down to the origin, so this is
 *   the only way the BE sees utm_source/utm_medium/utm_campaign (SPEC, Analytics v2).
 */
export function trackEvent(username: string, { kind, block_id, action }: TrackPayload): void {
  if (typeof window === "undefined") return;
  if (USE_MOCK) {
    import("./api").then(({ api }) => api.public.event(username, { kind, block_id }).catch(() => {}));
    return;
  }
  const body = JSON.stringify({
    kind,
    block_id,
    meta: action ? { action } : undefined,
    referrer: document.referrer || undefined,
    page_url: window.location.href,
  });
  const url = `${API_BASE}/public/${encodeURIComponent(username)}/events`;
  try {
    if (navigator.sendBeacon?.(url, new Blob([body], { type: "text/plain;charset=UTF-8" }))) return;
  } catch {
    // fall through
  }
  fetch(url, { method: "POST", keepalive: true, headers: { "Content-Type": "text/plain;charset=UTF-8" }, body }).catch(() => {});
}

/** Run once the page has finished loading (so beacons and tags never compete with the first paint). */
export function afterLoad(fn: () => void): void {
  if (document.readyState === "complete") setTimeout(fn, 0);
  else window.addEventListener("load", () => setTimeout(fn, 0), { once: true });
}
