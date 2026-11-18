import { Suspense } from "react";
import { Settings } from "@/components/settings/Settings";

export default function SettingsPage() {
  // Settings reads ?notice= (useSearchParams) in its Account section.
  return (
    <Suspense>
      <Settings />
    </Suspense>
  );
}
