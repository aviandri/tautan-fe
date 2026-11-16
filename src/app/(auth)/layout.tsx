import Link from "next/link";
import { Logo } from "@/components/brand";
import { Providers } from "../providers";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex flex-col px-6 py-6 sm:px-10">
          <Link href="/" className="w-fit" aria-label="Tautan home">
            <Logo />
          </Link>
          <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
            {children}
          </main>
          <p className="text-[13px] text-muted">© {new Date().getFullYear()} Tautan</p>
        </div>
        <AuthAside />
      </div>
    </Providers>
  );
}

/** A small rendering of a real Tautan page, so the right side shows the product. */
function AuthAside() {
  const rows = ["Latest episode", "Book a session", "Shop prints", "Newsletter"];
  return (
    <aside
      aria-hidden
      className="relative hidden overflow-hidden bg-brand lg:flex lg:items-center lg:justify-center"
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_10%,#2f7a63_0%,transparent_60%)]" />
      <div className="relative w-[300px] rotate-[-4deg] rounded-[40px] border border-white/15 bg-[#f4efe4] p-3 shadow-[0_40px_80px_-20px_rgba(0,0,0,.45)]">
        <div className="rounded-[30px] bg-[#f4efe4] px-5 pb-8 pt-10 text-center">
          <div className="mx-auto size-16 rounded-full bg-[conic-gradient(from_200deg,#e8743b,#f2b46d,#1f5c4a,#e8743b)]" />
          <p className="mt-3 text-[15px] font-semibold text-[#1d1b16]">Raka Pratama</p>
          <p className="text-[12px] text-[#6b6858]">Photographer · Bandung</p>
          <div className="mt-5 flex flex-col gap-2.5">
            {rows.map((r) => (
              <div
                key={r}
                className="rounded-2xl bg-[#1d1b16] px-4 py-3 text-[13px] font-medium text-[#f4efe4]"
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="absolute bottom-8 left-10 right-10 text-[15px] leading-relaxed text-white/80">
        tautan.id/<span className="text-white">yourname</span> holds your links, music, videos and a
        contact form, on one page you edit in minutes.
      </p>
    </aside>
  );
}
