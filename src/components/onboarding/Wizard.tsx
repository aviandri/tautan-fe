"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Download, Link2, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { Logo, PUBLIC_HOST } from "@/components/brand";
import { ImageField, TextField } from "@/components/editor/fields";
import dynamic from "next/dynamic";
import { SmartPaste } from "@/components/editor/SmartPaste";
// Heavy parts load on demand: the live preview (public renderer) and the Look step's theme picker.
const PhonePreview = dynamic(() => import("@/components/editor/preview/Preview").then((m) => m.PhonePreview), {
  ssr: false,
  loading: () => <div className="h-[620px] w-[290px] animate-pulse rounded-[48px] bg-white/50" aria-label="Loading preview" />,
});
const ThemePicker = dynamic(() => import("@/components/theme").then((m) => m.ThemePicker), {
  ssr: false,
  loading: () => <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-[200px] animate-pulse rounded-3xl bg-sunken" />)}</div>,
});
import { Alert, Button, cx, Field, Input, PrefixInput, Spinner, Switch } from "@/components/ui";
import { toast, Toaster } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { byPosition, useEditorData } from "@/lib/editor/queries";
import { INTENTS, STARTERS, starterBlock, type Starter } from "@/lib/onboarding/starters";
import { setProfileEverywhere, useUpdateProfile } from "@/lib/profile";
import { qk, useLogout, useSession } from "@/lib/session";
import { isUnverified } from "@/lib/verify-email";
import { VerifyEmailNotice } from "@/components/auth/VerifyEmailNotice";
import type { Block, ImportPreview, OnboardingIntent, Profile, Theme } from "@/lib/types";
import { isTempUsername } from "@/lib/constants";
import { lookStepDraft } from "@/lib/theme/presets";
import { useUsernameCheck } from "@/lib/use-username-check";

export const STEPS = ["start", "profile", "sections", "theme", "claim"] as const;
export type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = { start: "Start", profile: "Profile", sections: "Cards", theme: "Look", claim: "Your address" };

export function resumeStep(p: Profile): Step {
  const s = p.onboarding?.step as Step | undefined;
  return s && STEPS.includes(s) ? s : "start";
}

function onboardingError(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "invalid_url":
        return "That doesn't look like a web address.";
      case "blocked_url":
        return "That address can't be imported.";
      case "fetch_failed":
        return "We couldn't load that page. Check the link, or start from scratch.";
      case "rate_limited":
        return "Too many tries. Wait a minute and try again.";
      case "username_taken":
        return "That name was just taken. Try another.";
      case "username_not_claimed":
        return "Pick your page address before publishing.";
      default:
        return e.message;
    }
  }
  return "Couldn't reach the server. Try again.";
}

