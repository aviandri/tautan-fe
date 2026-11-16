"use client";

import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { cx } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useCreateBlock } from "@/lib/editor/queries";
import { blockFromUnfurl, looksPasteable } from "@/lib/editor/smart-paste";
import type { Block } from "@/lib/types";

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
/** Unfurl a pasted link and create the suggested block. Resolves to the block, or throws. */
export function usePasteToBlock(tabId: string) {
  const [busy, setBusy] = useState(false);
  const create = useCreateBlock();
  return {
    busy,
    run: async (text: string): Promise<Block> => {
      setBusy(true);
      try {
        const r = await api.unfurl(text.trim());
        return await create.mutateAsync(blockFromUnfurl(r, tabId));
      } finally {
        setBusy(false);
      }
    },
  };
}

export function SmartPaste({ tabId, onCreated }: { tabId: string; onCreated: (b: Block) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const paste = usePasteToBlock(tabId);
  const busy = paste.busy;
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(text: string) {
    const s = text.trim();
    if (!s || busy) return;
    setError(null);
    try {
      const block = await paste.run(s);
      setValue("");
      onCreated(block);
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
          "flex h-12 items-center gap-2 rounded-xl border bg-surface pl-3.5 pr-1.5 transition-[border-color,box-shadow]",
          "focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10",
          error ? "border-danger" : "border-line hover:border-[#cfcbbd]",
        )}
      >
        {busy ? <Loader2 className="size-4 shrink-0 animate-spin text-brand" aria-hidden /> : <Sparkles className="size-4 shrink-0 text-muted" aria-hidden />}
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
          placeholder="Paste a link, video, Calendly page or email"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#a8a493]"
        />
        <button
          type="submit"
          disabled={!value.trim() || busy}
          aria-label="Add from link"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-opacity disabled:opacity-25"
        >
          <ArrowRight className="size-4" />
        </button>
      </form>
      <p id="smart-paste-hint" className={cx("mt-1.5 text-[12px]", error ? "text-danger" : "text-muted")} role={error ? "alert" : undefined}>
        {error ?? "Links, YouTube, Spotify, Calendly, images and emails each become the right block."}
      </p>
    </div>
  );
}
