"use client";

import { Sidebar, MobileNav } from "@/components/dashboard/Sidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { Spinner } from "@/components/ui";
import { useRequireSession } from "@/lib/session";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = useRequireSession();

  if (!session.data) {
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
    </div>
  );
}
