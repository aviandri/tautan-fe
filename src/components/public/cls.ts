/**
 * Class names for the public page's global stylesheet (./public.css): s.btn → "tp-btn".
 * Replaces the CSS module import so no class map ships to the browser. COMPOSES mirrors the old
 * `composes:` rules (a class that pulls in another's styles), generated from public.module.css.
 */
const COMPOSES: Record<string, string[]> = {"avatarFallback": ["avatar"], "tabActive": ["tab"], "faqItem": ["card"], "quote": ["card"], "discount": ["card"], "countdown": ["card"], "sell": ["card"], "sellBtn": ["btn"], "form": ["card"]};

function cls(name: string): string {
  const extra = COMPOSES[name];
  return extra ? [name, ...extra].map((n) => `tp-${n}`).join(" ") : `tp-${name}`;
}

export const s: Record<string, string> = new Proxy({} as Record<string, string>, {
  get: (_, key) => (typeof key === "string" ? cls(key) : undefined),
});
