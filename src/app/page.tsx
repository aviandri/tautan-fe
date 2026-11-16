import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Check, FileDown, Mail, Plus, ShoppingBag, TrendingUp, Video } from "lucide-react";
import { PublicPage } from "@/components/public";
import { Logo } from "@/components/brand";
import { BLOCK_TYPES } from "@/lib/types";
import { PRESETS } from "@/lib/theme/presets";
import { backgroundValue } from "@/lib/theme/resolve";
import { SAMPLE_BLOCKS, SAMPLE_TABS, sampleProfile } from "@/components/landing/sample";
import "./globals.css";

/*
  Kartu (design direction B, canvas "Kartu · full app" → Landing page): off-white ground, pastel
  cards, magenta accent, Urbanist + DM Mono, round radii. Copy is plain and true to the product:
  numbers come from the code (card count, presets), and nothing here is a testimonial or a price.
*/

export const metadata: Metadata = {
  title: { absolute: "Tautan: link-in-bio pages for creators and small shops" },
  description: "Put your shop, booking calendar, downloads and sign-up form on one page. Drag cards into order and watch the page change as you go.",
  openGraph: {
    title: "Tautan: link-in-bio pages for creators and small shops",
    description: "Your shop, bookings, downloads and sign-ups on one page under your name.",
    type: "website",
    siteName: "Tautan",
  },
};

const CARD_COUNT = BLOCK_TYPES.length;
const NAV = [
  { href: "#cards", label: "Cards" },
  { href: "#looks", label: "Looks" },
  { href: "#insights", label: "Insights" },
  { href: "#questions", label: "Questions" },
];

const FAQ = [
  { q: "Can I keep my old links when I switch?", a: "Yes. Paste your Linktree or any public link page while you set up, and Tautan brings over your links, photo, bio and social icons." },
  { q: "What happens if I change my username?", a: "Your old address keeps working and forwards visitors to the new one." },
  { q: "Can I use my own domain?", a: "Not yet. Pages live at tautan.id/yourname for now." },
  { q: "Do my visitors need an account?", a: "No. Anyone with the link can open your page, book, download, order on WhatsApp and sign up." },
  { q: "Does Tautan take a cut of my sales?", a: "No. Buy buttons send people to your WhatsApp, your marketplace store or your own checkout; Tautan doesn't process payments." },
];

/** "tautan.id/ [yourname] Start your page": a plain GET to /signup?u=…, so it works before any JS. */
function ClaimForm({ id, dark = false }: { id: string; dark?: boolean }) {
  return (
    <form action="/signup" method="get" className={`flex w-full max-w-[520px] items-center gap-1.5 rounded-full bg-surface py-1.5 pl-[22px] pr-1.5 ${dark ? "" : "shadow-[0_0_0_1px_var(--line-2)]"}`}>
      <label htmlFor={id} className="whitespace-nowrap font-semibold text-muted">
        tautan.id/
      </label>
      <input
        id={id}
        name="u"
        placeholder="yourname"
        autoComplete="off"
        spellCheck={false}
        pattern="[a-z0-9_.]{3,30}"
        title="3–30 lowercase letters, numbers, _ or ."
        className="h-11 min-w-0 flex-1 bg-transparent text-[17px] font-semibold text-foreground outline-none placeholder:text-[#a3a39c]"
      />
      <button type="submit" className="inline-flex h-12 shrink-0 items-center rounded-full bg-brand px-[22px] text-[15px] font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover active:scale-[0.97]">
        <span className="sm:hidden">Start</span>
        <span className="hidden sm:inline">Start your page</span>
      </button>
    </form>
  );
}

