"use client";

import { Eye, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { PhonePreview } from "@/components/editor/preview/Preview";
import { QrCard } from "@/components/qr";
import { SocialsEditor, ThemeEditor } from "@/components/theme";
import { Alert, Button, Card, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { byPosition, errorMessage, useEditorData } from "@/lib/editor/queries";
import { useUpdateProfile } from "@/lib/profile";
import { DEFAULT_THEME } from "@/lib/theme/presets";
import type { Block, Profile, ProfilePatch, Social, Tab, Theme } from "@/lib/types";
import { isTempUsername } from "@/lib/constants";

type Draft = { theme: Theme; socials: Social[]; socials_position: "top" | "bottom" };

const fromProfile = (p: Profile): Draft => ({
  theme: p.theme ?? DEFAULT_THEME,
  socials: p.socials ?? [],
  socials_position: p.socials_position ?? "top",
});

function saveError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "invalid_theme") return `Theme not saved: ${err.message}`;
    if (err.code === "invalid_socials") return `Social icons not saved: ${err.message}`;
    return err.message;
  }
  return "Couldn't save. Check your connection.";
}

/**
 * /dashboard/appearance: theme, header social icons and the QR code. Theme and socials are a
 * local draft (sliders would otherwise PATCH on every step) shown live in the phone preview,
 * saved together with one PATCH /profile.
 */
export function Appearance() {
  const { data, isLoading, error, refetch } = useEditorData();
  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Alert>{error ? errorMessage(error) : "Couldn't load your page."}</Alert>
        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  return <AppearanceInner profile={data.profile} tabs={data.tabs} blocks={data.blocks} />;
}

function AppearanceInner({ profile, tabs: rawTabs, blocks }: { profile: Profile; tabs: Tab[]; blocks: Block[] }) {
  const update = useUpdateProfile();
  const saved = useMemo(() => fromProfile(profile), [profile]);
  const [draft, setDraft] = useState<Draft>(saved);
  const [sheet, setSheet] = useState(false);
  const tabs = useMemo(() => [...rawTabs].sort(byPosition), [rawTabs]);

  const themeDirty = JSON.stringify(draft.theme) !== JSON.stringify(saved.theme);
  const socialsDirty =
    JSON.stringify(draft.socials) !== JSON.stringify(saved.socials) || draft.socials_position !== saved.socials_position;
  const dirty = themeDirty || socialsDirty;

  // Unsaved edits: ask before the tab closes. (In-app links are plain <Link>s; the save bar stays visible.)
  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const save = async () => {
    const patch: ProfilePatch = {};
    if (themeDirty) patch.theme = draft.theme;
    if (socialsDirty) {
      // Rows left empty (an icon added but no handle typed) would fail BE URL validation.
      patch.socials = draft.socials.filter((s) => s.platform === "divider" || s.url.trim());
      patch.socials_position = draft.socials_position;
    }
    try {
      const p = await update.mutateAsync(patch);
      setDraft(fromProfile(p));
      toast.success("Appearance saved");
    } catch (err) {
      toast.error(saveError(err));
    }
  };

  const uploadImage = async (file: File) => (await api.uploads.create(file)).url;
  const previewProfile: Profile = { ...profile, ...draft };
  const preview = <PhonePreview profile={previewProfile} tabs={tabs} blocks={blocks} />;
  const hasAddress = !isTempUsername(profile.username);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pb-28 pt-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:pt-8">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader title="Appearance" description="How your page looks to visitors. Changes show in the preview before you save." />

        <Card className="px-5 py-5 sm:px-6">
          <ThemeEditor value={draft.theme} onChange={(theme) => setDraft((d) => ({ ...d, theme }))} onUploadImage={uploadImage} />
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold">Social icons</h2>
            <p className="mt-0.5 text-sm text-muted">A row of icons linking to your profiles elsewhere.</p>
          </div>
          <div className="px-5 py-5 sm:px-6">
            <SocialsEditor
              socials={draft.socials}
              position={draft.socials_position}
              onChange={(v) => setDraft((d) => ({ ...d, ...v }))}
            />
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4 sm:px-6">
            <h2 className="text-[15px] font-semibold">QR code</h2>
            <p className="mt-0.5 text-sm text-muted">For print, packaging or a slide. Scanning opens your page.</p>
          </div>
          <div className="px-5 py-5 sm:px-6">
            {hasAddress ? (
              <>
                <QrCard username={profile.username} compact />
                {!profile.is_published && (
                  <p className="mt-3 text-sm text-muted">Your page isn&apos;t published yet, so the code leads to a &ldquo;not found&rdquo; page until you publish.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Pick your page address in{" "}
                <Link href="/dashboard/settings" className="font-medium text-foreground underline underline-offset-2">
                  Settings
                </Link>{" "}
                first; the QR code points to it.
              </p>
            )}
          </div>
        </Card>
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-[88px]">
          {preview}
          <p className="mt-4 text-center text-[13px] text-muted">{dirty ? "Preview includes unsaved changes." : "Live preview."}</p>
        </div>
      </aside>

      {/* Save bar: sits above the mobile tab bar (bottom-16) and clears the preview button. */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-[232px]">
          <div role="region" aria-label="Unsaved changes" className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pl-4 pr-2.5 shadow-lg">
            <p className="flex-1 text-sm text-muted">Unsaved changes</p>
            <Button variant="ghost" size="sm" onClick={() => setDraft(saved)} disabled={update.isPending}>
              Discard
            </Button>
            <Button size="sm" onClick={save} loading={update.isPending}>
              Save
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setSheet(true)}
        className={`fixed right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-lg active:translate-y-px xl:hidden ${dirty ? "bottom-36 lg:bottom-24" : "bottom-20 lg:bottom-6"}`}
      >
        <Eye className="size-4" aria-hidden /> Preview
      </button>
      {sheet && (
        <div role="dialog" aria-modal aria-label="Page preview" className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#16150f]/80 px-4 py-6 backdrop-blur-sm xl:hidden">
          <button
            type="button"
            onClick={() => setSheet(false)}
            className="mb-4 inline-flex h-10 items-center gap-1.5 self-end rounded-full bg-white/10 px-4 text-sm font-medium text-white"
          >
            <X className="size-4" aria-hidden /> Close
          </button>
          {preview}
        </div>
      )}
    </div>
  );
}
