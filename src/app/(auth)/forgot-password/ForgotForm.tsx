"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { SENT_COPY } from "@/lib/password-reset";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ForgotForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) return setError("Enter the email you signed up with.");
    setError(null);
    setSubmitting(true);
    try {
      await api.auth.forgotPassword(v);
      setSentTo(v);
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "rate_limited"
          ? "Too many requests. Wait a few minutes and try again."
          : "Something went wrong. Try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <>
        <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">Check your email</h1>
        <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2" role="status">
          {SENT_COPY(sentTo)}
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <Button type="button" variant="secondary" size="lg" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
        </div>
        <p className="mt-4 text-center text-[13px] text-muted">
          Remembered it?{" "}
          <Link href="/login" className="font-bold text-foreground underline underline-offset-2">
            Log in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">Forgot your password?</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">
        Enter your account email and we&apos;ll send you a link to choose a new one.
      </p>
      <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Email">
          {(p) => (
            <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
          )}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-1.5">
          Send reset link
        </Button>
      </form>
      <p className="mt-4 text-center text-[13px] text-muted">
        <Link href="/login" className="font-bold text-foreground underline underline-offset-2">
          Back to log in
        </Link>
      </p>
    </>
  );
}
