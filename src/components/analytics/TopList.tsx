"use client";

import { fmtInt } from "./format";

export interface TopListRow {
  key: string;
  label: string;
  value: number;
}

/**
 * Ranked horizontal bars as plain HTML: single series, so one colour, values in text ink
 * (the bar carries magnitude, not identity), and the bar scale starts at zero.
 */
export function TopList({
  rows,
  color,
  unit,
  empty,
}: {
  rows: TopListRow[];
  color: string;
  unit: string;
  empty: string;
}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((r) => (
        <li
          key={r.key}
          className="group rounded-md px-2 py-1.5 transition-colors hover:bg-black/[0.03]"
          title={`${r.label}: ${fmtInt(r.value)} ${unit}${total ? ` (${Math.round((r.value / total) * 100)}% of these)` : ""}`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
            <span className="truncate text-foreground">{r.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-foreground">{fmtInt(r.value)}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-black/[0.05]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
