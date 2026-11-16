"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { X } from "lucide-react";
import type { Announcement } from "@/lib/page-extras";
import { usePublic } from "./context";
import s from "./public.module.css";

const key = (id: string) => `tautan:announcement-dismissed:${id}`;

function wasDismissed(id: string): boolean {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    return false;
  }
}
function remember(id: string) {
  try {
    localStorage.setItem(key(id), "1");
  } catch {
    // storage blocked: dismissal lasts for this page view only
  }
}

/** Scrolls to a form block on the page and focuses its first field. */
function goToForm(blockId: string) {
  const el = document.getElementById(`block-${blockId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
}

function Cta({ a, onDone }: { a: Announcement; onDone?: () => void }) {
  const { preview } = usePublic();
  if (!a.cta) return null;
  if (a.cta.form_block_id) {
    const id = a.cta.form_block_id;
    return (
      <button
        type="button"
        className={s.annCta}
        onClick={() => {
          onDone?.();
          if (!preview) goToForm(id);
        }}
      >
        {a.cta.label}
      </button>
    );
  }
  return (
    <a className={s.annCta} href={a.cta.url} target="_blank" rel="noopener noreferrer" onClick={preview ? (e) => e.preventDefault() : undefined}>
      {a.cta.label}
    </a>
  );
}

export function AnnouncementView({ a }: { a: Announcement }) {
  const { preview } = usePublic();
  // start hidden on the server and first paint for popups; banners and cards render at once
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setDismissed(!preview && wasDismissed(a.id));
    setReady(true);
  }, [a.id, preview]);

  const close = () => {
    setDismissed(true);
    if (!preview) remember(a.id);
  };
  const style = {
    ...(a.bg_color ? { "--ann-bg": a.bg_color } : {}),
    ...(a.text_color ? { "--ann-text": a.text_color } : {}),
  } as CSSProperties;

  if (dismissed) return null;

  if (a.layout === "popup") {
    return ready ? <Popup a={a} style={style} onClose={close} /> : null;
  }

  const body = (
    <>
      {a.image_url && a.layout === "card" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.annImage} src={a.image_url} alt="" loading="lazy" />
      ) : null}
      <div className={s.annText}>
        <strong className={s.annTitle}>{a.title}</strong>
        {a.description ? <span className={s.annDesc}>{a.description}</span> : null}
      </div>
      <Cta a={a} />
      <button type="button" className={s.annClose} onClick={close} aria-label="Dismiss announcement">
        <X aria-hidden />
      </button>
    </>
  );
  return (
    <aside className={a.layout === "card" ? s.annCard : s.annBanner} style={style} aria-label="Announcement">
      {body}
    </aside>
  );
}

function Popup({ a, style, onClose }: { a: Announcement; style: CSSProperties; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const { preview } = usePublic();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    // in the editor preview the popup sits inline instead of taking over the whole dashboard
    if (preview) d.show();
    else if (!d.open) d.showModal();
  }, [preview]);
  return (
    <dialog ref={ref} className={preview ? s.annPopupInline : s.annPopup} style={style} onClose={onClose} aria-labelledby="ann-title">
      {a.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.annPopupImage} src={a.image_url} alt="" />
      ) : null}
      <div className={s.annPopupBody}>
        <strong id="ann-title" className={s.annTitle}>
          {a.title}
        </strong>
        {a.description ? <p className={s.annDesc}>{a.description}</p> : null}
        <div className={s.annPopupActions}>
          <Cta a={a} onDone={() => ref.current?.close()} />
          <button type="button" className={s.annSecondary} onClick={() => ref.current?.close()}>
            Close
          </button>
        </div>
      </div>
      <button type="button" className={s.annClose} onClick={() => ref.current?.close()} aria-label="Close announcement">
        <X aria-hidden />
      </button>
    </dialog>
  );
}
