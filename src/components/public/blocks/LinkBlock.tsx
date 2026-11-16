"use client";

import type { MouseEvent, ReactNode } from "react";
import type { BlockOf, LinkData } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { useLinkClick, usePublic } from "../context";
import s from "../public.module.css";

type LinkBlockT = BlockOf<"link">;

/** Where a link goes, by dest_kind (url | email | file | tab). */
function useLinkTarget(block: LinkBlockT) {
  const { selectTab, tabHref, preview } = usePublic();
  const track = useLinkClick(block.id);
  const d = block.data;

  if (d.dest_kind === "tab" && d.tab_id) {
    const tabId = d.tab_id;
    return {
      href: tabHref?.(tabId),
      external: false,
      onClick: (e: MouseEvent) => {
        track(e);
        if (selectTab && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          selectTab(tabId);
        }
      },
    };
  }
  let raw = d.url;
  if (d.dest_kind === "email" && raw && !raw.startsWith("mailto:")) raw = `mailto:${raw}`;
  const href = safeHref(raw);
  return {
    href,
    external: !!href && !href.startsWith("mailto:") && !href.startsWith("tel:") && !href.startsWith("/"),
    download: d.dest_kind === "file" && !preview ? true : undefined,
    onClick: track,
  };
}

function Icon({ icon }: { icon?: string }) {
  if (!icon) return null;
  const img = /^(https?:|\/|blob:)/.test(icon) ? safeImageSrc(icon) : undefined;
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={s.linkIcon} src={img} alt="" loading="lazy" />;
  }
  return (
    <span className={s.linkEmoji} aria-hidden>
      {icon.slice(0, 8)}
    </span>
  );
}

function Label({ label }: { label?: string }) {
  return label ? <span className={s.linkLabel}>{label.slice(0, 24)}</span> : null;
}

function Anchor({
  block,
  className,
  children,
  style,
}: {
  block: LinkBlockT;
  className: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const t = useLinkTarget(block);
  if (!t.href) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <a
      className={className}
      style={style}
      href={t.href}
      target={t.external ? "_blank" : undefined}
      rel={t.external ? "noopener noreferrer" : undefined}
      download={t.download}
      onClick={t.onClick}
    >
      {children}
    </a>
  );
}

const alignClass = (a?: LinkData["text_align"]) => (a === "left" ? s.alignLeft : a === "right" ? s.alignRight : "");

/** One link on its own (button, thumbnail, thumbnail_highlight, image_background). */
export function LinkBlock({ block }: { block: LinkBlockT }) {
  const d = block.data;
  const thumb = safeImageSrc(d.thumbnail_url);
  const title = d.title || d.url;

  if (d.layout === "thumbnail_highlight" && thumb) {
    return (
      <Anchor block={block} className={`${s.linkCard} ${alignClass(d.text_align)}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.linkCardImage} src={thumb} alt="" loading="lazy" decoding="async" />
        <span className={s.linkCardBody}>
          <span className={s.linkTitleRow}>
            <Icon icon={d.icon} />
            <span className={s.linkTitle}>{title}</span>
            <Label label={d.label} />
          </span>
          {d.description ? <span className={s.linkDesc}>{d.description}</span> : null}
        </span>
      </Anchor>
    );
  }

  if (d.layout === "image_background" && thumb) {
    return (
      <Anchor block={block} className={`${s.linkBgImage} ${alignClass(d.text_align)}`} style={{ backgroundImage: `url("${thumb.replace(/"/g, "%22")}")` }}>
        <span className={s.linkBgShade} aria-hidden />
        <span className={s.linkBgBody}>
          <Label label={d.label} />
          <span className={s.linkTitle}>
            {d.icon ? <Icon icon={d.icon} /> : null} {title}
          </span>
          {d.description ? <span className={s.linkDesc}>{d.description}</span> : null}
        </span>
      </Anchor>
    );
  }

  // button (default) and thumbnail
  const big = d.layout === "thumbnail" && thumb;
  return (
    <Anchor block={block} className={`${s.btn} ${big ? s.btnThumbLarge : ""} ${alignClass(d.text_align)}`}>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={big ? s.thumbLarge : s.thumb} src={thumb} alt="" loading="lazy" decoding="async" />
      ) : d.icon ? (
        <Icon icon={d.icon} />
      ) : null}
      <span className={s.btnLabel}>
        <span className={s.linkTitleRow}>
          <span className={s.linkTitle}>{title}</span>
          <Label label={d.label} />
        </span>
        {d.description ? <span className={s.linkDesc}>{d.description}</span> : null}
      </span>
      {thumb || d.icon ? <span className={big ? s.thumbLargeSpacer : s.thumbSpacer} aria-hidden /> : null}
    </Anchor>
  );
}

/** A square tile, used by grid2, grid3 and carousel groups. */
export function LinkTile({ block }: { block: LinkBlockT }) {
  const d = block.data;
  const thumb = safeImageSrc(d.thumbnail_url);
  return (
    <Anchor block={block} className={`${s.linkTile} ${alignClass(d.text_align)}`}>
      <span className={s.linkTileMedia}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className={s.linkTileIcon}>{d.icon ? <Icon icon={d.icon} /> : (d.title || "?").slice(0, 1).toUpperCase()}</span>
        )}
        <Label label={d.label} />
      </span>
      <span className={s.linkTileTitle}>{d.title || d.url}</span>
      {d.description ? <span className={s.linkDesc}>{d.description}</span> : null}
    </Anchor>
  );
}

/** Adjacent links that share grid2 / grid3 / carousel render as one group. */
export function LinkGroup({ layout, blocks }: { layout: "grid2" | "grid3" | "carousel"; blocks: LinkBlockT[] }) {
  if (layout === "carousel") {
    return (
      <div className={s.carousel} role="list">
        {blocks.map((b) => (
          <div key={b.id} role="listitem" className={s.carouselItem}>
            <LinkTile block={b} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={layout === "grid3" ? s.grid3 : s.grid2}>
      {blocks.map((b) => (
        <LinkTile key={b.id} block={b} />
      ))}
    </div>
  );
}
