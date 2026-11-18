"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

type State = "checking" | "done" | "expired" | "error";

/** Opened from the confirmation email. Works signed in or not, on any device. */
export function VerifyEmail() {
  const params = useSearchParams();
  const started = useRef(false);
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (started.current) return; // StrictMode: tokens are single-use
    started.current = true;
    const token = params.get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) return setState("expired");
    api.auth
      .verifyEmail(token)
      .then(() => setState("done"))
      .catch((e) => setState(e instanceof ApiError && e.code === "invalid_token" ? "expired" : "error"));
  }, [params]);

  const cta = "mt-7 inline-flex h-14 items-center justify-center rounded-full bg-brand px-7 text-[17px] font-semibold text-brand-ink hover:bg-brand-hover";

  if (state === "checking") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
        <Spinner className="size-6" />
        <p className="text-[17px] text-ink-2">Confirming your email…</p>
      </div>
    );
  }
  if (state === "done") {
    return (
      <>
        <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">Email confirmed</h1>
        <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">Thanks. You can publish your page whenever you&apos;re ready.</p>
        <Link href="/dashboard" className={cta}>
          Go to my dashboard
        </Link>
      </>
    );
  }
  return (
    <>
      <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">
        {state === "expired" ? "That link has expired" : "Couldn't confirm your email"}
      </h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">
        {state === "expired"
          ? "Confirmation links work once and for 3 days. Log in and use “Resend link” on your dashboard to get a new one."
          : "Something went wrong on our side. Try the link again in a moment."}
      </p>
      <Link href="/dashboard" className={cta}>
        Go to my dashboard
      </Link>
    </>
  );
}
