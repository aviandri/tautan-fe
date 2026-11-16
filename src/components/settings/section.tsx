"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

/** Anchor id for a section title ("Page address" → "page-address"). */
export const sectionId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Shared section wrapper with its own Save button, enabled when dirty. */
export function Section({
  title,
  description,
  children,
  dirty,
  saving,
  canSave = true,
  onSave,
  onReset,
  badge,
  extraActions,
}: {
  title: string;
  badge?: string;
  /** left-aligned buttons in the footer (e.g. Remove) */
  extraActions?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  dirty?: boolean;
  saving?: boolean;
  canSave?: boolean;
  onSave?: () => void;
  onReset?: () => void;
}) {
  return (
    <Card id={sectionId(title)} className="scroll-mt-[96px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave?.();
        }}
        className="flex flex-col gap-4 p-6"
      >
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] font-bold tracking-[-0.015em]">{title}</h2>
            {badge && <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-mono text-[11px] font-medium text-brand-hover">{badge}</span>}
          </div>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        <div className="flex flex-col gap-5">{children}</div>
        {onSave && (
          <div className="flex items-center justify-end gap-2 pt-1">
            {extraActions}
            {dirty && onReset && (
              <Button type="button" variant="ghost" size="sm" onClick={onReset}>
                Discard
              </Button>
            )}
            <Button type="submit" size="sm" disabled={!dirty || !canSave} loading={saving}>
              Save
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
}

/**
 * Section-local edits. `saved` is derived from the live profile, so after a
 * successful save the section is clean again without remounting (and other
 * sections keep their unsaved edits).
 */
export function useSection<T extends object>(saved: T) {
  const [v, setV] = useState(saved);
  const dirty = JSON.stringify(v) !== JSON.stringify(saved);
  return { v, set: (p: Partial<T>) => setV((x) => ({ ...x, ...p })), reset: () => setV(saved), dirty };
}

