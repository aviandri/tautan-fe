import { Calendar, Copy, Download, FileText } from "../icons";
import type { BlockOf } from "@/lib/types";
import { safeHref } from "@/lib/safe-url";
import { bookingEmbedSrc } from "@/lib/embeds";
import { formatBytes } from "@/lib/format";
import { track, type PageEnv } from "../env";
import { s } from "../cls";

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

export function FileBlock({ block, env }: { block: BlockOf<"file">; env: PageEnv }) {
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
    <a className={s.btn} href={href} download={env.preview ? undefined : block.data.file_name || true} {...track(block.id, "download")}>
      {body}
    </a>
  );
}

export function DiscountCodeBlock({ block }: { block: BlockOf<"discount_code"> }) {
  const d = block.data;
  const href = safeHref(d.url);
  return (
    <div className={s.discount}>
      {d.brand ? <div className={s.discountBrand}>{d.brand}</div> : null}
      {d.discount ? <div className={s.discountValue}>{d.discount}</div> : null}
      {d.description ? <p className={s.discountDesc}>{d.description}</p> : null}
      {d.code ? (
        <div className={s.discountCodeRow}>
          <code className={s.discountCode}>{d.code}</code>
          <button type="button" className={s.discountCopy} data-copy={d.code} aria-label={`Copy code ${d.code}`} {...track(block.id, "copy")}>
            <Copy aria-hidden />
            <span data-copy-label>Copy</span>
          </button>
        </div>
      ) : (
        <p className={s.discountDesc}>No code needed.</p>
      )}
      {href ? (
        <a className={s.btn} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id)} style={{ justifyContent: "center" }}>
          {d.button_label || "Shop now"}
        </a>
      ) : null}
      <span role="status" className={s.srOnly} data-copy-status />
    </div>
  );
}

function parts(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor((t % 86400) / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

const UNITS = [
  ["d", "days"],
  ["h", "hours"],
  ["m", "minutes"],
  ["s", "seconds"],
] as const;

/**
 * Rendered with the server's numbers (fixed-width digits), then PageRuntime ticks them every second.
 * Updating text in fixed-width cells never moves anything, so no layout shift.
 */
export function CountdownBlock({ block, now }: { block: BlockOf<"countdown">; now: number }) {
  const d = block.data;
  const end = Date.parse(d.ends_at);
  if (Number.isNaN(end)) return null;
  const ended = now >= end;
  if (ended && d.hide_after_end) return null;
  const p = parts(end - now);
  return (
    <div className={s.countdown} data-countdown={d.ends_at} data-hide-after={d.hide_after_end ? "1" : undefined}>
      {d.label ? <div className={s.countdownLabel}>{d.label}</div> : null}
      <p className={s.countdownEnded} data-cd-ended hidden={!ended}>
        {d.ended_message || "This has ended."}
      </p>
      <div className={s.countdownGrid} role="timer" aria-live="off" data-cd-grid hidden={ended} suppressHydrationWarning aria-label={`${p.d} days ${p.h} hours ${p.m} minutes left`}>
        {UNITS.map(([k, label]) => (
          <div key={k} className={s.countdownCell}>
            <span className={s.countdownNum} data-u={k} suppressHydrationWarning>
              {String(p[k]).padStart(2, "0")}
            </span>
            <span className={s.countdownUnit}>{label}</span>
          </div>
        ))}
      </div>
      {d.description ? <p className={s.countdownDesc}>{d.description}</p> : null}
    </div>
  );
}

/** A button first; the scheduler iframe replaces it only when the visitor asks (PageRuntime). */
export function BookingBlock({ block }: { block: BlockOf<"booking"> }) {
  const src = bookingEmbedSrc(block.data.url);
  if (!src) return null;
  return (
    <div>
      <button
        type="button"
        className={s.btn}
        style={{ justifyContent: "center", width: "100%" }}
        data-embed={src}
        data-title="Booking calendar"
        data-frame-class={s.bookingFrame}
        {...track(block.id, "book")}
      >
        <Calendar className={s.btnIcon} aria-hidden />
        Book a time
      </button>
    </div>
  );
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
