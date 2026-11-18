"use client";

/** Kartu dashboard shell: logo, pill nav, publish state, share and the account menu. */
import { ChevronDown, ExternalLink, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand";
import { Button, cx } from "@/components/ui";
import { Menu, MenuItem, MenuLabel } from "@/components/ui/menu";
import { toast } from "@/components/ui/toast";
import { PUBLISH_BLOCKED } from "@/lib/verify-email";
import { ApiError, assetUrl } from "@/lib/api";
import { useUpdateProfile } from "@/lib/profile";
import { useLogout, useSession } from "@/lib/session";
import type { Profile } from "@/lib/types";
import { SharePopover } from "./SharePopover";

/**
 * Dashboard routes. Ownership:
 *   /dashboard, /dashboard/{audience,forms,inbox,settings} → editor session
 *   /dashboard/appearance, /dashboard/analytics       → tautan-c6
 */
export const NAV = [
  { href: "/dashboard", label: "Page", match: (p: string) => p === "/dashboard" },
  { href: "/dashboard/appearance", label: "Design", match: (p: string) => p.startsWith("/dashboard/appearance") },
  { href: "/dashboard/analytics", label: "Insights", match: (p: string) => p.startsWith("/dashboard/analytics") },
  {
    href: "/dashboard/audience",
    label: "Audience",
    match: (p: string) => ["/dashboard/audience", "/dashboard/forms", "/dashboard/inbox"].some((x) => p.startsWith(x)),
  },
  { href: "/dashboard/settings", label: "Settings", match: (p: string) => p.startsWith("/dashboard/settings") },
] as const;

export function initials(p: Pick<Profile, "display_name" | "username">) {
  const src = p.display_name?.trim() || p.username;
  const parts = src.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : src.slice(0, 2)).toUpperCase();
}

export function Avatar({ profile, size = 40, className }: { profile: Profile; size?: number; className?: string }) {
  const src = assetUrl(profile.avatar_url);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={cx("shrink-0 rounded-full object-cover", className)} style={{ width: size, height: size }} />
  ) : (
    <span
      className={cx("inline-flex shrink-0 items-center justify-center rounded-full bg-butter font-bold text-foreground", className)}
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials(profile)}
    </span>
  );
}

function PillNav({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className={cx("flex gap-0.5 rounded-full bg-sunken p-1", className)}>
      {NAV.map((n) => {
        const on = n.match(pathname);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={cx(
              "inline-flex h-[38px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-colors",
              on ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:bg-surface/55 hover:text-foreground",
            )}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function PublishControl({ profile }: { profile: Profile }) {
  const update = useUpdateProfile();
  const set = (is_published: boolean) =>
    update.mutate(
      { is_published },
      {
        onSuccess: () => toast.success(is_published ? "Your page is live" : "Your page is a draft again"),
        onError: (e) =>
          toast.error(
            e instanceof ApiError && e.code === "username_not_claimed"
              ? "Pick your page address in Settings first."
              : e instanceof ApiError && e.code === "email_unverified"
                ? PUBLISH_BLOCKED
                : "Couldn't change that. Try again.",
          ),
      },
    );
  if (!profile.is_published)
    return (
      <Button size="sm" onClick={() => set(true)} loading={update.isPending}>
        Publish page
      </Button>
    );
  return (
    <Menu
      trigger={(p) => (
        <button
          type="button"
          {...p}
          className="inline-flex h-[38px] items-center gap-2 rounded-full px-3 text-[14px] font-semibold text-ink-2 transition-colors hover:bg-sunken hover:text-foreground"
        >
          <span className="k-live" aria-hidden />
          Live
          <ChevronDown className="size-3.5" aria-hidden />
        </button>
      )}
    >
      {(close) => (
        <>
          <MenuLabel>Your page is public</MenuLabel>
          <a role="menuitem" href={`/${profile.username}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-sunken">
            <ExternalLink className="size-3.5 text-muted" aria-hidden /> Open my page
          </a>
          <MenuItem
            onSelect={() => {
              set(false);
              close();
            }}
          >
            Unpublish (make it a draft)
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function AccountMenu({ profile }: { profile: Profile }) {
  const { data } = useSession();
  const logout = useLogout();
  return (
    <Menu
      trigger={(p) => (
        <button type="button" {...p} aria-label="Account menu" className="rounded-full transition-transform hover:-translate-y-px focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand">
          <Avatar profile={profile} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="px-3 pb-2 pt-1.5">
            <p className="truncate text-sm font-semibold">{profile.display_name || `@${profile.username}`}</p>
            <p className="truncate text-[13px] text-muted">{data?.user.email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" href="/dashboard/settings" onClick={close} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-sunken">
            <Settings className="size-3.5 text-muted" aria-hidden /> Settings
          </Link>
          <MenuItem onSelect={logout}>
            <LogOut className="size-3.5 text-muted" aria-hidden /> Log out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

export function TopNav({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3 sm:px-7 sm:py-3.5">
        <Link href="/dashboard" aria-label="Tautan dashboard" className="shrink-0">
          <Logo />
        </Link>
        <PillNav className="mx-auto hidden md:flex" />
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <PublishControl profile={profile} />
          <SharePopover profile={profile} />
          <AccountMenu profile={profile} />
        </div>
      </div>
      <div className="overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:hidden">
        <PillNav className="w-max" />
      </div>
    </header>
  );
}
