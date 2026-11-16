"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Download, Link2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { UsernameStatusLine } from "@/components/auth/UsernameStatusLine";
import { Logo, PUBLIC_HOST } from "@/components/brand";
import { ImageField, TextField } from "@/components/editor/fields";
import { PhonePreview } from "@/components/editor/preview/Preview";
import { SmartPaste } from "@/components/editor/SmartPaste";
import { Alert, Button, cx, Field, Input, PrefixInput, Spinner, Switch } from "@/components/ui";
import { toast, Toaster } from "@/components/ui/toast";
import { api, ApiError } from "@/lib/api";
import { byPosition, useEditorData } from "@/lib/editor/queries";
import { INTENTS, STARTERS, starterBlock } from "@/lib/onboarding/starters";
import { setProfileEverywhere, useUpdateProfile } from "@/lib/profile";
import { qk, useLogout } from "@/lib/session";
import type { ImportPreview, OnboardingIntent, Profile } from "@/lib/types";
import { isTempUsername } from "@/lib/types";
import { useUsernameCheck } from "@/lib/use-username-check";

export const STEPS = ["start", "profile", "sections", "theme", "claim"] as const;
export type Step = (typeof STEPS)[number];
const STEP_LABELS: Record<Step, string> = { start: "Start", profile: "Profile", sections: "Sections", theme: "Look", claim: "Your link" };

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
  const idx = STEPS.indexOf(step);

  const go = (s: Step, extra: Parameters<typeof update.mutate>[0] = {}) => {
    setStepState(s);
    update.mutate({ ...extra, onboarding: { ...(extra.onboarding ?? {}), step: s } });
    window.scrollTo({ top: 0 });
  };
  const next = (extra?: Parameters<typeof update.mutate>[0]) => go(STEPS[Math.min(idx + 1, STEPS.length - 1)], extra);
  const back = () => go(STEPS[Math.max(idx - 1, 0)]);

  const tabs = editor.data ? [...editor.data.tabs].sort(byPosition) : [];
  const firstTab = tabs[0];

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_440px]">
      <div className="flex min-h-dvh flex-col px-5 py-5 sm:px-10">
        <header className="flex items-center justify-between">
          <Logo />
          <button onClick={logout} className="text-[13px] font-medium text-muted hover:text-foreground">
            Log out
          </button>
        </header>

        <nav aria-label="Setup progress" className="mx-auto mt-8 w-full max-w-xl">
          <ol className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <li key={s} className="flex flex-1 flex-col gap-1.5">
                <span className={cx("h-1 rounded-full transition-colors", i <= idx ? "bg-brand" : "bg-line")} />
                <span className={cx("hidden text-[12px] font-medium sm:block", i === idx ? "text-foreground" : "text-muted")} aria-current={i === idx ? "step" : undefined}>
                  {STEP_LABELS[s]}
                </span>
              </li>
            ))}
          </ol>
        </nav>

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col py-10">
          {step === "start" && <StartStep profile={profile} tabId={firstTab?.id} onNext={next} />}
          {step === "profile" && <ProfileStep profile={profile} onNext={next} onBack={back} />}
          {step === "sections" && firstTab && <SectionsStep profile={profile} tabId={firstTab.id} onNext={next} onBack={back} />}
          {step === "theme" && <ThemeStep onNext={next} onBack={back} />}
          {step === "claim" && <ClaimStep profile={profile} onBack={back} />}
        </main>
      </div>

      <aside className="hidden border-l border-line bg-surface/50 lg:flex lg:items-center lg:justify-center">
        {editor.data ? (
          <div className="sticky top-8">
            <PhonePreview profile={profile} tabs={tabs} blocks={editor.data.blocks} />
            <p className="mt-4 text-center text-[13px] text-muted">Your page, as you build it</p>
          </div>
        ) : (
          <Spinner />
        )}
      </aside>
      <Toaster />
    </div>
  );
}

type NextFn = (extra?: Parameters<ReturnType<typeof useUpdateProfile>["mutate"]>[0]) => void;

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">{description}</p>
    </div>
  );
}

