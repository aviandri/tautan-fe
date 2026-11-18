/** Email verification (SPEC.md → "Email verification"). Pure helpers. */

export const PUBLISH_BLOCKED = "Confirm your email to publish. We sent you a link; check your inbox (and spam).";

/** True only when the API says so; older API builds omit the field. */
export const isUnverified = (user: { email_verified?: boolean } | null | undefined) => user?.email_verified === false;

/** Toast/inline copy after POST /me/verification-email. */
export function resendResult(r: { ok: true; already?: boolean } | { ok: false; code?: string }): { tone: "success" | "error"; text: string } {
  if (r.ok) return r.already ? { tone: "success", text: "Your email is already confirmed." } : { tone: "success", text: "Sent. Check your inbox for the new link." };
  if (r.code === "rate_limited") return { tone: "error", text: "We've sent a few already. Check your inbox, or try again in an hour." };
  return { tone: "error", text: "Couldn't send the link. Try again." };
}
