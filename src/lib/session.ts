"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { api, refreshAccessToken, tokenStore } from "./api";
import type { AuthResponse, MeResponse } from "./types";

export const qk = {
  me: ["me"] as const,
  editor: ["editor"] as const,
  submissions: ["contact-submissions"] as const,
  analytics: (range: string) => ["analytics", range] as const,
};

/**
 * The access token lives in memory, so after a reload we have none: try the
 * refresh cookie once, then load /me. Resolves to null when signed out.
 */
async function loadSession(): Promise<MeResponse | null> {
  const token = tokenStore.get() ?? (await refreshAccessToken());
  if (!token) return null;
  try {
    return await api.me();
  } catch {
    return null;
  }
}

export function useSession() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: qk.me,
    queryFn: loadSession,
    staleTime: Infinity,
    retry: false,
  });

  // A failed refresh anywhere (token set to null) means we're signed out.
  useEffect(
    () =>
      tokenStore.subscribe((t) => {
        if (!t && qc.getQueryData(qk.me)) qc.setQueryData(qk.me, null);
      }),
    [qc],
  );

  return query;
}

/** Use in protected layouts: redirects to /login?next=… when signed out. */
export function useRequireSession() {
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (session.isSuccess && !session.data) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [session.isSuccess, session.data, router, pathname]);
  return session;
}

/** Store the result of signup/login so the dashboard renders without a refetch. */
export function useAcceptAuth() {
  const qc = useQueryClient();
  return useCallback(
    (r: AuthResponse) => {
      qc.setQueryData<MeResponse>(qk.me, { user: r.user, profile: r.profile });
    },
    [qc],
  );
}

export function useLogout() {
  return useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Token is cleared regardless; the cookie expires on its own.
    }
    // Hard navigation: drops every cached query and in-memory state, and avoids
    // the guard racing us to /login?next=….
    window.location.assign("/login");
  }, []);
}

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null | undefined, fallback = "/dashboard") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
