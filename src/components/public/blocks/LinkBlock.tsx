"use client";

import type { BlockOf } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { useLinkClick } from "../context";
import s from "../public.module.css";

export function LinkBlock({ block }: { block: BlockOf<"link"> }) {
  const { title, url, thumbnail_url } = block.data;
  const href = safeHref(url);
  const onClick = useLinkClick(block.id);
  const thumb = safeImageSrc(thumbnail_url);
  const body = (
    <>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.thumb} src={thumb} alt="" loading="lazy" decoding="async" />
      ) : null}
      <span className={s.btnLabel}>{title || url}</span>
      {thumb ? <span className={s.thumbSpacer} aria-hidden /> : null}
    </>
  );
  if (!href) return <div className={s.btn}>{body}</div>;
  return (
    <a className={s.btn} href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
      {body}
    </a>
  );
}
