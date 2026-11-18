import type { GiveawayState } from "./types-p3cd";

/** Toast after POST /giveaways/{id}/draw. */
export function drawToast(s: GiveawayState, notify: boolean): string {
  const who = s.winner?.name || s.winner?.email || "someone";
  if (!notify) return `Winner: ${who}. We didn't email them.`;
  if (s.notified) return `Winner: ${who}. We emailed them that they won.`;
  // Older API builds don't send `notified`; otherwise the owner isn't confirmed or a cap was hit.
  if (s.notified === undefined) return `Winner: ${who}`;
  return `Winner: ${who}. We couldn't email them (confirm your own email first, or try again tomorrow), so contact them yourself.`;
}
