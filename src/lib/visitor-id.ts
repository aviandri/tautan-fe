/**
 * First-party visitor id for the public page's interactive cards (E2E 2026-11-18 #5). Poll votes
 * and Ask-me rate limits key on it instead of IP + User-Agent, so people sharing a carrier-NAT IP
 * with the same phone model aren't mistaken for one visitor. It is random, stays in this
 * browser's localStorage, and is never tied to an account; analytics don't use it.
 *
 * Storage can be unavailable (private mode, blocked site data): then a per-page-load id is used,
 * which still separates different people and just forgets the voted state on reload.
 */
export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export const VID_KEY = "tautan:vid";
const VID_RE = /^[A-Za-z0-9_-]{16,64}$/;

function randomId(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); // 22 chars, base64url
}

let memoryId: string | null = null;

export function visitorId(store: KV | null): string {
  try {
    const v = store?.getItem(VID_KEY);
    if (v && VID_RE.test(v)) return v;
    const id = randomId();
    store?.setItem(VID_KEY, id);
    if (store) return id;
  } catch {
    // storage blocked: fall through to the in-memory id
  }
  return (memoryId ??= randomId());
}

/** UTC calendar day, matching the BE's one-vote-per-day window. */
export const utcDay = (now = new Date()) => now.toISOString().slice(0, 10);

const pollKey = (blockId: string) => `tautan:poll:${blockId}`;

/** Remember that this browser voted on a poll today (so the card can show it on the next load). */
export function markVoted(store: KV | null, blockId: string, now?: Date) {
  try {
    store?.setItem(pollKey(blockId), utcDay(now));
  } catch {
    /* ignore */
  }
}

/** True when this browser voted on the poll today; a stale (earlier day) record is cleared. */
export function votedToday(store: KV | null, blockId: string, now?: Date): boolean {
  try {
    const d = store?.getItem(pollKey(blockId));
    if (!d) return false;
    if (d === utcDay(now)) return true;
    store?.removeItem(pollKey(blockId));
  } catch {
    /* ignore */
  }
  return false;
}

export function clearVoted(store: KV | null, blockId: string) {
  try {
    store?.removeItem(pollKey(blockId));
  } catch {
    /* ignore */
  }
}

/** localStorage, or null when the browser refuses access. */
export function localStore(): KV | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}
