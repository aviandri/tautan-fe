"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Alert, Button, Field, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { checkNewPassword, resetErrorMessage } from "@/lib/password-reset";
import { homeFor, useAcceptAuth } from "@/lib/session";

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const accept = useAcceptAuth();
  // Read once, then drop the token from the address bar and history.
  const [token] = useState(() => params.get("token") ?? "");
  useEffect(() => {
    if (params.has("token")) window.history.replaceState(null, "", window.location.pathname);
  }, [params]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [dead, setDead] = useState(!token);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fe = checkNewPassword(password, confirm);
    setErrors(fe);
    if (Object.keys(fe).length) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const r = await api.auth.resetPassword({ token, new_password: password });
      accept(r);
      toast.success("Password changed. You're logged in, and other devices were signed out.");
      router.replace(homeFor(r.profile));
    } catch (err) {
      if (err instanceof ApiError && err.code === "invalid_token") setDead(true);
      else setFormError(err instanceof ApiError ? resetErrorMessage(err.code, err.message) : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  if (dead) {
    return (
      <>
        <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">That link has expired</h1>
        <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">{resetErrorMessage("invalid_token", "")}</p>
        <Link
          href="/forgot-password"
          className="mt-7 inline-flex h-14 items-center justify-center rounded-full bg-brand px-7 text-[17px] font-semibold text-brand-ink hover:bg-brand-hover"
        >
          Send a new link
        </Link>
        <p className="mt-4 text-center text-[13px] text-muted">
          <Link href="/login" className="font-bold text-foreground underline underline-offset-2">
            Back to log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">Choose a new password</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">You&apos;ll be logged in, and every other device will be signed out.</p>
      <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}
        <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" meter />
        <Field label="Confirm password" error={errors.confirm}>
          {(p) => (
            <Input {...p} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          )}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-1.5">
          Save and log in
        </Button>
      </form>
    </>
  );
}
