"use client";

import { createContext, useCallback, useContext, type MouseEvent } from "react";
import { trackEvent } from "@/lib/track";

interface PublicCtx {
  username: string;
  /** Editor live preview: no tracking, no network, links don't navigate. */
  preview: boolean;
}

export const PublicContext = createContext<PublicCtx>({ username: "", preview: false });

export function usePublic() {
  return useContext(PublicContext);
}

/** onClick for an outbound link: records a click (or, in preview, stops navigation). */
export function useLinkClick(blockId: string) {
  const { username, preview } = usePublic();
  return useCallback(
    (e: MouseEvent) => {
      if (preview) {
        e.preventDefault();
        return;
      }
      trackEvent(username, { kind: "click", block_id: blockId });
    },
    [username, preview, blockId],
  );
}
