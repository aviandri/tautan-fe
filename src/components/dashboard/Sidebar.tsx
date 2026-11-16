"use client";

import { BarChart3, Inbox, LayoutList, LogOut, Palette, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { cx } from "@/components/ui";
import { useLogout, useSession } from "@/lib/session";

/**
 * Dashboard routes. Ownership (see README):
 *   /dashboard, /dashboard/inbox, /dashboard/settings → editor session
 *   /dashboard/appearance, /dashboard/analytics       → tautan-c6
 */
export const NAV = [
  { href: "/dashboard", label: "Page", icon: LayoutList },
  { href: "/dashboard/appearance", label: "Appearance", icon: Palette },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
}

export function Sidebar() {
  const isActive = useIsActive();
  const logout = useLogout();
  const { data } = useSession();

  return (
    <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-surface/60 px-3 py-5 lg:flex">
      <Link href="/dashboard" className="mb-7 px-2.5" aria-label="Dashboard home">
        <Logo />
      </Link>
      <nav className="flex flex-col gap-0.5" aria-label="Dashboard">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                active ? "bg-foreground text-background" : "text-muted hover:bg-black/[.04] hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-line px-2.5 pt-4">
        <p className="truncate text-[13px] text-muted" title={data?.user.email}>
          {data?.user.email}
        </p>
        <button
          onClick={logout}
          className="mt-2 inline-flex items-center gap-2 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
        >
          <LogOut className="size-3.5" aria-hidden /> Log out
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Dashboard"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              active ? "text-foreground" : "text-muted",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
