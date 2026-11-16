"use client";

import { AlertCircle, Mail, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { QrCard } from "@/components/qr";
import { Button } from "@/components/ui";
import { Popover } from "@/components/ui/popover";
import { profileUrl } from "@/lib/qr";
import type { Profile } from "@/lib/types";

/** Share targets: plain intent URLs, no third-party scripts. */
function targets(url: string, name: string) {
  const text = `${name} on Tautan`;
  const u = encodeURIComponent(url);
  return [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { label: "X", href: `https://x.com/intent/post?url=${u}&text=${encodeURIComponent(text)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: "Telegram", href: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(text)}` },
  ];
}

export function SharePopover({ profile }: { profile: Profile }) {
  return (
    <Popover
      label="Share your page"
      className="w-[min(320px,calc(100vw-2rem))]"
      trigger={(p) => (
        <Button {...p} variant="secondary" size="sm" className="gap-1.5">
          <Share2 className="size-3.5" aria-hidden />
          <span className="max-sm:sr-only">Share</span>
        </Button>
      )}
    >
      {() => <ShareBody profile={profile} />}
    </Popover>
  );
}

function ShareBody({ profile }: { profile: Profile }) {
  const [url, setUrl] = useState("");
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setUrl(profileUrl(profile.username));
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, [profile.username]);
  const name = profile.display_name || `@${profile.username}`;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <p className="text-[15px] font-semibold">Share your page</p>
        <p className="text-[13px] text-muted">Scan, copy or send your link.</p>
      </div>
      {!profile.is_published && (
        <p className="flex items-start gap-2 rounded-xl bg-accent px-3 py-2 text-[13px] text-accent-ink">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Your page is a draft. Visitors see “page not found” until you publish.
        </p>
      )}
      <QrCard username={profile.username} compact />
      {url && (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-[12px] font-medium text-muted">Send to</p>
          <div className="flex flex-wrap gap-1.5">
            {targets(url, name).map((t) => (
              <a
                key={t.label}
                href={t.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-muted"
              >
                {t.label}
              </a>
            ))}
            <a
              href={`mailto:?subject=${encodeURIComponent(name)}&body=${encodeURIComponent(url)}`}
              className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-muted"
            >
              <Mail className="size-3.5" aria-hidden /> Email
            </a>
            {canShare && (
              <button
                type="button"
                onClick={() => navigator.share({ title: name, url }).catch(() => {})}
                className="rounded-full border border-line px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-muted"
              >
                More…
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
