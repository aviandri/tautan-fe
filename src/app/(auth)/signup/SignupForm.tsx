"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { PUBLIC_HOST } from "@/components/brand";
import { Alert, Button, Field, Input } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAcceptAuth } from "@/lib/session";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { useUsernameCheck } from "@/lib/use-username-check";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters").max(72, "At most 72 characters"),
});

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const accept = useAcceptAuth();
  useRedirectIfSignedIn();

  const [username, setUsername] = useState(params.get("u") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"email" | "password", string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const check = useUsernameCheck(username);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const fe: typeof errors = {};
      for (const i of parsed.error.issues) fe[i.path[0] as "email" | "password"] ??= i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    if (!check.ok) return;
    setSubmitting(true);
    try {
      const r = await api.auth.signup({ ...parsed.data, username: check.value });
      accept(r);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.code === "email_taken") {
        setErrors({ email: "That email already has an account." });
      } else if (err instanceof ApiError && err.code === "username_taken") {
        setFormError("Someone just took that username. Try another.");
      } else {
        setFormError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight">Claim your Tautan</h1>
      <p className="mt-2 text-[15px] text-muted">Pick a username. You can change it later.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}

        <Field
          label="Username"
          hint={<UsernameStatusLine status={check.status} host={PUBLIC_HOST} />}
        >
          {(p) => (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-[15px] text-muted">
                {PUBLIC_HOST}/
              </span>
              <Input
                {...p}
                aria-invalid={check.status.state === "invalid" || check.status.state === "taken"}
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                style={{ paddingLeft: `calc(0.875rem + ${PUBLIC_HOST.length + 1}ch)` }}
                className="font-medium"
              />
            </div>
          )}
        </Field>

        <Field label="Email" error={errors.email}>
          {(p) => (
            <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          )}
        </Field>

        <Field label="Password" error={errors.password} hint="At least 8 characters">
          {(p) => (
            <Input
              {...p}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          )}
        </Field>

        <Button type="submit" size="lg" loading={submitting} disabled={!check.ok} className="mt-1">
          Create my page
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
