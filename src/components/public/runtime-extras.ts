// Rarely used parts of PageRuntime, split into their own chunk and imported on demand
// (share panel, lightbox, third-party tags), so they don't count toward first-load JS.
import { s } from "./cls";

export function injectTags(ga4?: string, pixel?: string) {
  {
    const w = window as unknown as { dataLayer: unknown[]; gtag: (...a: unknown[]) => void; fbq?: unknown };
    if (ga4 && /^G-[A-Z0-9]{4,20}$/.test(ga4)) {
      w.dataLayer = w.dataLayer || [];
      w.gtag = function gtag() {
        // gtag.js expects the Arguments object itself
        // eslint-disable-next-line prefer-rest-params
        w.dataLayer.push(arguments);
      };
      w.gtag("js", new Date());
      w.gtag("config", ga4);
      addScript(`https://www.googletagmanager.com/gtag/js?id=${ga4}`);
    }
    if (pixel && /^\d{5,20}$/.test(pixel) && !w.fbq) {
      type Fbq = ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; push?: unknown; loaded?: boolean; version?: string };
      const n = function (...args: unknown[]) {
        if (n.callMethod) n.callMethod(...args);
        else n.queue.push(args);
      } as Fbq;
      n.queue = [];
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      w.fbq = n;
      (window as unknown as { _fbq: Fbq })._fbq = n;
      addScript("https://connect.facebook.net/en_US/fbevents.js");
      n("init", pixel);
      n("track", "PageView");
    }
  }
}

export function addScript(src: string) {
  const sc = document.createElement("script");
  sc.async = true;
  sc.src = src;
  document.head.append(sc);
}


// ---------- lightbox ----------

export function openLightbox(src: string, alt: string) {
  const d = document.createElement("dialog");
  d.className = s.lightbox;
  d.setAttribute("aria-label", alt || "Image");
  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  const close = document.createElement("button");
  close.type = "button";
  close.className = s.lightboxClose;
  close.setAttribute("aria-label", "Close");
  close.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  close.onclick = () => d.close();
  d.onclick = (e) => e.target === d && d.close();
  d.onclose = () => d.remove();
  d.append(img, close);
  document.body.append(d);
  d.showModal();
}


// ---------- share ----------

export async function openShare(raw: string, name: string) {
  const url = new URL(raw, location.href).href;
  if (navigator.share) {
    try {
      await navigator.share({ title: name, url });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return;
    }
  }
  const d = document.createElement("dialog");
  d.className = s.sharePanel;
  d.setAttribute("aria-labelledby", "share-title");
  d.innerHTML = `<div class="${s.sharePanelInner}"><strong id="share-title" class="${s.annTitle}"></strong><div class="${s.shareQr}" role="img"></div><div class="${s.shareUrlRow}"><span class="${s.shareUrl}"></span><button type="button" class="${s.pageAction}" data-share-copy>Copy link</button></div></div><button type="button" class="${s.annClose}" aria-label="Close" data-share-close><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  d.querySelector("#share-title")!.textContent = `Share ${name}`;
  d.querySelector(`.${s.shareUrl}`)!.textContent = url.replace(/^https?:\/\//, "");
  const qr = d.querySelector<HTMLElement>(`.${s.shareQr}`)!;
  qr.setAttribute("aria-label", `QR code for ${url}`);
  const copyBtn = d.querySelector<HTMLButtonElement>("[data-share-copy]")!;
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      copyBtn.textContent = "Copied";
      setTimeout(() => (copyBtn.textContent = "Copy link"), 1500);
    } catch {
      // blocked: the URL is shown
    }
  };
  d.querySelector<HTMLButtonElement>("[data-share-close]")!.onclick = () => d.close();
  d.onclick = (e) => e.target === d && d.close();
  d.onclose = () => d.remove();
  document.body.append(d);
  d.showModal();
  // the QR library loads only when the panel opens
  import("@/lib/qr")
    .then((m) => m.qrSvg(url, { margin: 2 }))
    .then((svg) => (qr.innerHTML = svg))
    .catch(() => {});
}
