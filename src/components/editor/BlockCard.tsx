"use client";

/** Shared editor bits: the card type tile and drag handle props. */
import { cx } from "@/components/ui";
import { getMeta } from "@/lib/editor/block-meta";
import { CATEGORIES } from "@/lib/editor/catalog";
import type { BlockType } from "@/lib/types";

export interface DragHandleProps {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (el: HTMLElement | null) => void;
}

/** Kartu icon tile: a pastel per card family, ink icon. */
const PASTEL: Record<string, string> = { sell: "var(--mint)", creators: "var(--blush)", links: "var(--sky)", grow: "var(--butter)", media: "var(--peach)" };
export function tileColor(type: BlockType): string {
  const cat = CATEGORIES.find((c) => c.types.includes(type));
  return (cat && PASTEL[cat.id]) || "var(--sunken)";
}

export function TypeChip({ type, size = "md" }: { type: BlockType; size?: "sm" | "md" | "lg" }) {
  const meta = getMeta(type);
  const Icon = meta.icon;
  return (
    <span
      className={cx(
        "flex shrink-0 items-center justify-center text-foreground",
        size === "lg" ? "size-11 rounded-[14px]" : size === "md" ? "size-10 rounded-[14px]" : "size-[34px] rounded-xl",
      )}
      style={{ backgroundColor: tileColor(type) }}
    >
      <Icon className={size === "sm" ? "size-4" : "size-[18px]"} aria-hidden />
    </span>
  );
}
