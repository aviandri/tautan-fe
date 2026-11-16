"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { PUBLIC_HOST } from "@/components/brand";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ImageField, TextField } from "@/components/editor/fields";
import { Button, Card, Field, PrefixInput, Spinner, Switch } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { ApiError, assetUrl } from "@/lib/api";
import { useUpdateProfile } from "@/lib/profile";
import { useLogout, useSession } from "@/lib/session";
import type { Profile, ProfilePatch } from "@/lib/types";
import { urlError } from "@/lib/url";
import { useUsernameCheck } from "@/lib/use-username-check";

const BIO_MAX = 160;
const SEO_TITLE_MAX = 70;
const SEO_DESC_MAX = 160;

function profileError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "username_taken":
        return "That username was just taken. Try another.";
      case "invalid_username":
        return "Usernames use 3–30 lowercase letters, numbers, _ or .";
      case "invalid_avatar_url":
        return "That avatar image URL isn't allowed.";
      case "invalid_seo":
        return "Check the share image URL.";
      default:
        return err.message;
    }
  }
  return "Couldn't save. Check your connection.";
}

/** Shared section wrapper with its own Save button, enabled when dirty. */
function Section({
  title,
  description,
  children,
  dirty,
  saving,
  canSave = true,
  onSave,
  onReset,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  dirty?: boolean;
  saving?: boolean;
  canSave?: boolean;
  onSave?: () => void;
  onReset?: () => void;
}) {
  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave?.();
        }}
      >
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">{children}</div>
        {onSave && (
          <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3 sm:px-6">
            {dirty && onReset && (
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                Discard
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!dirty || !canSave} loading={saving}>
              Save
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

/**
 * Section-local edits. `saved` is derived from the live profile, so after a
 * successful save the section is clean again without remounting (and other
 * sections keep their unsaved edits).
 */
function useSection<T extends object>(saved: T) {
  const [v, setV] = useState(saved);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  return { v, set: (p: Partial<T>) => setV((x) => ({ ...x, ...p })), reset: () => setV(saved), dirty };
}

export function Settings() {
  const { data } = useSession();
  if (!data) return <Spinner />;
  return <SettingsInner profile={data.profile} email={data.user.email} />;
}

function SettingsInner({ profile, email }: { profile: Profile; email: string }) {
  const update = useUpdateProfile();
  const logout = useLogout();
  const [saving, setSaving] = useState<string | null>(null);

  const basics = useSection({
    display_name: profile.display_name,
    bio: profile.bio,
    avatar_url: profile.avatar_url ?? "",
  });
  const addr = useSection({ username: profile.username });
  const seo = useSection({
    title: profile.seo.title ?? "",
    description: profile.seo.description ?? "",
    image_url: profile.seo.image_url ?? "",
  });
  const check = useUsernameCheck(addr.v.username, { current: profile.username });

  function save(section: string, patch: ProfilePatch, msg: string) {
    setSaving(section);
    update.mutate(patch, {
      onSuccess: () => toast.success(msg),
      onError: (e) => toast.error(profileError(e)),
      onSettled: () => setSaving(null),
    });
  }

  const avatarErr = urlError(basics.v.avatar_url, false);
  const seoImgErr = urlError(seo.v.image_url, false);
  const shareTitle = seo.v.title || profile.display_name || `@${profile.username}`;
  const shareDesc = seo.v.description || profile.bio || `Links from ${profile.display_name || profile.username}`;
  const shareImg = assetUrl(seo.v.image_url || basics.v.avatar_url);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Settings" description="Your profile, page address, visibility and how your link looks when shared." />

      <Section
        title="Profile"
        description="Shown at the top of your page."
        dirty={basics.dirty}
        saving={saving === "basics"}
        canSave={!avatarErr && basics.v.bio.length <= BIO_MAX}
        onReset={basics.reset}
        onSave={() =>
          save(
            "basics",
            {
              display_name: basics.v.display_name.trim(),
              bio: basics.v.bio.trim(),
              avatar_url: basics.v.avatar_url.trim() || null,
            },
            "Profile saved",
          )
        }
      >
        <ImageField
          label="Avatar"
          shape="round"
          allowUrl={false}
          value={basics.v.avatar_url}
          onChange={(avatar_url) => basics.set({ avatar_url })}
          error={avatarErr ?? undefined}
        />
        <TextField
          label="Display name"
          value={basics.v.display_name}
          onChange={(display_name) => basics.set({ display_name })}
          placeholder={profile.username}
          maxLength={60}
        />
        <TextField
          label="Bio"
          multiline
          value={basics.v.bio}
          onChange={(bio) => basics.set({ bio })}
          placeholder="A line about you or what you make"
          maxLength={BIO_MAX}
          hint={`${basics.v.bio.length}/${BIO_MAX}`}
        />
      </Section>

      <Section
        title="Page address"
        dirty={addr.dirty}
        saving={saving === "addr"}
        canSave={check.status.state === "available"}
        onReset={addr.reset}
        onSave={() => save("addr", { username: check.value }, "Username changed")}
      >
        <Field label="Username" hint={<UsernameStatusLine status={check.status} host={PUBLIC_HOST} />}>
          {(p) => (
            <PrefixInput
              {...p}
              prefix={`${PUBLIC_HOST}/`}
              aria-invalid={check.status.state === "invalid" || check.status.state === "taken"}
              value={addr.v.username}
              onChange={(e) => addr.set({ username: e.target.value.toLowerCase().replace(/\s/g, "") })}
              autoCapitalize="none"
              spellCheck={false}
              className="font-medium"
            />
          )}
        </Field>
        {addr.dirty && (
          <p className="flex items-start gap-2 rounded-xl bg-accent/10 px-3.5 py-2.5 text-[13px] text-[#8a3f17]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Links and QR codes that point to {PUBLIC_HOST}/{profile.username} will stop working.
          </p>
        )}
      </Section>

      <Section title="Visibility">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">{profile.is_published ? "Your page is public" : "Your page is a draft"}</p>
            <p className="mt-0.5 text-sm text-muted">
              {profile.is_published
                ? `Anyone with the link can see ${PUBLIC_HOST}/${profile.username}.`
                : "Visitors get a “page not found” until you publish."}
            </p>
          </div>
          <Switch
            label="Publish page"
            checked={profile.is_published}
            disabled={update.isPending}
            onChange={(v) =>
              update.mutate({ is_published: v }, { onError: (e) => toast.error(profileError(e)) })
            }
          />
        </div>
      </Section>

      <Section
        title="Search and sharing"
        description="Controls the title, description and image shown in search results and link previews."
        dirty={seo.dirty}
        saving={saving === "seo"}
        canSave={!seoImgErr}
        onReset={seo.reset}
        onSave={() => {
          const s = {
            ...(seo.v.title.trim() ? { title: seo.v.title.trim() } : {}),
            ...(seo.v.description.trim() ? { description: seo.v.description.trim() } : {}),
            ...(seo.v.image_url.trim() ? { image_url: seo.v.image_url.trim() } : {}),
          };
          save("seo", { seo: s }, "Sharing settings saved");
        }}
      >
        <TextField
          label="Title"
          value={seo.v.title}
          onChange={(title) => seo.set({ title })}
          placeholder={profile.display_name || profile.username}
          maxLength={SEO_TITLE_MAX}
          hint={`${seo.v.title.length}/${SEO_TITLE_MAX}`}
        />
        <TextField
          label="Description"
          multiline
          value={seo.v.description}
          onChange={(description) => seo.set({ description })}
          placeholder={profile.bio || "What visitors will find on your page"}
          maxLength={SEO_DESC_MAX}
          hint={`${seo.v.description.length}/${SEO_DESC_MAX}`}
        />
        <ImageField
          label="Share image"
          value={seo.v.image_url}
          onChange={(image_url) => seo.set({ image_url })}
          error={seoImgErr ?? undefined}
          allowUrl={false}
        />
        <div>
          <p className="mb-2 text-[13px] font-medium">Preview</p>
          <div className="overflow-hidden rounded-xl border border-line bg-background">
            {shareImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shareImg} alt="" className="aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="flex aspect-[1.91/1] items-center justify-center bg-brand text-3xl font-semibold text-brand-ink">
                {shareTitle}
              </div>
            )}
            <div className="px-4 py-3">
              <p className="text-[12px] uppercase tracking-wide text-muted">{PUBLIC_HOST}</p>
              <p className="mt-0.5 truncate text-[15px] font-semibold">{shareTitle}</p>
              <p className="line-clamp-2 text-sm text-muted">{shareDesc}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Account">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted">{email}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Log out
          </Button>
        </div>
      </Section>
    </div>
  );
}
