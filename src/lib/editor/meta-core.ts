/** Shared pieces of the per-type editor metadata (block-meta.ts, sell-meta.ts). */
import type { LucideIcon } from "lucide-react";
import type { BlockDataMap, BlockType, Schedule } from "../types";

export type FieldErrors = Record<string, string>;

export interface BlockMeta<K extends BlockType> {
  type: K;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Accent for the type chip (editor only; public page colours come from the theme). */
  tint: string;
  defaultData: () => BlockDataMap[K];
  /** The server rejects the default data (a URL is required), so collect it before POSTing. */
  needsInputFirst: boolean;
  /** Hidden from the "Add block" picker (still editable if present). */
  hidden?: boolean;
  summary: (d: BlockDataMap[K]) => string;
  /** Returns field errors and the data to send. */
  validate: (d: BlockDataMap[K]) => { errors: FieldErrors; data: BlockDataMap[K] };
}

export const put = (e: FieldErrors, k: string, v: string | null | undefined) => {
  if (v) e[k] = v;
};
export const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const maxLen = (v: string | undefined, n: number) => ((v ?? "").length > n ? `At most ${n} characters` : null);
export const required = (v: string | undefined) => ((v ?? "").trim() ? null : "Required");

/** Drop optional keys that are "", undefined or null, so we don't store noise. */
export function compact<T extends object>(d: T, keys: (keyof T)[]): T {
  const out = { ...d };
  for (const k of keys) {
    const v = out[k];
    if (v === undefined || v === null || v === "") delete out[k];
  }
  return out;
}

/** schedule: drop when empty; end must be after start (mirrors checkSchedule). */
export function validateSchedule(s: Schedule | undefined): { error: string | null; value: Schedule | undefined } {
  if (!s) return { error: null, value: undefined };
  const value = compact(s, ["start_at", "end_at"]);
  if (!value.start_at && !value.end_at) return { error: null, value: undefined };
  if (value.start_at && value.end_at && Date.parse(value.end_at) <= Date.parse(value.start_at))
    return { error: "End must be after start", value };
  return { error: null, value };
}

/** Wrap a type's validator with shared schedule handling. */
export function withSchedule<K extends BlockType>(
  fn: (d: BlockDataMap[K]) => { errors: FieldErrors; data: BlockDataMap[K] },
) {
  return (d: BlockDataMap[K]) => {
    const r = fn(d);
    const sched = validateSchedule((d as { schedule?: Schedule }).schedule);
    const data = { ...r.data } as BlockDataMap[K] & { schedule?: Schedule; resolved?: unknown; computed?: unknown };
    // server-only read fields (P3-B resolved/computed, video/music resolved) are never sent back
    delete data.resolved;
    delete data.computed;
    if (sched.value) data.schedule = sched.value;
    else delete data.schedule;
    if (sched.error) r.errors.schedule = sched.error;
    return { errors: r.errors, data: data as BlockDataMap[K] };
  };
}

export const keep = <T>(d: T) => ({ errors: {} as FieldErrors, data: d });
