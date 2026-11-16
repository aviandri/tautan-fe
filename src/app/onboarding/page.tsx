"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Wizard } from "@/components/onboarding/Wizard";
import { Spinner } from "@/components/ui";
import { homeFor, useRequireSession } from "@/lib/session";

export default function OnboardingPage() {
  const session = useRequireSession();
  const router = useRouter();
  const done = session.data && homeFor(session.data.profile) !== "/onboarding";
  useEffect(() => {
    if (done) router.replace("/dashboard");
  }, [done, router]);

  if (!session.data || done)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  return <Wizard profile={session.data.profile} />;
}