function Phone({ width = 300, height = 600, children }: { width?: number; height?: number; children: React.ReactNode }) {
  return (
    <div className="rounded-[48px] bg-[#111] p-2.5 shadow-lift" style={{ width }}>
      <div className="relative overflow-hidden rounded-[39px]" style={{ height }}>
        <div className="h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

const Section = ({ id, label, tone = "", children }: { id?: string; label: string; tone?: string; children: React.ReactNode }) => (
  <section id={id} aria-labelledby={`${label}-h`} className={`flex flex-col justify-center py-[72px] md:min-h-[860px] md:py-28 ${tone}`}>
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 md:px-10">{children}</div>
  </section>
);

const H2 = ({ id, children, className = "" }: { id: string; children: React.ReactNode; className?: string }) => (
  <h2 id={id} className={`text-[36px] font-semibold leading-[1.02] tracking-[-0.04em] md:text-[48px] ${className}`}>
    {children}
  </h2>
);

export default function Home() {
  return (
    <div className="bg-background font-sans text-foreground antialiased">
      {/* 1 · Hero */}
      <section className="flex flex-col md:min-h-[900px]">
        <header className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-7 px-4 py-[22px] md:px-10">
          <Link href="/" aria-label="Tautan home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="mx-auto hidden gap-0.5 rounded-full bg-sunken p-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="inline-flex h-[38px] items-center rounded-full px-4 text-[15px] font-semibold text-ink-2 transition hover:bg-white/55 hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-5 md:ml-0">
            <Link href="/login" className="font-semibold">
              Log in
            </Link>
            <Link href="/signup" className="inline-flex h-[38px] items-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-brand-hover">
              Start your page
            </Link>
          </div>
        </header>

        <main id="main" className="mx-auto flex w-full max-w-[1280px] flex-1 flex-wrap items-center gap-14 px-4 pb-14 md:px-10">
          <div className="k-enter flex min-w-0 flex-[1_1_480px] flex-col gap-[26px]">
            <span className="inline-flex h-6 items-center self-start rounded-full bg-brand-soft px-2.5 font-mono text-xs font-medium text-brand-hover">{CARD_COUNT} kinds of cards, one page</span>
            <h1 className="text-[48px] font-semibold leading-[0.98] tracking-[-0.045em] md:text-[80px]">Link-in-bio pages for creators and small shops</h1>
            <p className="max-w-[520px] text-xl leading-normal text-ink-2">Put your shop, booking calendar, downloads and sign-up form on one page. Drag cards into order and watch the page change as you go.</p>
            <ClaimForm id="claim-top" />
            <p className="text-[13px] text-muted">Bring your links from Linktree or any link page in one paste.</p>
          </div>

          <div aria-label="A Tautan page on a phone" className="relative flex h-[640px] min-w-0 flex-[1_1_520px] items-center justify-center">
            <div className="k-float absolute left-0 top-[70px] z-[3] hidden w-[230px] items-center gap-3 rounded-k-l bg-mint px-[18px] py-4 shadow-card sm:flex" aria-hidden>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/80">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <div>
                <div className="font-bold">New booking</div>
                <div className="text-sm text-muted">Wheel class, Sat 10:00</div>
              </div>
            </div>
            <div className="k-float absolute right-0 top-[330px] z-[3] hidden w-[210px] rounded-k-l bg-butter px-[18px] py-4 shadow-card [animation-delay:.6s] sm:block" aria-hidden>
              <div className="font-mono text-xs text-muted">Code copied</div>
              <div className="font-mono text-[22px] font-medium tracking-[0.06em]">LEMPUNG15</div>
              <div className="text-sm text-ink-2">Shows up in Insights</div>
            </div>
            <div className="k-float absolute bottom-[60px] left-[30px] z-[3] hidden w-[220px] items-center gap-3 rounded-k-l bg-sky px-[18px] py-4 shadow-card [animation-delay:1.1s] sm:flex" aria-hidden>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-white/80">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <div className="font-bold">New subscriber</div>
                <div className="text-sm text-muted">from your sign-up card</div>
              </div>
            </div>
            <div className="relative z-[1]">
              <Phone>
                <PublicPage profile={sampleProfile()} tabs={SAMPLE_TABS.slice(0, 1)} blocks={SAMPLE_BLOCKS} preview style={{ padding: "40px 16px 16px", minHeight: "100%" }} />
              </Phone>
            </div>
          </div>
        </main>
      </section>

      {/* 2 · Editor */}
      <Section label="editor" tone="bg-surface">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <H2 id="editor-h" className="max-w-[640px]">
            An editor that shows your page while you build it
          </H2>
          <p className="max-w-[420px] text-lg leading-normal text-ink-2">Every change lands on the phone preview the moment you make it. Publish when it looks right.</p>
        </div>
        <div className="rounded-k-xl bg-sunken p-3.5">
          <div className="flex min-h-[520px] flex-wrap gap-[22px] rounded-[26px] bg-background p-[22px]">
            <div className="flex min-w-[220px] flex-[0_1_250px] flex-col gap-2.5">
              <div className="text-[17px] font-bold tracking-[-0.015em]">Add a card</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["Link", "bg-mint"],
                  ["Product", "bg-blush"],
                  ["Booking", "bg-sky"],
                  ["Discount code", "bg-butter"],
                  ["WhatsApp order", "bg-sunken"],
                  ["Countdown", "bg-peach"],
                ].map(([t, c]) => (
                  <span key={t} className={`flex h-[78px] items-end rounded-[18px] p-3 text-[13px] font-bold ${c}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="inline-flex h-[34px] items-center rounded-full bg-foreground px-3.5 text-sm font-semibold text-white">Shop</span>
                <span className="inline-flex h-[34px] items-center rounded-full bg-sunken px-3.5 text-sm font-semibold">Classes</span>
                <span className="ml-auto flex items-center gap-1.5 text-sm text-muted">
                  <span className="k-live h-2 w-2 rounded-full bg-ok" aria-hidden />
                  Saved
                </span>
              </div>
              {[
                { t: "Order stoneware plates", d: "Link", icon: <ShoppingBag className="h-5 w-5" />, c: "bg-mint" },
                { t: "Saturday wheel class", d: "Booking · moving up", icon: <CalendarCheck className="h-5 w-5" />, c: "bg-blush", lifted: true },
                { t: "Kiln tour", d: "Video", icon: <Video className="h-5 w-5" />, c: "bg-sky" },
                { t: "LEMPUNG15", d: "Discount code · hides 20 Dec", icon: <FileDown className="h-5 w-5" />, c: "bg-butter" },
              ].map((r) => (
                <div
                  key={r.t}
                  className={`flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3.5 ${r.lifted ? "translate-x-2.5 shadow-[0_0_0_2px_var(--accent),0_24px_40px_-24px_rgba(208,16,111,.5)]" : "shadow-card"}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${r.c}`} aria-hidden>
                    {r.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{r.t}</div>
                    <div className="text-[13px] text-muted">{r.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-[0_1_270px] justify-center">
              <Phone width={250} height={470}>
                <PublicPage profile={sampleProfile()} tabs={SAMPLE_TABS.slice(0, 1)} blocks={SAMPLE_BLOCKS.slice(0, 3)} preview style={{ padding: "30px 12px 12px", minHeight: "100%" }} />
              </Phone>
            </div>
          </div>
        </div>
      </Section>

      {/* 3 · Cards */}
      <Section id="cards" label="cards">
        <H2 id="cards-h" className="max-w-[760px]">
          {CARD_COUNT} cards for links, sales and sign-ups. <span className="text-muted">Each one tracks its own taps.</span>
        </H2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <Mini tone="bg-blush" wide title="Sells a product, with variants and a WhatsApp order button">
            <div className="flex flex-wrap gap-1.5">
              {["Matte white", "Ash glaze", "Speckled"].map((v, i) => (
                <span key={v} className={`inline-flex h-[34px] items-center rounded-full px-3.5 text-sm font-semibold ${i === 1 ? "bg-foreground text-white" : "bg-white"}`}>
                  {v}
                </span>
              ))}
              <span className="ml-auto inline-flex h-[34px] items-center rounded-full bg-[#1d7a4a] px-3.5 text-sm font-semibold text-white">Order on WhatsApp</span>
            </div>
          </Mini>
          <Mini tone="bg-butter" title="Copies a discount code">
            <div className="flex items-center rounded-[18px] border-2 border-dashed border-black/25 p-3">
              <span className="flex-1 font-mono text-lg font-medium">LEMPUNG15</span>
              <span className="text-[13px] font-bold">Copy</span>
            </div>
          </Mini>
          <Mini tone="bg-mint" title="Hands out a file">
            <div className="flex items-center gap-2.5 rounded-[18px] bg-white p-3">
              <FileDown className="h-[18px] w-[18px]" aria-hidden />
              <span className="text-sm font-bold">Glaze notes</span>
              <span className="ml-auto font-mono text-xs text-muted">PDF</span>
            </div>
          </Mini>
          <Mini tone="bg-sky" title="Takes bookings from Cal.com and Calendly">
            <div className="flex flex-wrap gap-1.5">
              {["Thu 10:00", "Sat 10:00", "Sat 14:00"].map((t, i) => (
                <span key={t} className={`inline-flex h-[34px] items-center rounded-full px-3.5 text-sm font-semibold ${i === 1 ? "bg-foreground text-white" : "bg-white"}`}>
                  {t}
                </span>
              ))}
            </div>
          </Mini>
          <Mini tone="bg-surface shadow-card" title="Collects email sign-ups">
            <div className="flex gap-1.5">
              <span className="flex h-[42px] flex-1 items-center rounded-2xl bg-background px-4 text-muted shadow-[inset_0_0_0_1px_var(--line)]">you@email.com</span>
              <span className="inline-flex h-[42px] items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">Join</span>
            </div>
          </Mini>
          <Mini tone="bg-peach" wide title="Lists your other stores, with their real logos">
            <div className="grid grid-cols-3 gap-2">
              {["Shopee", "Tokopedia", "TikTok Shop"].map((m) => (
                <span key={m} className="rounded-[14px] bg-white px-3 py-2.5 text-center text-sm font-semibold">
                  {m}
                </span>
              ))}
            </div>
          </Mini>
        </div>
        <p className="text-base text-muted">Also forms, countdowns, price lists, store hours, payment details, reviews, media kits, rate cards, galleries, event dates, podcasts, polls and more.</p>
      </Section>

      {/* 4 · Looks */}
      <Section id="looks" label="looks" tone="bg-sunken">
        <H2 id="looks-h" className="max-w-[640px]">
          {PRESETS.length} looks to start from, every colour yours to change
        </H2>
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
          {PRESETS.map((p) => {
            const solid = p.bg.type === "color" ? p.bg.value : undefined;
            return (
              <div key={p.preset} className="flex h-[220px] transition duration-200 hover:-translate-y-0.5 flex-col items-center gap-[7px] rounded-[26px] px-3 py-4 md:h-[300px]" style={{ background: backgroundValue(p.bg, solid), color: p.text_color }}>
                <span className="mb-1 h-10 w-10 rounded-full" style={{ background: p.text_color, opacity: 0.18 }} aria-hidden />
                <i className="block h-[26px] w-full rounded-full md:h-[30px]" style={{ background: p.button.color, border: p.button.style === "outline" ? `2px solid ${p.button.color}` : undefined }} aria-hidden />
                <i className="block h-[26px] w-full rounded-full md:h-[30px]" style={{ background: `color-mix(in srgb, ${p.text_color} 10%, transparent)` }} aria-hidden />
                <i className="block h-[26px] w-full rounded-full md:h-[30px]" style={{ background: `color-mix(in srgb, ${p.text_color} 10%, transparent)` }} aria-hidden />
                <b className="mt-auto text-sm">{p.name}</b>
              </div>
            );
          })}
        </div>
        <div className="grid gap-3.5 md:grid-cols-3">
          {[
            ["Four header layouts", "Classic, banner photo, headshot or business card, with two fonts of your choice."],
            ["Buttons, borders and shadows", "Fill, outline or hard shadow, from square corners to full pills."],
            ["A finished look on laptops too", "On a wide screen your page sits on a rounded sheet over your own colours."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-k-l bg-surface p-[22px] shadow-card">
              <h3 className="text-xl font-bold tracking-[-0.015em]">{t}</h3>
              <p className="mt-1.5 text-base text-muted">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 · Insights */}
      <Section id="insights" label="insights">
        <div className="flex flex-wrap items-center gap-14">
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
            <H2 id="insights-h">Insights on every card, down to the UTM tag</H2>
            <p className="text-lg leading-normal text-ink-2">See views, unique visitors and taps for each card, then split them by source, country, device or campaign. Export any table as CSV.</p>
            <ul className="flex flex-col gap-2.5 text-[17px] font-semibold">
              {["Compared with the previous period", "Click any row to filter the whole page", "Unique visitors counted without cookies"].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[10px] bg-mint" aria-hidden>
                    <Check className="h-4 w-4" strokeWidth={2.6} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-[18px] rounded-k-l bg-surface p-[26px] shadow-card" aria-label="An example of Tautan Insights">
            <div className="flex items-center gap-2.5">
              <h3 className="flex-1 text-xl font-bold">
                Last 7 days <span className="ml-1.5 inline-flex h-6 items-center rounded-full bg-sunken px-2.5 align-middle font-mono text-xs font-medium text-ink-2">Example</span>
              </h3>
              <span className="inline-flex gap-1 rounded-full bg-sunken p-1 text-sm font-semibold" aria-hidden>
                <span className="px-3.5 py-1.5 text-ink-2">Today</span>
                <span className="rounded-full bg-surface px-3.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,.08)]">7 days</span>
                <span className="px-3.5 py-1.5 text-ink-2">30 days</span>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-[20px] bg-foreground px-4 py-3 text-white">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-brand" aria-hidden>
                <TrendingUp className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold">Saturday was your best day. Most taps went to “Saturday wheel class”.</p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["Visitors", "1,846", "+18%", "bg-blush"],
                ["Taps", "702", "+26%", "bg-sky"],
                ["Tap rate", "38.0%", "+3.1 pts", "bg-butter"],
              ].map(([l, v, d, c]) => (
                <div key={l} className={`rounded-[20px] p-4 ${c}`}>
                  <div className="text-[13px] font-semibold text-ink-2">{l}</div>
                  <div className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{v}</div>
                  <div className="font-mono text-xs text-ok">{d}</div>
                </div>
              ))}
            </div>
            <div className="flex h-[150px] items-end gap-2.5" role="img" aria-label="Taps per day, highest on Saturday">
              {[38, 52, 46, 64, 58, 100, 72].map((h, i) => (
                <span key={i} className={`flex-1 rounded-xl ${i === 5 ? "bg-brand" : "bg-sunken"}`} style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-[15px]">
              {["instagram.com", "tiktok.com"].map((r, i) => (
                <div key={r} className="relative flex overflow-hidden rounded-2xl bg-background px-3.5 py-3">
                  <i className="absolute inset-y-0 left-0 bg-sky" style={{ width: i === 0 ? "70%" : "35%" }} aria-hidden />
                  <span className="relative flex-1 font-semibold">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* 6 · Steps + questions */}
      <Section id="questions" label="steps" tone="bg-surface">
        <div className="flex flex-wrap gap-16">
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[22px]">
            <H2 id="steps-h">Live in three steps</H2>
            {[
              ["Paste your old link page, or start blank", "Tautan copies your links, photo and bio from Linktree or any public page.", "bg-mint"],
              ["Pick a look", `Start from one of ${PRESETS.length} looks and change any colour or font.`, "bg-blush"],
              ["Claim your name and publish", "Your page goes live at tautan.id/yourname, with a QR code to print.", "bg-sky"],
            ].map(([t, d, c], i) => (
              <div key={t} className={`flex gap-4 rounded-k-l p-[22px] ${c}`}>
                <span className="font-mono text-[28px] font-medium">{i + 1}</span>
                <div>
                  <h3 className="text-xl font-bold tracking-[-0.015em]">{t}</h3>
                  <p className="mt-1 text-ink-2">{d}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="min-w-0 flex-[1_1_480px]">
            <h2 className="mb-3 text-[28px] font-bold tracking-[-0.015em]">Questions</h2>
            {FAQ.map((f, i) => (
              <details key={f.q} className="group border-t border-line py-[22px] [&_summary::-webkit-details-marker]:hidden" open={i === 0}>
                <summary className="flex cursor-pointer list-none justify-between gap-4 text-xl font-bold">
                  {f.q}
                  <Plus className="h-6 w-6 shrink-0 transition group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-2.5 max-w-[640px] text-[17px] leading-[1.55] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* 7 · Close + footer */}
      <footer className="bg-foreground pb-10 pt-[120px] text-white">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-20 px-4 md:px-10">
          <div className="flex flex-col items-center gap-[26px] text-center">
            <h2 className="max-w-[900px] text-[44px] font-semibold leading-[0.98] tracking-[-0.045em] md:text-[72px]">Your link-in-bio, ready before your next post</h2>
            <ClaimForm id="claim-bottom" dark />
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-white/15 pt-7 text-sm">
            <span className="text-white">
              <Logo />
            </span>
            {NAV.slice(0, 3).map((n) => (
              <a key={n.href} href={n.href} className="text-[#bdbdb6] hover:text-white">
                {n.label}
              </a>
            ))}
            <span className="flex-1" />
            <Link href="/login" className="text-[#bdbdb6] hover:text-white">
              Log in
            </Link>
            <span className="text-[#bdbdb6]">© {new Date().getFullYear()} Tautan</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Mini({ tone, title, wide = false, children }: { tone: string; title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-h-[220px] transition duration-200 hover:-translate-y-0.5 hover:shadow-lift flex-col gap-3.5 rounded-k-l p-[22px] ${tone} ${wide ? "sm:col-span-2" : ""}`}>
      <h3 className="text-xl font-bold leading-tight tracking-[-0.015em]">{title}</h3>
      <div className="mt-auto">{children}</div>
    </div>
  );
}
