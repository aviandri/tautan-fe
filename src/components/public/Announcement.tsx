import type { CSSProperties } from "react";
import { X } from "./icons";
import type { Announcement } from "@/lib/page-extras";
import s from "./public.module.css";

// Server-rendered. Banners and cards are in the HTML from the first byte, so they never push the
// page down later; a visitor who dismissed one gets it hidden by a tiny inline script that runs
// before first paint. Close, CTA and the popup's opening are handled by PageRuntime (data-*).

const KEY = "tautan:announcement-dismissed:";

function Cta({ a }: { a: Announcement }) {
  if (!a.cta) return null;
  if (a.cta.form_block_id) {
    return (
      <button type="button" className={s.annCta} data-goto-form={a.cta.form_block_id}>
        {a.cta.label}
      </button>
    );
  }
  return (
    <a className={s.annCta} href={a.cta.url} target="_blank" rel="noopener noreferrer">
      {a.cta.label}
    </a>
  );
}

const Close = ({ id, label }: { id: string; label: string }) => (
  <button type="button" className={s.annClose} data-dismiss={id} aria-label={label}>
    <X aria-hidden />
  </button>
);

export function AnnouncementView({ a, preview }: { a: Announcement; preview: boolean }) {
  const style = {
    ...(a.bg_color ? { "--ann-bg": a.bg_color } : {}),
    ...(a.text_color ? { "--ann-text": a.text_color } : {}),
  } as CSSProperties;
  const elId = `ann-${a.id}`;

  if (a.layout === "popup") {
    return (
      <dialog id={elId} data-ann data-popup={a.id} className={preview ? s.annPopupInline : s.annPopup} style={style} aria-labelledby={`${elId}-title`}>
        {a.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.annPopupImage} src={a.image_url} alt="" loading="lazy" />
        ) : null}
        <div className={s.annPopupBody}>
          <strong id={`${elId}-title`} className={s.annTitle}>
            {a.title}
          </strong>
          {a.description ? <p className={s.annDesc}>{a.description}</p> : null}
          <div className={s.annPopupActions}>
            <Cta a={a} />
            <button type="button" className={s.annSecondary} data-dismiss={a.id}>
              Close
            </button>
          </div>
        </div>
        <Close id={a.id} label="Close announcement" />
      </dialog>
    );
  }

  return (
    <>
      <aside id={elId} data-ann className={a.layout === "card" ? s.annCard : s.annBanner} style={style} aria-label="Announcement">
        {a.image_url && a.layout === "card" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.annImage} src={a.image_url} alt="" loading="lazy" />
        ) : null}
        <div className={s.annText}>
          <strong className={s.annTitle}>{a.title}</strong>
          {a.description ? <span className={s.annDesc}>{a.description}</span> : null}
        </div>
        <Cta a={a} />
        <Close id={a.id} label="Dismiss announcement" />
      </aside>
      {preview ? null : (
        <script
          // ids are server-assigned; JSON.stringify plus "<" escaping keeps the literal inert
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem(${JSON.stringify(KEY + a.id).replace(/</g, "\\u003c")})==="1")document.getElementById(${JSON.stringify(elId).replace(/</g, "\\u003c")}).hidden=true}catch(e){}`,
          }}
        />
      )}
    </>
  );
}
