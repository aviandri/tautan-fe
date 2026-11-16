"use client";

import { CalendarClock, ChevronDown, FileUp, Loader2, Smile, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button, cx, Field, Input, Switch } from "@/components/ui";
import { api, assetUrl } from "@/lib/api";
import type { LinkLayout, Schedule } from "@/lib/types";
import { uploadErrorMessage } from "./fields";

// ---------- Segmented control ----------

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[13px] font-semibold text-ink-2">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="inline-flex w-fit flex-wrap gap-1 rounded-full bg-sunken p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4 text-[14px]",
              value === o.value ? "bg-surface text-foreground shadow-[0_1px_2px_rgba(0,0,0,.08)]" : "text-ink-2 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- Toggle row ----------

export function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      <Switch label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

// ---------- Date + time (local input ↔ RFC 3339) ----------

/** ISO → value for <input type="datetime-local"> in the viewer's zone. */
export function isoToLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function localInputToIso(v: string): string | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function DateTimeField({
  label,
  value,
  onChange,
  error,
  hint,
  clearable,
}: {
  label: string;
  value: string | undefined;
  onChange: (iso: string | undefined) => void;
  error?: string;
  hint?: React.ReactNode;
  clearable?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className="flex items-center gap-2">
          <Input {...p} type="datetime-local" value={isoToLocalInput(value)} onChange={(e) => onChange(localInputToIso(e.target.value))} />
          {clearable && value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)} aria-label={`Clear ${label}`}>
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      )}
    </Field>
  );
}

// ---------- Schedule ----------

export function ScheduleField({
  value,
  onChange,
  error,
  noun = "block",
}: {
  value: Schedule | undefined;
  onChange: (s: Schedule | undefined) => void;
  error?: string;
  /** what gets hidden, for the hint ("block", "announcement") */
  noun?: string;
}) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const set = (p: Partial<Schedule>) => {
    const next = { ...value, ...p };
    if (!next.start_at) delete next.start_at;
    if (!next.end_at) delete next.end_at;
    onChange(next.start_at || next.end_at ? next : undefined);
  };
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <DateTimeField label="Show from" value={value?.start_at} onChange={(start_at) => set({ start_at })} clearable />
        <DateTimeField label="Hide after" value={value?.end_at} onChange={(end_at) => set({ end_at })} error={error} clearable />
      </div>
      <p className="text-[12px] text-muted">
        Times are in your zone ({tz}). Outside this window the {noun} is hidden from visitors but stays here.
      </p>
    </div>
  );
}

export function scheduleState(s: Schedule | undefined, now = Date.now()): "scheduled" | "live" | "ended" | null {
  if (!s || (!s.start_at && !s.end_at)) return null;
  if (s.start_at && Date.parse(s.start_at) > now) return "scheduled";
  if (s.end_at && Date.parse(s.end_at) <= now) return "ended";
  return "live";
}

// ---------- Disclosure ----------

export function MoreOptions({
  title = "More options",
  badge,
  children,
  defaultOpen,
}: {
  title?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium"
      >
        {title}
        {badge}
        <ChevronDown className={cx("ml-auto size-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-4 border-t border-line px-3.5 py-4">{children}</div>}
    </div>
  );
}

// ---------- File upload (kind=file) ----------

const FILE_MAX = 25 * 1024 * 1024;

export function formatBytes(n: number | undefined): string {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUploadField({
  label,
  value,
  onUploaded,
  error,
}: {
  label: string;
  value: { url: string; file_name?: string; size?: number };
  onUploaded: (r: { url: string; file_name?: string; size?: number }) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(null);
    if (f.size > FILE_MAX) return setErr("Files can be up to 25 MB.");
    setBusy(true);
    try {
      const r = await api.uploads.create(f, "file");
      onUploaded({ url: r.url, file_name: r.file_name ?? f.name, size: r.size ?? f.size });
    } catch (e) {
      setErr(uploadErrorMessage(e).replace("Use a PNG, JPEG, GIF or WebP image.", "Use a PDF, ZIP, MP3, MP4, text file or image."));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <Field label={label} error={err ?? error}>
      {() => (
        <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-background/60 p-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface text-muted">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            {value.url ? (
              <>
                <span className="block truncate text-sm font-medium">{value.file_name || "Uploaded file"}</span>
                <span className="block text-[12px] text-muted">{formatBytes(value.size)}</span>
              </>
            ) : (
              <span className="text-sm text-muted">PDF, ZIP, MP3, MP4, text or image · up to 25 MB</span>
            )}
          </span>
          <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} loading={busy}>
            {value.url ? "Replace" : "Upload"}
          </Button>
          <input
            ref={ref}
            type="file"
            hidden
            accept=".pdf,.zip,.mp3,.mp4,.txt,.png,.jpg,.jpeg,.gif,.webp,application/pdf,application/zip,audio/mpeg,video/mp4,text/plain,image/*"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      )}
    </Field>
  );
}

