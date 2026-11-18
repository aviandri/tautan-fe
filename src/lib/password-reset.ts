/** Password reset (SPEC.md → "Email and password reset"). Pure helpers for the two pages. */

/** Error copy for POST /auth/password/reset. */
export function resetErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_token":
      return "This reset link has expired or was already used. Ask for a new one below.";
    case "invalid_password":
      return "Use 8 to 72 characters.";
    case "rate_limited":
      return "Too many tries. Wait a few minutes and try again.";
    default:
      return fallback;
  }
}

/** Client-side check matching the API (8–72 characters, both fields equal). */
export function checkNewPassword(pw: string, confirm: string): { password?: string; confirm?: string } {
  if (pw.length < 8) return { password: "At least 8 characters" };
  if (pw.length > 72) return { password: "At most 72 characters" };
  if (pw !== confirm) return { confirm: "The passwords don't match" };
  return {};
}

/** Forgot-password copy after submit: identical whether or not the account exists. */
export const SENT_COPY = (email: string) =>
  `If ${email} has a Tautan account, a reset link is on its way. It works once, for 30 minutes. Check your spam folder if it doesn't arrive in a few minutes.`;
