"use client";

import { X } from "lucide-react";
import { useId, useState } from "react";
import { cx, Field } from "./index";


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

