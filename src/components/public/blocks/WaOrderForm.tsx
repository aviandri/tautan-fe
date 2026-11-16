"use client";

import { useState, type FormEvent } from "react";
import { Minus, Plus } from "../icons";
import type { Currency } from "@/lib/sell/money";
import { formatMoney } from "@/lib/sell/money";
import { fillTemplate, waLink } from "@/lib/sell/wa";
import { composeOrder } from "@/lib/sell/order";
import { trackEvent } from "@/lib/track";
import s from "../forms.module.css";

type Field = "items" | "name" | "address" | "note";

export interface WaOrderFormProps {
  blockId: string;
  username: string;
  preview: boolean;
  number: string;
  label: string;
  template: string;
  fields: Field[];
  items: { name: string; price?: number }[];
  currency?: Currency;
}

const LABELS: Record<Exclude<Field, "items">, string> = { name: "Your name", address: "Delivery address", note: "Note (optional)" };

/**
 * The whatsapp card's order form (lazy island): qty steppers for the menu, then name/address/note,
 * composed into the owner's message template and opened as a prefilled wa.me chat.
 */
export function WaOrderForm({ blockId, username, preview, number, label, template, fields, items, currency }: WaOrderFormProps) {
  const [qty, setQty] = useState<number[]>(() => items.map(() => 0));
  const [error, setError] = useState<string | null>(null);
  const hasItems = fields.includes("items") && items.length > 0;
  const order = composeOrder(
    items.map((it, i) => ({ name: it.name, price: it.price, qty: qty[i] ?? 0 })),
    currency,
  );
  const count = qty.reduce((a, b) => a + b, 0);
  const uid = `wa-${blockId}`;

  const step = (i: number, d: 1 | -1) => setQty((q) => q.map((v, k) => (k === i ? Math.max(0, Math.min(99, v + d)) : v)));

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const val = (k: string) => String(fd.get(k) ?? "").trim();
    if (hasItems && count === 0) return setError("Choose at least one item.");
    if (fields.includes("name") && !val("name")) return setError("Add your name.");
    if (fields.includes("address") && !val("address")) return setError("Add a delivery address.");
    setError(null);
    const text = fillTemplate(template, { items: order.items, total: order.total, name: val("name"), address: val("address"), note: val("note") });
    const href = waLink(number, text);
    if (!href || preview) return;
    trackEvent(username, { kind: "click", block_id: blockId, action: "wa_order" });
    window.open(href, "_blank", "noopener,noreferrer");
  }

  return (
    <form className={`${s.sell} ${s.waForm}`} onSubmit={onSubmit} noValidate aria-label={label || "Order on WhatsApp"} id={`block-${blockId}`}>
      {hasItems ? (
        <ul className={s.waItems}>
          {items.map((it, i) => (
            <li key={i} className={s.waItem}>
              <span className={s.waItemName}>
                {it.name}
                {it.price != null ? <span className={s.waItemPrice}>{formatMoney(it.price, currency)}</span> : null}
              </span>
              <span className={s.waStepper}>
                <button type="button" onClick={() => step(i, -1)} disabled={!qty[i]} aria-label={`One less ${it.name}`}>
                  <Minus aria-hidden />
                </button>
                <output aria-live="polite" aria-label={`${it.name} quantity`}>{qty[i]}</output>
                <button type="button" onClick={() => step(i, 1)} aria-label={`One more ${it.name}`}>
                  <Plus aria-hidden />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {(["name", "address", "note"] as const)
        .filter((f) => fields.includes(f))
        .map((f) => (
          <label key={f} className={s.waField}>
            <span className={s.srOnly}>{LABELS[f]}</span>
            {f === "address" || f === "note" ? (
              <textarea name={f} rows={f === "address" ? 2 : 1} placeholder={LABELS[f]} maxLength={300} id={`${uid}-${f}`} />
            ) : (
              <input name={f} placeholder={LABELS[f]} maxLength={80} autoComplete="name" id={`${uid}-${f}`} />
            )}
          </label>
        ))}
      {error ? (
        <p className={s.formStatus} role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className={`${s.sellBtn} ${s.sellBtnWa}`}>
        {label || "Order on WhatsApp"}
        {order.total ? <span className={s.waTotal}> · {order.total}</span> : null}
      </button>
    </form>
  );
}
