"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { checkEmailChange, requestErrorMessage } from "@/lib/email-change";
import { qk } from "@/lib/session";
import type { MeResponse, User } from "@/lib/types";

/**
 * Email row of the Account section: the address, a pending change (confirm link sent to the new
 * address) and the change form. Lives inside the Section's <form>, so this is a div with type=button
 * controls and its own Enter handling (a nested form would silently drop submit).
 */
export function ChangeEmail({ user, actions }: { user: User; actions: React.ReactNode }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  // Older API builds don't send has_password: assume a password exists (the API decides anyway).
  const needsPassword = user.has_password !== false;
  const pending = user.pending_email ?? null;

  const setPending = (v: string | null) =>
    qc.setQueryData<MeResponse | null>(qk.me, (m) => (m ? { ...m, user: { ...m.user, pending_email: v } } : m));

  function close() {
    setOpen(false);
    setEmail("");
    setPassword("");
    setErrors({});
  }

  async function submit() {
    const fe = checkEmailChange({ email, password, current: user.email, needsPassword });
    setErrors(fe);
    if (Object.keys(fe).length || busy) return;
    setBusy(true);
    try {
      const r = await api.requestEmailChange({ new_email: email.trim(), ...(needsPassword ? { password } : {}) });
      setPending(r.pending_email);
      close();
      toast.success(`Link sent to ${r.pending_email}.`);
    } catch (err) {
      const m = requestErrorMessage(err instanceof ApiError ? err.code : undefined);
      setErrors({ [m.field]: m.text });
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    try {
      await api.cancelEmailChange();
      setPending(null);
      toast.success("Email change cancelled.");
    } catch {
      toast.error("Couldn't cancel. Check your connection.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Email</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!open && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
              Change
            </Button>
          )}
          {actions}
        </div>
      </div>

      {pending && !open && (
        <Alert tone="info">
          <p>
            We sent a link to <strong className="font-semibold">{pending}</strong>. Your email changes once you open it (within 24
            hours).
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
              Send again or use another
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void cancel()}>
              Cancel change
            </Button>
          </div>
        </Alert>
      )}

      {open && (
        <div
          className="flex flex-col gap-3 rounded-2xl bg-sunken p-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
              e.preventDefault();
              void submit();
            }
            if (e.key === "Escape") close();
          }}
        >
          <Field label="New email" error={errors.email}>
            {(p) => <Input {...p} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />}
          </Field>
          {needsPassword && (
            <Field label="Current password" error={errors.password} hint="To make sure it's you.">
              {(p) => (
                <Input {...p} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              )}
            </Field>
          )}
          <p className="text-[13px] text-muted">
            We&apos;ll send a link to the new address. When you open it, your email changes, every device is signed out, and your
            current address gets a note with a way to undo it.
          </p>
          {errors.form && <Alert>{errors.form}</Alert>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <Button type="button" size="sm" loading={busy} onClick={() => void submit()}>
              Send link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
