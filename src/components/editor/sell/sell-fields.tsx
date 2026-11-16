"use client";

/** Inputs shared by the P3-A sell card forms. */
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { SimpleIcon } from "simple-icons";
import { cx, Field, Input } from "@/components/ui";
import { api, assetUrl } from "@/lib/api";
import { CURRENCY_META, inputToMinor, minorToInput, type Currency } from "@/lib/sell/money";
import { toE164 } from "@/lib/sell/phone";
import { CURRENCIES } from "@/lib/types";
import { uploadErrorMessage } from "../fields";

export const selectCls =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10";

// ---------- money ----------

/**
 * Amount typed in major units ("85.000", "85rb") and reported in minor units.
 * Unparseable text reports NaN so the validator blocks the save; the text is kept.
 */
export function MoneyField({
  label,
  value,
  currency,
  onChange,
  error,
  hint,
  placeholder,
  compact,
}: {
  label: string;
  value: number | undefined;
  currency?: Currency;
  onChange: (minor: number | undefined) => void;
  error?: string;
  hint?: React.ReactNode;
  placeholder?: string;
  /** smaller input for rows */
  compact?: boolean;
}) {
  const cur = currency ?? "IDR";
  const [text, setText] = useState(() => minorToInput(value, cur));
  const focused = useRef(false);
  // follow outside changes (undo, unfurl prefill) while not typing
  useEffect(() => {
    if (!focused.current && !(value !== undefined && Number.isNaN(value))) setText(minorToInput(value, cur));
  }, [value, cur]);
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <div className={cx("flex items-center rounded-xl border border-line bg-surface focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10", compact ? "h-10" : "h-11", p["aria-invalid"] && "border-danger")}>
          <span className="pl-3 text-[14px] font-medium text-muted" aria-hidden>
            {CURRENCY_META[cur].symbol}
          </span>
          <input
            {...p}
            inputMode="decimal"
            value={text}
            placeholder={placeholder ?? (CURRENCY_META[cur].fraction ? "0.00" : "0")}
            onFocus={() => (focused.current = true)}
            onBlur={() => {
              focused.current = false;
              const m = inputToMinor(text, cur);
              if (m !== undefined && !Number.isNaN(m)) setText(minorToInput(m, cur));
            }}
            onChange={(e) => {
              setText(e.target.value);
              onChange(inputToMinor(e.target.value, cur));
            }}
            className="h-full min-w-0 flex-1 rounded-r-xl bg-transparent px-2 text-[15px] tabular-nums focus:outline-none"
          />
        </div>
      )}
    </Field>
  );
}

export function CurrencySelect({ value, onChange }: { value: Currency | undefined; onChange: (c: Currency) => void }) {
  return (
    <Field label="Currency" hint="Prices are shown in this currency. Nothing is converted.">
      {(p) => (
        <select {...p} value={value ?? "IDR"} onChange={(e) => onChange(e.target.value as Currency)} className={selectCls}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c} ({CURRENCY_META[c].symbol})
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

// ---------- phone ----------

/** WhatsApp number: forgiving input, stored as E.164 once the field loses focus. */
export function PhoneField({
  label = "WhatsApp number",
  value,
  onChange,
  error,
  hint = "Indonesian numbers can start with 0, like 0812 3456 7890.",
  autoFocus,
}: {
  label?: string;
  value: string | undefined;
  onChange: (e164: string) => void;
  error?: string;
  hint?: React.ReactNode;
  autoFocus?: boolean;
}) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <Input
          {...p}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value ?? ""}
          autoFocus={autoFocus}
          placeholder="0812 3456 7890"
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onChange(toE164(e.target.value))}
        />
      )}
    </Field>
  );
}

// ---------- brand marks ----------

/** Real simple-icons mark, or a neutral monogram when there is none (never a look-alike). */
export function Mark({ icon, label, size = 20 }: { icon: SimpleIcon | null; label: string; size?: number }) {
  if (icon)
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0" style={{ color: `#${icon.hex}` }}>
        <path d={icon.path} fill="currentColor" />
      </svg>
    );
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-md bg-foreground/10 font-semibold text-foreground/70"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {label.slice(0, 1)}
    </span>
  );
}

// ---------- chips ----------

