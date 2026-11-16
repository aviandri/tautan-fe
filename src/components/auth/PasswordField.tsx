"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cx, Field, Input } from "@/components/ui";

/** 0–4: length 8+, length 12+, mixed case or digits, a symbol. */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && (/[A-Z]/.test(pw) || /\d/.test(pw))) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw.length < 8 ? Math.min(s, 1) : s;
}

const STRENGTH = ["", "Too short. Use at least 8 characters.", "Okay. A few more characters make it stronger.", "Strong enough. 12 characters or more is even better.", "Strong."];

/** Password input with a show/hide toggle and, for new passwords, a 4-step strength meter. */
export function PasswordField({
  value,
  onChange,
  error,
  autoComplete,
  meter,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  autoComplete: "new-password" | "current-password";
  meter?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const score = meter ? passwordScore(value) : 0;
  return (
    <Field label="Password" error={error} hint={meter && value ? STRENGTH[Math.max(1, score)] : meter ? "At least 8 characters" : undefined}>
      {(p) => (
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Input {...p} type={shown ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className="pr-14" />
            <button
              type="button"
              onClick={() => setShown((v) => !v)}
              aria-pressed={shown}
              aria-label={shown ? "Hide characters" : "Show characters"}
              className="absolute right-1 top-1 inline-flex size-10 items-center justify-center rounded-full text-ink-2 hover:bg-sunken hover:text-foreground"
            >
              {shown ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
            </button>
          </div>
          {meter && (
            <span className="flex gap-1" aria-hidden>
              {[1, 2, 3, 4].map((n) => (
                <i key={n} className={cx("h-1 flex-1 rounded-full transition-colors", n <= score ? (score >= 3 ? "bg-ok" : "bg-warn") : "bg-line")} />
              ))}
            </span>
          )}
        </div>
      )}
    </Field>
  );
}
