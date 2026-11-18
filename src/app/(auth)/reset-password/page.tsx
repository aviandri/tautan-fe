import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetForm } from "./ResetForm";

// The URL carries a live token: keep it out of Referer headers and search indexes.
export const metadata: Metadata = { title: "Choose a new password", referrer: "no-referrer", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
