import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailChangeLink } from "@/components/auth/EmailChangeLink";

// The URL carries a live token: keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Confirm your new email", referrer: "no-referrer", robots: { index: false } };

export default function ConfirmEmailChangePage() {
  return (
    <Suspense>
      <EmailChangeLink kind="confirm" />
    </Suspense>
  );
}
