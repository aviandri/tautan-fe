/**
 * WhatsApp click-to-chat links for the sell cards (product buy, whatsapp order form).
 * Imported by PageRuntime, which loads on every public page: keep it dependency-free.
 * (Order composition with money formatting lives in ./order.ts.)
 */

/** https://wa.me/<digits>?text=…  (E.164 without the "+"). Undefined when the number is unusable. */
export function waLink(e164: string | undefined, text?: string): string | undefined {
  const digits = (e164 ?? "").replace(/[^0-9]/g, "");
  if (digits.length < 8 || digits.length > 15) return undefined;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/**
 * Replace {key} placeholders. A line whose placeholders are all empty and that is left as a bare
 * label ("Address:") is dropped, so an unfilled optional field doesn't send "Address:" on its own.
 */
export function fillTemplate(template: string, vars: Record<string, string | undefined>): string {
  return template
    .split("\n")
    .flatMap((line) => {
      const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      const filled = line.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "");
      const allEmpty = keys.length > 0 && keys.every((k) => !vars[k]);
      return allEmpty && /^[^:]*:\s*$/.test(filled) ? [] : [filled];
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const DEFAULT_PRODUCT_TEMPLATE = "Hi! I'd like to order {name}{variant}.";