export function Wizard({ profile }: { profile: Profile }) {
  const editor = useEditorData();
  const update = useUpdateProfile();
  const logout = useLogout();
  const [step, setStepState] = useState<Step>(() => resumeStep(profile));
  /** Look step: unsaved theme pick, shown in the preview, saved on Continue. */
  const [themeDraft, setThemeDraft] = useState<Theme | null>(null);
  /**
   * What the current step has typed or ticked but not saved yet. The phone preview renders the saved
   * profile and cards with this on top, so it follows every keystroke without a network round trip.
   */
  const [previewDraft, setPreviewDraft] = useState<PreviewDraft>({});
  const shown: Profile = {
    ...profile,
    ...previewDraft.profile,
    ...(previewDraft.username ? { username: previewDraft.username } : {}),
    ...(themeDraft ? { theme: themeDraft } : {}),
  };
  const idx = STEPS.indexOf(step);
  // Look step: never leave nothing selected (E2E finding #6).
  useEffect(() => {
    if (step === "theme" && !themeDraft) {
      const d = lookStepDraft(profile.theme);
      if (d) setThemeDraft(d);
    }
  }, [step, themeDraft, profile.theme]);

  const go = (s: Step, extra: Parameters<typeof update.mutate>[0] = {}) => {
    setStepState(s);
    setThemeDraft(null);
    setPreviewDraft({});
    update.mutate({ ...extra, onboarding: { ...(extra.onboarding ?? {}), step: s } });
    window.scrollTo({ top: 0 });
  };
  const next = (extra?: Parameters<typeof update.mutate>[0]) => go(STEPS[Math.min(idx + 1, STEPS.length - 1)], extra);
  const back = () => go(STEPS[Math.max(idx - 1, 0)]);

  const tabs = editor.data ? [...editor.data.tabs].sort(byPosition) : [];
  const firstTab = tabs[0];
  const savedBlocks = editor.data?.blocks ?? [];
  const previewBlocks = previewDraft.starters?.length && firstTab ? [...savedBlocks, ...draftBlocks(previewDraft.starters, firstTab.id, profile.id, savedBlocks)] : savedBlocks;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-5 px-5 py-5 sm:px-8">
        <Logo />
        <nav aria-label="Setup progress" className="order-3 w-full sm:order-none sm:mx-auto sm:w-auto">
          <ol className="flex flex-wrap gap-x-[22px] gap-y-2">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === idx ? "step" : undefined}
                className={cx("flex items-center gap-2 text-[14px] font-semibold", i === idx ? "text-foreground" : "text-muted")}
              >
                <b
                  className={cx(
                    "inline-flex size-[26px] items-center justify-center rounded-full text-[12px]",
                    i < idx ? "bg-ok text-white" : i === idx ? "bg-foreground text-background" : "bg-sunken text-ink-2",
                  )}
                >
                  {i < idx ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
                </b>
                <span className={cx(i !== idx && "max-sm:sr-only")}>{STEP_LABELS[s]}</span>
              </li>
            ))}
          </ol>
        </nav>
        <button onClick={logout} className="ml-auto text-[14px] font-semibold text-ink-2 hover:text-foreground sm:ml-0">
          Log out
        </button>
      </header>

      <div className="flex flex-1 flex-wrap gap-10 px-5 pb-8 pt-3 sm:px-8">
        <main className="k-enter mx-auto flex w-full min-w-0 max-w-[720px] flex-[1_1_620px] flex-col justify-center" key={step}>
          {step === "start" && <StartStep profile={profile} tabId={firstTab?.id} onNext={next} />}
          {step === "profile" && <ProfileStep profile={profile} onNext={next} onBack={back} onPreview={(p) => setPreviewDraft({ profile: p })} />}
          {step === "sections" && firstTab && <SectionsStep profile={profile} tabId={firstTab.id} onNext={next} onBack={back} onPreview={(starters) => setPreviewDraft({ starters })} />}
          {step === "theme" && <ThemeStep value={themeDraft ?? profile.theme} onChange={setThemeDraft} dirty={!!themeDraft} onNext={next} onBack={back} />}
          {step === "claim" && <ClaimStep profile={profile} onBack={back} onPreview={(username) => setPreviewDraft(username ? { username } : {})} />}
        </main>

        <aside aria-label="Live preview" className="hidden min-w-[320px] flex-[0_1_440px] flex-col items-center justify-center gap-4 rounded-[36px] bg-blush p-7 lg:flex">
          {editor.data ? <PhonePreview profile={shown} tabs={tabs} blocks={previewBlocks} width={290} height={600} /> : <Spinner />}
          <span className="rounded-full bg-surface px-3 py-1 font-mono text-[12px] text-ink-2">Your page, as you build it</span>
        </aside>
      </div>
      <Toaster />
    </div>
  );
}

interface PreviewDraft {
  profile?: Pick<Profile, "display_name" | "bio" | "avatar_url">;
  /** ticked starter sections, not created yet */
  starters?: Starter[];
  /** a valid address being claimed */
  username?: string;
}

/** Ticked starters as preview-only blocks after the saved ones, in order (ids never reach the API). */
function draftBlocks(starters: Starter[], tabId: string, profileId: string, saved: Block[]): Block[] {
  const top = saved.filter((b) => b.tab_id === tabId && !b.parent_id);
  const start = top.length ? Math.max(...top.map((b) => b.position)) + 1 : 0;
  return starters.map(
    (st, i) =>
      ({
        id: `draft-${st.key}`,
        profile_id: profileId,
        tab_id: tabId,
        parent_id: null,
        position: start + i,
        is_visible: true,
        created_at: "",
        updated_at: "",
        type: st.type,
        data: st.data(),
      }) as Block,
  );
}

type NextFn = (extra?: Parameters<ReturnType<typeof useUpdateProfile>["mutate"]>[0]) => void;

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-7">
      <h1 className="text-[38px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[52px]">{title}</h1>
      <p className="mt-2.5 text-[18px] leading-relaxed text-ink-2">{description}</p>
    </div>
  );
}

function Footer({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      )}
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}

// ---------- 1. start: import or intent ----------

