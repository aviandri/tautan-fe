"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { cx } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useCreateBlock } from "@/lib/editor/queries";
import { blockFromUnfurl, looksPasteable, marketplaceBlock, sellSuggestion, type SellSuggestion } from "@/lib/editor/smart-paste";
import type { Block, UnfurlResult } from "@/lib/types";

export function pasteError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "invalid_url") return "That doesn't look like a link or email address.";
    if (e.code === "blocked_url") return "That address can't be added.";
    if (e.code === "rate_limited") return "Slow down a little, then try again.";
    return e.message;
  }
  return "Couldn't reach the server. Try again.";
}

/**
 * "Paste a link" input: unfurls the URL and creates the suggested block
 * (link with title/description/thumbnail, video, music, booking, image, email).
 */
export type PasteOutcome = { kind: "created"; block: Block } | { kind: "sell"; suggestion: SellSuggestion };

/**
 * Unfurl a pasted link and create the suggested block. Marketplace links (P3-A) aren't
 * created straight away: they come back as a suggestion so the editor can ask
 * product, marketplace card or plain link. Throws on other failures.
 */
export function usePasteToBlock(tabId: string) {
  const [busy, setBusy] = useState(false);
  const create = useCreateBlock();
  return {
    busy,
    run: async (text: string): Promise<PasteOutcome> => {
      setBusy(true);
      try {
        let r: UnfurlResult;
        try {
          r = await api.unfurl(text.trim());
        } catch (e) {
          // the server couldn't read it: still recognise marketplace hosts
          const s = sellSuggestion(null, text);
          if (s && !(e instanceof ApiError && (e.code === "invalid_url" || e.code === "blocked_url"))) return { kind: "sell", suggestion: s };
          throw e;
        }
        const s = sellSuggestion(r, text);
        if (s) return { kind: "sell", suggestion: s };
        return { kind: "created", block: await create.mutateAsync(blockFromUnfurl(r, tabId)) };
      } finally {
        setBusy(false);
      }
    },
  };
}

/** `onSell` lets the editor ask what a marketplace link should become; without it a "Buy on" card is made. */
export function SmartPaste({ tabId, onCreated, onSell }: { tabId: string; onCreated: (b: Block) => void; onSell?: (s: SellSuggestion) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const paste = usePasteToBlock(tabId);
  const create = useCreateBlock();
  const busy = paste.busy || create.isPending;
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(text: string) {
    const s = text.trim();
    if (!s || busy) return;
    setError(null);
    try {
      const out = await paste.run(s);
      setValue("");
      if (out.kind === "created") onCreated(out.block);
      else if (onSell) onSell(out.suggestion);
      else onCreated(await create.mutateAsync(marketplaceBlock(out.suggestion, tabId)));
    } catch (e) {
      setError(pasteError(e));
      inputRef.current?.focus();
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
        }}
        className={cx(
          "flex h-[50px] items-center gap-2 rounded-full bg-surface pl-4 pr-1.5 transition-[box-shadow]",
          "focus-within:shadow-[inset_0_0_0_2px_var(--ink)]",
          error ? "shadow-[inset_0_0_0_2px_var(--danger)]" : "shadow-[inset_0_0_0_1px_var(--line-2)]",
        )}
      >
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-brand" aria-hidden /> : <Sparkles className="size-4 shrink-0 text-brand" aria-hidden />}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (looksPasteable(text)) {
              e.preventDefault();
              setValue(text.trim());
              run(text);
            }
          }}
          disabled={busy}
          aria-label="Paste a link, video or email"
          aria-invalid={!!error}
          aria-describedby="smart-paste-hint"
          placeholder="Paste a link to add a card"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none placeholder:font-medium placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!value.trim() || busy}
          aria-label="Add from link"
          className="inline-flex size-[38px] shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity disabled:opacity-25"
        >
          <ArrowRight className="size-4" />
        </button>
      </form>
      <p id="smart-paste-hint" className={cx("mt-1.5 px-4 text-[12px]", error ? "text-danger" : "text-muted")} role={error ? "alert" : undefined}>
        {error ?? "Links, YouTube, Spotify, Calendly, Shopee or Tokopedia, images and emails each become the right card."}
      </p>
    </div>
  );
}