/** Short strings entered one at a time (Enter or comma adds; Backspace on empty removes the last). */
export function ChipsInput({
  label,
  value,
  onChange,
  placeholder,
  max = 20,
  maxLength = 30,
  error,
  hint,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  maxLength?: number;
  error?: string;
  hint?: React.ReactNode;
}) {
  const [text, setText] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim().slice(0, maxLength)).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (next.length < max && !next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
    onChange(next);
    setText("");
  };
  return (
    <Field label={label} error={error} hint={hint ?? (value.length < max ? "Press Enter or comma to add" : `Up to ${max}`)}>
      {(p) => (
        <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-1.5 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/10">
          {value.map((v, i) => (
            <span key={`${v}-${i}`} className="inline-flex h-7 items-center gap-1 rounded-full bg-black/[.06] pl-2.5 pr-1 text-[13px] font-medium">
              {v}
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="inline-flex size-5 items-center justify-center rounded-full hover:bg-black/10">
                <X className="size-3" />
              </button>
            </span>
          ))}
          {value.length < max && (
            <input
              {...p}
              value={text}
              placeholder={value.length ? "" : placeholder}
              onChange={(e) => (e.target.value.includes(",") ? add(e.target.value) : setText(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add(text);
                } else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
              }}
              onBlur={() => add(text)}
              className="h-7 min-w-24 flex-1 bg-transparent px-1 text-[14px] focus:outline-none"
            />
          )}
        </div>
      )}
    </Field>
  );
}

/** Multi-select toggle chips for a fixed list. */
export function ToggleChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[13px] font-medium">
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
              className={cx(
                "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
                on ? "border-foreground bg-foreground text-background" : "border-line bg-surface text-muted hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- stars ----------

export function StarsInput({ label = "Stars", value, onChange, error }: { label?: string; value: number; onChange: (n: number) => void; error?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className="text-[13px] font-medium">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => onChange(n)}
            className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-black/[.05]"
          >
            <Star className={cx("size-5", n <= value ? "fill-[#e8a317] text-[#e8a317]" : "text-line")} />
          </button>
        ))}
      </div>
      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

// ---------- images (≤ max, reorderable) ----------

const IMG_ACCEPT = "image/png,image/jpeg,image/gif,image/webp";
const IMG_MAX = 5 * 1024 * 1024;

export function MultiImageField({
  label = "Photos",
  value,
  onChange,
  max = 8,
  error,
}: {
  label?: string;
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  error?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const latest = useRef(value);
  latest.current = value;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = value.map((u, i) => `${i}|${u}`);

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    setUploadError(null);
    const files = [...list].slice(0, Math.max(0, max - value.length - busy));
    if (files.length < list.length) setUploadError(`Up to ${max} photos.`);
    for (const f of files) {
      if (!IMG_ACCEPT.split(",").includes(f.type)) {
        setUploadError("Use PNG, JPEG, GIF or WebP images.");
        continue;
      }
      if (f.size > IMG_MAX) {
        setUploadError("Each photo can be up to 5 MB.");
        continue;
      }
      setBusy((b) => b + 1);
      try {
        const { url } = await api.uploads.create(f);
        onChange([...latest.current, url]);
      } catch (e) {
        setUploadError(uploadErrorMessage(e));
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function onDragEnd(e: DragEndEvent) {
    const from = ids.indexOf(String(e.active.id));
    const to = e.over ? ids.indexOf(String(e.over.id)) : -1;
    if (from >= 0 && to >= 0 && from !== to) onChange(arrayMove(value, from, to));
  }

  return (
    <Field label={label} error={error ?? uploadError} hint={value.length > 1 ? "Drag to reorder. The first photo is the cover." : `Up to ${max}. The first photo is the cover.`}>
      {(p) => (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={rectSortingStrategy}>
              {value.map((u, i) => (
                <Thumb key={ids[i]} id={ids[i]} url={u} index={i} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
              ))}
            </SortableContext>
          </DndContext>
          {Array.from({ length: busy }, (_, i) => (
            <div key={`b${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-line bg-background">
              <Loader2 className="size-4 animate-spin text-muted" />
            </div>
          ))}
          {value.length + busy < max && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-describedby={p["aria-describedby"]}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-background text-[12px] font-medium text-muted hover:border-muted hover:text-foreground"
              >
                <ImagePlus className="size-5" aria-hidden />
                Add photo
              </button>
              <input ref={fileRef} id={p.id} type="file" accept={IMG_ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files)} />
            </>
          )}
        </div>
      )}
    </Field>
  );
}

function Thumb({ id, url, index, onRemove }: { id: string; url: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className="group relative aspect-square"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Photo ${index + 1}${index === 0 ? " (cover)" : ""}. Press Space to move it.`}
        className="block size-full cursor-grab touch-none overflow-hidden rounded-xl border border-line bg-background active:cursor-grabbing"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={assetUrl(url)} alt="" className="size-full object-cover" draggable={false} />
      </button>
      {index === 0 && <span className="pointer-events-none absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove photo ${index + 1}`}
        className="absolute right-1 top-1 inline-flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-90 hover:bg-black/80"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
