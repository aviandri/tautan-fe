"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Wizard } from "@/components/onboarding/Wizard";
import { Spinner } from "@/components/ui";
import { homeFor, useRequireSession } from "@/lib/session";

export default function OnboardingPage() {
  const session = useRequireSession();
  const router = useRouter();
  // Decide once, from the first load: finishing the wizard updates the profile optimistically,
  // and that must not race the wizard's own hand-off to /onboarding/live.
  const alreadyDone = useRef<boolean | null>(null);
  if (session.data && alreadyDone.current === null) alreadyDone.current = homeFor(session.data.profile) !== "/onboarding";
  const done = alreadyDone.current === true;
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
