// P3-A sell cards, part (b): price list, store info, payment, tip jar, reviews.
// Server components: no hooks, no context, no "use client". Interactivity goes through the data-*
// hooks PageRuntime handles (copy, lightbox, go-to-form, click tracking).
import { Copy, MapPin, Star } from "../icons";
import type { BlockOf, StoreInfoData, Weekday } from "@/lib/types";
import { WEEKDAYS } from "@/lib/constants";
import { safeHref } from "@/lib/safe-url";
import { formatMoney } from "@/lib/sell/money";
import { toE164 } from "@/lib/sell/phone";
import { COURIER_LABELS, TIPS } from "@/lib/sell/platforms";
import { mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { BrandMark } from "./SellBlocksA";
import { s as p } from "../cls";
import s from "./sell-b.module.css";

function waHref(number: string, text: string): string | undefined {
  const n = toE164(number);
  return /^\+[1-9][0-9]{7,14}$/.test(n) ? `https://wa.me/${n.slice(1)}?text=${encodeURIComponent(text)}` : undefined;
}

function Stars({ value, label }: { value: number; label?: string }) {
  const full = Math.round(value);
  return (
    <span data-p="sellStars" role="img" aria-label={label ?? `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden data-p={n <= full ? "sellStarOn" : "sellStarOff"} />
      ))}
    </span>
  );
}

// ---------- price list ----------

export function PriceListBlock({ block, env }: { block: BlockOf<"price_list">; env: PageEnv }) {
  const d = block.data;
  const ask = d.ask;
  const askHref = ask ? (ask.kind === "whatsapp" ? waHref(ask.target, "Hi! I'd like to ask about your prices.") : safeHref(ask.target)) : undefined;
  return (
    <div className={`${p.card} ${s.sell}`}>
      {d.sections.map((sec, i) => (
        <section key={i} data-p="priceSection" aria-label={sec.title || undefined}>
          {sec.title ? <h3 data-p="sellTitle">{sec.title}</h3> : null}
          <ul data-p="priceList">
            {sec.items.map((it, j) => (
              <li key={j} data-p="priceItem">
                {it.image_url ? <Img src={it.image_url} alt="" media={mediaFor(env, it.image_url)} width={56} height={56} sizes="56px" className={s.priceThumb} /> : null}
                <span data-p="priceText">
                  <span data-p="priceName">{it.name}</span>
                  {it.desc ? <span data-p="priceDesc">{it.desc}</span> : null}
                </span>
                {it.price != null ? (
                  <span data-p="priceValue">
                    {it.price_from ? <span data-p="priceFrom">from </span> : null}
                    {formatMoney(it.price, d.currency)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
      {d.note ? <p data-p="sellNote">{d.note}</p> : null}
      {ask && askHref ? (
        <a className={p.btn} href={askHref} target="_blank" rel="noopener noreferrer" {...track(block.id, "ask")} style={{ justifyContent: "center" }}>
          {ask.label}
        </a>
      ) : null}
    </div>
  );
}

// ---------- store info ----------

const DAY_LABEL: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
const DAY_SHORT: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Day of week and minutes since midnight at `now` in `tz`. */
function localNow(tz: string, now: Date): { day: Weekday; min: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = get("weekday").toLowerCase().slice(0, 3) as Weekday;
    if (!WEEKDAYS.includes(day)) return null;
    return { day, min: Number(get("hour")) * 60 + Number(get("minute")) };
  } catch {
    return null;
  }
}

export type OpenStatus = { open: true; until: string } | { open: false; opens?: { day: Weekday; time: string; today: boolean } } | null;

/**
 * Open now? Slots whose close is earlier than (or equal to "24:00" past) open run past midnight,
 * so yesterday's late slot can still be open early today. Exported for tests.
 */
export function openStatus(hours: StoreInfoData["hours"], tz: string, now: Date): OpenStatus {
  const t = localNow(tz, now);
  if (!t || !hours.length) return null;
  const di = WEEKDAYS.indexOf(t.day);
  const yesterday = WEEKDAYS[(di + 6) % 7];
  for (const h of hours) {
    const o = toMin(h.open);
    const c = h.close === "24:00" ? 1440 : toMin(h.close);
    const overnight = c <= o;
    if (h.day === t.day && t.min >= o && (overnight || t.min < c)) return { open: true, until: h.close === "24:00" ? "midnight" : h.close };
    if (overnight && h.day === yesterday && t.min < c) return { open: true, until: h.close };
  }
  // next opening within the coming week
  for (let k = 0; k < 7; k++) {
    const day = WEEKDAYS[(di + k) % 7];
    const later = hours
      .filter((h) => h.day === day && (k > 0 || toMin(h.open) > t.min))
      .sort((a, b) => toMin(a.open) - toMin(b.open))[0];
    if (later) return { open: false, opens: { day, time: later.open, today: k === 0 } };
  }
  return { open: false };
}

export function StoreInfoBlock({ block, now }: { block: BlockOf<"store_info">; now: number }) {
  const d = block.data;
  const status = openStatus(d.hours, d.tz, new Date(now));
  const today = localNow(d.tz, new Date(now))?.day;
  const place = [d.address, d.area].filter(Boolean).join(", ");
  const maps = place ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}` : undefined;
  return (
    <div className={`${p.card} ${s.sell}`}>
      {status ? (
        <p data-p={status.open ? "openBadge" : "closedBadge"}>
          <span data-p="openDot" aria-hidden />
          {status.open
            ? `Open now · until ${status.until}`
            : status.opens
              ? `Closed · opens ${status.opens.today ? "today" : DAY_SHORT[status.opens.day]} ${status.opens.time}`
              : "Closed"}
        </p>
      ) : null}
      {d.hours.length ? (
        <dl data-p="hoursList">
          {WEEKDAYS.map((day) => {
            const slots = d.hours.filter((h) => h.day === day);
            return (
              <div key={day} data-p={day === today ? "hoursToday" : "hoursRow"}>
                <dt>{DAY_LABEL[day]}</dt>
                <dd>{slots.length ? slots.map((h) => `${h.open}–${h.close}`).join(", ") : "Closed"}</dd>
              </div>
            );
          })}
        </dl>
      ) : null}
      {place ? (
        <div data-p="storePlace">
          <MapPin aria-hidden data-p="storePin" />
          <span data-p="priceText">
            {d.address ? <span data-p="priceName">{d.address}</span> : null}
            {d.area ? <span data-p="priceDesc">{d.area}</span> : null}
          </span>
        </div>
      ) : null}
      {maps ? (
        <a className={p.btn} href={maps} target="_blank" rel="noopener noreferrer" {...track(block.id, "directions")} style={{ justifyContent: "center" }}>
          Get directions
        </a>
      ) : null}
      {d.couriers?.length ? (
        <ul data-p="sellChips" aria-label="Delivery">
          {d.couriers.map((c) => (
            <li key={c} data-p="sellChip">
              {COURIER_LABELS[c] ?? c}
            </li>
          ))}
        </ul>
      ) : null}
      {d.delivery_note ? <p data-p="sellNote">{d.delivery_note}</p> : null}
    </div>
  );
}

// ---------- payment ----------

export function PaymentBlock({ block, env }: { block: BlockOf<"payment">; env: PageEnv }) {
  const d = block.data;
  const c = d.confirm;
  const label = c?.label || "I've paid";
  return (
    <div className={`${p.card} ${s.sell}`}>
      {d.title ? <h3 data-p="sellTitle">{d.title}</h3> : null}
      {d.qris_image_url ? (
        <figure data-p="qris">
          <button type="button" data-p="qrisZoom" data-lightbox={d.qris_image_url} data-alt="QRIS payment code" aria-label="Show the QRIS code larger">
            <Img src={d.qris_image_url} alt="QRIS payment code" media={mediaFor(env, d.qris_image_url)} width={220} height={220} sizes="220px" className={s.qrisImg} />
          </button>
          <figcaption data-p="priceDesc">QRIS · scan with any e-wallet or bank app</figcaption>
        </figure>
      ) : null}
      {d.accounts.length ? (
        <div data-p="accounts">
          {d.accounts.map((a, i) => (
            <div key={i} data-p="account">
              <span data-p="priceText">
                <span data-p="priceName">
                  {a.bank} · {a.name}
                </span>
                <code data-p="accountNumber">{a.number}</code>
              </span>
              <button type="button" data-p="accountCopy" data-copy={a.number.replace(/\s/g, "")} aria-label={`Copy ${a.bank} account number`} {...track(block.id, "copy_account")}>
                <Copy aria-hidden />
                <span data-copy-label>Copy</span>
              </button>
            </div>
          ))}
          <span role="status" className={p.srOnly} data-copy-status />
        </div>
      ) : null}
      {d.note ? <p data-p="sellNote">{d.note}</p> : null}
      {c?.kind === "whatsapp" && waHref(c.target, "Hi! I've paid. Here's my receipt.") ? (
        <a className={p.btn} href={waHref(c.target, "Hi! I've paid. Here's my receipt.")} target="_blank" rel="noopener noreferrer" {...track(block.id, "wa_confirm")} style={{ justifyContent: "center" }}>
          {label}
        </a>
      ) : c?.kind === "url" && safeHref(c.target) ? (
        <a className={p.btn} href={safeHref(c.target)} target="_blank" rel="noopener noreferrer" {...track(block.id, "confirm")} style={{ justifyContent: "center" }}>
          {label}
        </a>
      ) : c?.kind === "form" && c.target ? (
        <button type="button" className={p.btn} data-goto-form={c.target} {...track(block.id, "confirm")} style={{ justifyContent: "center" }}>
          {label}
        </button>
      ) : null}
    </div>
  );
}

// ---------- tip jar ----------

export function TipJarBlock({ block }: { block: BlockOf<"tip_jar"> }) {
  const d = block.data;
  return (
    <div className={`${p.card} ${s.sell}`}>
      <h3 data-p="sellTitle">{d.title}</h3>
      {d.description ? <p data-p="sellNote">{d.description}</p> : null}
      {d.amounts?.length ? (
        <ul data-p="sellChips" aria-label="Suggested amounts">
          {d.amounts.map((a, i) => (
            <li key={i} data-p="sellChip">
              {formatMoney(a, d.currency)}
            </li>
          ))}
        </ul>
      ) : null}
      <div data-p="tipButtons">
        {d.platforms.map((pl) => {
          const href = safeHref(pl.url);
          const meta = TIPS[pl.platform];
          if (!href || !meta) return null;
          return (
            <a key={pl.platform} className={p.btn} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, `tip:${pl.platform}`)} style={{ justifyContent: "center" }}>
              <BrandMark icon={meta.icon} label={meta.label} />
              Support on {meta.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ---------- reviews ----------

export function ReviewsBlock({ block }: { block: BlockOf<"reviews"> }) {
  const d = block.data;
  const dist = d.distribution;
  const max = dist ? Math.max(1, ...dist) : 1;
  const countLine = d.count != null ? `from ${d.count.toLocaleString("en-US")}${d.source ? ` ${d.source}` : ""} review${d.count === 1 ? "" : "s"}` : d.source ? `on ${d.source}` : null;
  return (
    <div className={`${p.card} ${s.sell}`}>
      {d.title ? <h3 data-p="sellTitle">{d.title}</h3> : null}
      {d.average != null ? (
        <div data-p="reviewSummary">
          <span data-p="reviewAverage">{d.average.toFixed(1)}</span>
          <span data-p="priceText">
            <Stars value={d.average} label={`Rated ${d.average.toFixed(1)} out of 5`} />
            {countLine ? <span data-p="priceDesc">{countLine}</span> : null}
          </span>
        </div>
      ) : null}
      {dist ? (
        <ul data-p="reviewBars" aria-label="Rating breakdown">
          {dist.map((n, i) => (
            <li key={i} data-p="reviewBarRow">
              <span data-p="reviewBarLabel">{5 - i}★</span>
              <span data-p="reviewBar" aria-hidden>
                <span style={{ width: `${(n / max) * 100}%` }} />
              </span>
              <span data-p="reviewBarCount">{n.toLocaleString("en-US")}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {d.items.length ? (
        <ul data-p="reviewList">
          {d.items.map((r, i) => {
            const href = safeHref(r.source_url);
            return (
              <li key={i} data-p="reviewItem">
                <Stars value={r.stars} />
                <blockquote data-p="reviewQuote">{r.quote}</blockquote>
                <p data-p="priceDesc">
                  {r.author}
                  {href ? (
                    <>
                      {" · "}
                      <a href={href} target="_blank" rel="noopener noreferrer" data-p="reviewSource" {...track(block.id, "review")}>
                        See the review
                      </a>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
