import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * URL of a theme font's Latin .woff2, so /[username] can preload exactly the one family its theme
 * uses. next/font can't preload a font chosen at runtime (preload:true would preload all ten on
 * every page), and it doesn't expose file URLs, so we read them once from the built CSS: each
 * next/font face is `@font-face{font-family:<Family>;…src:url(/_next/static/media/…woff2)…;
 * unicode-range:u+00??,…}` (the Latin subset starts with u+00??). Returns undefined in dev or if
 * the format changes: the page just loads the font via CSS as before.
 */
let cache: Map<string, string> | null = null;

function load(): Map<string, string> {
  const map = new Map<string, string>();
  try {
    const dir = join(process.cwd(), process.env.NEXT_DIST_DIR || ".next", "static", "css");
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".css")) continue;
      const css = readFileSync(join(dir, f), "utf8");
      for (const m of css.matchAll(/@font-face\{([^}]*)\}/g)) {
        const body = m[1];
        const family = body.match(/font-family:\s*['"]?([^;'"]+)['"]?;/)?.[1]?.trim();
        const url = body.match(/src:url\((\/_next\/static\/media\/[^)]+\.woff2)\)/)?.[1];
        if (family && url && /unicode-range:u\+00\?\?/.test(body) && !map.has(family)) map.set(family, url);
      }
    }
  } catch {
    // no build output (dev): nothing to preload
  }
  return map;
}

export function latinFontUrl(family: string | undefined): string | undefined {
  if (!family) return undefined;
  cache ??= load();
  return cache.get(family);
}
