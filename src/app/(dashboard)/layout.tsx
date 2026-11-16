"use client";

import { TopNav } from "@/components/dashboard/TopNav";
import { Spinner } from "@/components/ui";
import { Toaster } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useRequireSession } from "@/lib/session";
import { Providers } from "../providers";
import "../globals.css";

// React Query lives here (and in the auth/onboarding layouts), not in the root layout, so the
// public /[username] page doesn't download it.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const session = useRequireSession();
  const router = useRouter();
  const needsOnboarding = homeFor(session.data?.profile) === "/onboarding";
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (!session.data || needsOnboarding) {
    return (
      <div className={`grid min-h-dvh place-items-center`}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`flex min-h-dvh flex-col`} data-kartu-root>
      <TopNav profile={session.data.profile} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      <Toaster />
    </div>
  );
}
