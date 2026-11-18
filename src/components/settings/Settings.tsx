"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { PUBLIC_HOST } from "@/components/brand";
import { ImageField, TextField } from "@/components/editor/fields";
import { cx, Field, PrefixInput, Spinner, Switch } from "@/components/ui";
import { Section, sectionId, useSection } from "./section";
import { AccountSection } from "./AccountSection";
import { AnnouncementSection } from "./AnnouncementSection";
import { PaymentsSection } from "./PaymentsSection";
import { toast } from "@/components/ui/toast";
import { API_BASE, ApiError, assetUrl } from "@/lib/api";
import { useUpdateProfile } from "@/lib/profile";
import { useSession } from "@/lib/session";
import { PUBLISH_BLOCKED } from "@/lib/verify-email";
import type { PageSettings, Profile, ProfilePatch, User } from "@/lib/types";
import { urlError } from "@/lib/url";
import { compactSettings, LANGUAGES, settingsErrors } from "@/lib/settings";
import { ToggleRow } from "@/components/editor/fields-extra";
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
      case "invalid_settings":
        return err.message.replace(/^\w/, (c) => c.toUpperCase());
      case "username_not_claimed":
        return "Pick your page address before publishing.";
      case "email_unverified":
        return PUBLISH_BLOCKED;
      default:
        return err.message;
    }
  }
  return "Couldn't save. Check your connection.";
}

export function Settings() {
  const { data } = useSession();
  if (!data) return <Spinner />;
  return <SettingsInner profile={data.profile} user={data.user} />;
}

function SettingsInner({ profile, user }: { profile: Profile; user: User }) {
  const update = useUpdateProfile();
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
  const st = profile.settings ?? {};
  const pageOpts = useSection({
    language: st.language ?? "",
    show_share: st.show_share !== false, // on unless explicitly turned off
    show_save_contact: !!st.show_save_contact,
    contact_email: st.contact_email ?? "",
    contact_phone: st.contact_phone ?? "",
  });
  const tracking = useSection({ ga4_id: st.ga4_id ?? "", meta_pixel_id: st.meta_pixel_id ?? "" });
  const optErr = settingsErrors({ ...pageOpts.v, ...tracking.v });
  /**
   * settings is replaced wholesale on PATCH: send the saved object with only this
   * section's values on top (other sections' unsaved edits stay local).
   */
  const saveSettings = (section: string, part: Partial<PageSettings>, msg: string) =>
    save(section, { settings: compactSettings({ ...st, ...part }) }, msg);

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
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 pb-10 pt-2 sm:px-7 lg:flex-row lg:items-start">
      <SettingsNav />
      <div className="grid min-w-0 flex-1 items-start gap-[14px] xl:grid-cols-2">

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
          <p className="flex items-start gap-2 rounded-xl bg-accent px-3.5 py-2.5 text-[13px] text-accent-ink">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              {PUBLIC_HOST}/{profile.username} will keep working: it redirects to your new address, and no one else can take it.
              We keep your last 5 old names. Update links where you can, since printed QR codes and bios will go through the redirect.
            </span>
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

      <AnnouncementSection profile={profile} />

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

      <Section
        title="Page options"
        description="Language and the buttons visitors see on your page."
        dirty={pageOpts.dirty}
        saving={saving === "opts"}
        canSave={!optErr.contact_email && !optErr.contact_phone && !optErr.language}
        onReset={pageOpts.reset}
        onSave={() => saveSettings("opts", pageOpts.v, "Page options saved")}
      >
        <Field label="Page language" hint="Sets the language for screen readers, translation and search engines.">
          {(p) => (
            <select
              {...p}
              value={pageOpts.v.language}
              onChange={(e) => pageOpts.set({ language: e.target.value })}
              className="h-12 w-full rounded-2xl border-0 bg-background px-4 text-[15px] font-medium shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--line-2)] focus:bg-surface focus:shadow-[inset_0_0_0_2px_var(--ink)] focus:outline-none"
            >
              <option value="">Automatic</option>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <ToggleRow
          label="Share button"
          hint="Lets visitors copy or share your page link."
          checked={pageOpts.v.show_share}
          onChange={(show_share) => pageOpts.set({ show_share })}
        />
        <ToggleRow
          label="Save contact button"
          hint="Visitors can add you to their phone contacts (vCard) with your name, photo, link and socials."
          checked={pageOpts.v.show_save_contact}
          onChange={(show_save_contact) => pageOpts.set({ show_save_contact })}
        />
        {pageOpts.v.show_save_contact && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Contact email (optional)"
              value={pageOpts.v.contact_email}
              onChange={(contact_email) => pageOpts.set({ contact_email })}
              placeholder="you@example.com"
              error={optErr.contact_email}
            />
            <TextField
              label="Contact phone (optional)"
              value={pageOpts.v.contact_phone}
              onChange={(contact_phone) => pageOpts.set({ contact_phone })}
              placeholder="+62 812 3456 7890"
              error={optErr.contact_phone}
            />
          </div>
        )}
        {profile.is_published && st.show_save_contact && (
          <a href={`${API_BASE}/public/${profile.username}/vcard`} className="w-fit text-[13px] font-medium text-brand underline-offset-2 hover:underline">
            Download your contact card to check it
          </a>
        )}
      </Section>

      <Section
        title="Tracking"
        description="Send page views to your own analytics. Tautan's built-in Analytics keeps working either way."
        dirty={tracking.dirty}
        saving={saving === "tracking"}
        canSave={!optErr.ga4_id && !optErr.meta_pixel_id}
        onReset={tracking.reset}
        onSave={() => saveSettings("tracking", tracking.v, "Tracking saved")}
      >
        <TextField
          label="Google Analytics 4 measurement ID"
          value={tracking.v.ga4_id}
          onChange={(ga4_id) => tracking.set({ ga4_id: ga4_id.toUpperCase().trim() })}
          placeholder="G-XXXXXXXXXX"
          error={optErr.ga4_id}
          hint="In GA4: Admin → Data streams → your web stream."
        />
        <TextField
          label="Meta Pixel ID"
          value={tracking.v.meta_pixel_id}
          onChange={(meta_pixel_id) => tracking.set({ meta_pixel_id: meta_pixel_id.replace(/\s/g, "") })}
          placeholder="123456789012345"
          error={optErr.meta_pixel_id}
          hint="In Meta Events Manager: Data sources → your pixel."
        />
      </Section>

      <div className="min-w-0 xl:col-span-2">
        <PaymentsSection />
      </div>

      <AccountSection user={user} />
      </div>
    </div>
  );
}

