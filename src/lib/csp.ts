/**
 * Content-Security-Policy for every page (security audit 2026-11, L3). Shipped as
 * Content-Security-Policy-Report-Only first; enforcement waits until the reports are clean.
 *
 * Why each source is there:
 * - script 'unsafe-inline': Next's inline bootstrap and the Announcement dismiss script. Nonces would
 *   make /[username] dynamic (ISR needs static HTML), so they're not an option on public pages.
 * - googletagmanager / connect.facebook.net: the owner's GA4 and Meta Pixel (runtime-extras, lazy).
 * - img https: owners use image URLs from anywhere (link thumbnails, external images).
 * - frame: the embed allow-list in lib/embeds.ts (YouTube nocookie, Vimeo, Spotify, SoundCloud,
 *   Calendly, Cal.com), loaded after a click.
 * - form-action: checkout posts to the API, which 303s to the provider's hosted page, and browsers
 *   check form-action on that redirect too.
 */
export function contentSecurityPolicy(apiOrigin: string, dev = false): string {
  const api = originOf(apiOrigin);
  const d: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), "https://www.googletagmanager.com", "https://connect.facebook.net"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:", api],
    "media-src": ["'self'", "https:", api],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      api,
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com",
      "https://www.facebook.com",
      "https://connect.facebook.net",
      ...(dev ? ["ws:"] : []),
    ],
    "frame-src": [
      "https://www.youtube-nocookie.com",
      "https://player.vimeo.com",
      "https://open.spotify.com",
      "https://w.soundcloud.com",
      "https://calendly.com",
      "https://cal.com",
      "https://app.cal.com",
    ],
    "form-action": [
      "'self'",
      api,
      "https://checkout.xendit.co",
      "https://checkout-staging.xendit.co",
      "https://app.midtrans.com",
      "https://app.sandbox.midtrans.com",
      "https://checkout.stripe.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'none'"],
    "report-uri": ["/api/csp-report"],
    "report-to": ["csp"],
  };
  return Object.entries(d)
    .map(([k, v]) => `${k} ${[...new Set(v.filter(Boolean))].join(" ")}`)
    .join("; ");
}

function originOf(u: string): string {
  try {
    return new URL(u).origin;
  } catch {
    return "";
  }
}

/** One log line from a CSP report body (report-uri or Reporting API shape), or null. URLs lose their query. */
export function summarizeReport(body: unknown): string | null {
  const reports: Record<string, unknown>[] = [];
  if (Array.isArray(body)) {
    for (const r of body) if (r && typeof r === "object" && (r as { type?: string }).type === "csp-violation") reports.push((r as { body: Record<string, unknown> }).body ?? {});
  } else if (body && typeof body === "object" && "csp-report" in body) {
    reports.push((body as { "csp-report": Record<string, unknown> })["csp-report"] ?? {});
  }
  if (!reports.length) return null;
  return reports
    .slice(0, 5)
    .map((r) => {
      const dir = str(r["effectiveDirective"] ?? r["effective-directive"] ?? r["violated-directive"]);
      const blocked = clean(str(r["blockedURL"] ?? r["blocked-uri"]));
      const doc = clean(str(r["documentURL"] ?? r["document-uri"]));
      const src = clean(str(r["sourceFile"] ?? r["source-file"]));
      return `csp-report-only ${dir} blocked=${blocked} page=${doc}${src ? ` source=${src}` : ""}`;
    })
    .join("\n");
}

const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : "");

/** Drops query and fragment (order pages carry ?t= tokens) and control characters. */
function clean(u: string): string {
  return u.split(/[?#]/)[0].replace(/[\x00-\x1f\x7f]/g, "");
}
