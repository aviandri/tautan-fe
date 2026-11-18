/** Changing the account email (SPEC.md → "Changing the account email"). Pure helpers. */

export const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;

/** Client-side check before POST /me/email. */
export function checkEmailChange(input: { email: string; password: string; current: string; needsPassword: boolean }): {
  email?: string;
  password?: string;
} {
  const e = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(e)) return { email: "Enter a valid email address." };
  if (e === input.current.toLowerCase()) return { email: "That's already your email." };
  if (input.needsPassword && !input.password) return { password: "Enter your current password." };
  return {};
}

/** Copy for POST /me/email errors; `field` says where to show it. */
export function requestErrorMessage(code: string | undefined): { field: "email" | "password" | "form"; text: string } {
  switch (code) {
    case "invalid_email":
      return { field: "email", text: "Enter a valid email address." };
    case "same_email":
      return { field: "email", text: "That's already your email." };
    case "email_taken":
      return { field: "email", text: "Another account already uses this email." };
    case "invalid_password":
      return { field: "password", text: "That password isn't right." };
    case "rate_limited":
      return { field: "form", text: "We've sent a few links already. Check your inbox, or try again in an hour." };
    default:
      return { field: "form", text: "Couldn't send the link. Check your connection and try again." };
  }
}

/** Copy for the confirm/undo pages when the POST fails. */
export function linkErrorMessage(kind: "confirm" | "revert", code: string | undefined): { title: string; body: string } {
  if (code === "invalid_token") {
    return kind === "confirm"
      ? {
          title: "That link has expired",
          body: "Links to confirm a new email work once, for 24 hours, and only the newest one works. Start the change again in Settings.",
        }
      : {
          title: "That link no longer works",
          body: "Undo links work once, for 7 days, and only while the account still has the email it was changed to. If you can't get into your account, reply to the email you got.",
        };
  }
  if (code === "email_taken") return { title: "That email is taken", body: "Another account started using this email before you confirmed. Pick a different one in Settings." };
  if (code === "rate_limited") return { title: "Too many tries", body: "Wait a few minutes, then open the link again." };
  return { title: "Something went wrong", body: "Try the link again in a moment." };
}
