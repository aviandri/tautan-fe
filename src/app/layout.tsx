import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// No global CSS here: the app areas import ./globals.css (Tailwind + tokens) from their own layouts,
// and /[username] gets only a reset (its layout), so visitors never download the dashboard's utilities.

// preload:false: public pages render in their theme font and must not fetch these (perf budget);
// the dashboard still gets them, just without the high-priority preload.
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap", preload: false });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: { default: "Tautan", template: "%s · Tautan" },
  description: "One link for everything you make.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
