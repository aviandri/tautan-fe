import { Providers } from "../providers";
import "../globals.css";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
