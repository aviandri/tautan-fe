"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { guardedTarget } from "@/lib/nav/leave-guard";
import { Button } from "./index";

/**
 * While `dirty`, asks before the page is left: beforeunload for reloads/closing the tab, and an
 * in-app dialog for client-side link navigation (which never fires beforeunload). Render the
 * returned element once. `onSave` resolves true when saving worked; then the navigation proceeds.
 */
export function useLeaveGuard(dirty: boolean, onSave: () => Promise<boolean>) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      const to = guardedTarget(e, a, window.location);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      setTarget(to);
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
  }, [target]);

  const go = (to: string) => {
    setTarget(null);
    router.push(to);
  };

  const dialog = (
    <dialog
      ref={ref}
      aria-labelledby="leave-guard-title"
      onClose={() => setTarget(null)}
      className="m-auto w-[min(92vw,480px)] rounded-3xl bg-surface p-6 text-foreground shadow-lift backdrop:bg-black/40"
    >
      <h2 id="leave-guard-title" className="text-lg font-semibold">
        Leave without saving?
      </h2>
      <p className="mt-2 text-sm text-muted">Your design changes aren&apos;t saved yet. If you leave now, they&apos;ll be lost.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => setTarget(null)} autoFocus>
          Keep editing
        </Button>
        <Button variant="secondary" size="sm" onClick={() => target && go(target)} disabled={saving}>
          Discard changes
        </Button>
        <Button
          variant="dark"
          size="sm"
          loading={saving}
          onClick={async () => {
            if (!target) return;
            setSaving(true);
            const ok = await onSave();
            setSaving(false);
            if (ok) go(target);
          }}
        >
          Save and leave
        </Button>
      </div>
    </dialog>
  );
  return dialog;
}
