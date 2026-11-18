"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { PasswordField } from "@/components/auth/PasswordField";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError, USE_MOCK } from "@/lib/api";
import { loginErrorMessage } from "@/lib/google-auth";
import { safeNext, useAcceptAuth } from "@/lib/session";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const accept = useAcceptAuth();
  useRedirectIfSignedIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return setError("Enter your email and password.");
    setError(null);
    setSubmitting(true);
    try {
      const r = await api.auth.login({ email: email.trim(), password });
      accept(r);
      router.replace(r.profile.onboarding && !r.profile.onboarding.completed ? "/onboarding" : safeNext(params.get("next")));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? loginErrorMessage(err.status, err.code, err.message)
          : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">Welcome back</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">Log in to edit your page.</p>

      <GoogleButton next={params.get("next")} />

      <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        {USE_MOCK && (
          <Alert tone="info">
            Mock API: <span className="font-mono">demo@tautan.id</span> /{" "}
            <span className="font-mono">password123</span>
          </Alert>
        )}
        <Field label="Email">
          {(p) => (
            <Input
              {...p}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          )}
        </Field>
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" size="lg" loading={submitting} className="mt-1.5">
          Log in
        </Button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        New to Tautan?{" "}
        <Link href="/signup" className="font-bold text-foreground underline underline-offset-2">
          Create your page
        </Link>
      </p>
    </>
  );
}
