"use client";

import { useEffect, useState } from "react";
import { PublicPageView, type PublicPageViewProps } from "./PublicPageView";

export type PublicPageProps = PublicPageViewProps;

/**
 * Client wrapper for the editor preview and the landing page: same renderer, plus local tab state
 * so tabs switch in place. The public route uses PublicPageView directly (server-rendered).
 */
export function PublicPage({ activeTabSlug, onTabChange, ...rest }: PublicPageProps) {
  const [slug, setSlug] = useState(activeTabSlug ?? null);
  useEffect(() => setSlug(activeTabSlug ?? null), [activeTabSlug]);
  return (
    <PublicPageView
      {...rest}
      activeTabSlug={slug}
      onTabChange={(next) => {
        setSlug(next);
        onTabChange?.(next);
      }}
    />
  );
}
