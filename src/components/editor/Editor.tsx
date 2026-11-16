"use client";

import { Eye, Settings2, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Spinner } from "@/components/ui";
import { assetUrl } from "@/lib/api";
import { byPosition, errorMessage, useEditorData } from "@/lib/editor/queries";
import type { Tab } from "@/lib/types";
import { BlockList } from "./BlockList";
import { PhonePreview } from "./preview/Preview";
import { TabsBar } from "./TabsBar";

export function Editor() {
  const { data, isLoading, error, refetch } = useEditorData();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [sheet, setSheet] = useState(false);

  const tabs = useMemo(() => (data ? [...data.tabs].sort(byPosition) : []), [data]);
  const slug = params.get("tab");
  const active = tabs.find((t) => t.slug === slug) ?? tabs[0];

  const selectTab = (t: Tab) => {
    const q = new URLSearchParams(params);
    if (t.id === tabs[0]?.id) q.delete("tab");
    else q.set("tab", t.slug);
    router.replace(`${pathname}${q.size ? `?${q}` : ""}`, { scroll: false });
  };
  const selectBySlug = (s: string) => {
    const t = tabs.find((x) => x.slug === s);
    if (t) selectTab(t);
  };

  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner />
      </div>
    );
  }
  if (error || !data || !active) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10">
        <Alert>{error ? errorMessage(error) : "Couldn't load your page."}</Alert>
        <Button variant="secondary" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { profile, blocks } = data;
  const avatar = assetUrl(profile.avatar_url);

  return (
    <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:py-8">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-14 rounded-full object-cover" />
          ) : (
            <div className="flex size-14 items-center justify-center rounded-full bg-brand text-xl font-semibold text-brand-ink">
              {(profile.display_name || profile.username).slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold">{profile.display_name || `@${profile.username}`}</p>
            <p className="line-clamp-1 text-sm text-muted">{profile.bio || "No bio yet"}</p>
          </div>
          <Link
            href="/dashboard/settings"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium transition-colors hover:border-[#cfcbbd]"
          >
            <Settings2 className="size-3.5" /> Edit profile
          </Link>
        </section>

        <TabsBar tabs={tabs} blocks={blocks} activeId={active.id} onSelect={selectTab} />
        <BlockList key={active.id} blocks={blocks} tab={active} tabs={tabs} />
      </div>

      <aside className="hidden xl:block">
        <div className="sticky top-[88px]">
          <PhonePreview profile={profile} tabs={tabs} blocks={blocks} activeTabSlug={active.slug} onTabChange={selectBySlug} />
          <p className="mt-4 text-center text-[13px] text-muted">
            {profile.is_published ? "Live preview. Changes save automatically." : "Draft preview. Publish to make it public."}
          </p>
        </div>
      </aside>

      {/* Mobile / tablet preview */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className="fixed bottom-20 right-4 z-30 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background shadow-lg active:translate-y-px xl:hidden lg:bottom-6"
      >
        <Eye className="size-4" /> Preview
      </button>
      {sheet && (
        <div role="dialog" aria-modal aria-label="Page preview" className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-[#16150f]/80 px-4 py-6 backdrop-blur-sm xl:hidden">
          <button
            onClick={() => setSheet(false)}
            className="mb-4 inline-flex h-10 items-center gap-1.5 self-end rounded-full bg-white/10 px-4 text-sm font-medium text-white"
          >
            <X className="size-4" /> Close
          </button>
          <PhonePreview profile={profile} tabs={tabs} blocks={blocks} activeTabSlug={active.slug} onTabChange={selectBySlug} />
        </div>
      )}
    </div>
  );
}
