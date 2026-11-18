"use client";

import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";
import { Download, Search, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, cx, Spinner } from "@/components/ui";
import { toast } from "@/components/ui/toast";
import { downloadCsv } from "@/lib/api";
import { errorMessage } from "@/lib/editor/queries";
import { FILTERS, itemsSummary, ordersApi, PROVIDER_NAME, STATUS_LABEL, type Order, type OrderFilter, type OrderStatus } from "@/lib/orders";
import { formatMoney, type Currency } from "@/lib/sell/money";
import { relativeTime } from "@/lib/time";
import { useMedia } from "@/lib/use-media";
import { OrderDetail } from "./OrderDetail";

function useDebounced<T>(v: T, ms = 300) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cx(
        "inline-flex h-[26px] w-fit items-center rounded-full px-2.5 text-[13px] font-semibold",
        status === "paid" ? "bg-ok-soft text-ok" : status === "pending" ? "bg-butter text-warn" : "bg-sunken text-ink-2",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** Dashboard → Orders (payments b): paid revenue, status tabs, search, CSV, detail. */
export function Orders() {
  const [status, setStatus] = useState<OrderFilter>("all");
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim());
  const query = useInfiniteQuery({
    queryKey: ["orders", status, q],
    queryFn: ({ pageParam }) => ordersApi.list({ status, q: q || undefined, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
    placeholderData: keepPreviousData,
  });
  const orders = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const first = query.data?.pages[0];
  const counts = first?.counts;
  const revenue = Object.entries(first?.revenue ?? {}).filter(([, v]) => (v ?? 0) > 0) as [Currency, number][];
  const [exporting, setExporting] = useState(false);
  const isLg = useMedia("(min-width: 1024px)");
  const [picked, setPicked] = useState<string | null>(null);
  const selected = isLg ? (picked && orders.some((o) => o.id === picked) ? picked : orders[0]?.id) : undefined;
  const noneAtAll = counts && counts.all === 0;

  async function exportCsv() {
    setExporting(true);
    try {
      await downloadCsv(ordersApi.csvPath({ status, q: q || undefined }), `orders-${status}.csv`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-[14px] px-4 pb-10 pt-2 sm:px-7">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[32px] font-semibold leading-none tracking-[-0.045em] sm:text-[36px]">Orders</h1>
        {revenue.length > 0 && (
          <p className="text-sm text-muted">
            Earned{" "}
            {revenue.map(([c, v], i) => (
              <span key={c}>
                {i > 0 && " · "}
                <b className="text-foreground">{formatMoney(v, c)}</b>
              </span>
            ))}
          </p>
        )}
        <span className="hidden flex-1 lg:block" />
        {!noneAtAll && (
          <label className="flex h-[42px] w-full items-center gap-2 rounded-full bg-surface px-4 shadow-[inset_0_0_0_1px_var(--line-2)] focus-within:shadow-[inset_0_0_0_2px_var(--ink)] sm:w-[280px]">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, name or order code"
              aria-label="Search orders"
              className="h-full min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none placeholder:font-medium placeholder:text-muted"
            />
          </label>
        )}
        <Button size="sm" variant="secondary" onClick={exportCsv} loading={exporting} disabled={!orders.length}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>

      {!noneAtAll && (
        <div role="tablist" aria-label="Filter orders" className="flex flex-wrap gap-2.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={status === f.value}
              onClick={() => setStatus(f.value)}
              className={cx(
                "inline-flex h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors",
                status === f.value ? "bg-foreground text-background" : "bg-sunken hover:bg-line",
              )}
            >
              {f.label}
              {counts && <span className="font-mono text-[12px] font-medium opacity-75">{counts[f.value] ?? 0}</span>}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner />
        </div>
      ) : query.error ? (
        <div>
          <Alert>{errorMessage(query.error)}</Alert>
          <Button variant="secondary" className="mt-3" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : noneAtAll ? (
        <Card className="px-6 py-16 text-center">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-2xl bg-mint">
            <ShoppingBag className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-[17px] font-bold">No orders yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
            Connect a payment provider in Settings, then turn on &ldquo;Sell this file&rdquo; on a File card or pick Checkout on a Product card.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/dashboard/settings#payments" className="inline-flex h-[38px] items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background">
              Set up payments
            </Link>
            <Link href="/dashboard" className="inline-flex h-[38px] items-center rounded-full px-4 text-sm font-semibold hover:bg-sunken">
              Go to the editor
            </Link>
          </div>
        </Card>
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No orders match{q ? ` “${q}”` : " this filter"}.</p>
      ) : (
        <div className="flex flex-col items-start gap-[14px] lg:flex-row">
          <Card className={cx("w-full min-w-0 overflow-x-auto px-3 py-2.5 transition-opacity lg:flex-[2]", query.isPlaceholderData && "opacity-60")}>
            <table className="w-full border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-[13px] font-semibold text-muted">
                  <th className="px-3 py-2.5 font-semibold">Buyer</th>
                  <th className="hidden px-3 py-2.5 font-semibold md:table-cell">Item</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="hidden px-3 py-2.5 font-semibold sm:table-cell">Status</th>
                  <th className="hidden px-3 py-2.5 font-semibold xl:table-cell">When</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <OrderRow key={o.id} o={o} selected={selected === o.id} onSelect={isLg ? () => setPicked(o.id) : undefined} />
                ))}
              </tbody>
            </table>
            {query.hasNextPage && (
              <div className="flex justify-center py-3">
                <Button variant="secondary" size="sm" onClick={() => query.fetchNextPage()} loading={query.isFetchingNextPage}>
                  Load more
                </Button>
              </div>
            )}
          </Card>
          {isLg && selected && (
            <aside aria-label="Order details" className="sticky top-[84px] w-full min-w-[340px] rounded-[28px] bg-surface p-[22px] shadow-card lg:flex-1">
              <OrderDetail key={selected} id={selected} embedded />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

function OrderRow({ o, selected, onSelect }: { o: Order; selected: boolean; onSelect?: () => void }) {
  const cell = cx("border-t border-line px-3 py-3", selected && "border-transparent bg-brand-soft");
  return (
    <tr className={cx("cursor-pointer", !selected && "hover:[&>td]:bg-background")} onClick={onSelect}>
      <td className={cx(cell, selected && "rounded-l-2xl")}>
        <Link
          href={`/dashboard/orders/${o.id}`}
          onClick={(e) => {
            if (onSelect) {
              e.preventDefault();
              onSelect();
            }
          }}
          aria-current={selected ? "true" : undefined}
          className="block min-w-0"
        >
          <b className="block truncate">{o.buyer_name || o.buyer_email}</b>
          <span className="block truncate text-[13px] text-muted">
            <span className="font-mono">{o.code}</span>
            {o.mode === "sandbox" ? " · test" : ""}
            <span className="sm:hidden"> · {STATUS_LABEL[o.status]}</span>
          </span>
        </Link>
      </td>
      <td className={cx(cell, "hidden max-w-[260px] truncate md:table-cell")}>{itemsSummary(o.items)}</td>
      <td className={cx(cell, "whitespace-nowrap text-right font-semibold")}>{formatMoney(o.amount, o.currency)}</td>
      <td className={cx(cell, "hidden sm:table-cell")}>
        <OrderStatusBadge status={o.status} />
        <span className="ml-2 hidden text-[12px] text-muted 2xl:inline">{PROVIDER_NAME[o.provider]}</span>
      </td>
      <td className={cx(cell, "hidden text-muted xl:table-cell", selected && "rounded-r-2xl")}>{relativeTime(o.created_at)}</td>
    </tr>
  );
}
