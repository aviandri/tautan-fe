"use client";

/** Live phone preview, rendered with the public page renderer in preview mode. */
import { PublicPage } from "@/components/public";
import type { Block, Profile, Tab } from "@/lib/types";

export function PhonePreview({
  profile,
  tabs,
  blocks,
  activeTabSlug,
  onTabChange,
}: {
  profile: Profile;
  tabs: Tab[];
  blocks: Block[];
  activeTabSlug?: string;
  onTabChange?: (slug: string) => void;
}) {
  return (
    <div className="mx-auto w-[320px] shrink-0 rounded-[46px] bg-[#16150f] p-[10px] shadow-[0_30px_60px_-24px_rgba(22,21,15,.45)]">
      <div className="relative h-[640px] overflow-hidden rounded-[36px] bg-white">
        <div className="pointer-events-none absolute left-1/2 top-2.5 z-10 h-[22px] w-[90px] -translate-x-1/2 rounded-full bg-[#16150f]" />
        <div className="h-full overflow-y-auto overscroll-contain [scrollbar-width:none]">
          <PublicPage
            profile={profile}
            tabs={tabs}
            blocks={blocks}
            activeTabSlug={activeTabSlug}
            onTabChange={onTabChange}
            preview
          />
        </div>
      </div>
    </div>
  );
}
