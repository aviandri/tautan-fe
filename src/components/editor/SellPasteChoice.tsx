"use client";

import { X } from "lucide-react";
import { Button, IconButton } from "@/components/ui";
import type { SellSuggestion } from "@/lib/editor/smart-paste";
import { formatMoney } from "@/lib/sell/money";
import { MARKETPLACES } from "@/lib/sell/platforms";
import { prettyUrl } from "@/lib/url";
import type { Block } from "@/lib/types";
import { Mark } from "./sell/sell-fields";

/** After pasting a marketplace link: product card, marketplace card, add to an existing one, or a plain link. */
export function SellPasteChoice({
  suggestion: s,
  existing,
  busy,
  onProduct,
  onMarketplace,
  onAppend,
  onLink,
  onCancel,
}: {
  suggestion: SellSuggestion;
  /** a marketplace card on this tab that doesn't list this platform yet */
  existing?: Block;
  busy?: boolean;
  onProduct: () => void;
  onMarketplace: () => void;
  onAppend: () => void;
  onLink: () => void;
  onCancel: () => void;
}) {
  const m = MARKETPLACES[s.platform];
  const p = s.product;
  return (
    <section aria-label={`Add ${m.label} link`} className="rounded-2xl border border-brand/30 bg-surface p-4 shadow-[0_0_0_4px_rgba(31,92,74,.06)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-background">
          <Mark icon={m.icon} label={m.label} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">{s.isProduct ? `A ${m.label} product` : `Your ${m.label} store`}</p>
          <p className="truncate text-[13px] text-muted">
            {[p.name, p.price != null ? formatMoney(p.price, p.currency) : "", prettyUrl(s.url)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <IconButton label="Cancel" onClick={onCancel}>
          <X className="size-4" />
        </IconButton>
      </div>
      <p className="mb-2 mt-4 text-[13px] font-medium">Add it as</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={s.isProduct ? "primary" : "secondary"} onClick={onProduct} disabled={busy}>
          Product card
        </Button>
        {existing ? (
          <Button type="button" size="sm" variant={s.isProduct ? "secondary" : "primary"} onClick={onAppend} disabled={busy}>
            Add to your marketplace card
          </Button>
        ) : (
          <Button type="button" size="sm" variant={s.isProduct ? "secondary" : "primary"} onClick={onMarketplace} disabled={busy}>
            “Buy on {m.label}” card
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={onLink} disabled={busy}>
          Plain link
        </Button>
      </div>
      {s.isProduct && !p.name && <p className="mt-3 text-[12px] text-muted">{m.label} didn&apos;t share the product details, so you&apos;ll type the name and price.</p>}
    </section>
  );
}
