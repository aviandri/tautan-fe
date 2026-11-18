import { API_URL, assetUrl } from "@/lib/api";
import { amountRange, cartHref, cartLinesIn, checkoutErrorMessage, DETAILS_ERRORS, eligibleProviders, MAX_SHIP_QTY, providerLabel, providersFor, shippingFieldErrors, type Cart } from "@/lib/buy";
import { formatMoney } from "@/lib/sell/money";
import type { PagePayments } from "@/lib/types";

type Query = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Countries offered for the address. ID first: almost every buyer is in Indonesia. */
const COUNTRIES: [string, string][] = [
  ["ID", "Indonesia"],
  ["MY", "Malaysia"],
  ["SG", "Singapore"],
  ["BN", "Brunei"],
  ["PH", "Philippines"],
  ["TH", "Thailand"],
  ["VN", "Vietnam"],
  ["TL", "Timor-Leste"],
  ["AU", "Australia"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["HK", "Hong Kong"],
  ["TW", "Taiwan"],
  ["NL", "Netherlands"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
];

/**
 * Payments (c): the shop cart checkout, in two server-rendered steps and no client JS.
 *  1. Review: quantities and options in a GET form back to this page ("Update", "Continue").
 *  2. Details: email, address (when something ships) and payment, in a POST straight to the API.
 * Contact and address fields only ever travel in the POST, never in a URL.
 */
export function CartCheckout({ username, seller, cart, payments, q }: { username: string; seller: string; cart: Cart; payments: PagePayments | null | undefined; q: Query }) {
  const code = one(q.error);
  const error = checkoutErrorMessage(code);
  const money = (n: number) => formatMoney(n, cart.currency as "IDR" | "USD");
  const supported = eligibleProviders(payments, cart.currency);
  const providers = providersFor(payments, cart.currency, cart.total);
  const details = cart.ready && providers.length > 0 && (one(q.step) === "details" || (!!code && DETAILS_ERRORS.has(code)));
  const lines = cartLinesIn(cart);
  const editHref = cartHref(username, cart.blockId, lines);

  if (!cart.lines.length) {
    return (
      <>
        <h1 className="tb-h1">Your cart is empty</h1>
        <p className="tb-sub">{cart.dropped ? "The items in this link aren't available any more." : "Add something from the shop first."}</p>
        <a className="tb-btn tb-btn-ghost" href={`/${username}`}>
          Back to {seller}
        </a>
      </>
    );
  }

  let rangeNote: string | null = null;
  if (supported.length && !providers.length) {
    const lo = Math.min(...supported.map((p) => amountRange(p, cart.currency)[0]));
    rangeNote = cart.total < lo ? `The total must be at least ${money(lo)} to pay online. Add something to your cart.` : "The total is above what can be paid online in one order. Split it into smaller orders.";
  }

  const totals = (
    <>
      {cart.ships ? (
        <li className="tb-row">
          <span>Shipping</span>
          <span>{cart.shippingFee ? money(cart.shippingFee) : "Free"}</span>
        </li>
      ) : null}
      <li className="tb-row tb-total">
        <span>Total</span>
        <span>{money(cart.total)}</span>
      </li>
    </>
  );
  const summary = (
    <ul className="tb-list">
      {cart.lines.map((l, i) => (
        <li key={i} className="tb-row">
          <span>
            {l.qty > 1 ? `${l.qty} × ` : ""}
            {l.item.name}
            {Object.values(l.options).some(Boolean) ? ` (${Object.entries(l.options).map(([k, v]) => `${k}: ${v}`).join(", ")})` : ""}
          </span>
          <span>{money(l.total)}</span>
        </li>
      ))}
      {totals}
    </ul>
  );

  if (details) {
    const bad = shippingFieldErrors(q);
    const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, hint?: string) => (
      <label className="tb-field">
        <span className="tb-label">{label}</span>
        <input className="tb-input" name={`shipping.${name}`} aria-invalid={bad.has(name) || undefined} {...props} />
        {hint ? <span className="tb-hint">{hint}</span> : null}
      </label>
    );
    return (
      <form method="post" action={`${API_URL}/api/v1/public/${encodeURIComponent(username)}/orders`} style={{ display: "contents" }}>
        <div className="tb-steps">
          <a href={editHref}>Cart</a>
          <span aria-hidden>›</span>
          <b aria-current="step">Details</b>
        </div>
        <h1 className="tb-h1">Checkout</h1>
        {summary}
        <a className="tb-link" href={editHref}>
          Edit cart
        </a>
        {error ? (
          <p className="tb-alert" role="alert">
            {error} {code === "invalid_shipping" || code === "invalid_email" ? "For your privacy, the form doesn't keep what you typed, so please fill it in again." : ""}
          </p>
        ) : null}

        <input type="hidden" name="block_id" value={cart.blockId} />
        {lines.map((l, n) => (
          <span key={n} hidden>
            <input type="hidden" name={`line.${n}.item`} value={l.item} />
            <input type="hidden" name={`line.${n}.qty`} value={l.qty} />
            {Object.entries(l.options).map(([k, v]) => (
              <input key={k} type="hidden" name={`line.${n}.option.${k}`} value={v} />
            ))}
          </span>
        ))}

        <label className="tb-field">
          <span className="tb-label">Email</span>
          <input className="tb-input" type="email" name="email" required autoComplete="email" inputMode="email" maxLength={254} placeholder="you@example.com" />
          <span className="tb-hint">{cart.lines.some((l) => !l.ships) ? "Your receipt and download link go here." : "Your receipt and shipping updates go here."}</span>
        </label>
        {cart.ships ? (
          <fieldset className="tb-fieldset">
            <legend className="tb-label">Ship to</legend>
            {field("name", "Recipient's name", { required: true, maxLength: 100, autoComplete: "shipping name" })}
            {field("phone", "Phone", { required: true, type: "tel", inputMode: "tel", maxLength: 24, autoComplete: "shipping tel", placeholder: "0812 3456 7890" }, "For the courier.")}
            <label className="tb-field">
              <span className="tb-label">Address</span>
              <textarea className="tb-input tb-textarea" name="shipping.address" required maxLength={300} rows={3} autoComplete="shipping street-address" aria-invalid={bad.has("address") || undefined} placeholder="Street, number, RT/RW, district" />
            </label>
            <div className="tb-two">
              {field("city", "City", { required: true, maxLength: 80, autoComplete: "shipping address-level2" })}
              {field("postal_code", "Postal code", { maxLength: 12, autoComplete: "shipping postal-code", inputMode: "numeric" })}
            </div>
            <label className="tb-field">
              <span className="tb-label">Country</span>
              <select className="tb-select" name="shipping.country" defaultValue="ID" autoComplete="shipping country" aria-invalid={bad.has("country") || undefined}>
                {COUNTRIES.map(([c, n]) => (
                  <option key={c} value={c}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            {field("notes", "Delivery notes (optional)", { maxLength: 300, placeholder: "Gate code, landmark, best time" })}
          </fieldset>
        ) : (
          <label className="tb-field">
            <span className="tb-label">Name (optional)</span>
            <input className="tb-input" type="text" name="name" autoComplete="name" maxLength={100} />
          </label>
        )}

        {providers.length > 1 ? (
          <fieldset className="tb-fieldset">
            <legend className="tb-label">Pay with</legend>
            {providers.map((p, i) => (
              <label key={p} className="tb-radio">
                <input type="radio" name="provider" value={p} defaultChecked={i === 0} required />
                <span>
                  <b>{providerLabel(p).methods}</b>
                  <span>via {providerLabel(p).name}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="provider" value={providers[0]} />
            <p className="tb-hint">
              Pay with {providerLabel(providers[0]).methods}, on {providerLabel(providers[0]).name}&apos;s secure page.
            </p>
          </>
        )}
        <button className="tb-btn" type="submit">
          Pay {money(cart.total)}
        </button>
      </form>
    );
  }

  return (
    <form method="get" action={`/${username}/checkout`} style={{ display: "contents" }}>
      <div className="tb-steps">
        <b aria-current="step">Cart</b>
        <span aria-hidden>›</span>
        <span>Details</span>
      </div>
      <h1 className="tb-h1">Your cart</h1>
      {error ? (
        <p className="tb-alert" role="alert">
          {error}
        </p>
      ) : null}
      {cart.dropped ? <p className="tb-note">Some items aren&apos;t available any more, so they were taken out of your cart.</p> : null}
      <input type="hidden" name="block" value={cart.blockId} />
      <ul className="tb-list tb-lines">
        {cart.lines.map((l, n) => {
          const img = assetUrl(l.item.images[0]);
          const rest = lines.filter((_, j) => j !== n);
          return (
            <li key={n} className="tb-line">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img} alt="" width={56} height={56} />
              ) : (
                <span className="tb-line-icon" aria-hidden />
              )}
              <div className="tb-line-body">
                <p className="tb-item-name">{l.item.name}</p>
                <p className="tb-item-meta">
                  {money(l.unit)}
                  {l.ships ? "" : " · Digital download"}
                </p>
                <input type="hidden" name={`line.${n}.item`} value={l.item.id} />
                {(l.item.variants ?? [])
                  .filter((v) => v.options.length)
                  .map((v) => (
                    <label key={v.name} className="tb-inline">
                      <span>{v.name}</span>
                      <select className="tb-select tb-select-sm" name={`line.${n}.option.${v.name}`} defaultValue={l.options[v.name]} aria-invalid={!l.options[v.name] || undefined}>
                        {!l.options[v.name] ? <option value="">Choose…</option> : null}
                        {v.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                {l.ships ? (
                  <label className="tb-inline">
                    <span>Qty</span>
                    <select className="tb-select tb-select-sm" name={`line.${n}.qty`} defaultValue={l.qty}>
                      {Array.from({ length: MAX_SHIP_QTY }, (_, i) => i + 1).map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {l.problem ? <p className="tb-line-err">{l.problem}, then press Update.</p> : null}
                <a className="tb-remove" href={rest.length ? cartHref(username, cart.blockId, rest) : `/${username}/checkout?block=${encodeURIComponent(cart.blockId)}`}>
                  Remove
                </a>
              </div>
              <span className="tb-price">{money(l.total)}</span>
            </li>
          );
        })}
      </ul>
      <ul className="tb-list">{totals}</ul>
      {rangeNote ? <p className="tb-note">{rangeNote}</p> : !supported.length ? <p className="tb-note">{seller} isn&apos;t taking online payments for this right now.</p> : null}
      <div className="tb-btn-row">
        <button className="tb-btn tb-btn-ghost" type="submit">
          Update
        </button>
        {providers.length ? (
          <button className="tb-btn" type="submit" name="step" value="details">
            Continue
          </button>
        ) : null}
      </div>
      <a className="tb-link" href={`/${username}`}>
        Keep shopping
      </a>
    </form>
  );
}
