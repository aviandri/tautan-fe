"use client";

import { Eye, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLeaveGuard } from "@/components/ui/leave-guard";
import { clearDraft, recoverDraft, stashDraft } from "@/lib/appearance/draft-store";
import { PhonePreview } from "@/components/editor/preview/Preview";
import { QrCard } from "@/components/qr";
import { Group, SocialsEditor, ThemeEditor } from "@/components/theme";
import { PublicPage } from "@/components/public";
import { Alert, Button, Spinner } from "@/components/ui";
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
  // Back/Forward can't be intercepted (leave guard), so the draft survives in sessionStorage.
  const [restored] = useState(() => recoverDraft(profile.id, saved));
  const [draft, setDraft] = useState<Draft>(restored ?? saved);
  const [sheet, setSheet] = useState(false);
  const tabs = useMemo(() => [...rawTabs].sort(byPosition), [rawTabs]);

  const themeDirty = JSON.stringify(draft.theme) !== JSON.stringify(saved.theme);
  const socialsDirty =
    JSON.stringify(draft.socials) !== JSON.stringify(saved.socials) || draft.socials_position !== saved.socials_position;
  const dirty = themeDirty || socialsDirty;

  useEffect(() => {
    if (restored) toast.success("Restored your unsaved design changes. Save or discard them.");
  }, [restored]);
  useEffect(() => stashDraft(profile.id, saved, draft), [profile.id, saved, draft]);

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const save = async (): Promise<boolean> => {
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
      return true;
    } catch (err) {
      toast.error(saveError(err));
      return false;
    }
  };
  // Unsaved edits: ask before reloading/closing the tab and before in-app navigation (E2E #4).
  // An explicit "Discard changes" also forgets the stashed draft (it would come back otherwise).
  const leaveGuard = useLeaveGuard(dirty, save, () => clearDraft(profile.id));

  const uploadImage = async (file: File) => (await api.uploads.create(file)).url;
  const previewProfile: Profile = { ...profile, ...draft };
  const hasAddress = !isTempUsername(profile.username);
  const changes = countChanges(saved, draft);

  const saveBar = (
    <div role="region" aria-label="Unsaved changes" className="flex w-full items-center gap-2.5 rounded-full bg-surface py-2.5 pl-[18px] pr-2.5 shadow-lift">
      <p className="flex-1 text-sm font-semibold">
        {changes} unsaved change{changes === 1 ? "" : "s"}
      </p>
      <Button variant="secondary" size="sm" onClick={() => setDraft(saved)} disabled={update.isPending}>
        Discard
      </Button>
      <Button variant="dark" size="sm" onClick={() => void save()} loading={update.isPending}>
        Save design
      </Button>
    </div>
  );

  return (
    <div className="mx-auto flex max-w-[1440px] flex-wrap gap-4 px-4 pb-32 pt-4 sm:px-6 xl:pb-6">
      <h1 className="sr-only">Design</h1>
      <section aria-label="Design controls" className="grid min-w-0 flex-[1_1_640px] content-start gap-3 md:grid-cols-2">
        <ThemeEditor value={draft.theme} onChange={(theme) => setDraft((d) => ({ ...d, theme }))} onUploadImage={uploadImage} />

        <Group title="Social icons" wide>
          <SocialsEditor socials={draft.socials} position={draft.socials_position} onChange={(v) => setDraft((d) => ({ ...d, ...v }))} />
        </Group>

        <Group title="QR code" wide>
          <p className="-mt-1 text-sm text-muted">For print, packaging or a slide. Scanning opens your page.</p>
          {hasAddress ? (
            <>
              <QrCard username={profile.username} compact />
              {!profile.is_published && <p className="text-sm text-muted">Your page isn&apos;t published yet, so the code leads to a &ldquo;not found&rdquo; page until you publish.</p>}
            </>
          ) : (
            <p className="text-sm text-muted">
              Pick your page address in{" "}
              <Link href="/dashboard/settings" className="font-semibold text-foreground underline underline-offset-2">
                Settings
              </Link>{" "}
              first; the QR code points to it.
            </p>
          )}
        </Group>
      </section>

      <aside aria-label="Live preview" className="relative hidden min-w-[340px] flex-[0_1_440px] flex-col items-center gap-4 self-start rounded-[32px] bg-sunken p-5 xl:sticky xl:top-4 xl:flex">
        <DevicePreview profile={previewProfile} tabs={tabs} blocks={blocks} />
        <p className="text-center text-[13px] text-muted">{dirty ? "The preview includes your unsaved changes." : "Live preview."}</p>
        {dirty ? <div className="sticky bottom-5 w-full">{saveBar}</div> : null}
      </aside>

      {leaveGuard}
      {/* below xl the save bar floats above the mobile nav, and a button opens the preview */}
      {dirty ? <div className="fixed inset-x-0 bottom-16 z-40 flex justify-center px-4 lg:bottom-6 xl:hidden"><div className="w-full max-w-md">{saveBar}</div></div> : null}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className={`fixed right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-white shadow-lift active:scale-[0.97] xl:hidden ${dirty ? "bottom-36 lg:bottom-24" : "bottom-20 lg:bottom-6"}`}
      >
        <Eye className="size-4" aria-hidden /> Preview
      </button>
      {sheet && (
        <div role="dialog" aria-modal aria-label="Page preview" className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#16150f]/80 px-4 py-6 backdrop-blur-sm xl:hidden">
          <button type="button" onClick={() => setSheet(false)} className="mb-4 inline-flex h-10 items-center gap-1.5 self-end rounded-full bg-white/10 px-4 text-sm font-semibold text-white">
            <X className="size-4" aria-hidden /> Close
          </button>
          <PhonePreview profile={previewProfile} tabs={tabs} blocks={blocks} />
        </div>
      )}
    </div>
  );
}

