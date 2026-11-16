"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cx } from "./index";

/**
 * Click-to-open panel (non-modal dialog): outside click and Escape close it,
 * focus moves into the panel on open and back to the trigger on Escape.
 */
export function Popover({
  label,
  trigger,
  children,
  align = "right",
  className,
}: {
  /** accessible name of the panel */
  label: string;
  trigger: (p: { onClick: () => void; "aria-expanded": boolean; "aria-controls": string; ref: React.Ref<HTMLButtonElement> }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      btn.current?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      {trigger({ onClick: () => setOpen((o) => !o), "aria-expanded": open, "aria-controls": id, ref: btn })}
      {open && (
        <div
          ref={panel}
          id={id}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className={cx(
            "absolute top-full z-40 mt-2 rounded-2xl border border-line bg-surface shadow-[0_18px_40px_-12px_rgba(0,0,0,.22)] focus:outline-none",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}
