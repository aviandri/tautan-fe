"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cx } from "./index";

type Toast = { id: number; tone: "error" | "success"; message: string };

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(tone: Toast["tone"], message: string) {
  const id = ++seq;
  toasts = [...toasts.filter((t) => t.message !== message), { id, tone, message }].slice(-3);
  emit();
  setTimeout(() => dismiss(id), tone === "error" ? 5000 : 2500);
}
function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (m: string) => push("error", m),
  success: (m: string) => push("success", m),
};

export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm shadow-lg",
            "animate-[toast-in_180ms_ease-out]",
            t.tone === "error" ? "bg-[#2a1210] text-white" : "bg-foreground text-background",
          )}
        >
          {t.tone === "error" ? (
            <CircleAlert className="size-4 shrink-0 text-[#ff8a75]" aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0 text-[#7fd1b0]" aria-hidden />
          )}
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="ml-1 opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
