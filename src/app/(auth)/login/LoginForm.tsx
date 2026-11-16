"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError, USE_MOCK } from "@/lib/api";
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
      router.replace(safeNext(params.get("next")));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "That email and password don't match."
          : err instanceof ApiError
            ? err.message
            : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 text-[15px] text-muted">Log in to edit your page.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
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
        <Field label="Password">
          {(p) => (
            <Input
              {...p}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={submitting} className="mt-1">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        New to Tautan?{" "}
        <Link href="/signup" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create your page
        </Link>
      </p>
    </>
  );
}
