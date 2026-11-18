"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";
import { ToggleRow } from "@/components/editor/fields-extra";
import { Alert, Button } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { qk, useLogout } from "@/lib/session";
import type { MeResponse, User } from "@/lib/types";
import { Section } from "./section";

/**
 * Email, sign-in methods and logout. A Google-only account (P2-8) can add a
 * password here; changing an existing one isn't offered yet.
 */
export function AccountSection({ user }: { user: User }) {
  const logout = useLogout();
  const qc = useQueryClient();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const google = user.identities?.includes("google");
  // Older API builds don't send has_password: assume a password exists.
  const needsPassword = user.has_password === false;
  const removedNotice = needsPassword && params.get("notice") === "password_removed";

  // Older API builds omit the flag: hide the toggle rather than guess.
  const notify = user.notify_submissions;
  async function setNotify(v: boolean) {
    const prev = notify;
    qc.setQueryData<MeResponse | null>(qk.me, (m) => (m ? { ...m, user: { ...m.user, notify_submissions: v } } : m));
    try {
      await api.setNotifications({ submissions: v });
      toast.success(v ? "We'll email you about new messages and responses." : "Submission emails are off.");
    } catch {
      qc.setQueryData<MeResponse | null>(qk.me, (m) => (m ? { ...m, user: { ...m.user, notify_submissions: prev } } : m));
      toast.error("Couldn't save. Check your connection.");
    }
  }

  function markHasPassword() {
    qc.setQueryData<MeResponse | null>(qk.me, (m) => (m ? { ...m, user: { ...m.user, has_password: true } } : m));
  }

  async function save() {
    if (password.length < 8) return setError("At least 8 characters");
    if (password.length > 72) return setError("At most 72 characters");
    setError(undefined);
    setSaving(true);
    try {
      await api.setPassword(password);
      markHasPassword();
      setPassword("");
      toast.success("Password added. You can now log in with your email too.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_already_set") {
        markHasPassword();
        toast.success("This account already has a password.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Couldn't save. Check your connection.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      title="Account"
      {...(needsPassword
        ? { onSave: save, dirty: password.length > 0, saving, onReset: () => setPassword("") }
        : {})}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Email</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={logout}>
          Log out
        </Button>
      </div>

      <div>
        <p className="text-sm font-medium">Sign-in methods</p>
        <ul className="mt-1.5 flex flex-wrap gap-2 text-[13px]">
          {google && <li className="rounded-full bg-sunken px-3 py-1 font-medium">Google</li>}
          {!needsPassword && <li className="rounded-full bg-sunken px-3 py-1 font-medium">Email and password</li>}
        </ul>
      </div>

      {notify !== undefined && (
        <ToggleRow
          label="Email me about new submissions"
          hint={
            user.email_verified === false
              ? "Contact messages and form responses. Starts once your email is confirmed."
              : "Contact messages and form responses, sent as they arrive. Reply to answer the visitor."
          }
          checked={notify}
          onChange={setNotify}
        />
      )}

      {needsPassword && (
        <div className="flex flex-col gap-3">
          {removedNotice && (
            <Alert tone="info">
              To keep your account safe, linking Google removed the old password on this account and signed out every
              other device. Add a new password below if you want to log in with your email too.
            </Alert>
          )}
          <p className="text-sm text-muted">Add a password to also log in with your email and password.</p>
          <PasswordField value={password} onChange={setPassword} error={error} autoComplete="new-password" meter />
        </div>
      )}
    </Section>
  );
}
