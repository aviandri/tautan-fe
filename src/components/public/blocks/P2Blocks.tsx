"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Copy, Download, FileText } from "lucide-react";
import type { BlockOf } from "@/lib/types";
import { safeHref } from "@/lib/safe-url";
import { bookingEmbedSrc } from "@/lib/embeds";
import { formatBytes } from "@/lib/format";
import { useLinkClick, usePublic, useTrackClick } from "../context";
import s from "../public.module.css";

const align = (a?: "left" | "center" | "right") => (a === "left" ? s.alignLeft : a === "right" ? s.alignRight : "");

export function HeadingBlock({ block }: { block: BlockOf<"heading"> }) {
  if (!block.data.title?.trim()) return null;
  return <h2 className={`${s.heading} ${align(block.data.text_align)}`}>{block.data.title}</h2>;
}

export function DividerBlock({ block }: { block: BlockOf<"divider"> }) {
  const style = block.data.style ?? "solid";
  if (style === "none") return <div className={s.spacer} aria-hidden />;
  return <hr className={s.divider} style={{ borderTopStyle: style, borderTopWidth: style === "double" ? 4 : 1 }} />;
}

export function FileBlock({ block }: { block: BlockOf<"file"> }) {
  const { preview } = usePublic();
  const onClick = useLinkClick(block.id);
  const href = safeHref(block.data.url);
  const meta = [block.data.file_name, formatBytes(block.data.size)].filter(Boolean).join(" · ");
  const body = (
    <>
      <span className={s.fileIcon} aria-hidden>
        <FileText />
      </span>
      <span className={s.btnLabel} style={{ textAlign: "left" }}>
        <span className={s.linkTitle}>{block.data.title || block.data.file_name || "Download"}</span>
        {meta ? <span className={s.linkDesc}>{meta}</span> : null}
      </span>
      <Download className={s.fileDownload} aria-hidden />
    </>
  );
  if (!href) return <div className={s.btn}>{body}</div>;
  return (
    <a className={s.btn} href={href} download={preview ? undefined : block.data.file_name || true} onClick={onClick}>
      {body}
    </a>
  );
}

export function DiscountCodeBlock({ block }: { block: BlockOf<"discount_code"> }) {
  const d = block.data;
  const track = useTrackClick(block.id);
  const onLink = useLinkClick(block.id);
  const [copied, setCopied] = useState(false);
  const href = safeHref(d.url);

  async function copy() {
    try {
      await navigator.clipboard.writeText(d.code);
    } catch {
      // clipboard blocked: the code is visible and selectable, still count the intent
    }
    track();
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className={s.discount}>
      {d.brand ? <div className={s.discountBrand}>{d.brand}</div> : null}
      {d.discount ? <div className={s.discountValue}>{d.discount}</div> : null}
      {d.description ? <p className={s.discountDesc}>{d.description}</p> : null}
      {d.code ? (
        <div className={s.discountCodeRow}>
          <code className={s.discountCode}>{d.code}</code>
          <button type="button" className={s.discountCopy} onClick={copy} aria-label={copied ? "Code copied" : `Copy code ${d.code}`}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      ) : (
        <p className={s.discountDesc}>No code needed.</p>
      )}
      {href ? (
        <a className={s.btn} href={href} target="_blank" rel="noopener noreferrer" onClick={onLink} style={{ justifyContent: "center" }}>
          {d.button_label || "Shop now"}
        </a>
      ) : null}
      <span role="status" className={s.srOnly}>
        {copied ? "Code copied to clipboard" : ""}
      </span>
    </div>
  );
}

function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

export function CountdownBlock({ block }: { block: BlockOf<"countdown"> }) {
  const d = block.data;
  const end = Date.parse(d.ends_at);
  // the server can't know the visitor's clock, so the numbers appear after mount (no hydration mismatch)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (Number.isNaN(end)) return null;
  const ended = now !== null && now >= end;
  if (ended && d.hide_after_end) return null;
  const p = now === null ? null : parts(end - now);
  const units: [keyof NonNullable<typeof p>, string][] = [
    ["d", "days"],
    ["h", "hours"],
    ["m", "minutes"],
    ["s", "seconds"],
  ];
  return (
    <div className={s.countdown}>
      {d.label ? <div className={s.countdownLabel}>{d.label}</div> : null}
      {ended ? (
        <p className={s.countdownEnded}>{d.ended_message || "This has ended."}</p>
      ) : (
        <div className={s.countdownGrid} role="timer" aria-live="off" aria-label={p ? `${p.d} days ${p.h} hours ${p.m} minutes left` : "Time left"}>
          {units.map(([k, label]) => (
            <div key={k} className={s.countdownCell}>
              <span className={s.countdownNum}>{p ? String(p[k]).padStart(2, "0") : "––"}</span>
              <span className={s.countdownUnit}>{label}</span>
            </div>
          ))}
        </div>
      )}
      {d.description ? <p className={s.countdownDesc}>{d.description}</p> : null}
    </div>
  );
}

/** A button first; the scheduler iframe loads only when the visitor asks for it. */
export function BookingBlock({ block }: { block: BlockOf<"booking"> }) {
  const [open, setOpen] = useState(false);
  const { preview } = usePublic();
  const track = useTrackClick(block.id);
  const src = bookingEmbedSrc(block.data.url);
  if (!src) return null;
  if (!open) {
    return (
      <button
        type="button"
        className={s.btn}
        style={{ justifyContent: "center" }}
        onClick={() => {
          if (preview) return;
          track();
          setOpen(true);
        }}
      >
        <Calendar className={s.btnIcon} aria-hidden />
        Book a time
      </button>
    );
  }
  return <iframe className={s.bookingFrame} src={src} title="Booking calendar" loading="lazy" />;
}

export function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  const d = block.data;
  if (!d.quote?.trim()) return null;
  return (
    <figure className={s.bigQuote}>
      {d.heading ? <div className={s.blockHeading}>{d.heading}</div> : null}
      <blockquote>“{d.quote}”</blockquote>
      {d.name ? (
        <figcaption>
          {d.name}
          {d.role ? <span className={s.quoteRole}>, {d.role}</span> : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
