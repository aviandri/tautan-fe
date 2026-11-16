"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { downloadHref, profileUrl, qrPngDataUrl, qrSvg } from "@/lib/qr";

export interface QrCardProps {
  username: string;
  /** Compact layout for a popover (smaller code, no heading). */
  compact?: boolean;
}

export function QrCard({ username, compact = false }: QrCardProps) {
  const [url, setUrl] = useState("");
  const [svg, setSvg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  // profileUrl reads window.location, so build it after mount
  useEffect(() => setUrl(profileUrl(username)), [username]);

  useEffect(() => {
    if (!url) return;
    let live = true;
    qrSvg(url)
      .then((s) => live && setSvg(s))
      .catch(() => live && setError(true));
    return () => {
      live = false;
    };
  }, [url]);

  const file = `tautan-${username}-qr`;

  async function downloadPng() {
    downloadHref(await qrPngDataUrl(url, 1024), `${file}.png`);
  }

  function downloadSvg() {
    if (!svg) return;
    const href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    downloadHref(href, `${file}.svg`);
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the URL is visible and selectable anyway */
    }
  }

  const size = compact ? "w-40" : "w-56";

  return (
    <div className={`flex flex-col items-center gap-4 ${compact ? "" : "rounded-xl border border-line bg-surface p-6"}`}>
      {compact ? null : (
        <div className="self-stretch">
          <h2 className="text-base font-semibold text-foreground">QR code</h2>
          <p className="text-sm text-muted">Print it on a menu, a flyer or your packaging. It opens your page.</p>
        </div>
      )}

      <div className={`${size} aspect-square overflow-hidden rounded-lg border border-line bg-white`}>
        {svg ? (
          // generated locally by the qrcode library from our own URL, not user HTML
          <div className="h-full w-full [&>svg]:h-full [&>svg]:w-full" role="img" aria-label={`QR code for ${url}`} dangerouslySetInnerHTML={{ __html: svg }} />
        ) : error ? (
          <p className="grid h-full place-items-center p-4 text-center text-sm text-danger">Couldn&apos;t make the QR code.</p>
        ) : (
          <div className="h-full w-full animate-pulse bg-black/5" />
        )}
      </div>

      <div className="flex w-full max-w-sm items-center gap-2 rounded-lg border border-line bg-background px-3">
        <span className="min-w-0 flex-1 truncate py-2 font-mono text-sm text-foreground" title={url}>
          {url.replace(/^https?:\/\//, "")}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? "Link copied" : "Copy link"}
          className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-black/5 hover:text-foreground"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      <div className="grid w-full max-w-sm grid-cols-2 gap-2">
        <button
          type="button"
          onClick={downloadPng}
          disabled={!svg}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-brand-ink hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          PNG
        </button>
        <button
          type="button"
          onClick={downloadSvg}
          disabled={!svg}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-foreground hover:border-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" aria-hidden />
          SVG
        </button>
      </div>
    </div>
  );
}
