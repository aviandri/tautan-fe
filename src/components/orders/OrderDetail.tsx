"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, RefreshCw, Truck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, Button, cx, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/editor/queries";
import { addressLines, eventLabel, ordersApi, PROVIDER_NAME, type Order, type OrderDetail as Detail } from "@/lib/orders";
import { formatMoney } from "@/lib/sell/money";
import { dateTimeFormat, relativeTime } from "@/lib/time";
import { OrderStatusBadge } from "./Orders";

export function OrderDetail({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["order", id], queryFn: () => ordersApi.get(id) });
  const refresh = useMutation({
    mutationFn: () => ordersApi.refresh(id),
    onSuccess: (d) => {
      qc.setQueryData<Detail>(["order", id], d);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Status: ${d.order.status}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);

  if (q.isLoading) return <Spinner />;
  if (q.error || !q.data) return <Alert>{errorMessage(q.error)}</Alert>;
  const { order: o, events, order_page_url } = q.data;
  const money = (n: number) => formatMoney(n, o.currency);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[13px] text-muted">{o.code}</p>
          <h2 className="truncate text-[22px] font-bold tracking-[-0.02em]">{o.buyer_name || o.buyer_email}</h2>
          {o.buyer_name && <p className="truncate text-sm text-muted">{o.buyer_email}</p>}
        </div>
        <div className="flex items-center gap-2">
          {o.mode === "sandbox" && <span className="rounded-full bg-sky px-2.5 py-1 text-[12px] font-semibold">Test</span>}
          <OrderStatusBadge status={o.status} />
        </div>
      </div>

      <div className="rounded-2xl bg-background p-4">
        <ul className="flex flex-col gap-2 text-[15px]">
          {o.items.map((it, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="min-w-0">
                {it.quantity > 1 ? `${it.quantity} × ` : ""}
                {it.name}
                {it.variant && <span className="text-muted"> ({it.variant})</span>}
                {it.file_name && <span className="block truncate text-[13px] text-muted">{it.file_name}</span>}
              </span>
              <span className="shrink-0">{money(it.unit_amount * it.quantity)}</span>
            </li>
          ))}
          {o.fulfilment && (
            <li className="flex justify-between gap-3">
              <span>Shipping</span>
              <span className="shrink-0">{o.shipping_fee ? money(o.shipping_fee) : "Free"}</span>
            </li>
          )}
          <li className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
            <span>Total</span>
            <span>{money(o.amount)}</span>
          </li>
        </ul>
      </div>

      {o.fulfilment && <Shipping o={o} />}

      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Created</dt>
        <dd>{dateTimeFormat.format(new Date(o.created_at))}</dd>
        {o.paid_at && (
          <>
            <dt className="text-muted">Paid</dt>
            <dd>{dateTimeFormat.format(new Date(o.paid_at))}</dd>
          </>
        )}
        {o.refunded_at && (
          <>
            <dt className="text-muted">Refunded</dt>
            <dd>{dateTimeFormat.format(new Date(o.refunded_at))}</dd>
          </>
        )}
        <dt className="text-muted">Provider</dt>
        <dd>
          {PROVIDER_NAME[o.provider]} · {o.mode}
        </dd>
        {o.provider_ref && (
          <>
            <dt className="text-muted">Reference</dt>
            <dd className="truncate font-mono text-[13px]">{o.provider_ref}</dd>
          </>
        )}
        <dt className="text-muted">Downloads</dt>
        <dd>{o.downloads}</dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(order_page_url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // clipboard blocked (permissions, insecure origin): show the link to copy by hand
              setShowLink(true);
              toast.error("Couldn't copy. Select the link below and copy it.");
            }
          }}
        >
          {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />} Copy buyer&apos;s order link
        </Button>
        {(o.status === "pending" || o.status === "expired" || o.status === "failed") && o.provider_ref && (
          <Button size="sm" variant="secondary" loading={refresh.isPending} onClick={() => refresh.mutate()}>
            <RefreshCw className="size-3.5" /> Check with {PROVIDER_NAME[o.provider]}
          </Button>
        )}
        {embedded && (
          <Link href={`/dashboard/orders/${o.id}`} className="inline-flex h-[38px] items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold hover:bg-sunken">
            <ExternalLink className="size-3.5" /> Open
          </Link>
        )}
      </div>
      {showLink && (
        <input
          readOnly
          value={order_page_url}
          aria-label="Buyer's order link"
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          className="-mt-2 h-10 w-full rounded-xl border border-line bg-background px-3 font-mono text-[12px]"
        />
      )}
      <p className="-mt-2 text-[13px] text-muted">The buyer&apos;s link opens their order page with fresh download links. Share it only with them.</p>

      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-muted">Activity</h3>
        <ol className="flex flex-col gap-2 text-sm">
          <li className="flex justify-between gap-3">
            <span>Checkout opened</span>
            <span className="shrink-0 text-muted">{relativeTime(o.created_at)}</span>
          </li>
          {events.map((e, i) => (
            <li key={i} className={cx("flex justify-between gap-3", e.status === "amount_mismatch" && "text-danger")}>
              <span className="min-w-0">{eventLabel(e)}</span>
              <span className="shrink-0 text-muted">{relativeTime(e.received_at)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Payments (c): where to send it, and marking it shipped (the buyer gets one email). */
function Shipping({ o }: { o: Order }) {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState(o.tracking);
  const [copied, setCopied] = useState(false);
  const ship = useMutation({
    mutationFn: () => ordersApi.ship(o.id, tracking.trim()),
    onSuccess: (d) => {
      qc.setQueryData<Detail>(["order", o.id], d);
      qc.invalidateQueries({ queryKey: ["orders"] });
      toast.success(o.fulfilment === "shipped" ? "Tracking number saved" : "Marked shipped. We emailed the buyer.");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const lines = o.shipping ? addressLines(o.shipping) : [];
  const shipped = o.fulfilment === "shipped";
  const canShip = o.status === "paid";
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <Truck className="size-4" aria-hidden /> Ship to
        </h3>
        <span className={cx("rounded-full px-2.5 py-1 text-[12px] font-semibold", shipped ? "bg-ok-soft text-ok" : canShip ? "bg-butter text-warn" : "bg-sunken text-ink-2")}>
          {shipped ? "Shipped" : canShip ? "To ship" : "Not paid"}
        </span>
      </div>
      {lines.length ? (
        <>
          <address className="whitespace-pre-line text-[15px] not-italic leading-relaxed">{lines.join("\n")}</address>
          {o.shipping?.notes && <p className="text-[13px] text-muted">Note: {o.shipping.notes}</p>}
          <Button
            size="sm"
            variant="secondary"
            className="self-start"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(lines.join("\n"));
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                toast.error("Couldn't copy. Select the address and copy it.");
              }
            }}
          >
            {copied ? <Check className="size-3.5 text-brand" /> : <Copy className="size-3.5" />} Copy address
          </Button>
        </>
      ) : (
        <p className="text-[13px] text-muted">The address was cleared because this order was never paid.</p>
      )}
      {canShip && (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            ship.mutate();
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-[13px] font-medium">Tracking number (optional)</span>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              maxLength={100}
              placeholder="JNE, J&T, SiCepat…"
              className="h-10 rounded-xl border border-line bg-surface px-3 font-mono text-[14px] focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <Button size="sm" type="submit" loading={ship.isPending} disabled={shipped && tracking.trim() === o.tracking}>
            {shipped ? "Save tracking" : "Mark shipped"}
          </Button>
        </form>
      )}
      {shipped && o.shipped_at && <p className="text-[13px] text-muted">Shipped {dateTimeFormat.format(new Date(o.shipped_at))}. The buyer was emailed once; changing the tracking number doesn&apos;t email them again.</p>}
      {!shipped && canShip && <p className="text-[13px] text-muted">Marking it shipped emails the buyer, with the tracking number if you add one.</p>}
    </div>
  );
}
