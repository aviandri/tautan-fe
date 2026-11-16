import type { Metadata } from "next";
import { fontVariables } from "./fonts";
// No global CSS here: the app areas import ./globals.css (Tailwind + tokens) from their own layouts,
// and /[username] gets only a reset (its layout), so visitors never download the dashboard's utilities.

export const metadata: Metadata = {
  title: { default: "Tautan", template: "%s · Tautan" },
  description: "One link for everything you make.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
