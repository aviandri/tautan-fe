import { afterLoad, trackEvent } from "@/lib/track";
import { fillTemplate, waLink } from "@/lib/sell/wa";
import { s } from "./cls";

/**
 * The public page's runtime, imported by the PageRuntime stub right after hydration (so it never
 * counts toward first-load JS). Cards render as server HTML with data-* attributes, and this
 * wires them up by event delegation on the page root:
 *
 *   data-b / data-a     click tracking (block id, meta.action), sent by sendBeacon
 *   data-tab            tab links (in the editor preview they call onTabChange instead of navigating)
 *   data-copy           copy-to-clipboard buttons (label in [data-copy-label])
 *   data-embed          click-to-load facades: replaced by the iframe on click
 *   data-lightbox       image lightbox
 *   data-countdown      ticking countdowns (digits are fixed-width, so updating them never shifts layout)
 *   data-dismiss        announcement close; data-goto-form scrolls to a form block
 *   dialog[data-popup]  announcement popup, opened once unless dismissed
 *   data-share          share sheet (navigator.share, else a panel with a QR code)
 *   data-open-dialog    opens <dialog id=…> (shop product sheet); data-close-dialog closes it
 *   data-wa-template    product WhatsApp link: re-composed with the chosen variant radios at click time
 *   data-slides         photo carousel; keeps its [data-slide-count] "n / total" in sync
 *   data-live-slot      events "Live now" badge: re-checked against data-live-end / data-next-start/-end
 *                       every 30 s (fixed-width slot, so the text swap never shifts layout)
 *   audio[data-play-b]  podcast episodes: one click event (action "play") per play
 *   form[data-x] submit / [data-x] input
 *                       interactive P3-C/D cards and gate unlocks: handled by ./runtime-p3cd
 *                       (lazy); data-x-lock stubs are restored from stored tokens on start
 *
 * Vanilla DOM on purpose: it's a few kB, and nothing here needs React state.
 */
export interface RuntimeOptions {
  username: string;
  preview: boolean;
  /** editor preview: called instead of navigating to a tab */
  onTab?: (slug: string) => void;
  ga4?: string;
  pixel?: string;
}

