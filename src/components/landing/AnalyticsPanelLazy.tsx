"use client";

import dynamic from "next/dynamic";

// recharts is ~100 kB; the panel sits below the fold, so load it after the first screen.
export const AnalyticsPanelLazy = dynamic(() => import("./AnalyticsPanel").then((m) => m.AnalyticsPanel), {
  ssr: false,
  loading: () => <div className="h-[536px] rounded-[20px] border border-line bg-surface" aria-hidden />,
});
