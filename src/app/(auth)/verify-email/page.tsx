import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmail } from "./VerifyEmail";

// The URL carries a live token: keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Confirm your email", referrer: "no-referrer", robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmail />
    </Suspense>
  );
}
