/**
 * Leave guard for pages with unsaved edits (Design). App Router client navigation never fires
 * beforeunload, so in-app links are intercepted instead: a capture-phase click listener calls
 * preventDefault (next/link then skips its navigation) and the page asks first.
 *
 * guardedTarget() decides which clicks count: a plain left click on a same-origin <a> that would
 * load another page in this tab. Modified clicks, new-tab/download links, hash jumps on the same
 * page and external links are left alone (they don't lose the draft, or beforeunload covers them).
 */
export interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
}

export interface AnchorLike {
  href: string;
  target: string;
  hasAttribute(name: string): boolean;
}

/** The in-app path to confirm before leaving, or null when the click should proceed untouched. */
export function guardedTarget(e: ClickLike, a: AnchorLike | null, here: { origin: string; pathname: string; search: string }): string | null {
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  if ((a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
  let url: URL;
  try {
    url = new URL(a.href, here.origin);
  } catch {
    return null;
  }
  if (url.origin !== here.origin) return null; // full page load: beforeunload asks
  if (url.pathname === here.pathname && url.search === here.search) return null; // same page (or a #hash)
  return url.pathname + url.search + url.hash;
}
