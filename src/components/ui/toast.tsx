"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cx } from "./index";

type ToastAction = { label: string; onClick: () => void };
type Toast = { id: number; tone: "error" | "success"; message: string; action?: ToastAction };

let toasts: Toast[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function push(tone: Toast["tone"], message: string, action?: ToastAction) {
  const id = ++seq;
  toasts = [...toasts.filter((t) => t.message !== message), { id, tone, message, action }].slice(-3);
  emit();
  setTimeout(() => dismiss(id), action ? 7000 : tone === "error" ? 5000 : 2500);
  return id;
}
function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (m: string) => push("error", m),
  success: (m: string, action?: ToastAction) => push("success", m, action),
  dismiss,
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
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => (
        <div
          key={t.id}
          role={t.tone === "error" ? "alert" : "status"}
          className={cx(
            "pointer-events-auto flex max-w-md items-center gap-2.5 rounded-full py-2 pl-4 pr-2 text-sm font-semibold shadow-[0_18px_36px_-16px_rgba(0,0,0,.5)]",
            "animate-[k-pop_.35s_var(--k-ease)_both]",
            t.tone === "error" ? "bg-danger text-white" : "bg-foreground text-background",
          )}
        >
          {t.tone === "error" ? (
            <CircleAlert className="size-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="size-4 shrink-0 text-mint" aria-hidden />
          )}
          <span>{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.onClick();
                dismiss(t.id);
              }}
              className="ml-1 h-[34px] rounded-full bg-white px-4 font-semibold text-black transition-transform hover:-translate-y-px active:scale-[.97]"
            >
              {t.action.label}
            </button>
          )}
          <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="mr-1 opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