const SECTIONS = ["Profile", "Page address", "Visibility", "Announcement", "Search and sharing", "Page options", "Tracking", "Payments", "Account"];

/** Kartu settings nav: sticky section links on large screens (current one highlighted), chips on phones. */
function SettingsNav() {
  const [current, setCurrent] = useState(sectionId(SECTIONS[0]));
  // after a click, the clicked section wins while the page scrolls there (two columns share the top band)
  const lockUntil = useRef(0);
  useEffect(() => {
    const els = SECTIONS.map((t) => document.getElementById(sectionId(t))).filter((e): e is HTMLElement => !!e);
    // entries only list what changed, so keep the visible set and pick the first in page order
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = SECTIONS.map(sectionId).find((id) => visible.has(id));
        if (first && Date.now() > lockUntil.current) setCurrent(first);
      },
      { rootMargin: "-90px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return (
    <nav aria-label="Settings sections" className="lg:sticky lg:top-[84px] lg:w-[240px] lg:shrink-0">
      <h1 className="px-1 pb-3 text-[32px] font-semibold leading-none tracking-[-0.045em] lg:px-4 lg:pb-4 lg:text-[36px]">Settings</h1>
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {SECTIONS.map((t) => {
          const id = sectionId(t);
          const on = current === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              aria-current={on ? "location" : undefined}
              onClick={() => {
                lockUntil.current = Date.now() + 1200;
                setCurrent(id);
              }}
              className={cx(
                "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors lg:h-11",
                on ? "bg-surface text-foreground shadow-card" : "text-ink-2 hover:bg-sunken hover:text-foreground",
              )}
            >
              {t}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
