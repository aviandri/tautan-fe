import { Play } from "lucide-react";

import type { BlockOf } from "@/lib/types";
import { toMusicEmbed, toVideoEmbed, youtubeId } from "@/lib/embeds";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { MiniMarkdown } from "@/lib/mini-markdown";
import { mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { LinkBlock } from "./LinkBlock";
import s from "../public.module.css";

// Server-safe (no hooks): interactivity comes from PageRuntime via data-* attributes.

export function TextBlock({ block }: { block: BlockOf<"text"> }) {
  if (!block.data.content?.trim()) return null;
  return (
    <div className={s.text}>
      <MiniMarkdown source={block.data.content} />
    </div>
  );
}

export function ImageBlock({ block, env, priority = false }: { block: BlockOf<"image">; env: PageEnv; priority?: boolean }) {
  const d = block.data;
  const src = safeImageSrc(d.url);
  const href = safeHref(d.link_url);
  if (!src) return null;
  const cls = `${s.image} ${d.full_bleed ? s.fullBleed : ""}`;
  const img = <Img className={cls} src={src} alt={d.alt ?? ""} media={mediaFor(env, src)} sizes="(max-width: 600px) 100vw, 560px" priority={priority} />;
  if (href) {
    return (
      <a className={`${s.imageLink} ${d.full_bleed ? s.fullBleed : ""}`} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id)}>
        {img}
      </a>
    );
  }
  if (d.lightbox) {
    return (
      <button
        type="button"
        className={`${s.imageButton} ${d.full_bleed ? s.fullBleed : ""}`}
        data-lightbox={src}
        data-alt={d.alt ?? ""}
        aria-label={d.alt ? `Enlarge image: ${d.alt}` : "Enlarge image"}
      >
        {img}
      </button>
    );
  }
  return img;
}

/** Unrecognised media URL: show it as a plain link so the visitor can still reach it. */
function Fallback({ block, env }: { block: BlockOf<"video"> | BlockOf<"music">; env: PageEnv }) {
  return <LinkBlock env={env} block={{ ...block, type: "link", data: { title: block.data.url, url: block.data.url } } as BlockOf<"link">} />;
}

/**
 * Click-to-load facade: a poster and a play button in the iframe's exact box. The third-party
 * player (≈1 MB of script for YouTube) loads only when the visitor presses play.
 */
export function VideoBlock({ block, env }: { block: BlockOf<"video">; env: PageEnv }) {
  const e = toVideoEmbed(block.data.url);
  if (!e) return <Fallback block={block} env={env} />;
  const yt = e.provider === "youtube" ? youtubeId(block.data.url) : null;
  return (
    <div className={s.embedVideo}>
      <button
        type="button"
        className={s.facade}
        data-embed={e.src}
        data-autoplay="autoplay=1"
        data-title={e.title}
        aria-label={`Play ${e.title}`}
        {...track(block.id, "play")}
      >
        {yt ? (
          // poster from YouTube's image CDN (an image, not script), lazy below the fold
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.facadePoster} src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" loading="lazy" decoding="async" width={480} height={360} />
        ) : null}
        <span className={s.facadePlay} aria-hidden>
          <Play />
        </span>
        <span className={s.facadeLabel}>{e.provider === "youtube" ? "YouTube" : "Vimeo"}</span>
      </button>
    </div>
  );
}

export function MusicBlock({ block, env }: { block: BlockOf<"music">; env: PageEnv }) {
  const e = toMusicEmbed(block.data.url);
  if (!e) return <Fallback block={block} env={env} />;
  const provider = e.provider === "spotify" ? "Spotify" : "SoundCloud";
  return (
    <div className={s.audioFacadeBox} style={{ height: e.height }}>
      <button
        type="button"
        className={s.audioFacade}
        data-embed={e.src}
        data-autoplay={e.provider === "soundcloud" ? "auto_play=true" : undefined}
        data-title={e.title}
        data-height={String(e.height ?? 152)}
        data-frame-class={s.embedAudio}
        aria-label={`Play ${e.title}`}
        {...track(block.id, "play")}
      >
        <span className={s.facadePlay} aria-hidden>
          <Play />
        </span>
        <span className={s.audioFacadeText}>
          <span className={s.linkTitle}>Listen on {provider}</span>
          <span className={s.linkDesc}>{e.title}</span>
        </span>
      </button>
    </div>
  );
}
