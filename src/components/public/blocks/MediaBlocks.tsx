"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

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
  const d = block.data;
  const src = safeImageSrc(d.url);
  const href = safeHref(d.link_url);
  const onClick = useLinkClick(block.id);
  const [zoom, setZoom] = useState(false);
  if (!src) return null;
  const cls = `${s.image} ${d.full_bleed ? s.fullBleed : ""}`;
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img className={cls} src={src} alt={d.alt ?? ""} loading="lazy" decoding="async" />;
  if (href) {
    return (
      <a className={`${s.imageLink} ${d.full_bleed ? s.fullBleed : ""}`} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
        {img}
      </a>
    );
  }
  if (d.lightbox) {
    return (
      <>
        <button type="button" className={`${s.imageButton} ${d.full_bleed ? s.fullBleed : ""}`} onClick={() => setZoom(true)} aria-label={d.alt ? `Enlarge image: ${d.alt}` : "Enlarge image"}>
          {img}
        </button>
        {zoom ? <Lightbox src={src} alt={d.alt ?? ""} onClose={() => setZoom(false)} /> : null}
      </>
    );
  }
  return img;
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = ref.current;
    // no close() in cleanup: it fires onClose, and StrictMode's double effect would unmount us at once.
    // Unmounting removes the dialog (and its top-layer state) anyway.
    if (dlg && !dlg.open) dlg.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.lightbox}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label={alt || "Image"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} />
      <button type="button" className={s.lightboxClose} onClick={onClose} aria-label="Close">
        <X aria-hidden />
      </button>
    </dialog>
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
