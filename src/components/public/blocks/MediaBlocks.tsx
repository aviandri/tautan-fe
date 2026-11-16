"use client";

import type { BlockOf } from "@/lib/types";
import { toMusicEmbed, toVideoEmbed } from "@/lib/embeds";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { MiniMarkdown } from "@/lib/mini-markdown";
import { useLinkClick } from "../context";
import { LinkBlock } from "./LinkBlock";
import s from "../public.module.css";

export function TextBlock({ block }: { block: BlockOf<"text"> }) {
  if (!block.data.content?.trim()) return null;
  return (
    <div className={s.text}>
      <MiniMarkdown source={block.data.content} />
    </div>
  );
}

export function ImageBlock({ block }: { block: BlockOf<"image"> }) {
  const src = safeImageSrc(block.data.url);
  const href = safeHref(block.data.link_url);
  const onClick = useLinkClick(block.id);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img className={s.image} src={src} alt={block.data.alt ?? ""} loading="lazy" decoding="async" />;
  if (!href) return img;
  return (
    <a className={s.imageLink} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {img}
    </a>
  );
}

/** Unrecognised media URL: show it as a plain link so the visitor can still reach it. */
function Fallback({ block }: { block: BlockOf<"video"> | BlockOf<"music"> }) {
  return (
    <LinkBlock
      block={{ ...block, type: "link", data: { title: block.data.url, url: block.data.url } } as BlockOf<"link">}
    />
  );
}

export function VideoBlock({ block }: { block: BlockOf<"video"> }) {
  const e = toVideoEmbed(block.data.url);
  if (!e) return <Fallback block={block} />;
  return (
    <div className={s.embedVideo}>
      <iframe
        src={e.src}
        title={e.title}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

export function MusicBlock({ block }: { block: BlockOf<"music"> }) {
  const e = toMusicEmbed(block.data.url);
  if (!e) return <Fallback block={block} />;
  return (
    <iframe
      className={s.embedAudio}
      src={e.src}
      title={e.title}
      height={e.height}
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
