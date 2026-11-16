"use client";

/** After onboarding publishes the page: confetti, the link to copy, a QR code and three next steps. */
import { Check, Copy } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo, PUBLIC_HOST } from "@/components/brand";
import { Button, cx } from "@/components/ui";
import { useEditorData, byPosition } from "@/lib/editor/queries";
import type { BlockType, OnboardingIntent, Profile } from "@/lib/types";

const PhonePreview = dynamic(() => import("@/components/editor/preview/Preview").then((m) => m.PhonePreview), {
  ssr: false,
  loading: () => <div className="h-[560px] w-[270px] animate-pulse rounded-[48px] bg-line" />,
});
const QrCard = dynamic(() => import("@/components/qr").then((m) => m.QrCard), {
  ssr: false,
  loading: () => <div className="size-40 animate-pulse rounded-lg bg-white/60" />,
});

const CONFETTI = [
  ["8%", "var(--accent)", 0],
  ["16%", "var(--mint)", 0.2],
  ["24%", "var(--butter)", 0.1],
  ["33%", "var(--sky)", 0.35],
  ["41%", "var(--accent)", 0.15],
  ["52%", "var(--blush)", 0.05],
  ["61%", "var(--mint)", 0.3],
  ["70%", "var(--ink)", 0.25],
  ["79%", "var(--butter)", 0.12],
  ["88%", "var(--accent)", 0.4],
  ["94%", "var(--sky)", 0.22],
] as const;

const NEXT: Record<OnboardingIntent | "default", { label: string; cta: string; type: BlockType }> = {
  sell: { label: "Add your first product", cta: "Add a product card", type: "product" },
  local: { label: "Show your opening hours and address", cta: "Add store info", type: "store_info" },
  audience: { label: "Start collecting emails", cta: "Add an email sign-up", type: "email_signup" },
  other: { label: "Let people book time with you", cta: "Add a booking card", type: "booking" },
  default: { label: "Let people book time with you", cta: "Add a booking card", type: "booking" },
};

export function LiveScreen({ profile }: { profile: Profile }) {
  const editor = useEditorData();
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [how, setHow] = useState(false);
  useEffect(() => {
    const env = process.env.NEXT_PUBLIC_SITE_URL;
    setUrl(`${env ? env.replace(/\/$/, "") : window.location.origin}/${profile.username}`);
  }, [profile.username]);
  const next = NEXT[profile.onboarding?.intent ?? "default"];
  const tabs = editor.data ? [...editor.data.tabs].sort(byPosition) : [];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the address is on screen to select */
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {CONFETTI.map(([left, color, delay], i) => (
          <span
            key={i}
            className="absolute top-0 rounded-[5px]"
            style={{ left, background: color, width: i === 7 ? 10 : 16, height: i === 7 ? 10 : 16, animation: `k-fall 2.8s cubic-bezier(.3,.6,.4,1) ${delay}s both` }}
          />
        ))}
      </div>
      <header className="flex items-center gap-5 px-6 py-5 sm:px-8">
        <Logo />
        <Link
          href="/dashboard"
          className="ml-auto inline-flex h-[38px] items-center rounded-full bg-surface px-4 text-[14px] font-semibold shadow-[inset_0_0_0_1px_var(--line-2)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[inset_0_0_0_1px_var(--ink)]"
        >
          Go to my dashboard
        </Link>
      </header>
      <div className="relative flex flex-1 flex-wrap items-center gap-12 px-6 pb-10 sm:px-14">
        <main className="flex min-w-0 flex-[1_1_560px] flex-col gap-6">
          <span className="k-pop inline-flex h-[30px] w-fit items-center gap-2 rounded-full bg-ok-soft px-3 font-mono text-[13px] text-ok">
            <span className="k-live" />
            Published just now
          </span>
          <h1 className="k-enter text-[48px] font-semibold leading-[.98] tracking-[-0.045em] sm:text-[72px]">Your page is live</h1>
          <div className="k-enter flex max-w-[560px] items-center gap-2.5 rounded-full bg-surface py-2 pl-[22px] pr-2 shadow-card [animation-delay:.1s]">
            <span className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-[-0.02em] sm:text-[22px]">
              {PUBLIC_HOST}/<span className="text-brand">{profile.username}</span>
            </span>
            <Button variant="dark" onClick={copy}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p className="max-w-[520px] text-[18px] leading-relaxed text-ink-2">
            Paste it into your Instagram and TikTok bios. Every tap from there shows up in Insights.
          </p>
          <div className="flex max-w-[560px] flex-col gap-2.5">
            <span className="text-[13px] font-semibold text-ink-2">Three things to do next</span>
            <Todo done label="Publish your page" />
            <Todo
              done={done.bio}
              onToggle={() => setDone((d) => ({ ...d, bio: !d.bio }))}
              label="Add the link to your Instagram bio"
              action={
                <button type="button" onClick={() => setHow((h) => !h)} aria-expanded={how} className="text-[14px] font-bold text-brand hover:text-brand-hover">
                  {how ? "Hide steps" : "Show me how"}
                </button>
              }
            >
              {how && (
                <ol className="mt-2 list-decimal pl-5 text-[14px] leading-relaxed text-ink-2">
                  <li>Copy your link above.</li>
                  <li>In Instagram, open your profile and tap Edit profile.</li>
                  <li>Tap Links, then Add external link, paste it and save.</li>
                </ol>
              )}
            </Todo>
            <Todo
              done={done.next}
              onToggle={() => setDone((d) => ({ ...d, next: !d.next }))}
              label={next.label}
              action={
                <Link href={`/dashboard?add=${next.type}`} className="text-[14px] font-bold text-brand hover:text-brand-hover">
                  {next.cta}
                </Link>
              }
            />
          </div>
        </main>
        <aside className="flex min-w-0 flex-[0_1_520px] flex-wrap items-center justify-center gap-5">
          <div className="k-float">{editor.data && <PhonePreview profile={profile} tabs={tabs} blocks={editor.data.blocks} width={270} height={540} />}</div>
          <div className="flex w-full max-w-[300px] flex-col items-center gap-3 rounded-[28px] bg-butter p-[18px] shadow-card">
            <QrCard username={profile.username} compact />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Todo({ done, onToggle, label, action, children }: { done?: boolean; onToggle?: () => void; label: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className={cx("rounded-[20px] bg-surface px-4 py-3.5 shadow-[0_0_0_1px_var(--line)]", !done && onToggle && "transition-transform hover:-translate-y-0.5")}>
      <div className="flex items-center gap-3 font-semibold">
        <button
          type="button"
          role="checkbox"
          aria-checked={!!done}
          aria-label={label}
          disabled={!onToggle}
          onClick={onToggle}
          className={cx("inline-flex size-6 shrink-0 items-center justify-center rounded-full", done ? "bg-ok text-white" : "shadow-[inset_0_0_0_2px_var(--line-2)]")}
        >
          {done && <Check className="size-3.5" strokeWidth={3.5} aria-hidden />}
        </button>
        <span className={cx("flex-1", done && "text-muted line-through")}>{label}</span>
        {!done && action}
      </div>
      {children}
    </div>
  );
}
