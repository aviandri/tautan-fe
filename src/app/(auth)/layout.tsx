import Link from "next/link";
import { Logo } from "@/components/brand";
import { Providers } from "../providers";
import "../globals.css";

/** Kartu auth: the form on the left, a blush panel with a page taking shape on the right. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-dvh flex-wrap bg-background">
        <div className="flex min-w-0 flex-[1_1_560px] flex-col px-6 py-6 sm:px-12 sm:py-7">
          <Link href="/" className="w-fit" aria-label="Tautan home">
            <Logo />
          </Link>
          <main className="k-enter mx-auto my-auto flex w-full max-w-[440px] flex-col py-12">{children}</main>
          <p className="text-[13px] text-muted">By continuing you agree to the Tautan Terms and Privacy policy.</p>
        </div>
        <AuthAside />
      </div>
    </Providers>
  );
}

/** A page taking shape: blank avatar, pastel rows, a floating phone. Decorative. */
function AuthAside() {
  return (
    <aside aria-hidden className="relative m-3.5 hidden min-w-0 flex-[1_1_560px] items-center justify-center overflow-hidden rounded-[36px] bg-blush lg:flex">
      <svg className="absolute inset-0 size-full" viewBox="0 0 600 860" preserveAspectRatio="xMidYMid slice">
        <g opacity=".55">
          <rect x="40" y="60" width="150" height="90" rx="26" fill="var(--mint)" />
          <rect x="420" y="120" width="130" height="130" rx="30" fill="var(--butter)" />
          <rect x="60" y="640" width="170" height="110" rx="28" fill="var(--sky)" />
          <rect x="410" y="660" width="140" height="80" rx="24" fill="#fff" />
        </g>
      </svg>
      <div className="relative flex flex-col items-center gap-[18px]">
        <div className="k-float w-[290px] rounded-[48px] bg-[#111] p-[10px] shadow-lift">
          <div className="flex h-[560px] flex-col items-center gap-2.5 rounded-[39px] bg-white px-[18px] pb-[18px] pt-11">
            <span className="flex size-[76px] items-center justify-center rounded-full bg-sunken text-muted">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
              </svg>
            </span>
            <span className="mt-1.5 h-3.5 w-[120px] rounded-full bg-sunken" />
            <span className="mb-2.5 h-2.5 w-[170px] rounded-full bg-background" />
            <span className="h-[50px] w-full rounded-full bg-blush" />
            <span className="h-[50px] w-full rounded-full bg-sunken" />
            <span className="h-[50px] w-full rounded-full bg-sunken" />
            <span className="grid w-full grid-cols-2 gap-2">
              <span className="aspect-square rounded-[20px] bg-mint" />
              <span className="aspect-square rounded-[20px] bg-sky" />
            </span>
          </div>
        </div>
        <span className="flex items-center gap-2.5 rounded-full bg-surface px-[18px] py-3 font-semibold shadow-card">
          <span className="k-live" />
          Your page takes shape in the next step
        </span>
      </div>
    </aside>
  );
}
