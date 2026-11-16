"use client";

import { Sidebar, MobileNav } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { Spinner } from "@/components/ui";
import { Toaster } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor, useRequireSession } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = useRequireSession();
  const router = useRouter();
  const needsOnboarding = homeFor(session.data?.profile) === "/onboarding";
  useEffect(() => {
    if (needsOnboarding) router.replace("/onboarding");
  }, [needsOnboarding, router]);

  if (!session.data || needsOnboarding) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <Sidebar />
      <div className="flex min-w-0 flex-col pb-20 lg:pb-0">
        <TopBar profile={session.data.profile} />
        <main className="flex-1">{children}</main>
      </div>
      <MobileNav />
      <Toaster />
    </div>
  );
}
