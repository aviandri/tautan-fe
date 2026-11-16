"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { href: "/dashboard/audience", label: "Contacts" },
  { href: "/dashboard/forms", label: "Form responses" },
  { href: "/dashboard/inbox", label: "Inbox" },
  { href: "/dashboard/audience/questions", label: "Questions" },
  { href: "/dashboard/audience/giveaways", label: "Giveaways" },
];

/** Sub-navigation for the Audience area (the top nav's "Audience" covers all of these). */
export function AudienceNav() {
  const path = usePathname();
  const current = ITEMS.slice(1).find((i) => path.startsWith(i.href))?.href ?? ITEMS[0].href;
  return (
    <nav aria-label="Audience sections" className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="inline-flex w-max gap-1 rounded-full bg-sunken p-1">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={current === i.href ? "page" : undefined}
          className={cx(
            "inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] font-semibold transition-colors",
            current === i.href ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
      </div>
    </nav>
  );
}
