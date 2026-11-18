"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, Button, cx, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { errorMessage } from "@/lib/editor/queries";
import { eventLabel, ordersApi, PROVIDER_NAME, type OrderDetail as Detail } from "@/lib/orders";
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
          <li className="flex justify-between gap-3 border-t border-line pt-2 font-bold">
            <span>Total</span>
            <span>{money(o.amount)}</span>
          </li>
        </ul>
      </div>

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
            } catch {}
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
