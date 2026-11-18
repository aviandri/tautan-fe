"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { googleErrorMessage, landingAfterGoogle, parseCallbackParams, takeNext } from "@/lib/google-auth";
import { useAcceptAuth } from "@/lib/session";

/**
 * P2-8: Google redirects here with ?code&state (or ?error=…). The code is
 * single-use, so it is redeemed exactly once, even under StrictMode's double effects.
 */
export function GoogleCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const accept = useAcceptAuth();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const p = parseCallbackParams(new URLSearchParams(params.toString()));
    // Drop code/state from the address bar and history either way.
    window.history.replaceState(null, "", window.location.pathname);
    if (p.kind === "error") {
      takeNext();
      setError(p.code);
      return;
    }
    api.auth
      .googleCallback({ code: p.code, state: p.state })
      .then((r) => {
        accept(r);
        router.replace(landingAfterGoogle(r, takeNext()));
      })
      .catch((err) => {
        takeNext();
        setError(err instanceof ApiError ? err.code : "network");
      });
  }, [params, router, accept]);

  if (!error) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
        <Spinner className="size-6" />
        <p className="text-[17px] text-ink-2">Signing you in with Google…</p>
      </div>
    );
  }

  const msg = googleErrorMessage(error);
  return (
    <>
      <h1 className="text-[34px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-[40px]">{msg.title}</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">{msg.body}</p>
      {error !== "provider_disabled" && <GoogleButton divider={false} />}
      <p className="mt-6 text-center text-[13px] text-muted">
        <Link href="/login" className="font-bold text-foreground underline underline-offset-2">
          Log in with email
        </Link>
        {" · "}
        <Link href="/signup" className="font-bold text-foreground underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </>
  );
}
