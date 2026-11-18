import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { API_URL, assetUrl } from "@/lib/api";
import { checkoutErrorMessage, eligibleProviders, findPurchasable, PROVIDER_LABEL } from "@/lib/buy";
import { getPublicPageCached } from "@/lib/get-public-page";
import { formatMoney } from "@/lib/sell/money";
import { Seller, sellerName } from "../seller";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

type Props = { params: Promise<{ username: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Payments (b): the buyer enters their email (for the receipt and download link), picks options and
 * a payment method, and the plain HTML form posts straight to the API, which 303s to the
 * provider's hosted page (or back here with ?error=). No client JS.
 */
export default async function CheckoutPage({ params, searchParams }: Props) {
  const { username } = await params;
  const q = await searchParams;
  const result = await getPublicPageCached(username);
  if (result.kind === "moved") permanentRedirect(`/${result.to}/checkout?${new URLSearchParams(q as Record<string, string>).toString()}`);
  if (result.kind !== "page") notFound();
  const { profile, blocks, payments } = result.data;
  const item = findPurchasable(blocks, one(q.block), one(q.item));
  const providers = item ? eligibleProviders(payments, item.currency) : [];
  const error = checkoutErrorMessage(one(q.error));
  const seller = sellerName(profile);
  const image = assetUrl(item?.image);

  return (
    <main className="tb-wrap">
      <Seller profile={profile} />
      <div className="tb-card">
        {!item ? (
          <>
            <h1 className="tb-h1">This item isn&apos;t available</h1>
            <p className="tb-sub">It may have been removed or taken off sale.</p>
            <a className="tb-btn tb-btn-ghost" href={`/${profile.username}`}>
              Back to {seller}
            </a>
          </>
        ) : (
          <form method="post" action={`${API_URL}/api/v1/public/${encodeURIComponent(profile.username)}/orders`} style={{ display: "contents" }}>
            <h1 className="tb-h1">Checkout</h1>
            <div className="tb-item">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" width={64} height={64} />
              ) : (
                <span className="tb-item-icon" aria-hidden>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </span>
              )}
              <div style={{ minWidth: 0 }}>
                <p className="tb-item-name">{item.name}</p>
                <p className="tb-item-meta">{item.kind === "file" ? `Digital download${item.fileName ? ` · ${item.fileName}` : ""}` : "Digital product"}</p>
              </div>
              <span className="tb-price">{formatMoney(item.price, item.currency as "IDR" | "USD")}</span>
            </div>

            {error ? (
              <p className="tb-alert" role="alert">
                {error}
              </p>
            ) : null}

            {providers.length === 0 ? (
              <p className="tb-note">{seller} isn&apos;t taking online payments for this right now.</p>
            ) : (
              <>
                <input type="hidden" name="block_id" value={item.blockId} />
                {item.itemId ? <input type="hidden" name="item_id" value={item.itemId} /> : null}

                {item.variants.map((v) => (
                  <label key={v.name} className="tb-field">
                    <span className="tb-label">{v.name}</span>
                    <select className="tb-select" name={`option.${v.name}`} required defaultValue={v.options[0]}>
                      {v.options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}

                <label className="tb-field">
                  <span className="tb-label">Email</span>
                  <input className="tb-input" type="email" name="email" required autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" />
                  <span className="tb-hint">Your receipt and download link go here.</span>
                </label>
                <label className="tb-field">
                  <span className="tb-label">Name (optional)</span>
                  <input className="tb-input" type="text" name="name" autoComplete="name" maxLength={100} />
                </label>

                {providers.length > 1 ? (
                  <fieldset className="tb-field" style={{ border: 0, padding: 0, margin: 0 }}>
                    <legend className="tb-label" style={{ marginBottom: 6 }}>
                      Pay with
                    </legend>
                    {providers.map((p, i) => (
                      <label key={p} className="tb-radio" style={{ marginBottom: 8 }}>
                        <input type="radio" name="provider" value={p} defaultChecked={i === 0} required />
                        <span>
                          <b>{PROVIDER_LABEL[p].methods}</b>
                          <span>via {PROVIDER_LABEL[p].name}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                ) : (
                  <p className="tb-hint">Pay with {PROVIDER_LABEL[providers[0]].methods}, on {PROVIDER_LABEL[providers[0]].name}&apos;s secure page.</p>
                )}

                <button className="tb-btn" type="submit">
                  Pay {formatMoney(item.price, item.currency as "IDR" | "USD")}
                </button>
              </>
            )}
          </form>
        )}
      </div>
      <p className="tb-foot">
        You pay {seller} directly through the payment provider. Tautan hosts this page and never sees your card details.
        <br />
        <a href={`/${profile.username}/orders`}>Already bought something? Find your order</a>
      </p>
    </main>
  );
}