export function start(root: HTMLElement, { username, preview, onTab, ga4, pixel }: RuntimeOptions): () => void {
  const tabCb = { current: onTab };
    const cleanups: (() => void)[] = [];

  if (!preview) {
    const w = window as unknown as { __tautanViewed?: string };
    if (w.__tautanViewed !== username) {
      w.__tautanViewed = username;
      afterLoad(() => trackEvent(username, { kind: "view" }));
      afterLoad(() => loadTags(ga4, pixel));
    }
  }

  const onClick = (e: MouseEvent) => {
    const t = e.target as Element | null;
    if (!t?.closest) return;
    const a = t.closest<HTMLAnchorElement>("a[href]");
    const plain = e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

    if (a?.dataset.waTemplate) composeWa(a);
    if (preview && a) {
      e.preventDefault();
      if (a.dataset.tab) tabCb.current?.(a.dataset.tab);
    }
    if (!preview) {
      const tracked = t.closest<HTMLElement>("[data-b]");
      if (tracked) trackEvent(username, { kind: "click", block_id: tracked.dataset.b, action: tracked.dataset.a });
    }
    if (!plain) return;

    const copy = t.closest<HTMLElement>("[data-copy]");
    if (copy) return void doCopy(copy);
    const embed = t.closest<HTMLElement>("[data-embed]");
    if (embed) {
      if (!preview) loadEmbed(embed);
      return;
    }
    const zoom = t.closest<HTMLElement>("[data-lightbox]");
    if (zoom) return void import("./runtime-extras").then((m) => m.openLightbox(zoom.dataset.lightbox!, zoom.dataset.alt ?? ""));
    const dismiss = t.closest<HTMLElement>("[data-dismiss]");
    if (dismiss) return void dismissAnnouncement(dismiss, preview);
    const goto = t.closest<HTMLElement>("[data-goto-form]");
    if (goto) {
      goto.closest("dialog")?.close();
      if (!preview) goToForm(goto.dataset.gotoForm!);
      return;
    }
    const open = t.closest<HTMLElement>("[data-open-dialog]");
    if (open) {
      const d = document.getElementById(open.dataset.openDialog!);
      if (d instanceof HTMLDialogElement && !d.open) {
        d.showModal();
        if (!d.dataset.wired) {
          d.dataset.wired = "1";
          d.addEventListener("click", (ev) => ev.target === d && d.close());
        }
      }
      return;
    }
    if (t.closest("[data-close-dialog]")) return void t.closest("dialog")?.close();
    const share = t.closest<HTMLElement>("[data-share]");
    if (share && !preview) void import("./runtime-extras").then((m) => m.openShare(share.dataset.share!, share.dataset.name ?? ""));
  };
  root.addEventListener("click", onClick);
  cleanups.push(() => root.removeEventListener("click", onClick));

  // scroll doesn't bubble: listen in the capture phase for any carousel on the page
  const onScroll = (e: Event) => {
    const el = e.target as HTMLElement;
    if (!el?.dataset || !("slides" in el.dataset)) return;
    const n = el.children.length;
    const i = Math.min(n, Math.round(el.scrollLeft / Math.max(1, el.clientWidth)) + 1);
    const c = el.parentElement?.querySelector("[data-slide-count]");
    if (c && c.textContent !== `${i} / ${n}`) c.textContent = `${i} / ${n}`;
  };
  root.addEventListener("scroll", onScroll, { capture: true, passive: true });
  cleanups.push(() => root.removeEventListener("scroll", onScroll, { capture: true }));

  cleanups.push(startCountdowns(root));

  const popup = root.querySelector<HTMLDialogElement>("dialog[data-popup]");
  if (popup && !popup.open && (preview || !wasDismissed(popup.dataset.popup!))) {
    if (preview) popup.show();
    else popup.showModal();
    const onClose = () => !preview && remember(popup.dataset.popup!);
    popup.addEventListener("close", onClose);
    cleanups.push(() => popup.removeEventListener("close", onClose));
  }


  cleanups.push(startLiveSlots(root));
  if (!preview) {
    // "play" doesn't bubble: capture it on the root for every podcast episode player
    const onPlay = (e: Event) => {
      const a = e.target as HTMLElement;
      if (a?.dataset?.playB) trackEvent(username, { kind: "click", block_id: a.dataset.playB, action: "play" });
    };
    root.addEventListener("play", onPlay, true);
    cleanups.push(() => root.removeEventListener("play", onPlay, true));
  }

  // interactive P3-C/D cards and gate unlocks (tautan-27): one delegated hook, module loaded on demand
  const ctx = { username, preview, root };
  let p3cd: Promise<typeof import("./runtime-p3cd")> | null = null;
  const loadP3cd = () => (p3cd ??= import("./runtime-p3cd"));
  const onSubmit = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-x]");
    if (!el) return;
    e.preventDefault();
    void loadP3cd().then((m) => m.run(e, el, ctx));
  };
  const onInput = (e: Event) => {
    const el = (e.target as Element | null)?.closest?.<HTMLElement>("[data-x]");
    if (el) void loadP3cd().then((m) => m.run(e, el, ctx));
  };
  root.addEventListener("submit", onSubmit);
  root.addEventListener("input", onInput);
  cleanups.push(() => {
    root.removeEventListener("submit", onSubmit);
    root.removeEventListener("input", onInput);
  });
  if (root.querySelector("[data-x-lock]")) void loadP3cd().then((m) => m.restore(root, ctx));

  return () => cleanups.forEach((f) => f());
}

// ---------- owner's GA4 / Meta Pixel (like next/script lazyOnload, without its client code) ----------

/**
 * Starts on the visitor's first interaction or 3 s after load, whichever comes first, so ~250 kB of
 * tag script never competes with the page's own first paint and images (trade-off: a visitor who
 * leaves within 3 s without touching the page isn't counted by GA/Pixel; Tautan's own analytics still is).
 */
function loadTags(ga4?: string, pixel?: string) {
  if (!ga4 && !pixel) return;
  let started = false;
  const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
  const go = () => {
    if (started) return;
    started = true;
    events.forEach((e) => window.removeEventListener(e, go));
    void import("./runtime-extras").then((m) => m.injectTags(ga4, pixel));
  };
  events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
  setTimeout(go, 3000);
}

// ---------- product WhatsApp link ----------

function composeWa(a: HTMLAnchorElement) {
  const card = a.closest("[data-product]");
  const variant = card ? [...card.querySelectorAll<HTMLInputElement>("input[data-variant]:checked")].map((r) => r.value).join(", ") : "";
  const href = waLink(a.dataset.waNumber, fillTemplate(a.dataset.waTemplate!, { name: a.dataset.waName, price: a.dataset.waPrice, variant }));
  if (href) a.href = href;
}

