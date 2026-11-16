"use client";

import { Copy, Plus, X } from "lucide-react";
import { Button, Field, IconButton, Switch } from "@/components/ui";
import { browserTz } from "@/lib/editor/sell-meta";
import type { StoreInfoData, Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/constants";
import { selectCls } from "./sell-fields";

type Slot = StoreInfoData["hours"][number];

const DAY_LABEL: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const MAX_PER_DAY = 3;

/** Keep slots grouped by weekday (mon → sun) and by opening time inside a day. */
export function sortHours(h: Slot[]): Slot[] {
  return [...h].sort((a, b) => WEEKDAYS.indexOf(a.day) - WEEKDAYS.indexOf(b.day) || a.open.localeCompare(b.open));
}

export function HoursEditor({
  hours,
  onChange,
  errors,
}: {
  hours: Slot[];
  onChange: (h: Slot[]) => void;
  /** keyed "hours.<index>.open|close" against `hours` as given */
  errors: Record<string, string>;
}) {
  const indexed = hours.map((s, i) => ({ s, i }));
  const set = (next: Slot[]) => onChange(sortHours(next));
  const copyToAll = (day: Weekday) => {
    const src = hours.filter((s) => s.day === day);
    set(WEEKDAYS.flatMap((d) => (d === day ? src : src.map((s) => ({ ...s, day: d })))));
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-medium">Opening hours</span>
      <p className="mb-1 text-[12px] text-muted">Closing earlier than opening means you close after midnight.</p>
      <div className="divide-y divide-line rounded-xl border border-line">
        {WEEKDAYS.map((day) => {
          const slots = indexed.filter((x) => x.s.day === day);
          const open = slots.length > 0;
          return (
            <div key={day} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start">
              <div className="flex w-full items-center gap-3 sm:w-36 sm:pt-1.5">
                <Switch
                  label={`Open on ${DAY_LABEL[day]}`}
                  checked={open}
                  onChange={(v) => set(v ? [...hours, { day, open: "09:00", close: "17:00" }] : hours.filter((s) => s.day !== day))}
                />
                <span className="text-sm font-medium">{DAY_LABEL[day]}</span>
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                {!open && <span className="py-2 text-sm text-muted">Closed</span>}
                {slots.map(({ s, i }) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <TimeInput
                      label={`${DAY_LABEL[day]} opens`}
                      value={s.open}
                      error={errors[`hours.${i}.open`]}
                      onChange={(v) => set(hours.map((x, j) => (j === i ? { ...x, open: v } : x)))}
                    />
                    <span className="text-muted" aria-hidden>
                      –
                    </span>
                    <TimeInput
                      label={`${DAY_LABEL[day]} closes`}
                      value={s.close}
                      error={errors[`hours.${i}.close`]}
                      onChange={(v) => set(hours.map((x, j) => (j === i ? { ...x, close: v } : x)))}
                    />
                    {slots.length > 1 && (
                      <IconButton label="Remove time slot" onClick={() => set(hours.filter((_, j) => j !== i))}>
                        <X className="size-3.5" />
                      </IconButton>
                    )}
                    {(errors[`hours.${i}.open`] || errors[`hours.${i}.close`]) && (
                      <p className="w-full text-[12px] text-danger">{errors[`hours.${i}.open`] || errors[`hours.${i}.close`]}</p>
                    )}
                  </div>
                ))}
                {open && (
                  <div className="flex flex-wrap gap-1">
                    {slots.length < MAX_PER_DAY && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => set([...hours, { day, open: "18:00", close: "21:00" }])}>
                        <Plus className="size-3.5" /> Add hours
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={() => copyToAll(day)}>
                      <Copy className="size-3.5" /> Same every day
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimeInput({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <input
      type="time"
      aria-label={label}
      aria-invalid={!!error}
      value={value === "24:00" ? "00:00" : value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border border-line bg-surface px-2 text-[14px] tabular-nums focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 aria-[invalid=true]:border-danger"
    />
  );
}

const ZONES: { tz: string; label: string }[] = [
  { tz: "Asia/Jakarta", label: "WIB, Jakarta (UTC+7)" },
  { tz: "Asia/Makassar", label: "WITA, Makassar and Bali (UTC+8)" },
  { tz: "Asia/Jayapura", label: "WIT, Jayapura (UTC+9)" },
  { tz: "Asia/Singapore", label: "Singapore (UTC+8)" },
  { tz: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (UTC+8)" },
  { tz: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { tz: "Asia/Manila", label: "Manila (UTC+8)" },
];

export function TzSelect({
  value,
  onChange,
  error,
  hint = "Visitors see “Open now” based on this zone, wherever they are.",
}: {
  value: string;
  onChange: (tz: string) => void;
  error?: string;
  hint?: string;
}) {
  const local = browserTz();
  const extra = [value, local].filter((z, i, a) => z && !ZONES.some((x) => x.tz === z) && a.indexOf(z) === i);
  return (
    <Field label="Time zone" error={error} hint={hint}>
      {(p) => (
        <select {...p} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
          {ZONES.map((z) => (
            <option key={z.tz} value={z.tz}>
              {z.label}
            </option>
          ))}
          {extra.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
