"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

const ITEMS = [
  { href: "/dashboard/audience", label: "Contacts" },
  { href: "/dashboard/audience/questions", label: "Questions" },
  { href: "/dashboard/audience/giveaways", label: "Giveaways" },
];

/** Sub-navigation for the Audience area. */
export function AudienceNav() {
  const path = usePathname();
  const current = ITEMS.slice(1).find((i) => path.startsWith(i.href))?.href ?? ITEMS[0].href;
  return (
    <nav aria-label="Audience sections" className="-mb-1 flex gap-1 border-b border-line">
      {ITEMS.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={current === i.href ? "page" : undefined}
          className={cx(
            "-mb-px border-b-2 px-3 pb-2.5 pt-1 text-[14px] font-medium transition-colors",
            current === i.href ? "border-foreground text-foreground" : "border-transparent text-muted hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
