"use client";

import { useEffect, useRef } from "react";

/**
 * Tiny always-loaded stub: after hydration it imports the real runtime (./runtime-core) and starts
 * it on this page's root. Keeping the runtime out of the first-load bundle leaves the public page's
 * JS budget for the framework; the runtime arrives a moment after hydration, and countdowns,
 * popups and the rest start then (server HTML is already correct and laid out).
 */
export function PageRuntime({
  username,
  preview,
  onTabChange,
  ga4,
  pixel,
}: {
  username: string;
  preview: boolean;
  onTabChange?: (slug: string) => void;
  /** owner's tags (format-checked by readSettings); injected after load, never in preview */
  ga4?: string;
  pixel?: string;
}) {
  const marker = useRef<HTMLSpanElement>(null);
  const tabCb = useRef(onTabChange);
  tabCb.current = onTabChange;

  useEffect(() => {
    const root = marker.current?.closest<HTMLElement>("[data-tpage]");
    if (!root) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    void import("./runtime-core").then((m) => {
      if (!cancelled) stop = m.start(root, { username, preview, ga4, pixel, onTab: (slug) => tabCb.current?.(slug) });
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [username, preview, ga4, pixel]);

  return <span ref={marker} hidden />;
}
