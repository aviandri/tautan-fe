"use client";

import { createContext, useCallback, useContext, type MouseEvent } from "react";
import { trackEvent } from "@/lib/track";

interface PublicCtx {
  username: string;
  /** Editor live preview: no tracking, no network, links don't navigate. */
  preview: boolean;
  /** Switch the page to another tab (links with dest_kind "tab"). Absent outside a full page. */
  selectTab?: (tabId: string) => void;
  /** href for a tab, for links that open one (works without JS). */
  tabHref?: (tabId: string) => string | undefined;
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

/** Record a click on a block without navigation (e.g. copying a discount code). */
export function useTrackClick(blockId: string) {
  const { username, preview } = usePublic();
  return useCallback(() => {
    if (!preview) trackEvent(username, { kind: "click", block_id: blockId });
  }, [username, preview, blockId]);
}
