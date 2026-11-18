/**
 * P3-C/D interactivity, imported lazily by runtime-core (never part of first-load JS):
 *
 *   run(e, el, ctx)   a submit/input event on an element with data-x (runtime-core has already
 *                     called preventDefault for submits):
 *                       ba      before/after range → --pos on the figure
 *                       poll    vote → results (per data-show)
 *                       ask     anonymous question
 *                       lead    email → signed download link
 *                       enter   giveaway entry
 *                       unlock  card-level gate → render the card (unlock-render, lazy)
 *   restore(root, ctx) re-open gated cards ([data-x-lock]) from tokens saved in localStorage
 *
 * Requests use a text/plain JSON body (a CORS "simple" request: no preflight); the BE decodes JSON
 * whatever the Content-Type. Inside an unlocked card, endpoints get ?unlock=<token>.
 */
import type { PollResults } from "@/lib/types";
import { trackEvent } from "@/lib/track";

export interface P3cdContext {
  username: string;
  preview: boolean;
  root: HTMLElement;
}

const API_BASE = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/$/, "")}/api/v1`;

type Res = { ok: boolean; status: number; body: Record<string, unknown> | null };

async function post(path: string, body: unknown): Promise<Res> {
  try {
    const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: JSON.stringify(body) });
    const text = await r.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: r.ok, status: r.status, body: json };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

const errMsg = (r: Res, fallback = "Something went wrong. Please try again.") => {
  if (r.status === 0) return "You seem to be offline. Please try again.";
  if (r.status === 429) return "Too many tries. Please wait a few minutes.";
  const e = r.body?.error as { message?: string } | undefined;
  return e?.message ? e.message.charAt(0).toUpperCase() + e.message.slice(1) : fallback;
};

/** A successful interaction counts as a tap on its card (Insights → Top cards, Taps), with its action. */
function tap(ctx: P3cdContext, blockId: string | undefined, action: string) {
  if (blockId) trackEvent(ctx.username, { kind: "click", block_id: blockId, action });
}

// ---------- unlock tokens ----------

const tokenKey = (u: string, id: string) => `tautan:unlock:${u}:${id}`;
function getToken(u: string, id: string): string | null {
  try {
    return localStorage.getItem(tokenKey(u, id));
  } catch {
    return null;
  }
}
function setToken(u: string, id: string, tok: string | null) {
  try {
    if (tok) localStorage.setItem(tokenKey(u, id), tok);
    else localStorage.removeItem(tokenKey(u, id));
  } catch {
    // storage blocked: the card re-locks on the next visit
  }
}

/** The card's endpoint path, with ?unlock= when it sits inside an unlocked card. */
function cardPath(ctx: P3cdContext, el: HTMLElement, blockId: string, action: string): string {
  const tok = el.closest<HTMLElement>("[data-unlock-token]")?.dataset.unlockToken;
  return `/public/${encodeURIComponent(ctx.username)}/blocks/${encodeURIComponent(blockId)}/${action}${tok ? `?unlock=${encodeURIComponent(tok)}` : ""}`;
}

// ---------- form helpers ----------

function setStatus(form: HTMLElement, msg: string, tone: "error" | "ok" = "error") {
  const st = form.querySelector<HTMLElement>('[data-p="status"]');
  if (!st) return;
  st.textContent = msg;
  st.dataset.tone = tone;
}

function busy(form: HTMLFormElement, on: boolean) {
  const b = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (b) {
    b.disabled = on;
    b.setAttribute("aria-busy", on ? "true" : "false");
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function readContact(form: HTMLFormElement): { email: string; name: string; subscribe: boolean } | null {
  const fd = new FormData(form);
  const email = String(fd.get("email") ?? "").trim();
  if (!EMAIL_RE.test(email)) {
    setStatus(form, "Enter a valid email address.");
    form.querySelector<HTMLInputElement>('input[name="email"]')?.focus();
    return null;
  }
  return { email, name: String(fd.get("name") ?? "").trim(), subscribe: fd.get("subscribe") === "1" };
}

/** Replace a finished form with a short message (focus moves to it for screen readers). */
function done(form: HTMLElement, text: string, extra?: HTMLElement) {
  const box = document.createElement("div");
  box.dataset.p = "done";
  box.setAttribute("role", "status");
  box.tabIndex = -1;
  const p = document.createElement("p");
  p.textContent = text;
  box.append(p);
  if (extra) box.append(extra);
  form.replaceWith(box);
  box.focus({ preventScroll: true });
}

// ---------- handlers ----------

function beforeAfter(el: HTMLElement) {
  const input = el as HTMLInputElement;
  input.closest<HTMLElement>('[data-p="ba"]')?.style.setProperty("--pos", `${input.value}%`);
}

function pollResultsEl(options: { id: string; label: string }[], r: PollResults, mine: string): HTMLElement {
  const ul = document.createElement("ul");
  ul.dataset.p = "pollResults";
  for (const o of options) {
    const n = r.counts[o.id] ?? 0;
    const pct = r.total ? Math.round((n / r.total) * 100) : 0;
    const li = document.createElement("li");
    li.dataset.p = "pollRow";
    if (o.id === mine) li.dataset.mine = "";
    li.style.setProperty("--pct", `${pct}%`);
    const label = document.createElement("span");
    label.dataset.p = "pollLabel";
    label.textContent = o.label;
    const val = document.createElement("span");
    val.dataset.p = "pollPct";
    val.textContent = `${pct}%`;
    li.append(label, val);
    ul.append(li);
  }
  return ul;
}

async function poll(form: HTMLFormElement, ctx: P3cdContext) {
  const option = new FormData(form).get("option");
  if (!option) return setStatus(form, "Pick an answer first.");
  if (ctx.preview) return setStatus(form, "Voting works on your live page.", "ok");
  busy(form, true);
  const r = await post(cardPath(ctx, form, form.dataset.block!, "vote"), { option_id: String(option) });
  busy(form, false);
  const results = r.body?.results as PollResults | undefined;
  if (r.ok) tap(ctx, form.dataset.block, "vote");
  if (r.ok || (r.status === 409 && (r.body?.error as { code?: string })?.code === "already_voted")) {
    let options: { id: string; label: string }[] = [];
    try {
      options = JSON.parse(form.dataset.options || "[]");
    } catch {
      options = [];
    }
    const already = !r.ok;
    if (results && form.dataset.show !== "never") {
      const wrap = document.createElement("div");
      wrap.append(pollResultsEl(options, results, String(option)));
      const total = document.createElement("p");
      total.dataset.p = "fine";
      total.textContent = `${already ? "You already voted today · " : ""}${results.total} vote${results.total === 1 ? "" : "s"}`;
      wrap.append(total);
      return done(form, already ? "Here are the results so far." : "Thanks for voting!", wrap);
    }
    return done(form, already ? "You already voted today. Thanks!" : "Thanks for voting!");
  }
  setStatus(form, errMsg(r));
}

async function ask(form: HTMLFormElement, ctx: P3cdContext) {
  const fd = new FormData(form);
  if (fd.get("company")) return done(form, "Thanks! Your question was sent.");
  const question = String(fd.get("question") ?? "").trim();
  if (!question) return setStatus(form, "Type a question first.");
  if (ctx.preview) return setStatus(form, "Questions can be sent from your live page.", "ok");
  busy(form, true);
  const r = await post(cardPath(ctx, form, form.dataset.block!, "ask"), { question });
  busy(form, false);
  if (r.ok) {
    tap(ctx, form.dataset.block, "ask");
    return done(form, "Thanks! Your question was sent anonymously.");
  }
  setStatus(form, errMsg(r));
}

async function lead(form: HTMLFormElement, ctx: P3cdContext) {
  if (new FormData(form).get("company")) return done(form, form.dataset.done || "Thanks!");
  const c = readContact(form);
  if (!c) return;
  if (ctx.preview) return setStatus(form, "The download works on your live page.", "ok");
  busy(form, true);
  const r = await post(cardPath(ctx, form, form.dataset.block!, "lead"), c);
  busy(form, false);
  const url = r.body?.download_url as string | undefined;
  // The BE returns a root-relative path; accept an absolute https URL too, nothing else.
  const href = url?.startsWith("/") && !url.startsWith("//") ? `${API_BASE.replace(/\/api\/v1$/, "")}${url}` : url && /^https:\/\//.test(url) ? url : undefined;
  if (r.ok && href) {
    tap(ctx, form.dataset.block, "lead");
    const a = document.createElement("a");
    a.href = href;
    a.dataset.p = "download";
    a.textContent = "Download";
    a.rel = "noopener";
    return done(form, form.dataset.done || "Here's your download.", a);
  }
  setStatus(form, errMsg(r));
}

async function enter(form: HTMLFormElement, ctx: P3cdContext) {
  if (new FormData(form).get("company")) return done(form, "You're in. Good luck!");
  const c = readContact(form);
  if (!c) return;
  if (ctx.preview) return setStatus(form, "Entries open on your live page.", "ok");
  busy(form, true);
  const r = await post(cardPath(ctx, form, form.dataset.block!, "enter"), c);
  busy(form, false);
  if (r.ok && !r.body?.already_entered) tap(ctx, form.dataset.block, "enter"); // a repeat entry is not a new tap
  if (r.ok) return done(form, r.body?.already_entered ? "You're already entered with that email. Good luck!" : "You're in. Good luck!");
  setStatus(form, errMsg(r));
}

// ---------- gates ----------

interface UnlockBody {
  block: unknown;
  children: unknown[];
  media: Record<string, unknown>;
  unlock_token: string;
}

async function openCard(stub: HTMLElement, ctx: P3cdContext, body: UnlockBody) {
  const id = stub.dataset.xLock!;
  setToken(ctx.username, id, body.unlock_token);
  const host = document.createElement("div");
  host.dataset.unlockToken = body.unlock_token;
  host.id = stub.id;
  // The locked stub was rendered as a form card (no tp-sb, so its unlock button used the accent).
  // Once open, a button-ish card (link, file, booking, folder) takes its palette surface again.
  const type = (body.block as { type?: string } | null)?.type ?? "";
  if (/\btp-s\d\b/.test(stub.parentElement?.className ?? "") && ["link", "file", "booking", "folder"].includes(type)) host.className = "tp-sb";
  stub.replaceWith(host);
  const m = await import("./unlock-render");
  m.renderUnlocked(host, body, ctx.username);
}

async function unlock(form: HTMLFormElement, ctx: P3cdContext) {
  const stub = form.closest<HTMLElement>("[data-x-lock]");
  if (!stub) return;
  const fd = new FormData(form);
  const body: Record<string, unknown> = {};
  switch (form.dataset.kind) {
    case "password": {
      const pw = String(fd.get("password") ?? "");
      if (!pw) return setStatus(form, "Enter the password.");
      body.password = pw;
      break;
    }
    case "email": {
      const c = readContact(form);
      if (!c) return;
      Object.assign(body, c);
      break;
    }
    case "age_18":
      body.confirm_age = true;
      break;
    case "follow":
      body.followed = true;
      break;
  }
  if (ctx.preview) return setStatus(form, "Visitors unlock this card on your live page.", "ok");
  busy(form, true);
  const r = await post(`/public/${encodeURIComponent(ctx.username)}/blocks/${encodeURIComponent(stub.dataset.xLock!)}/unlock`, body);
  busy(form, false);
  if (r.ok && r.body) {
    tap(ctx, stub.dataset.xLock, "unlock");
    return openCard(stub, ctx, r.body as unknown as UnlockBody);
  }
  setStatus(form, (r.body?.error as { code?: string })?.code === "wrong_password" ? "That password isn't right." : errMsg(r));
  if (form.dataset.kind === "password") form.querySelector<HTMLInputElement>('input[name="password"]')?.select();
}

export async function restore(root: HTMLElement, c: P3cdContext) {
  if (c.preview) return;
  const stubs = [...root.querySelectorAll<HTMLElement>("[data-x-lock]")];
  await Promise.all(
    stubs.map(async (stub) => {
      const id = stub.dataset.xLock!;
      const token = getToken(c.username, id);
      if (!token) return;
      const r = await post(`/public/${encodeURIComponent(c.username)}/blocks/${encodeURIComponent(id)}/unlock`, { token });
      if (r.ok && r.body) await openCard(stub, c, r.body as unknown as UnlockBody);
      // Forget the token only when the BE says it's no longer valid (gate changed, card gone or not
      // gated): keep it on network errors and 5xx so a hiccup doesn't re-lock the card. Don't
      // "simplify" this to !r.ok.
      else if (r.status === 403 || r.status === 404 || r.status === 400) setToken(c.username, id, null);
    }),
  );
}

export function run(e: Event, el: HTMLElement, ctx: P3cdContext): void | Promise<void> {
  const kind = el.dataset.x;
  if (e.type === "input") {
    if (kind === "ba") beforeAfter(el);
    return;
  }
  if (e.type !== "submit" || !(el instanceof HTMLFormElement)) return;
  switch (kind) {
    case "poll":
      return poll(el, ctx);
    case "ask":
      return ask(el, ctx);
    case "lead":
      return lead(el, ctx);
    case "enter":
      return enter(el, ctx);
    case "unlock":
      return unlock(el, ctx);
  }
}
