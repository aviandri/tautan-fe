"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2, UserPlus, X } from "lucide-react";
import { API_BASE } from "@/lib/api";

// The QR library (~15 kB) loads only when the share panel opens; most visitors never open it.
function pageUrl(username: string): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  return `${env ? env.replace(/\/$/, "") : window.location.origin}/${username}`;
}
import { usePublic } from "./context";
import s from "./public.module.css";

/** Share and save-contact buttons for visitors (settings.show_share / show_save_contact). */
export function PageActions({ name, share, saveContact }: { name: string; share: boolean; saveContact: boolean }) {
  const { username, preview } = usePublic();
  const [open, setOpen] = useState(false);
  if (!share && !saveContact) return null;

  async function onShare() {
    if (preview) return;
    const url = pageUrl(username);
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return; // the visitor closed the sheet
      }
    }
    setOpen(true);
  }

  return (
    <div className={s.pageActions}>
      {saveContact ? (
        <a
          className={s.pageAction}
          href={`${API_BASE}/public/${encodeURIComponent(username)}/vcard`}
          download={`${username}.vcf`}
          onClick={preview ? (e) => e.preventDefault() : undefined}
          aria-label={`Save ${name} to contacts`}
        >
          <UserPlus aria-hidden />
          <span>Save contact</span>
        </a>
      ) : null}
      {share ? (
        <button type="button" className={s.pageAction} onClick={onShare} aria-haspopup="dialog" aria-label={`Share ${name}'s page`}>
          <Share2 aria-hidden />
          <span>Share</span>
        </button>
      ) : null}
      {open ? <SharePanel name={name} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function SharePanel({ name, onClose }: { name: string; onClose: () => void }) {
  const { username } = usePublic();
  const ref = useRef<HTMLDialogElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = pageUrl(username);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    import("@/lib/qr")
      .then((m) => m.qrSvg(url, { margin: 2 }))
      .then(setSvg)
      .catch(() => {});
  }, [url]);

  return (
    <dialog ref={ref} className={s.sharePanel} onClose={onClose} aria-labelledby="share-title" onClick={(e) => e.target === e.currentTarget && ref.current?.close()}>
      <div className={s.sharePanelInner}>
        <strong id="share-title" className={s.annTitle}>
          Share {name}
        </strong>
        {svg ? <div className={s.shareQr} role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} /> : <div className={s.shareQr} />}
        <div className={s.shareUrlRow}>
          <span className={s.shareUrl}>{url.replace(/^https?:\/\//, "")}</span>
          <button
            type="button"
            className={s.pageAction}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                // clipboard blocked: the URL is shown and selectable
              }
            }}
          >
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            <span>{copied ? "Copied" : "Copy link"}</span>
          </button>
        </div>
      </div>
      <button type="button" className={s.annClose} onClick={() => ref.current?.close()} aria-label="Close">
        <X aria-hidden />
      </button>
    </dialog>
  );
}
