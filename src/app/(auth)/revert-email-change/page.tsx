import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailChangeLink } from "@/components/auth/EmailChangeLink";

// The URL carries a live token: keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Undo email change", referrer: "no-referrer", robots: { index: false } };

export default function RevertEmailChangePage() {
  return (
    <Suspense>
      <EmailChangeLink kind="revert" />
    </Suspense>
  );
}
