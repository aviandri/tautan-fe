"use client";

import { LiveScreen } from "@/components/onboarding/LiveScreen";
import { Spinner } from "@/components/ui";
import { useRequireSession } from "@/lib/session";

export default function LivePage() {
  const session = useRequireSession();
  if (!session.data)
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  return <LiveScreen profile={session.data.profile} />;
}
