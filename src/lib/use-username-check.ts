"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import { USERNAME_RE } from "./constants";

export type UsernameStatus =
  | { state: "idle" }
  | { state: "invalid"; message: string }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "unchanged" }
  | { state: "error"; message: string };

/**
 * Live username availability: validates locally, then debounces a call to
 * GET /auth/username-available. Stale responses are aborted.
 * Pass `current` on the settings page so your own username reads as fine.
 */
export function useUsernameCheck(raw: string, { current, delay = 350 }: { current?: string; delay?: number } = {}) {
  const value = raw.trim().toLowerCase();
  const [status, setStatus] = useState<UsernameStatus>({ state: "idle" });

  useEffect(() => {
    if (!value) return setStatus({ state: "idle" });
    if (current && value === current) return setStatus({ state: "unchanged" });
    // same rule and message as UsernameSchema, without pulling zod into the auth pages
    if (!USERNAME_RE.test(value)) return setStatus({ state: "invalid", message: "3–30 chars: lowercase letters, numbers, _ or ." });
    setStatus({ state: "checking" });
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api.auth
        .usernameAvailable(value, ctrl.signal)
        .then((r) => setStatus({ state: r.available ? "available" : "taken" }))
        .catch((e: unknown) => {
          if ((e as Error).name === "AbortError") return;
          setStatus({ state: "error", message: "Couldn't check right now" });
        });
    }, delay);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value, current, delay]);

  return { value, status, ok: status.state === "available" || status.state === "unchanged" };
}
