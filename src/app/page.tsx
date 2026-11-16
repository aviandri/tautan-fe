import Link from "next/link";
import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Mark, NAV_LINKS } from "@/components/landing/brand";
import { EditorWindow } from "@/components/landing/EditorWindow";
import { BlocksBento, QrPoster, ThemesStrip } from "@/components/landing/Showcase";
import { AnalyticsPanelLazy } from "@/components/landing/AnalyticsPanelLazy";
import s from "@/components/landing/landing.module.css";

/*
  tasteskill deal (design-taste-frontend): kind software · hero centred (one window) · nav-centre ·
  footer-statement · close-word · rhythm dark-band · buttons pill · mark initial ·
  moment line-carries-colour (themes section) + the hero window loop.
  Palette: the client's own tokens (globals.css: brand green, accent orange, warm paper ground).
  Voice: plain-practical. Short concrete sentences, product as the subject, no virtue words.
*/

export const metadata: Metadata = {
  title: { absolute: "Tautan: link-in-bio pages for creators and shops" },
  description:
    "Put your links, videos, music, questions and a contact form on one page under your name. Eight themes, live preview, click analytics and a QR code.",
  openGraph: {
    title: "Tautan: link-in-bio pages for creators and shops",
    description: "Links, videos, music, questions and a contact form on one page under your name.",
    type: "website",
    siteName: "Tautan",
  },
};

const FAQ = [
  {
    q: "Can I use my own domain?",
    a: "Not yet. Your page lives at your Tautan username for now. Custom domains are planned for a later release.",
  },
  {
    q: "Does the contact form show my email address?",
    a: "No. Messages go to the inbox in your dashboard, and you reply from your own email when you choose to.",
  },
  {
    q: "Can I hide a block without deleting it?",
    a: "Yes. A hidden block stays in your editor and disappears from your public page until you switch it back on.",
  },
  {
    q: "What does analytics record?",
    a: "Page views and link clicks, with the site that sent each visitor, their country and their device type. It stores no names or contact details.",
  },
  {
    q: "Can I split my page into sections?",
    a: "Yes, with tabs. Each tab has its own blocks and its own link, so you can send people straight to your class schedule.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        {/* hero */}
        <section id="top" className={s.hero} aria-labelledby="hero-h">
          <div className={`${s.wrap} flex h-full flex-col items-center text-center`}>
            <p className={`${s.enter} rounded-full border border-line bg-surface px-3.5 py-1 text-sm text-muted`}>
              10 block types and 8 themes
            </p>
            <h1
              id="hero-h"
              className={`${s.enter2} mt-4 max-w-[16ch] text-[40px] font-semibold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[72px]`}
            >
              Link-in-bio pages for creators and shops
            </h1>
            <p className={`${s.enter3} mt-4 max-w-[52ch] text-[17px] leading-[1.5] text-muted sm:text-xl`}>
              Put your links, videos, music, questions and a contact form on one page under your name. Edit it beside a live phone
              preview.
            </p>
            <div className={`${s.enter4} mt-7 flex flex-wrap justify-center gap-3`}>
              <Link href="/signup" className={s.btnPrimary}>
                Create your page
              </Link>
              <a href="#themes" className={s.btnSecondary}>
                See the themes
              </a>
            </div>
            <div className={`${s.enter4} ${s.heroFrame} w-full flex-1`}>
              <EditorWindow />
            </div>
          </div>
        </section>

        {/* blocks */}
        <section id="blocks" className={s.section} aria-labelledby="blocks-h">
          <div className={s.wrap}>
            <div className="mb-10 max-w-2xl">
              <h2 id="blocks-h" className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
                Blocks for links, media and questions
              </h2>
              <p className="mt-3 text-lg text-muted">
                Drag blocks into order. Hide one for a while without deleting it.
              </p>
            </div>
            <BlocksBento />
          </div>
        </section>

        {/* themes: dark band + moment */}
        <section id="themes" className={`${s.dark} ${s.momentScope}`} aria-labelledby="themes-h">
          <div className={s.momentPanel} aria-hidden />
          <div className={s.momentLine} aria-hidden />
          <div className={`${s.wrap} ${s.momentContent}`}>
            <div className="mb-10 max-w-2xl">
              <h2 id="themes-h" className="text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
                Eight themes to start from
              </h2>
              <p className="mt-3 text-lg text-[#b9b6a6]">
                Then change the background, button shape, colours and font. The preview updates as you go.
              </p>
            </div>
            <ThemesStrip />
          </div>
        </section>

        {/* analytics */}
        <section id="analytics" className={s.section} aria-labelledby="analytics-h">
          <div className={`${s.wrap} grid grid-cols-1 items-start gap-12 lg:grid-cols-[5fr_7fr]`}>
            <div className="lg:pt-6">
              <h2 id="analytics-h" className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
                See which links get clicked
              </h2>
              <p className="mt-3 text-lg text-muted">
                Views, clicks and click-through rate for the last 7, 30 or 90 days. Your top links and the sites that sent visitors
                sit underneath.
              </p>
            </div>
            <AnalyticsPanelLazy />
          </div>
        </section>

        {/* QR */}
        <section id="qr" className={s.section} aria-labelledby="qr-h">
          <div className={`${s.wrap} grid grid-cols-1 items-center gap-12 lg:grid-cols-2`}>
            <div className="order-2 lg:order-1">
              <QrPoster />
            </div>
            <div className="order-1 lg:order-2">
              <h2 id="qr-h" className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
                A QR code for your counter
              </h2>
              <p className="mt-3 max-w-[44ch] text-lg text-muted">
                Download it as PNG for flyers and packaging, or SVG to print at any size. It opens your page in the phone&apos;s camera.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="questions" className={s.section} aria-labelledby="faq-h">
          <div className={`${s.wrap} grid grid-cols-1 gap-10 lg:grid-cols-[5fr_7fr]`}>
            <h2 id="faq-h" className="text-[32px] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
              Questions about Tautan pages
            </h2>
            <div className="flex flex-col border-t border-line">
              {FAQ.map((f) => (
                <details key={f.q} className="group border-b border-line">
                  <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 py-4 text-lg font-medium text-foreground [&::-webkit-details-marker]:hidden">
                    <span className="flex-1">{f.q}</span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="max-w-[60ch] pb-5 text-[17px] leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* close (close-word) + footer (footer-statement) */}
      <footer id="contact" className={s.footer}>
        <div className={`${s.wrap} pb-10 pt-28`}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className="text-[32px] font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">Your page, under your name</h2>
              <p className="mt-3 text-lg text-[#b9b6a6]">Pick a username, add your first links and publish when it looks right.</p>
            </div>
            <Link href="/signup" className={s.btnOnDark}>
              Create your page
            </Link>
          </div>
          <div className={`${s.bigName} mt-16`} aria-hidden>
            tautan
          </div>
          <div className="mt-14 flex flex-wrap items-start justify-between gap-8 border-t border-white/15 pt-8 text-[15px]">
            <div className="flex items-center gap-2.5 font-semibold">
              <Mark />
              Tautan
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-[#d8d5c7]">
              {NAV_LINKS.map((l) => (
                <a key={l.href} href={l.href} className={s.link}>
                  {l.label}
                </a>
              ))}
              <Link href="/login" className={s.link}>
                Log in
              </Link>
            </nav>
          </div>
          <p className="mt-8 text-[13px] text-[#9d9a8b]">
            © {new Date().getFullYear()} Tautan · Product names and logos are trademarks of their owners.
          </p>
        </div>
      </footer>
    </>
  );
}
