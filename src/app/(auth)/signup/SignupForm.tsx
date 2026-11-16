"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { PUBLIC_HOST } from "@/components/brand";
import { Alert, Button, Field, Input, PrefixInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { homeFor, useAcceptAuth } from "@/lib/session";
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

  // Coming from the landing page's "claim your name" box (?u=) reserves the name now;
  // otherwise the username is claimed at the end of onboarding (P2-6).
  const withUsername = params.has("u");
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
    if (withUsername && !check.ok) return;
    setSubmitting(true);
    try {
      const r = await api.auth.signup({ ...parsed.data, ...(withUsername ? { username: check.value } : {}) });
      accept(r);
      router.replace(homeFor(r.profile));
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
      <h1 className="text-[28px] font-semibold tracking-tight">{withUsername ? "Claim your Tautan" : "Create your Tautan"}</h1>
      <p className="mt-2 text-[15px] text-muted">
        {withUsername ? "Your username becomes your page address. You can change it later." : "Free to start. You'll pick your page address at the end of setup."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}

        {withUsername && (
        <Field
          label="Username"
          hint={<UsernameStatusLine status={check.status} host={PUBLIC_HOST} />}
        >
          {(p) => (
            <PrefixInput
              {...p}
              prefix={`${PUBLIC_HOST}/`}
              aria-invalid={check.status.state === "invalid" || check.status.state === "taken"}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus
              className="font-medium"
            />
          )}
        </Field>
        )}

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

        <Button type="submit" size="lg" loading={submitting} disabled={withUsername && !check.ok} className="mt-1">
          {withUsername ? "Create my page" : "Create account"}
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
