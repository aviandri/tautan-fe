"use client";

import { AlertTriangle, Lock } from "lucide-react";
import Link from "next/link";
import { isPrivateUpload } from "@/lib/sell/checkout";
import { usePaymentProviders } from "@/lib/payments";

/**
 * Payments (b): tells the creator whether the page can take this currency
 * right now, and how the file is delivered.
 */
export function CheckoutHint({ currency, fileUrl }: { currency: string; fileUrl?: string }) {
  const q = usePaymentProviders();
  const on = q.data?.providers.filter((p) => p.enabled) ?? [];
  const fits = on.some((p) => p.currencies.includes(currency));
  const external = !!fileUrl && !fileUrl.includes("/uploads/");
  return (
    <div className="flex flex-col gap-2 text-[13px]">
      {q.data && !fits && (
        <p className="flex items-start gap-2 rounded-xl bg-accent px-3 py-2.5 text-accent-ink">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>
            {on.length === 0 ? "No payment provider is on yet, so visitors can't buy this." : `None of your providers takes ${currency}, so visitors can't buy this.`}{" "}
            <Link href="/dashboard/settings#payments" className="font-semibold underline underline-offset-2">
              Set up payments
            </Link>
          </span>
        </p>
      )}
      <p className="flex items-start gap-2 text-muted">
        <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          {external
            ? "This file is a link to another site, so anyone with that link can open it. Upload the file here to keep it private."
            : isPrivateUpload(fileUrl)
              ? "The file is private. Buyers get a download link after paying, and it isn't shown on your page."
              : "Buyers pay on the provider's checkout page, then get a private download link. The file is never shown on your page."}
        </span>
      </p>
    </div>
  );
}