// ---------- Icon: emoji or image ----------

const QUICK_EMOJI = ["🔗", "🛍️", "📅", "🎧", "🎥", "📩", "⭐", "🔥", "🎁", "📍"];

export function IconField({
  value,
  onChange,
  error,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
  error?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isImage = !!value && /^(https?:|\/uploads\/)/.test(value);

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(null);
    setBusy(true);
    try {
      onChange((await api.uploads.create(f)).url);
    } catch (e) {
      setErr(uploadErrorMessage(e));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <Field label="Icon" error={err ?? error} hint="One emoji, or upload a small image">
      {(p) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-background text-xl">
              {isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrl(value)} alt="" className="size-full object-cover" />
              ) : value ? (
                value
              ) : (
                <Smile className="size-4 text-muted" />
              )}
            </span>
            {!isImage && (
              <Input {...p} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="🙂" className="w-24 text-center text-lg" />
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()} loading={busy}>
              Image
            </Button>
            {value && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
                <X className="size-3.5" /> Clear
              </Button>
            )}
            <input ref={ref} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK_EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onChange(e)}
                aria-label={`Use ${e}`}
                className={cx("size-8 rounded-lg text-base hover:bg-black/[.05]", value === e && "bg-black/[.06]")}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}

// ---------- Link layout picker ----------

const LAYOUTS: { value: LinkLayout; label: string; art: React.ReactNode }[] = [
  { value: "button", label: "Button", art: <div className="h-3 w-full rounded-[3px] bg-current" /> },
  {
    value: "thumbnail",
    label: "Thumbnail",
    art: (
      <div className="flex h-3 w-full items-center gap-1 rounded-[3px] border border-current px-0.5">
        <div className="size-2 rounded-[2px] bg-current" />
      </div>
    ),
  },
  {
    value: "thumbnail_highlight",
    label: "Featured",
    art: (
      <div className="flex w-full flex-col gap-0.5">
        <div className="h-4 w-full rounded-[3px] bg-current opacity-60" />
        <div className="h-1.5 w-2/3 rounded-full bg-current" />
      </div>
    ),
  },
  {
    value: "grid2",
    label: "Grid 2",
    art: (
      <div className="grid w-full grid-cols-2 gap-0.5">
        <div className="h-4 rounded-[3px] bg-current" />
        <div className="h-4 rounded-[3px] bg-current opacity-50" />
      </div>
    ),
  },
  {
    value: "grid3",
    label: "Grid 3",
    art: (
      <div className="grid w-full grid-cols-3 gap-0.5">
        <div className="h-4 rounded-[2px] bg-current" />
        <div className="h-4 rounded-[2px] bg-current opacity-50" />
        <div className="h-4 rounded-[2px] bg-current opacity-30" />
      </div>
    ),
  },
  {
    value: "image_background",
    label: "Image",
    art: (
      <div className="flex h-5 w-full items-end rounded-[3px] bg-current/40 p-0.5" style={{ background: "currentColor", opacity: 0.55 }}>
        <div className="h-1 w-1/2 rounded-full bg-white" />
      </div>
    ),
  },
  {
    value: "carousel",
    label: "Carousel",
    art: (
      <div className="flex w-full gap-0.5 overflow-hidden">
        <div className="h-4 w-3/4 shrink-0 rounded-[3px] bg-current" />
        <div className="h-4 w-1/2 shrink-0 rounded-[3px] bg-current opacity-40" />
      </div>
    ),
  },
];

export function LayoutPicker({ value, onChange }: { value: LinkLayout; onChange: (v: LinkLayout) => void }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[13px] font-medium">
        Layout
      </span>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={value === l.value}
            aria-label={l.label}
            onClick={() => onChange(l.value)}
            className={cx(
              "flex flex-col items-center gap-1.5 rounded-xl border px-2 pb-1.5 pt-2.5 transition-colors",
              value === l.value ? "border-brand bg-brand/[.06] text-brand" : "border-line text-[#a29e8e] hover:border-line-2",
            )}
          >
            <div className="flex h-6 w-full items-center">{l.art}</div>
            <span className={cx("text-[11px] font-medium", value === l.value ? "text-brand" : "text-muted")}>{l.label}</span>
          </button>
        ))}
      </div>
      {(value === "grid2" || value === "grid3" || value === "carousel") && (
        <p className="text-[12px] text-muted">Consecutive links with the same layout are grouped together.</p>
      )}
    </div>
  );
}

export { CalendarClock };