/** Number of changed settings, for the save bar ("3 unsaved changes"). */
function countChanges(a: Draft, b: Draft): number {
  const keys = new Set([...Object.keys(a.theme), ...Object.keys(b.theme)]) as Set<keyof Theme>;
  let n = 0;
  for (const k of keys) if (JSON.stringify(a.theme[k]) !== JSON.stringify(b.theme[k])) n++;
  if (JSON.stringify(a.socials) !== JSON.stringify(b.socials)) n++;
  if (a.socials_position !== b.socials_position) n++;
  return n;
}

/** Phone / Desktop preview. Desktop renders the real page at 1100px and scales it into the panel. */
function DevicePreview({ profile, tabs, blocks }: { profile: Profile; tabs: Tab[]; blocks: Block[] }) {
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.36);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || device !== "desktop") return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / 1100));
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);
  return (
    <>
      <div role="radiogroup" aria-label="Preview device" className="inline-flex gap-1 rounded-full bg-background/70 p-1">
        {(["phone", "desktop"] as const).map((d) => (
          <button key={d} type="button" role="radio" aria-checked={device === d} onClick={() => setDevice(d)} className={`h-9 rounded-full px-4 text-sm font-semibold capitalize ${device === d ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2"}`}>
            {d}
          </button>
        ))}
      </div>
      {device === "phone" ? (
        <PhonePreview profile={profile} tabs={tabs} blocks={blocks} />
      ) : (
        <div ref={box} className="w-full overflow-hidden rounded-2xl bg-surface shadow-lift" style={{ height: 760 * scale }}>
          {/* the transform also contains the page's fixed-position share pills and decorations */}
          <div className="origin-top-left overflow-y-auto" style={{ width: 1100, height: 760, transform: `scale(${scale})` }}>
            <PublicPage profile={profile} tabs={tabs} blocks={blocks} preview fullHeight style={{ minHeight: 760 }} />
          </div>
        </div>
      )}
    </>
  );
}
