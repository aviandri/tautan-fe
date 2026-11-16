"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button, cx, Field, IconButton, Input, Textarea } from "@/components/ui";
import { api, ApiError, assetUrl } from "@/lib/api";
import { normalizeUrl } from "@/lib/url";

/** Text input bound to a string value. */
export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  multiline,
  maxLength,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  hint?: React.ReactNode;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) =>
        multiline ? (
          <Textarea {...p} value={value} placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
        ) : (
          <Input {...p} value={value} placeholder={placeholder} maxLength={maxLength} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </Field>
  );
}

/** URL input that normalises "example.com" → "https://example.com" on blur. */
export function UrlField({
  label = "URL",
  value,
  onChange,
  error,
  placeholder = "https://",
  hint,
  autoFocus,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  hint?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <Input
          {...p}
          type="url"
          inputMode="url"
          autoCapitalize="none"
          spellCheck={false}
          value={value}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const n = normalizeUrl(e.target.value);
            if (n !== e.target.value) onChange(n);
          }}
        />
      )}
    </Field>
  );
}

const MAX_UPLOAD = 5 * 1024 * 1024;
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

export function uploadErrorMessage(err: unknown) {
  if (err instanceof ApiError) {
    if (err.code === "unsupported_type") return "Use a PNG, JPEG, GIF or WebP image.";
    if (err.code === "file_too_large") return "Images can be up to 5 MB.";
    return err.message;
  }
  return "Upload failed. Try again.";
}

/** Upload an image (POST /uploads) or paste a URL. */
export function ImageField({
  label,
  value,
  onChange,
  error,
  shape = "wide",
  allowUrl = true,
}: {
  label: string;
  value: string | undefined;
  onChange: (url: string) => void;
  error?: string;
  shape?: "wide" | "square" | "round";
  allowUrl?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setUploadError(null);
    if (!ACCEPT.split(",").includes(f.type)) return setUploadError("Use a PNG, JPEG, GIF or WebP image.");
    if (f.size > MAX_UPLOAD) return setUploadError("Images can be up to 5 MB.");
    setBusy(true);
    try {
      const { url } = await api.uploads.create(f);
      onChange(url);
    } catch (e) {
      setUploadError(uploadErrorMessage(e));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const src = assetUrl(value);
  return (
    <Field label={label} error={uploadError ?? error}>
      {(p) => (
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label={value ? "Replace image" : "Upload image"}
            className={cx(
              "group relative shrink-0 overflow-hidden border border-dashed border-line bg-background transition-colors hover:border-brand",
              shape === "wide" ? "h-20 w-32 rounded-xl" : shape === "round" ? "size-16 rounded-full" : "size-16 rounded-xl",
              src && "border-solid",
            )}
          >
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" className="size-full object-cover" />
            ) : (
              <span className="flex size-full items-center justify-center text-muted group-hover:text-brand">
                <ImagePlus className="size-5" aria-hidden />
              </span>
            )}
            {busy && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                <Loader2 className="size-4 animate-spin" />
              </span>
            )}
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {allowUrl && (
              <Input
                {...p}
                value={value ?? ""}
                placeholder="Upload, or paste an image URL"
                onChange={(e) => onChange(e.target.value)}
                onBlur={(e) => {
                  const n = normalizeUrl(e.target.value);
                  if (n !== e.target.value) onChange(n);
                }}
                className="h-9 text-sm"
              />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={busy}>
                {value ? "Replace" : "Upload"}
              </Button>
              {value && (
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                  <X className="size-3.5" /> Remove
                </Button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      )}
    </Field>
  );
}

/** Repeatable rows with add / remove / move up-down. */
export function ItemsEditor<T>({
  items,
  onChange,
  make,
  addLabel,
  render,
  max = 30,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  max?: number;
}) {
  const set = (i: number, patch: Partial<T>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((it, i) => (
        <div key={i} className="relative rounded-xl border border-line bg-background/60 p-3 pr-11">
          {render(it, (p) => set(i, p), i)}
          <div className="absolute right-1.5 top-1.5 flex flex-col">
            <IconButton label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              <Trash2 className="size-3.5" />
            </IconButton>
            {i > 0 && (
              <IconButton label="Move up" onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </IconButton>
            )}
            {i < items.length - 1 && (
              <IconButton label="Move down" onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="secondary" size="sm" className="self-start" onClick={() => onChange([...items, make()])}>
          <Plus className="size-3.5" /> {addLabel}
        </Button>
      )}
    </div>
  );
}
