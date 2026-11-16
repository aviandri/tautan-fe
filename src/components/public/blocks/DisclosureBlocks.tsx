"use client";

import { ChevronDown } from "lucide-react";
import type { Block, BlockOf } from "@/lib/types";
import { safeImageSrc } from "@/lib/safe-url";
import { LinkBlock } from "./LinkBlock";
import s from "../public.module.css";

// Folder and FAQ use <details>/<summary>: they open without JavaScript and are keyboard
// accessible out of the box.

export function FolderBlock({ block, children }: { block: BlockOf<"folder">; children: Block[] }) {
  const links = children.filter((c): c is BlockOf<"link"> => c.type === "link");
  return (
    <details className={s.details}>
      <summary className={s.btn}>
        <span className={s.thumbSpacer} aria-hidden />
        <span className={s.btnLabel}>{block.data.title || "Folder"}</span>
        <span className={s.thumbSpacer} style={{ display: "grid", placeItems: "center" }} aria-hidden>
          <ChevronDown className={s.chevron} />
        </span>
      </summary>
      <div className={s.folderBody}>
        {links.length ? links.map((c) => <LinkBlock key={c.id} block={c} />) : <p className={s.empty}>No links yet</p>}
      </div>
    </details>
  );
}

export function FaqBlock({ block }: { block: BlockOf<"faq"> }) {
  const items = (block.data.items ?? []).filter((i) => i.q?.trim());
  if (!items.length) return null;
  return (
    <div className={s.faq}>
      {items.map((it, i) => (
        <details key={i} className={`${s.details} ${s.faqItem}`}>
          <summary className={s.summary}>
            <span>{it.q}</span>
            <ChevronDown className={s.chevron} aria-hidden />
          </summary>
          <p className={s.faqAnswer}>{it.a}</p>
        </details>
      ))}
    </div>
  );
}

export function TestimonialBlock({ block }: { block: BlockOf<"testimonial"> }) {
  const items = (block.data.items ?? []).filter((i) => i.quote?.trim());
  if (!items.length) return null;
  return (
    <div className={s.testimonials}>
      {items.map((it, i) => {
        const avatar = safeImageSrc(it.avatar_url);
        return (
          <figure key={i} className={s.quote}>
            <blockquote>“{it.quote}”</blockquote>
            {it.author ? (
              <figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {avatar ? <img className={s.quoteAvatar} src={avatar} alt="" loading="lazy" /> : null}
                {it.author}
              </figcaption>
            ) : null}
          </figure>
        );
      })}
    </div>
  );
}
