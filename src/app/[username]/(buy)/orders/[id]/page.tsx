import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shouldAutoRefresh, type BuyerOrder } from "@/lib/buy";
import { getPublicPageCached, SERVER_API_BASE } from "@/lib/get-public-page";
import { safeHref } from "@/lib/safe-url";
import { formatMoney } from "@/lib/sell/money";
import { Seller, sellerName } from "../../seller";

// The URL carries the order token (?t=): a capability link. Never index it or leak it in Referer
// (the header is also set in next.config.ts for /:username/orders/*).
export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function loadOrder(username: string, id: string, token: string): Promise<BuyerOrder | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !token || token.length > 200) return null;
  const res = await fetch(`${SERVER_API_BASE}/public/${encodeURIComponent(username)}/orders/${id}?t=${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`order read failed: ${res.status}`);
  return (await res.json()) as BuyerOrder;
}

export default async function OrderPage({ params, searchParams }: Props) {
  const { username, id } = await params;
  const q = await searchParams;
  const data = await loadOrder(username, id, one(q.t) ?? "");
  if (!data) notFound();
  const { order: o, downloads } = data;
  // the seller header is best-effort: buyers keep access even if the page is unpublished
  const page = await getPublicPageCached(username).catch(() => null);
  const profile = page?.kind === "page" ? page.data.profile : { username, display_name: "", avatar_url: null };
  const seller = sellerName(profile);
  const money = (n: number) => formatMoney(n, o.currency as "IDR" | "USD");
  const cancelled = one(q.cancelled) === "1";
  const checkout = o.checkout_url ? safeHref(o.checkout_url) : undefined;
  const refresh = shouldAutoRefresh(o);

  return (
    <main className="tb-wrap">
      {refresh ? <meta httpEquiv="refresh" content="5" /> : null}
      <Seller profile={profile} />
      <div className="tb-card">
        {o.mode === "sandbox" ? <span className="tb-test">Test order: no real money moved</span> : null}
        <span className="tb-status" data-s={o.status}>
          {{ pending: "Waiting for payment", paid: "Paid", expired: "Not paid", failed: "Payment failed", refunded: "Refunded" }[o.status]}
        </span>

        {o.status === "paid" ? (
          <>
            <h1 className="tb-h1">Thanks{o.buyer_name ? `, ${o.buyer_name}` : ""}!</h1>
            <p className="tb-sub">
              Your download is ready. The links below last 24 hours; come back to this page any time for fresh ones. We also emailed a receipt with this page&apos;s link to {o.buyer_email}.
            </p>
            <ul className="tb-list">
              {downloads.map((d) => (
                <li key={d.index}>
                  <a className="tb-dl" href={safeHref(d.url)} rel="noreferrer nofollow">
                    <span>
                      <b>{d.name}</b>
                      <small>{d.file_name}</small>
                    </span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 15V3" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <path d="m7 10 5 5 5-5" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : o.status === "pending" ? (
          <>
            <h1 className="tb-h1">{cancelled ? "Payment not finished" : "Waiting for your payment"}</h1>
            <p className="tb-sub">
              {cancelled
                ? "You left the payment page before paying. You can go back and finish, or pay another time."
                : refresh
                  ? "As soon as the payment is confirmed, your download appears here. This page refreshes on its own."
                  : "We haven't had a confirmation yet. If you paid, refresh this page in a minute."}
            </p>
            {checkout ? (
              <a className={cancelled ? "tb-btn" : "tb-btn tb-btn-ghost"} href={checkout} rel="noreferrer">
                {cancelled ? "Go back to payment" : "Open the payment page again"}
              </a>
            ) : null}
          </>
        ) : o.status === "refunded" ? (
          <>
            <h1 className="tb-h1">This order was refunded</h1>
            <p className="tb-sub">The payment was returned, so the download is no longer available.</p>
          </>
        ) : (
          <>
            <h1 className="tb-h1">This order wasn&apos;t paid</h1>
            <p className="tb-sub">The payment {o.status === "failed" ? "didn't go through" : "window closed"}. No money was taken. You can start a new order from {seller}&apos;s page.</p>
            <a className="tb-btn tb-btn-ghost" href={`/${username}`}>
              Back to {seller}
            </a>
          </>
        )}

        <ul className="tb-list">
          {o.items.map((it, i) => (
            <li key={i} className="tb-row">
              <span>
                {it.quantity > 1 ? `${it.quantity} × ` : ""}
                {it.name}
                {it.variant ? ` (${it.variant})` : ""}
              </span>
              <span>{money(it.unit_amount * it.quantity)}</span>
            </li>
          ))}
          <li className="tb-row tb-total">
            <span>Total</span>
            <span>{money(o.amount)}</span>
          </li>
        </ul>
        <p className="tb-hint">
          Order <span className="tb-code">{o.code}</span> · {o.buyer_email}
        </p>
      </div>
      <p className="tb-foot">
        Questions about your order? Contact {seller} and mention the order code.
        <br />
        <a href={`/${username}`}>Back to {seller}</a>
      </p>
    </main>
  );
}
