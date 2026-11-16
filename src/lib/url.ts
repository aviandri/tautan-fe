/**
 * URL rules, mirrored from tautan-be (internal/server/blockdata.go checkURL):
 * http(s) with a host, mailto:, tel:, or a root-relative /uploads/… path.
 */
export function urlError(raw: string | undefined, required: boolean): string | null {
  const s = (raw ?? "").trim();
  if (!s) return required ? "Required" : null;
  if (s.startsWith("/uploads/")) return null;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return "Enter a full URL, like https://example.com";
  }
  const scheme = u.protocol.replace(":", "").toLowerCase();
  if (scheme === "http" || scheme === "https") return u.host ? null : "Enter a full URL, like https://example.com";
  if (scheme === "mailto" || scheme === "tel") return null;
  return "Use an https://, mailto: or tel: link";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_RE = /^([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,}$/;

/** Forgiving input: "example.com" → "https://example.com", "a@b.co" → "mailto:a@b.co". */
export function normalizeUrl(raw: string): string {
  const s = raw.trim();
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith("/")) return s;
  if (EMAIL_RE.test(s)) return `mailto:${s}`;
  if (PHONE_RE.test(s)) return `tel:${s.replace(/[\s-]/g, "")}`;
  if (DOMAIN_RE.test(s) || s.startsWith("www.")) return `https://${s}`;
  return s;
}

/** Short display form: "https://www.example.com/path" → "example.com/path". */
export function prettyUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/^mailto:/, "")
    .replace(/^tel:/, "")
    .replace(/\/$/, "");
}