function StartStep({ profile, tabId, onNext }: { profile: Profile; tabId?: string; onNext: NextFn }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"choose" | "import">("choose");
  const [intent, setIntent] = useState<OnboardingIntent | undefined>(profile.onboarding?.intent);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function doPreview(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setError(null);
    setBusy("preview");
    try {
      const r = await api.import({ url: url.trim() });
      setPreview(r.preview);
    } catch (err) {
      setError(onboardingError(err));
    } finally {
      setBusy(null);
    }
  }

  async function doApply() {
    setError(null);
    setBusy("apply");
    try {
      const r = await api.import({ url: preview!.source_url || url.trim(), apply: true, tab_id: tabId });
      if (r.profile) setProfileEverywhere(qc, r.profile);
      await qc.invalidateQueries({ queryKey: qk.editor });
      const a = r.applied;
      toast.success(a ? `Imported ${a.links} link${a.links === 1 ? "" : "s"}${a.socials ? ` and ${a.socials} social${a.socials === 1 ? "" : "s"}` : ""}` : "Imported");
      onNext({ onboarding: { source: "import", intent: intent ?? "other" } });
    } catch (err) {
      setError(onboardingError(err));
    } finally {
      setBusy(null);
    }
  }

  if (mode === "import") {
    return (
      <>
        <StepHeader title="Bring your links over" description="Paste the address of your current link page. We'll copy your links, socials, name, bio and photo." />
        <form onSubmit={doPreview} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreview(null);
            }}
            placeholder="linktr.ee/yourname"
            aria-label="Link page address"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
          />
          <Button type="submit" loading={busy === "preview"} disabled={!url.trim()}>
            Preview
          </Button>
        </form>
        {error && (
          <div className="mt-3">
            <Alert>{error}</Alert>
          </div>
        )}
        {preview && (
          <div className="mt-6 rounded-[20px] bg-surface p-5 shadow-card">
            <div className="flex items-center gap-3">
              {preview.profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.profile.avatar_url} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="size-12 rounded-full bg-sunken" />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{preview.profile.display_name || "No name found"}</p>
                <p className="line-clamp-2 text-sm text-muted">{preview.profile.bio || "No bio found"}</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] font-medium">
              {preview.links.length} link{preview.links.length === 1 ? "" : "s"}
              {preview.socials.length ? ` · ${preview.socials.length} social${preview.socials.length === 1 ? "" : "s"} (${preview.socials.map((s) => s.platform).join(", ")})` : ""}
            </p>
            {preview.links.length > 0 && (
              <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {preview.links.map((l, i) => (
                  <li key={i} className="k-pop flex items-center gap-2 rounded-[14px] bg-background px-3 py-2 text-sm font-semibold" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                    <Link2 className="size-3.5 shrink-0 text-muted" aria-hidden />
                    <span className="truncate font-medium">{l.title || l.url}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <Footer onBack={() => setMode("choose")}>
          {preview && (
            <Button onClick={doApply} loading={busy === "apply"} disabled={!preview.links.length && !preview.socials.length && !preview.profile.display_name}>
              <Download className="size-4" /> Import and continue
            </Button>
          )}
        </Footer>
      </>
    );
  }

  return (
    <>
      <StepHeader title="How would you like to start?" description="Pick one. Everything stays editable afterwards." />
      <button
        type="button"
        onClick={() => setMode("import")}
        className="flex w-full items-center gap-3.5 rounded-[28px] bg-surface p-[22px] text-left shadow-card transition-[transform,box-shadow] duration-200 ease-k hover:-translate-y-0.5 hover:shadow-lift"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-mint">
          <Link2 className="size-[22px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[20px] font-bold tracking-[-0.015em]">Already have a link page?</span>
          <span className="block text-[15px] text-muted">Bring your links from Linktree, Beacons, a portfolio or any public page</span>
        </span>
        <span className="hidden rounded-full bg-brand-soft px-2.5 py-1 font-mono text-[12px] text-brand-hover sm:inline">Fastest</span>
        <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
      </button>
      <section aria-labelledby="blank-start" className="mt-3.5 flex flex-col gap-3.5 rounded-[28px] bg-surface p-[22px] shadow-card">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-butter">
            <Plus className="size-[22px]" aria-hidden />
          </span>
          <div>
            <h2 id="blank-start" className="text-[20px] font-bold tracking-[-0.015em]">
              Start from a blank page
            </h2>
            <p className="text-[15px] text-muted">Tell us what the page is for and we add the first cards</p>
          </div>
        </div>
        <div role="radiogroup" aria-label="What is your page for?" className="flex flex-wrap gap-2">
          {INTENTS.map((it) => (
            <button
              key={it.value}
              type="button"
              role="radio"
              aria-checked={intent === it.value}
              aria-label={`${it.title}: ${it.description}`}
              onClick={() => setIntent(it.value)}
              className={cx(
                "inline-flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors",
                intent === it.value ? "bg-foreground text-background" : "bg-sunken hover:bg-line",
              )}
            >
              {intent === it.value && <Check className="size-3.5" aria-hidden />}
              {it.title}
            </button>
          ))}
        </div>
        {intent && <p className="text-[14px] text-ink-2">{INTENTS.find((i) => i.value === intent)?.description}</p>}
      </section>
      <Footer>
        <Button size="lg" disabled={!intent} onClick={() => onNext({ onboarding: { intent, source: "scratch" } })}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 2. profile ----------

function ProfileStep({ profile, onNext, onBack, onPreview }: { profile: Profile; onNext: NextFn; onBack: () => void; onPreview: (p: NonNullable<PreviewDraft["profile"]>) => void }) {
  const [name, setName] = useState(isTempUsername(profile.display_name) ? "" : profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
  useEffect(() => {
    onPreview({ display_name: name.trim(), bio: bio.trim(), avatar_url: avatar || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPreview is a fresh closure each render; the values are what matter
  }, [name, bio, avatar]);
  return (
    <>
      <StepHeader title="Introduce yourself" description="This goes at the top of your page." />
      <div className="flex flex-col gap-5">
        <ImageField label="Photo or logo" shape="round" allowUrl={false} value={avatar} onChange={setAvatar} />
        <TextField label="Name" value={name} onChange={setName} placeholder="Your name or business" maxLength={60} autoFocus />
        <TextField label="Bio" value={bio} onChange={setBio} multiline maxLength={160} placeholder="One line about what you do" hint={`${bio.length}/160`} />
      </div>
      <Footer onBack={onBack}>
        <Button size="lg" onClick={() => onNext({ display_name: name.trim(), bio: bio.trim(), avatar_url: avatar || null })}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 3. sections ----------

function SectionsStep({ profile, tabId, onNext, onBack, onPreview }: { profile: Profile; tabId: string; onNext: NextFn; onBack: () => void; onPreview: (starters: Starter[]) => void }) {
  const qc = useQueryClient();
  const editor = useEditorData();
  const intent = profile.onboarding?.intent ?? "other";
  const imported = profile.onboarding?.source === "import";
  const starters = STARTERS[intent];
  const existing = new Set((editor.data?.blocks ?? []).map((b) => b.type));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(imported ? [] : starters.filter((s) => !existing.has(s.type)).map((s) => s.key)));
  const [busy, setBusy] = useState(false);
  const linkCount = (editor.data?.blocks ?? []).filter((b) => b.type === "link").length;
  useEffect(() => {
    onPreview(starters.filter((st) => picked.has(st.key)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see ProfileStep
  }, [picked, starters]);

  async function finish() {
    setBusy(true);
    try {
      for (const st of starters.filter((s) => picked.has(s.key))) await api.blocks.create(starterBlock(st, tabId));
      await qc.invalidateQueries({ queryKey: qk.editor });
      onNext();
    } catch (e) {
      toast.error(onboardingError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <StepHeader
        title={imported ? "Anything to add?" : "Pick your starting sections"}
        description="Add your first links below, and tick the sections you want. Each one is editable later."
      />
      <SmartPaste tabId={tabId} onCreated={() => qc.invalidateQueries({ queryKey: qk.editor })} />
      {linkCount > 0 && (
        <p className="mt-2 text-[13px] text-brand">
          <Check className="mr-1 inline size-3.5" />
          {linkCount} link{linkCount === 1 ? "" : "s"} on your page
        </p>
      )}
      <ul className="mt-6 flex flex-col gap-2">
        {starters.map((st) => {
          const on = picked.has(st.key);
          return (
            <li key={st.key}>
              <label className={cx("flex cursor-pointer items-center gap-3 rounded-[20px] p-4 transition-[box-shadow,transform]", on ? "bg-surface shadow-[0_0_0_2px_var(--accent)]" : "bg-surface shadow-card hover:-translate-y-px")}>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={on}
                  onChange={(e) =>
                    setPicked((p) => {
                      const n = new Set(p);
                      if (e.target.checked) n.add(st.key);
                      else n.delete(st.key);
                      return n;
                    })
                  }
                />
                <span>
                  <span className="block text-[15px] font-medium">{st.title}</span>
                  <span className="block text-sm text-muted">{st.description}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Footer onBack={onBack}>
        <Button size="lg" onClick={finish} loading={busy}>
          {picked.size ? `Add ${picked.size} and continue` : "Continue"} <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 4. theme ----------

/**
 * Swap point: renders tautan-c6's <ThemePicker> once it's on main (#2).
 * Until then the step explains where to change the look and moves on.
 */
function ThemeStep({
  value,
  onChange,
  dirty,
  onNext,
  onBack,
}: {
  value: Theme;
  onChange: (t: Theme) => void;
  dirty: boolean;
  onNext: NextFn;
  onBack: () => void;
}) {
  return (
    <>
      <StepHeader title="Choose a look" description="Pick a starting theme. You can fine-tune colours, fonts and buttons later under Appearance." />
      <ThemePicker value={value} onChange={onChange} />
      <Footer onBack={onBack}>
        <Button size="lg" onClick={() => onNext(dirty ? { theme: value } : undefined)}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 5. claim ----------

function ClaimStep({ profile, onBack, onPreview }: { profile: Profile; onBack: () => void; onPreview: (username: string | null) => void }) {
  const update = useUpdateProfile();
  const session = useSession();
  const claimed = profile.onboarding?.username_claimed !== false && !isTempUsername(profile.username);
  const [username, setUsername] = useState(claimed ? profile.username : (profile.onboarding?.suggested_username ?? ""));
  // Unverified accounts can't publish yet: finish as a draft, publish after confirming.
  const [blocked, setBlocked] = useState(false);
  const unverified = blocked || isUnverified(session.data?.user);
  const [publishWanted, setPublish] = useState(true);
  const publish = publishWanted && !unverified;
  const [error, setError] = useState<string | null>(null);
  const check = useUsernameCheck(username, { current: claimed ? profile.username : undefined });
  const busy = update.isPending;
  const previewName = check.status.state === "available" || check.status.state === "unchanged" ? check.value : null;
  useEffect(() => {
    onPreview(previewName);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see ProfileStep
  }, [previewName]);

  function finish() {
    setError(null);
    if (!claimed && !check.ok) return;
    update.mutate(
      {
        ...(claimed && check.value === profile.username ? {} : { username: check.value }),
        is_published: publish,
        onboarding: { completed: true, step: "done" },
      },
      {
        onSuccess: () => window.location.assign(publish ? "/onboarding/live" : "/dashboard"),
        onError: (e) => {
          if (e instanceof ApiError && e.code === "email_unverified") {
            setBlocked(true); // the notice below explains; "Finish setup" saves a draft
            return;
          }
          setError(onboardingError(e));
        },
      },
    );
  }

  return (
    <>
      <StepHeader title="Claim your link" description="This is the address you'll share. You can change it later in Settings." />
      <Field label="Your page address" hint={<UsernameStatusLine status={check.status} host={PUBLIC_HOST} />}>
        {(p) => (
          <PrefixInput
            {...p}
            prefix={`${PUBLIC_HOST}/`}
            aria-invalid={check.status.state === "invalid" || check.status.state === "taken"}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            className="font-medium"
          />
        )}
      </Field>
      <div className="mt-6 flex items-center justify-between gap-4 rounded-[20px] bg-surface p-4 shadow-card">
        <div>
          <p className="text-[15px] font-bold">Publish now</p>
          <p className="text-sm text-muted">{publish ? "Anyone with the link can see your page." : "Keep it as a draft until you're ready."}</p>
        </div>
        <Switch label="Publish now" checked={publish} onChange={setPublish} disabled={unverified} />
      </div>
      {unverified && session.data && (
        <div className="mt-4">
          <VerifyEmailNotice email={session.data.user.email} variant="inline" />
          <p className="mt-2 text-sm text-muted">Finish setup now; you can publish from the dashboard once your email is confirmed.</p>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      )}
      <Footer onBack={onBack}>
        <Button size="lg" onClick={finish} disabled={busy || !check.ok} loading={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {publish ? "Publish my page" : "Finish setup"}
        </Button>
      </Footer>
    </>
  );
}
