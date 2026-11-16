"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { PUBLIC_HOST } from "@/components/brand";
import { Link2 } from "lucide-react";
import { PasswordField } from "@/components/auth/PasswordField";
import { Alert, Button, Field, Input, PrefixInput } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { homeFor, useAcceptAuth } from "@/lib/session";
import { useRedirectIfSignedIn } from "@/lib/use-redirect-if-signed-in";
import { useUsernameCheck } from "@/lib/use-username-check";

const EMAIL_RE = /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/;
/** Same rules as before (no zod here: it would ship the whole schema library with this page). */
function check(email: string, password: string) {
  const e: Partial<Record<"email" | "password", string>> = {};
  if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email";
  if (password.length < 8) e.password = "At least 8 characters";
  else if (password.length > 72) e.password = "At most 72 characters";
  return e;
}

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
  const usernameCheck = useUsernameCheck(username);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const fe = check(email, password);
    if (Object.keys(fe).length) {
      setErrors(fe);
      return;
    }
    setErrors({});
    if (withUsername && !usernameCheck.ok) return;
    setSubmitting(true);
    try {
      const r = await api.auth.signup({ email: email.trim(), password, ...(withUsername ? { username: usernameCheck.value } : {}) });
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
      <h1 className="text-[40px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[48px]">{withUsername ? "Claim your Tautan" : "Create your Tautan account"}</h1>
      <p className="mt-2.5 text-[17px] leading-relaxed text-ink-2">
        {withUsername ? "Your username becomes your page address. You can change it later." : "Email and a password for now. You choose your page address at the end."}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
        {formError && <Alert>{formError}</Alert>}

        {withUsername && (
        <Field
          label="Username"
          hint={<UsernameStatusLine status={usernameCheck.status} host={PUBLIC_HOST} />}
        >
          {(p) => (
            <PrefixInput
              {...p}
              prefix={`${PUBLIC_HOST}/`}
              aria-invalid={usernameCheck.status.state === "invalid" || usernameCheck.status.state === "taken"}
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

        <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="new-password" meter />

        <Button type="submit" size="lg" loading={submitting} disabled={withUsername && !usernameCheck.ok} className="mt-1.5">
          {withUsername ? "Create my page" : "Create account"}
        </Button>
      </form>

      <p className="mt-4 text-center text-[13px] text-muted">
        Already have a page?{" "}
        <Link href="/login" className="font-bold text-foreground underline underline-offset-2">
          Log in
        </Link>
      </p>
      {!withUsername && (
        <div className="mt-6 flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 shadow-[0_0_0_1px_var(--line)]">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-mint">
            <Link2 className="size-5" aria-hidden />
          </span>
          <p className="text-[15px] leading-snug">
            <b>Moving from another link page?</b> <span className="text-muted">Paste it on the next screen and we copy everything over.</span>
          </p>
        </div>
      )}
    </>
  );
}
