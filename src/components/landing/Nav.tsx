"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import s from "./landing.module.css";
import { Mark, NAV_LINKS } from "./brand";

export function Nav() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>
      <nav aria-label="Main" className={`${s.wrap} flex h-16 items-center`}>
        <Link href="#top" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-tight text-foreground">
          <Mark />
          Tautan
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-[15px] text-muted md:flex">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className={`${s.link} py-2 hover:text-foreground`}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-5 md:flex">
          <Link href="/login" className={`${s.link} text-[15px] text-foreground`}>
            Log in
          </Link>
          <Link href="/signup" className={s.btnPrimary} style={{ minHeight: 40, padding: "0 18px" }}>
            Create your page
          </Link>
        </div>

        <button
          type="button"
          className="ml-auto grid h-11 w-11 place-items-center rounded-lg text-foreground md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {open ? (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col bg-background px-4 pb-8 pt-6 md:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-14 items-center border-b border-line text-2xl font-semibold tracking-tight text-foreground"
                >
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className="flex min-h-14 items-center border-b border-line text-2xl font-semibold tracking-tight text-foreground">
                Log in
              </Link>
            </li>
          </ul>
          <Link href="/signup" className={`${s.btnPrimary} mt-auto w-full`}>
            Create your page
          </Link>
        </div>
      ) : null}
    </header>
  );
}
