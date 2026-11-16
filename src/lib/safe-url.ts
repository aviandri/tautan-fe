import { assetUrl } from "./api";

const ALLOWED = new Set(["http:", "https:", "mailto:", "tel:"]);

/** Returns the URL if it uses a safe scheme, else undefined. Bare domains get https://. */
export function safeHref(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  if (!v) return undefined;
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return ALLOWED.has(u.protocol) ? u.toString() : undefined;
  } catch {
    // "example.com/foo" -> https://example.com/foo
    if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(v)) return `https://${v}`;
    return undefined;
  }
}

/**
 * Image sources: http(s), blob: (a fresh upload in the editor), or an API path like
 * /uploads/x.png, which is resolved against the API origin.
 */
export function safeImageSrc(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim();
  if (v.startsWith("blob:")) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return assetUrl(v);
  const h = safeHref(v);
  return h && h.startsWith("http") ? h : undefined;
}
