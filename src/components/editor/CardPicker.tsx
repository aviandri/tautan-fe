"use client";

/**
 * "Add a card" dialog: category nav, search with synonyms (or paste a link),
 * and a preview of the hovered card rendered in the page's own theme.
 */
import { Check, Link2, Search, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ThemedBlocks } from "@/components/public";
import { Button, cx, IconButton } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { tileColor } from "./BlockCard";
import { ALL_TYPES, CATALOG, CATEGORIES, POPULAR, searchCards, type CategoryId } from "@/lib/editor/catalog";
import { looksPasteable } from "@/lib/editor/smart-paste";
import { useSession } from "@/lib/session";
import type { Block, BlockType, Theme } from "@/lib/types";

export function CardPicker({
  onPick,
  onPaste,
  onClose,
}: {
  onPick: (t: BlockType) => void;
  /** a link typed or pasted into search */
  onPaste?: (text: string) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<BlockType>("product");
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);
  const theme = useSession().data?.profile.theme;

  const pasteable = onPaste && looksPasteable(query);
  const results = useMemo(() => searchCards(query), [query]);
  const shown = useMemo((): { title: string; types: BlockType[]; compact?: boolean }[] => {
    if (query.trim()) return [{ title: `Matches for “${query.trim()}”`, types: results }];
    if (cat === "all") return [{ title: "Popular", types: POPULAR, compact: true }, ...CATEGORIES.map((c) => ({ title: c.label, types: c.types }))];
    const c = CATEGORIES.find((x) => x.id === cat)!;
    return [{ title: c.label, types: c.types }];
  }, [query, cat, results]);

  // keep the preview on something visible
  useEffect(() => {
    const first = shown.find((s) => s.types.length)?.types[0];
    if (first && !shown.some((s) => s.types.includes(preview))) setPreview(first);
  }, [shown, preview]);

  useEffect(() => {
    restoreFocus.current = document.activeElement as HTMLElement | null;
    searchRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      restoreFocus.current?.focus?.();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    // keep focus inside the dialog
    const f = [...dialogRef.current.querySelectorAll<HTMLElement>("button, input, [href], [tabindex]:not([tabindex='-1'])")].filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
    if (!f.length) return;
    const [first, last] = [f[0], f[f.length - 1]];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const count = ALL_TYPES.length;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-[rgba(20,20,18,.36)] sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-picker-title"
        onKeyDown={onKeyDown}
        className="flex h-full w-full max-w-[1120px] flex-col overflow-hidden bg-surface shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)] sm:h-[min(760px,100%)] sm:rounded-[28px] md:flex-row"
      >
        {/* categories */}
        <nav aria-label="Card categories" className="shrink-0 border-line md:w-56 md:border-r md:p-4">
          <div className="flex items-center justify-between px-4 pt-4 md:px-2 md:pt-0">
            <h2 id="card-picker-title" className="text-lg font-semibold md:mb-3">
              Add a card
            </h2>
            <div className="md:hidden">
              <IconButton label="Close" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto px-4 py-3 [scrollbar-width:none] md:flex-col md:overflow-visible md:p-0">
            {[{ id: "all" as const, label: "All cards" }, ...CATEGORIES].map((c) => {
              const on = cat === c.id && !query.trim();
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => {
                    setCat(c.id);
                    setQuery("");
                  }}
                  className={cx(
                    "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-left text-[14px] font-medium transition-colors md:h-10",
                    on ? "bg-foreground text-background" : "text-muted hover:bg-black/[.04] hover:text-foreground",
                  )}
                >
                  {c.label}
                  {c.id === "all" && <span className="ml-auto font-mono text-[11px] opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* search + grid */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
          <div className="flex items-center gap-2 px-4 pb-3 md:px-6 md:pt-6">
            <label className="flex h-12 flex-1 items-center gap-2.5 rounded-full border-2 border-foreground bg-surface px-4">
              <Search className="size-4 shrink-0" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (pasteable) onPaste!(query.trim());
                  else if (results[0]) onPick(results[0]);
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (onPaste && looksPasteable(text)) {
                    e.preventDefault();
                    onPaste(text.trim());
                  }
                }}
                aria-label="Search cards or paste a link"
                placeholder="Search cards or paste a link"
                autoCapitalize="none"
                spellCheck={false}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-muted"
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-muted hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </label>
            <div className="hidden md:block">
              <IconButton label="Close" onClick={onClose} className="size-12 rounded-full bg-surface">
                <X className="size-4" />
              </IconButton>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 md:px-6">
            {pasteable ? (
              <button
                type="button"
                onClick={() => onPaste!(query.trim())}
                className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-brand/10 px-4 py-3 text-left text-[14px] font-medium text-brand hover:bg-brand/15"
              >
                <Link2 className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">Add a card from {query.trim()}</span>
                <kbd className="hidden rounded-md bg-surface px-1.5 py-0.5 font-mono text-[11px] sm:inline">Enter</kbd>
              </button>
            ) : (
              !query.trim() &&
              onPaste && (
                <p className="mb-4 flex items-center gap-2.5 rounded-2xl bg-accent px-4 py-3 text-[13px] font-medium text-accent-ink">
                  <Link2 className="size-4 shrink-0" aria-hidden />
                  Tip: paste a link here and we pick the card. A YouTube link becomes a video, a Shopee link a marketplace card.
                </p>
              )
            )}

            {shown.map((s) => (
              <section key={s.title} className="mb-6">
                <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">{s.title}</h3>
                {s.types.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
                    No cards match. Try “order”, “toko” or “calendar”{onPaste ? ", or paste a link" : ""}.
                  </p>
                ) : (
                  <div className={cx("grid gap-2.5", s.compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3")}>
                    {s.types.map((t) => (
                      <Tile key={`${s.title}-${t}`} type={t} compact={s.compact} active={preview === t} onFocus={() => setPreview(t)} onPick={() => onPick(t)} />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>

        {/* preview */}
        <aside aria-label="Card preview" className="hidden w-[330px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-6 lg:flex">
          <PreviewPane type={preview} theme={theme} onAdd={() => onPick(preview)} />
        </aside>
      </div>
    </div>,
    // inside the Kartu root so the dialog gets the owner-side tokens and fonts
    document.querySelector("[data-kartu-root]") ?? document.body,
  );
}

function Tile({ type, compact, active, onFocus, onPick }: { type: BlockType; compact?: boolean; active: boolean; onFocus: () => void; onPick: () => void }) {
  const m = getMeta(type);
  const Icon = m.icon;
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      aria-label={`${m.label}: ${m.description}`}
      className={cx(
        "flex rounded-2xl text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(0,0,0,.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
        compact ? "items-center gap-3 bg-surface p-3 shadow-[0_0_0_1px_var(--line)]" : "min-h-[124px] flex-col gap-2.5 p-3.5",
        active && !compact && "shadow-[0_0_0_2px_var(--ink)]",
      )}
      style={compact ? undefined : { background: tileColor(type) }}
    >
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-surface/80 text-foreground">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold">{m.label}</span>
        <span className={cx("block text-[12.5px] leading-snug text-muted", compact && "truncate")}>{m.description}</span>
      </span>
    </button>
  );
}

const SAMPLE_BASE = { profile_id: "", tab_id: "x", parent_id: null, position: 0, is_visible: true, created_at: "", updated_at: "" };

function PreviewPane({ type, theme, onAdd }: { type: BlockType; theme?: Theme; onAdd: () => void }) {
  const m = getMeta(type);
  const e = CATALOG[type];
  const Icon = m.icon;
  const box = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(true);
  const blocks = useMemo(() => (e.sample ? ([{ ...SAMPLE_BASE, id: `sample-${type}`, type, data: e.sample }] as Block[]) : []), [e.sample, type]);

  // The renderer draws nothing for types it doesn't know yet: fall back to the icon.
  useLayoutEffect(() => {
    const el = box.current;
    setRendered(!!el && (el.innerText.trim().length > 0 || !!el.querySelector("img, svg, iframe, input")));
  }, [blocks]);

  return (
    <>
      <div className="relative overflow-hidden rounded-[26px]" style={{ background: tileColor(type) }}>
        {theme && blocks.length > 0 && (
          <div ref={box} aria-hidden className={cx("pointer-events-none max-h-[300px] overflow-hidden", !rendered && "absolute inset-0 opacity-0")} inert>
            <ThemedBlocks theme={theme} blocks={blocks} style={{ padding: 18 }} />
          </div>
        )}
        {(!theme || !blocks.length || !rendered) && (
          <div className="flex aspect-[4/3] items-center justify-center">
            <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-surface text-foreground shadow-card">
              <Icon className="size-7" aria-hidden />
            </span>
          </div>
        )}
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{m.label}</h3>
      <p className="text-[14px] leading-relaxed text-muted">{e.blurb}</p>
      {e.features && (
        <ul className="flex flex-col gap-2 text-[13px] font-medium">
          {e.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
      )}
      <Button type="button" size="lg" className="mt-auto w-full" onClick={onAdd}>
        Add {m.label.toLowerCase()} card
      </Button>
    </>
  );
}
