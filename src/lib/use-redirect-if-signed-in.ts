"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { safeNext, useSession } from "./session";

/** On /login and /signup: send already-signed-in users on to the dashboard. */
export function useRedirectIfSignedIn() {
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  useEffect(() => {
    if (session.data) router.replace(safeNext(params.get("next")));
  }, [session.data, router, params]);
}
