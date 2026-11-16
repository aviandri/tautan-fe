/** WhatsApp numbers: stored as E.164 with the plus. */
import { E164_RE } from "../constants";

/**
 * Forgiving input → E.164. Local Indonesian forms are the default:
 * "0812-3456-7890" → "+6281234567890", "62812…" → "+62812…", "812…" → "+62812…".
 * Anything starting with "+" keeps its country code. Returns the cleaned string even when invalid.
 */
export function toE164(raw: string, defaultCc = "62"): string {
  const s = raw.trim();
  if (!s) return "";
  const plus = s.startsWith("+") || s.startsWith("00");
  let d = s.replace(/[^0-9]/g, "");
  if (s.startsWith("00")) d = d.slice(2);
  if (plus) return `+${d}`;
  if (d.startsWith("0")) return `+${defaultCc}${d.slice(1)}`;
  if (d.startsWith(defaultCc)) return `+${d}`;
  if (d.startsWith("8")) return `+${defaultCc}${d}`;
  return `+${d}`;
}

export function e164Error(v: string | undefined, required = true): string | null {
  const s = (v ?? "").trim();
  if (!s) return required ? "Add a WhatsApp number" : null;
  return E164_RE.test(s) ? null : "Use a full number, like 0812 3456 7890 or +62 812 3456 7890";
}

/** "+6281234567890" → "+62 812-3456-7890" (display only). */
export function prettyPhone(e164: string): string {
  const m = e164.match(/^\+62(\d{3})(\d{4})(\d+)$/);
  return m ? `+62 ${m[1]}-${m[2]}-${m[3]}` : e164;
}
