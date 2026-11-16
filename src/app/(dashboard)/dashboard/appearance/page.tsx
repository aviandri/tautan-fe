import type { Metadata } from "next";
import { Appearance } from "@/components/appearance/Appearance";

export const metadata: Metadata = { title: "Appearance" };

export default function AppearancePage() {
  return <Appearance />;
}
