"use client";

/** Live previews (phone and desktop frames), rendered with the public page renderer in preview mode. */
import { PublicPage } from "@/components/public";
import type { Block, Profile, Tab } from "@/lib/types";

interface PreviewProps {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
  activeTabSlug?: string;
  onTabChange?: (slug: string) => void;
}

function Page(p: PreviewProps) {
  return <PublicPage profile={p.profile} tabs={p.tabs} blocks={p.blocks} activeTabSlug={p.activeTabSlug} onTabChange={p.onTabChange} preview />;
}

export function PhonePreview(p: PreviewProps & { width?: number; height?: number }) {
  const w = p.width ?? 320;
  const h = p.height ?? 640;
  return (
    <div className="mx-auto shrink-0 rounded-[48px] bg-[#111] p-[10px] shadow-lift" style={{ width: w }}>
      <div className="relative overflow-hidden rounded-[39px] bg-white" style={{ height: h }}>
        <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-[22px] w-[90px] -translate-x-1/2 rounded-full bg-[#111]" />
        <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none]">
          <Page {...p} />
        </div>
      </div>
    </div>
  );
}

export function DesktopPreview(p: PreviewProps & { height?: number }) {
  return (
    <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-[22px] bg-surface shadow-lift">
      <div className="flex items-center gap-1.5 border-b border-line px-4 py-2.5" aria-hidden>
        <span className="size-2.5 rounded-full bg-line-2" />
        <span className="size-2.5 rounded-full bg-line-2" />
        <span className="size-2.5 rounded-full bg-line-2" />
        <span className="mx-auto rounded-full bg-sunken px-4 py-1 font-mono text-[11px] text-muted">/{p.profile.username}</span>
      </div>
      <div className="overflow-y-auto overscroll-contain" style={{ height: p.height ?? 620 }}>
        <Page {...p} />
      </div>
    </div>
  );
}
