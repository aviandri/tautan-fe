"use client";

import { useEffect, useState } from "react";
import { siSoundcloud, siSpotify, siVimeo, siYoutube, type SimpleIcon } from "simple-icons";
import type { Block, BlockDataMap, BlockType } from "@/lib/types";
import { PublicPage, ThemedBlocks } from "@/components/public";
import { PRESETS, themeFromPreset } from "@/lib/theme/presets";
import { qrSvg } from "@/lib/qr";
import { themeFontVariables } from "@/lib/theme/fonts";
import { SAMPLE_BLOCKS, SAMPLE_TABS, sampleProfile } from "./sample";
import s from "./landing.module.css";

function one<K extends BlockType>(id: string, type: K, data: BlockDataMap[K], extra: Partial<Block> = {}): Block {
  return { id, profile_id: "p", tab_id: "x", parent_id: null, position: 0, is_visible: true, created_at: "", updated_at: "", type, data, ...extra } as Block;
}

const card = themeFromPreset("batu");

// ---------- blocks bento ----------

function BrandIcon({ icon }: { icon: SimpleIcon }) {
  return (
    <span className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-foreground">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={`#${icon.hex}`} aria-hidden>
        <path d={icon.path} />
      </svg>
      {icon.title}
    </span>
  );
}

export function BlocksBento() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <article className={`${s.card} flex flex-col gap-4 p-6 md:col-span-3`}>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Plays videos and music in place</h3>
          <p className="mt-1 text-[15px] text-muted">Paste a link and visitors watch or listen without leaving your page.</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2">
          {[siYoutube, siVimeo, siSpotify, siSoundcloud].map((i) => (
            <BrandIcon key={i.slug} icon={i} />
          ))}
        </div>
      </article>

      <article className={`${s.card} flex flex-col gap-3 overflow-hidden p-6 md:col-span-3`}>
        <h3 className="text-lg font-semibold text-foreground">Groups links in a folder</h3>
        <p className="text-[15px] text-muted">Put a set of guides behind one button. Visitors tap to open it.</p>
        <ThemedBlocks
          theme={card}
          className="mt-auto rounded-xl"
          style={{ padding: 14, minHeight: 0 }}
          blocks={[
            one("f", "folder", { title: "Glaze care guides" }),
            one("f1", "link", { title: "Washing matte glazes", url: "https://example.com" }, { parent_id: "f" }),
            one("f2", "link", { title: "Oven and microwave use", url: "https://example.com" }, { parent_id: "f" }),
          ]}
        />
      </article>

      <article className={`${s.card} flex flex-col gap-3 overflow-hidden p-6 md:col-span-2`}>
        <h3 className="text-lg font-semibold text-foreground">Answers the usual questions</h3>
        <ThemedBlocks
          theme={card}
          className="mt-auto rounded-xl"
          style={{ padding: 14, minHeight: 0 }}
          blocks={[one("q", "faq", { items: [{ q: "Do you ship outside Java?", a: "Yes. Allow a week." }, { q: "Can I book a class for four?", a: "Yes, on Saturdays." }] })]}
        />
      </article>

      <article className={`${s.card} flex flex-col gap-3 overflow-hidden p-6 md:col-span-2`}>
        <h3 className="text-lg font-semibold text-foreground">Takes messages for you</h3>
        <p className="text-[15px] text-muted">They arrive in your Tautan inbox. Your email address stays off the page.</p>
        <div className="mt-auto flex flex-col gap-2 rounded-xl bg-[#ebebe8] p-4" aria-hidden>
          <div className="h-10 rounded-lg border border-black/10 bg-white/70" />
          <div className="h-10 rounded-lg border border-black/10 bg-white/70" />
          <div className="flex h-10 items-center justify-center rounded-[14px] bg-white text-sm font-semibold text-[#222]">Send message</div>
        </div>
      </article>

      <article className={`${s.card} flex flex-col gap-3 overflow-hidden p-6 md:col-span-2`}>
        <h3 className="text-lg font-semibold text-foreground">Links every social profile</h3>
        <p className="text-[15px] text-muted">Sixteen platforms, shown as a row of icons under your name.</p>
        <ThemedBlocks
          theme={card}
          className="mt-auto rounded-xl"
          style={{ padding: 10, minHeight: 0 }}
          blocks={[
            one("so", "social_icons", {
              items: ["instagram", "tiktok", "youtube", "x", "whatsapp", "spotify"].map((platform) => ({ platform, url: "https://example.com" })),
            }),
          ]}
        />
      </article>
    </div>
  );
}

// ---------- themes strip ----------

export function ThemesStrip() {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <ul className="grid w-max grid-cols-[repeat(8,200px)] gap-4 xl:w-full xl:grid-cols-8 xl:gap-3">
        {PRESETS.map((p) => (
          <li key={p.preset} className="flex flex-col gap-2">
            <div className="h-[340px] overflow-hidden rounded-[22px] border-4 border-[#2a2922]" inert aria-hidden>
              {/* rendered at phone width, then zoomed down so the whole top of the page fits */}
              <div style={{ zoom: 0.6, height: `${340 / 0.6}px` }}>
                <PublicPage
                  profile={sampleProfile(p.preset)}
                  tabs={SAMPLE_TABS.slice(0, 1)}
                  blocks={SAMPLE_BLOCKS.filter((b) => b.type !== "faq")}
                  preview
                  style={{ padding: "32px 16px 20px" }}
                />
              </div>
            </div>
            <div className="text-sm">
              <span className="font-semibold text-[#f7f6f2]">{p.name}</span>
              <span className="block text-[13px] text-[#b9b6a6]">{p.blurb}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- QR poster ----------

export function QrPoster() {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    qrSvg(`${window.location.origin}/studiolempung`, { margin: 2 }).then(setSvg);
  }, []);
  return (
    <div className={`${themeFontVariables} relative mx-auto flex aspect-[3/4] w-full max-w-[360px] flex-col items-center justify-center gap-5 rounded-[20px] bg-[#f5efe3] p-8 shadow-[0_30px_70px_-35px_rgba(22,21,15,0.55)] [font-family:var(--font-fraunces),Georgia,serif]`}>
      <div className="text-center text-2xl font-semibold text-[#1c1a17]">Studio Lempung</div>
      <div className="aspect-square w-[70%] rounded-lg bg-white p-2">
        {svg ? <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
      </div>
      <div className="text-center text-[15px] text-[#1c1a17]/80">Scan for classes and the shop</div>
      <div className="absolute -right-3 top-6 flex flex-col gap-2 [font-family:var(--font-urbanist)]">
        <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold text-background">PNG</span>
        <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-foreground">SVG</span>
      </div>
    </div>
  );
}
