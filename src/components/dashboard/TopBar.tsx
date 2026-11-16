"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { PUBLIC_HOST } from "@/components/brand";
import { cx, IconButton, Switch } from "@/components/ui";
import { useUpdateProfile } from "@/lib/profile";
import type { Profile } from "@/lib/types";
import { SharePopover } from "./SharePopover";

export function TopBar({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const [copied, setCopied] = useState(false);
  const display = `${PUBLIC_HOST}/${profile.username}`;
  const href = `/${profile.username}`;

  async function copy() {
    const url = typeof window !== "undefined" ? `${window.location.origin}${href}` : display;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3.5 pr-1">
        <span className="truncate text-sm font-medium">
          <span className="text-muted">{PUBLIC_HOST}/</span>
          {profile.username}
        </span>
        <IconButton label={copied ? "Copied" : "Copy link"} onClick={copy} className="size-7 rounded-full">
          {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />}
        </IconButton>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="Open your page"
          title="Open your page"
          className="inline-flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/[.05] hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <SharePopover profile={profile} />
        <span
          className={cx(
            "hidden items-center gap-1.5 text-[13px] font-medium sm:inline-flex",
            profile.is_published ? "text-brand" : "text-muted",
          )}
        >
          <span
            className={cx("size-1.5 rounded-full", profile.is_published ? "bg-brand" : "bg-[#b9b5a6]")}
            aria-hidden
          />
          {profile.is_published ? "Published" : "Draft, only you can see it"}
        </span>
        <Switch
          label="Publish page"
          checked={profile.is_published}
          disabled={update.isPending}
          onChange={(v) => update.mutate({ is_published: v })}
        />
      </div>
    </header>
  );
}
