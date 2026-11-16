"use client";

import { useSyncExternalStore } from "react";

/** Live `matchMedia(query).matches`. The server snapshot is true (large screen first). */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
