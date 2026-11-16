import { Suspense } from "react";
import type { Metadata } from "next";
import { AnalyticsDashboard } from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  // useSearchParams (the ?range= filter) needs a Suspense boundary
  return (
    <div className="px-4 py-8 sm:px-6">
      <Suspense>
        <AnalyticsDashboard />
      </Suspense>
    </div>
  );
}