function Footer({ onBack, children }: { onBack?: () => void; children: React.ReactNode }) {
  return (
    <div className="mt-10 flex items-center gap-3">
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
          <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              {preview.profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview.profile.avatar_url} alt="" className="size-12 rounded-full object-cover" />
              ) : (
                <div className="size-12 rounded-full bg-black/[.06]" />
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
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-sm">
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
      <StepHeader title="Let's set up your page" description="What will people find on it? This picks a few starting sections. You can change everything later." />
      <div role="radiogroup" aria-label="What is your page for?" className="grid gap-2.5 sm:grid-cols-2">
        {INTENTS.map((it) => (
          <button
            key={it.value}
            type="button"
            role="radio"
            aria-checked={intent === it.value}
            onClick={() => setIntent(it.value)}
            className={cx(
              "flex flex-col items-start rounded-2xl border p-4 text-left transition-[border-color,box-shadow,transform] active:translate-y-px",
              intent === it.value ? "border-brand shadow-[0_0_0_3px_rgba(31,92,74,.12)]" : "border-line bg-surface hover:border-[#cfcbbd]",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <span className="text-[15px] font-semibold">{it.title}</span>
              {intent === it.value && <Check className="size-4 text-brand" />}
            </span>
            <span className="mt-1 text-sm text-muted">{it.description}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setMode("import")}
        className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-dashed border-line p-4 text-left transition-colors hover:border-brand"
      >
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand/[.08] text-brand">
          <Download className="size-4" />
        </span>
        <span>
          <span className="block text-[15px] font-semibold">Already have a link page?</span>
          <span className="block text-sm text-muted">Import from Linktree, Beacons or any public page</span>
        </span>
        <ArrowRight className="ml-auto size-4 text-muted" />
      </button>
      <Footer>
        <Button size="lg" disabled={!intent} onClick={() => onNext({ onboarding: { intent, source: "scratch" } })}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 2. profile ----------

function ProfileStep({ profile, onNext, onBack }: { profile: Profile; onNext: NextFn; onBack: () => void }) {
  const [name, setName] = useState(isTempUsername(profile.display_name) ? "" : profile.display_name);
  const [bio, setBio] = useState(profile.bio);
  const [avatar, setAvatar] = useState(profile.avatar_url ?? "");
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

function SectionsStep({ profile, tabId, onNext, onBack }: { profile: Profile; tabId: string; onNext: NextFn; onBack: () => void }) {
  const qc = useQueryClient();
  const editor = useEditorData();
  const intent = profile.onboarding?.intent ?? "other";
  const imported = profile.onboarding?.source === "import";
  const starters = STARTERS[intent];
  const existing = new Set((editor.data?.blocks ?? []).map((b) => b.type));
  const [picked, setPicked] = useState<Set<string>>(() => new Set(imported ? [] : starters.filter((s) => !existing.has(s.type)).map((s) => s.key)));
  const [busy, setBusy] = useState(false);
  const linkCount = (editor.data?.blocks ?? []).filter((b) => b.type === "link").length;

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
              <label className={cx("flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition-colors", on ? "border-brand bg-brand/[.04]" : "border-line bg-surface hover:border-[#cfcbbd]")}>
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
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
function ThemeStep({ onNext, onBack }: { onNext: NextFn; onBack: () => void }) {
  return (
    <>
      <StepHeader title="Choose a look" description="Colours, fonts and button styles." />
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-5">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <p className="text-sm text-muted">
          Your page starts with a clean default look. Pick a theme and fine-tune colours and fonts any time under{" "}
          <span className="font-medium text-foreground">Appearance</span> in your dashboard.
        </p>
      </div>
      <Footer onBack={onBack}>
        <Button size="lg" onClick={() => onNext()}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </Footer>
    </>
  );
}

// ---------- 5. claim ----------

function ClaimStep({ profile, onBack }: { profile: Profile; onBack: () => void }) {
  const update = useUpdateProfile();
  const claimed = profile.onboarding?.username_claimed !== false && !isTempUsername(profile.username);
  const [username, setUsername] = useState(claimed ? profile.username : (profile.onboarding?.suggested_username ?? ""));
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const check = useUsernameCheck(username, { current: claimed ? profile.username : undefined });
  const busy = update.isPending;

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
        onSuccess: () => window.location.assign("/dashboard"),
        onError: (e) => setError(onboardingError(e)),
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
      <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="text-[15px] font-medium">Publish now</p>
          <p className="text-sm text-muted">{publish ? "Anyone with the link can see your page." : "Keep it as a draft until you're ready."}</p>
        </div>
        <Switch label="Publish now" checked={publish} onChange={setPublish} />
      </div>
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
