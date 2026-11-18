/**
 * Keeps the Design page's unsaved draft in sessionStorage, so the browser's Back/Forward
 * (which the leave guard can't intercept without fighting the App Router) or a crashed tab
 * don't lose it: on return, the draft comes back as unsaved changes.
 *
 * The stored entry remembers the saved state it was based on. If the profile was saved since
 * (another tab, another device), the draft is stale and is dropped rather than overwriting
 * newer work.
 */
type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const key = (profileId: string) => `tautan.design.draft.${profileId}`;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Remember draft (or forget it when it equals saved). */
export function stashDraft<T>(profileId: string, saved: T, draft: T, s: Store | null = store()) {
  try {
    const base = JSON.stringify(saved);
    const d = JSON.stringify(draft);
    if (d === base) s?.removeItem(key(profileId));
    else s?.setItem(key(profileId), JSON.stringify({ base, draft: d }));
  } catch {
    /* storage full or blocked: the leave guard still covers in-app links and reloads */
  }
}

/** Forget the stored draft (an explicit discard). */
export function clearDraft(profileId: string, s: Store | null = store()) {
  try {
    s?.removeItem(key(profileId));
  } catch {
    /* blocked storage: nothing stored */
  }
}

/** The stored draft if it was based on the current saved state and differs from it. */
export function recoverDraft<T>(profileId: string, saved: T, s: Store | null = store()): T | null {
  try {
    const raw = s?.getItem(key(profileId));
    if (!raw) return null;
    const { base, draft } = JSON.parse(raw) as { base: string; draft: string };
    if (base !== JSON.stringify(saved) || draft === base) {
      s?.removeItem(key(profileId));
      return null;
    }
    return JSON.parse(draft) as T;
  } catch {
    return null;
  }
}
