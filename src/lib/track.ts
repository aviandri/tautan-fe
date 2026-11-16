import { API_BASE, USE_MOCK, api } from "./api";
import type { EventKind } from "./types";

/**
 * Fire-and-forget view/click event from the public page.
 *
 * Not api.public.event, because this needs:
 * - `keepalive`, so a click that navigates away still gets recorded
 * - no `credentials: "include"` (a visitor has no session, and it keeps CORS simple)
 * - `referrer` in the body: the request's own Referer header is the Tautan page, so only
 *   document.referrer says where the visitor came from (proposed SPEC change; BE ignores it until then)
 */
export function trackEvent(username: string, payload: { kind: EventKind; block_id?: string }): void {
  if (typeof window === "undefined") return;
  if (USE_MOCK) {
    api.public.event(username, payload).catch(() => {});
    return;
  }
  const body = { ...payload, referrer: document.referrer || undefined };
  fetch(`${API_BASE}/public/${encodeURIComponent(username)}/events`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}
