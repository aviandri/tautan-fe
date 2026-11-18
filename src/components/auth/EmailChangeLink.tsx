"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { linkErrorMessage } from "@/lib/email-change";
import { useAcceptAuth } from "@/lib/session";

type State = { s: "ready" } | { s: "working" } | { s: "done"; email: string } | { s: "failed"; code?: string };

const h1 = "text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]";
const lead = "mt-2.5 text-[17px] leading-relaxed text-ink-2";
const cta = "mt-7 inline-flex h-14 items-center justify-center rounded-full bg-brand px-7 text-[17px] font-semibold text-brand-ink hover:bg-brand-hover";

/**
 * The two links from email-change emails. "confirm" (sent to the new address) runs on open, like
 * /verify-email. "revert" (the undo link sent to the old address) waits for a click, so a mail
 * scanner opening the link can't undo anything. Both sign in and end every other session.
 */
export function EmailChangeLink({ kind }: { kind: "confirm" | "revert" }) {
  const params = useSearchParams();
  const accept = useAcceptAuth();
  const [token] = useState(() => params.get("token") ?? "");
  const [state, setState] = useState<State>(token ? (kind === "confirm" ? { s: "working" } : { s: "ready" }) : { s: "failed", code: "invalid_token" });
  const started = useRef(false);

  useEffect(() => {
    if (params.has("token")) window.history.replaceState(null, "", window.location.pathname);
  }, [params]);

  async function run() {
    if (started.current) return; // StrictMode and double clicks: tokens are single use
    started.current = true;
    setState({ s: "working" });
    try {
      const r = await (kind === "confirm" ? api.auth.confirmEmailChange(token) : api.auth.revertEmailChange(token));
      accept(r);
      setState({ s: "done", email: r.user.email });
    } catch (e) {
      setState({ s: "failed", code: e instanceof ApiError ? e.code : undefined });
    }
  }

  useEffect(() => {
    if (kind === "confirm" && token) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.s === "working") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center" role="status" aria-live="polite">
        <Spinner className="size-6" />
        <p className="text-[17px] text-ink-2">{kind === "confirm" ? "Confirming your new email…" : "Undoing the change…"}</p>
      </div>
    );
  }
  if (state.s === "ready") {
    return (
      <>
        <h1 className={h1}>Undo the email change?</h1>
        <p className={lead}>
          This puts your old email back on your Tautan account and signs out every device, including whoever changed it.
        </p>
        <Button className="mt-7 h-14 px-7 text-[17px]" onClick={() => void run()}>
          Undo the change
        </Button>
      </>
    );
  }
  if (state.s === "done") {
    return kind === "confirm" ? (
      <>
        <h1 className={h1}>Email changed</h1>
        <p className={lead}>
          You now sign in with <strong className="font-semibold text-foreground [overflow-wrap:anywhere]">{state.email}</strong>. We signed out your other devices and let your old address know.
        </p>
        <Link href="/dashboard/settings" className={cta}>
          Go to Settings
        </Link>
      </>
    ) : (
      <>
        <h1 className={h1}>Your email is back</h1>
        <p className={lead}>
          Your account uses <strong className="font-semibold text-foreground [overflow-wrap:anywhere]">{state.email}</strong> again, and every other device is signed out. Someone else may know your password, so reset it now.
        </p>
        <Link href={`/forgot-password?email=${encodeURIComponent(state.email)}`} className={cta}>
          Reset my password
        </Link>
      </>
    );
  }
  const msg = linkErrorMessage(kind, state.code);
  return (
    <>
      <h1 className={h1}>{msg.title}</h1>
      <p className={lead}>{msg.body}</p>
      <Link href="/dashboard/settings" className={cta}>
        Go to Settings
      </Link>
    </>
  );
}
