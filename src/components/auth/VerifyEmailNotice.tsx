"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, cx } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { qk } from "@/lib/session";
import { resendResult } from "@/lib/verify-email";

/**
 * "Confirm your email to publish" with a resend button. Shown while
 * user.email_verified is false; refetches /me when the tab regains focus so
 * confirming in another tab clears it.
 */
export function VerifyEmailNotice({ email, variant = "banner" }: { email: string; variant?: "banner" | "inline" }) {
  const qc = useQueryClient();
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onFocus = () => void qc.invalidateQueries({ queryKey: qk.me });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [qc]);

  async function resend() {
    setSending(true);
    try {
      const r = await api.resendVerification();
      const m = resendResult({ ok: true, already: r.already_verified });
      toast.success(m.text);
      if (r.already_verified) void qc.invalidateQueries({ queryKey: qk.me });
    } catch (err) {
      toast.error(resendResult({ ok: false, code: err instanceof ApiError ? err.code : undefined }).text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className={cx(
        "flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px]",
        variant === "banner" ? "bg-butter px-4 py-2.5 sm:px-7" : "rounded-[20px] bg-butter p-4",
      )}
    >
      <MailCheck className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        <b>Confirm your email to publish.</b> We sent a link to <span className="font-medium">{email}</span>.
      </p>
      <Button type="button" size="sm" variant="secondary" onClick={resend} loading={sending}>
        Resend link
      </Button>
    </div>
  );
}
