/**
 * Google sign-in (SPEC.md → P2-8). Pure helpers so they can be unit tested;
 * the button and the callback page live in components/auth and app/(auth).
 *
 * Flow: the button navigates to the API's /auth/google/start, Google sends the
 * browser back to /auth/google/callback?code&state (or ?error=…), and that page
 * POSTs code + state to the API, which answers like /auth/login.
 */
import { safeNext } from "./session";

export type CallbackParams =
  | { kind: "ok"; code: string; state: string }
  | { kind: "error"; code: string };

/** Reads Google's (or our API's) redirect parameters. */
export function parseCallbackParams(p: URLSearchParams): CallbackParams {
  const error = p.get("error");
  if (error) return { kind: "error", code: error };
  const code = p.get("code");
  const state = p.get("state");
  if (!code || !state) return { kind: "error", code: "missing_params" };
  return { kind: "ok", code, state };
}

/** Copy for every error the callback page can show. Unknown codes get a generic line. */
export function googleErrorMessage(code: string): { title: string; body: string } {
  switch (code) {
    case "access_denied":
      return { title: "Google sign-in was cancelled", body: "No problem. You can try again, or use your email and password." };
    case "email_not_verified":
      return {
        title: "Your Google email isn't verified",
        body: "Verify your email with Google first, or sign up with email and password instead.",
      };
    case "invalid_state":
    case "invalid_code":
    case "missing_params":
      return { title: "That sign-in link expired", body: "Sign-in links only work once and for a few minutes. Start again from the button below." };
    case "provider_disabled":
      return { title: "Google sign-in is off", body: "Log in with your email and password instead." };
    case "provider_error":
    case "temporarily_unavailable":
    case "server_error":
      return { title: "Google didn't respond", body: "This is usually brief. Try again in a moment." };
    default:
      return { title: "Couldn't sign you in with Google", body: "Try again, or use your email and password." };
  }
}

// Where to land after the round trip: /login?next=… survives via sessionStorage,
// since Google only hands back code and state.
const NEXT_KEY = "tautan.google.next";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null; // storage blocked
  }
}

export function rememberNext(next: string | null, s: Store | null = store()) {
  try {
    if (next) s?.setItem(NEXT_KEY, next);
    else s?.removeItem(NEXT_KEY);
  } catch {
    /* storage full or blocked: fall back to the default landing page */
  }
}

/** Reads and clears the remembered destination (same-origin paths only). */
export function takeNext(s: Store | null = store()): string | null {
  try {
    const v = s?.getItem(NEXT_KEY) ?? null;
    s?.removeItem(NEXT_KEY);
    return v ? safeNext(v) : null;
  } catch {
    return null;
  }
}

/** New or unfinished accounts go to onboarding; others to `next` or the dashboard. */
export function landingAfterGoogle(
  r: { is_new_user?: boolean; profile: { onboarding?: { completed: boolean } | null } },
  next: string | null,
): string {
  if (r.is_new_user || (r.profile.onboarding && !r.profile.onboarding.completed)) return "/onboarding";
  return next ?? "/dashboard";
}
