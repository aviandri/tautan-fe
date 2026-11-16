import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsV2 } from "@/components/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  // useSearchParams (range, interval and filters live in the URL) needs a Suspense boundary
  return (
    <div className="px-4 py-8 sm:px-6">
      <Suspense>
        <AnalyticsV2 />
      </Suspense>
    </div>
  );
}