// ---------- copy ----------

async function doCopy(btn: HTMLElement) {
  try {
    await navigator.clipboard.writeText(btn.dataset.copy!);
  } catch {
    // clipboard blocked: the text is visible and selectable
  }
  const label = btn.querySelector("[data-copy-label]");
  const status = btn.parentElement?.parentElement?.querySelector("[data-copy-status]");
  if (label) {
    const was = label.textContent;
    label.textContent = "Copied";
    if (status) status.textContent = "Copied to clipboard";
    setTimeout(() => {
      label.textContent = was;
      if (status) status.textContent = "";
    }, 1800);
  }
}

// ---------- embeds ----------

function loadEmbed(el: HTMLElement) {
  const f = document.createElement("iframe");
  let src = el.dataset.embed!;
  if (el.dataset.autoplay) src += (src.includes("?") ? "&" : "?") + el.dataset.autoplay;
  f.src = src;
  f.title = el.dataset.title || "Embedded content";
  if (el.dataset.height) f.height = el.dataset.height;
  f.className = el.dataset.frameClass || "";
  f.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  f.referrerPolicy = "strict-origin-when-cross-origin";
  f.allowFullscreen = true;
  const host = el.dataset.replace === "self" ? el : el.parentElement!;
  if (host === el) el.replaceWith(f);
  else host.replaceChildren(f);
  f.focus();
}

// ---------- events "Live now" ----------

function startLiveSlots(root: HTMLElement): () => void {
  const els = [...root.querySelectorAll<HTMLElement>("[data-live-slot]")];
  if (!els.length) return () => {};
  const t = (v?: string) => (v ? Date.parse(v) : NaN);
  const tick = () => {
    const now = Date.now();
    for (const el of els) {
      const { liveEnd, nextStart, nextEnd, nextLabel } = el.dataset;
      const on = now < t(liveEnd) || (now >= t(nextStart) && now < t(nextEnd));
      const text = on ? "Live now" : now < t(nextStart) ? (nextLabel ?? "") : "";
      el.classList.toggle(s.crLiveOn, on);
      if (el.textContent !== text) el.textContent = text;
    }
  };
  tick();
  const id = setInterval(tick, 30_000);
  return () => clearInterval(id);
}

// ---------- countdowns ----------

function startCountdowns(root: HTMLElement): () => void {
  const els = [...root.querySelectorAll<HTMLElement>("[data-countdown]")];
  if (!els.length) return () => {};
  const tick = () => {
    const now = Date.now();
    for (const el of els) {
      const end = Date.parse(el.dataset.countdown!);
      if (Number.isNaN(end)) continue;
      const left = Math.max(0, Math.floor((end - now) / 1000));
      if (left === 0) {
        if (el.dataset.hideAfter) el.hidden = true;
        el.querySelector<HTMLElement>("[data-cd-grid]")?.setAttribute("hidden", "");
        el.querySelector<HTMLElement>("[data-cd-ended]")?.removeAttribute("hidden");
        continue;
      }
      const v = { d: Math.floor(left / 86400), h: Math.floor((left % 86400) / 3600), m: Math.floor((left % 3600) / 60), s: left % 60 };
      el.querySelectorAll<HTMLElement>("[data-u]").forEach((n) => {
        const txt = String(v[n.dataset.u as keyof typeof v]).padStart(2, "0");
        if (n.textContent !== txt) n.textContent = txt;
      });
      el.querySelector("[data-cd-grid]")?.setAttribute("aria-label", `${v.d} days ${v.h} hours ${v.m} minutes left`);
    }
  };
  tick();
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}

// ---------- announcement ----------

const annKey = (id: string) => `tautan:announcement-dismissed:${id}`;
function wasDismissed(id: string): boolean {
  try {
    return localStorage.getItem(annKey(id)) === "1";
  } catch {
    return false;
  }
}
function remember(id: string) {
  try {
    localStorage.setItem(annKey(id), "1");
  } catch {
    // storage blocked: dismissal lasts for this page view only
  }
}
function dismissAnnouncement(btn: HTMLElement, preview: boolean) {
  const box = btn.closest<HTMLElement>("[data-ann]");
  if (box instanceof HTMLDialogElement) box.close();
  else if (box) box.hidden = true;
  if (!preview) remember(btn.dataset.dismiss!);
}
function goToForm(blockId: string) {
  const el = document.getElementById(`block-${blockId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.querySelector<HTMLElement>("input, textarea, select")?.focus({ preventScroll: true });
}
