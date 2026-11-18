import type { Metadata } from "next";
import { Suspense } from "react";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
