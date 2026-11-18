import { ShoppingBag, X } from "../icons";
import { siWhatsapp, type SimpleIcon } from "simple-icons";
import type { BlockOf, MarketplacePlatform, ProductData, ShopItem } from "@/lib/types";
import { safeHref, safeImageSrc } from "@/lib/safe-url";
import { formatMoney } from "@/lib/sell/money";
import { MARKETPLACES } from "@/lib/sell/platforms";
import { DEFAULT_PRODUCT_TEMPLATE, fillTemplate, waLink } from "@/lib/sell/wa";
import { canCheckout, checkoutHref, mediaFor, track, type PageEnv } from "../env";
import { Img } from "../Img";
import { WaOrderIsland } from "../islands";
import { s } from "../cls";

// P3-A sell cards, part (a): product, shop, marketplace, whatsapp. Server components (no hooks):
// variant chips are native radios, the shop's category filter is CSS (:has), the product sheet
// is a <dialog> opened by PageRuntime (data-open-dialog), and the WhatsApp link picks up the chosen
// variant at click time (data-wa-*). Only the WhatsApp order form is a React island.

const BADGES: Record<NonNullable<ProductData["badge"]>, string> = {
  new: "New",
  best_seller: "Best seller",
  pre_order: "Pre-order",
  sold_out: "Sold out",
};

/** A real brand mark (simple-icons) on its brand colour, or a neutral monogram when there's none. */
export function BrandMark({ icon, label, className }: { icon: SimpleIcon | null; label: string; className?: string }) {
  if (!icon) {
    return (
      <span className={`${s.mark} ${s.markMono} ${className ?? ""}`} aria-hidden>
        {label
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()}
      </span>
    );
  }
  return (
    <span className={`${s.mark} ${className ?? ""}`} style={{ background: `#${icon.hex}` }} aria-hidden>
      <svg viewBox="0 0 24 24" fill="#fff">
        <path d={icon.path} />
      </svg>
    </span>
  );
}

function Price({ d }: { d: Pick<ProductData, "price" | "compare_at" | "currency"> }) {
  if (d.price == null) return null;
  return (
    <span className={s.sellPrice}>
      {d.compare_at != null && d.compare_at > d.price ? (
        <s className={s.sellStrike}>
          <span className={s.srOnly}>was </span>
          {formatMoney(d.compare_at, d.currency)}
        </s>
      ) : null}
      <b>{formatMoney(d.price, d.currency)}</b>
    </span>
  );
}

function Gallery({ d, env, priority, sizes }: { d: ProductData; env: PageEnv; priority?: boolean; sizes: string }) {
  const imgs = d.images.map((u) => safeImageSrc(u)).filter((u): u is string => !!u).slice(0, 8);
  const badge = d.badge ? <span className={`${s.sellBadge} ${d.badge === "sold_out" ? s.sellBadgeOut : ""}`}>{BADGES[d.badge]}</span> : null;
  if (!imgs.length) {
    return (
      <div className={s.sellGallery}>
        <div className={s.sellSlide}>
          <span className={s.sellNoImage} aria-hidden>
            <ShoppingBag />
          </span>
        </div>
        {badge}
      </div>
    );
  }
  return (
    <div className={s.sellGallery}>
      <div className={s.sellSlides} data-slides tabIndex={imgs.length > 1 ? 0 : undefined} aria-label={imgs.length > 1 ? `${d.name}: ${imgs.length} photos, swipe for more` : undefined} role={imgs.length > 1 ? "region" : undefined}>
        {imgs.map((src, i) => (
          <div key={src + i} className={s.sellSlide}>
            <Img src={src} alt={i === 0 ? d.name : ""} media={mediaFor(env, src)} sizes={sizes} priority={priority && i === 0} />
          </div>
        ))}
      </div>
      {badge}
      {imgs.length > 1 ? (
        <span className={s.sellCount} aria-hidden data-slide-count>
          1 / {imgs.length}
        </span>
      ) : null}
    </div>
  );
}

function BuyButton({ d, blockId, env }: { d: ProductData; blockId: string; env: PageEnv }) {
  const a = d.action;
  if (d.badge === "sold_out") {
    return (
      <span className={`${s.sellBtn} ${s.sellBtnOff}`} aria-disabled="true">
        Sold out
      </span>
    );
  }
  if (a.kind === "checkout") {
    // Payments (b): a plain link to our checkout page; the provider's page comes after.
    if (d.price == null || !canCheckout(env, d.currency)) {
      return (
        <span className={`${s.sellBtn} ${s.sellBtnOff}`} aria-disabled="true">
          Not available right now
        </span>
      );
    }
    const itemId = (d as ProductData & { id?: string }).id;
    return (
      <a className={s.sellBtn} href={checkoutHref(env, blockId, itemId)} rel="nofollow" {...track(blockId, "buy")}>
        {a.label || "Buy now"}
      </a>
    );
  }
  if (a.kind === "whatsapp") {
    const template = a.wa_template?.trim() || DEFAULT_PRODUCT_TEMPLATE;
    const price = d.price != null ? formatMoney(d.price, d.currency) : "";
    const firstVariant = (d.variants ?? []).map((v) => v.options[0]).filter(Boolean).join(", ");
    const href = waLink(a.wa_number, fillTemplate(template, { name: d.name, price, variant: firstVariant }));
    if (!href) return null;
    return (
      <a
        className={`${s.sellBtn} ${s.sellBtnWa}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-wa-number={a.wa_number}
        data-wa-template={template}
        data-wa-name={d.name}
        data-wa-price={price}
        {...track(blockId, "wa_order")}
      >
        <WaGlyph />
        {a.label || "Order on WhatsApp"}
      </a>
    );
  }
  const href = safeHref(a.url);
  if (!href || !/^https?:/.test(href)) return null;
  if (a.kind === "marketplace" && a.marketplace) {
    const m = MARKETPLACES[a.marketplace];
    return (
      <a className={s.sellBtn} href={href} target="_blank" rel="noopener noreferrer" {...track(blockId, `marketplace:${a.marketplace}`)}>
        <BrandMark icon={m.icon} label={m.label} className={s.markSm} />
        {a.label || `Buy on ${m.label}`}
      </a>
    );
  }
  return (
    <a className={s.sellBtn} href={href} target="_blank" rel="noopener noreferrer" {...track(blockId, "buy")}>
      {a.label || "Buy"}
    </a>
  );
}

function WaGlyph() {
  // WhatsApp's own mark (simple-icons), so the button reads as WhatsApp at a glance
  return (
    <svg className={s.sellBtnIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={WA_PATH} />
    </svg>
  );
}
const WA_PATH = siWhatsapp.path;

/** One product's full card (also the body of the shop's product sheet). `uid` keeps radio names unique. */
function ProductBody({ d, blockId, uid, env, priority, sizes }: { d: ProductData; blockId: string; uid: string; env: PageEnv; priority?: boolean; sizes: string }) {
  return (
    <>
      <Gallery d={d} env={env} priority={priority} sizes={sizes} />
      <div className={s.sellHead}>
        <h3 className={s.sellName}>{d.name}</h3>
        <Price d={d} />
      </div>
      {d.description ? <p className={s.sellDesc}>{d.description}</p> : null}
      {(d.variants ?? []).filter((v) => v.options.length).map((v, gi) => (
        <fieldset key={gi} className={s.sellVariants}>
          <legend className={s.sellVariantName}>{v.name}</legend>
          <div className={s.sellChips}>
            {v.options.map((o, oi) => (
              <label key={oi} className={s.sellChip}>
                <input type="radio" name={`${uid}-v${gi}`} value={o} defaultChecked={oi === 0} data-variant />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {d.stock_note ? <p className={s.sellNote}>{d.stock_note}</p> : null}
      <BuyButton d={d} blockId={blockId} env={env} />
    </>
  );
}

export function ProductBlock({ block, env, priority }: { block: BlockOf<"product">; env: PageEnv; priority?: boolean }) {
  return (
    <article className={s.sell} data-product aria-label={block.data.name}>
      <ProductBody d={block.data} blockId={block.id} uid={`p-${block.id}`} env={env} priority={priority} sizes="(max-width: 600px) 92vw, 540px" />
    </article>
  );
}

export function ShopBlock({ block, env }: { block: BlockOf<"shop">; env: PageEnv }) {
  const d = block.data;
  const items = d.items.slice(0, 60);
  if (!items.length) return null;
  const cats = (d.categories ?? []).filter((c) => items.some((it) => it.category === c));
  const rootId = `shop-${block.id}`;
  const catIndex = (it: ShopItem) => (it.category ? cats.indexOf(it.category) : -1);
  // category chips are radios; this rule hides the other categories' items (no JS)
  const css = cats
    .map((_, i) => `#${rootId}:has(input[value="${i}"]:checked) [data-cat]:not([data-cat="${i}"]){display:none}`)
    .join("");
  return (
    <section id={rootId} className={s.sell} aria-label={d.title || "Shop"}>
      {css ? <style>{css}</style> : null}
      {d.title ? <h3 className={s.sellName}>{d.title}</h3> : null}
      {cats.length ? (
        <div className={s.sellChips} role="radiogroup" aria-label="Category">
          <label className={s.sellChip}>
            <input type="radio" name={`${rootId}-cat`} value="all" defaultChecked />
            <span>All</span>
          </label>
          {cats.map((c, i) => (
            <label key={c} className={s.sellChip}>
              <input type="radio" name={`${rootId}-cat`} value={String(i)} />
              <span>{c}</span>
            </label>
          ))}
        </div>
      ) : null}
      <ul className={s.shopGrid}>
        {items.map((it) => {
          const img = safeImageSrc(it.images[0]);
          const dlg = `${rootId}-${it.id}`;
          return (
            <li key={it.id} data-cat={String(catIndex(it))}>
              <button type="button" className={s.shopItem} data-open-dialog={dlg} aria-haspopup="dialog" {...track(block.id, "view_product")}>
                <span className={s.shopThumb}>
                  {img ? <Img src={img} alt="" media={mediaFor(env, img)} sizes="(max-width: 600px) 45vw, 180px" /> : <ShoppingBag aria-hidden />}
                  {it.badge ? <span className={`${s.sellBadge} ${it.badge === "sold_out" ? s.sellBadgeOut : ""}`}>{BADGES[it.badge]}</span> : null}
                </span>
                <span className={s.shopItemName}>{it.name}</span>
                {it.price != null ? <span className={s.shopItemPrice}>{formatMoney(it.price, it.currency)}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {items.map((it) => (
        <dialog key={it.id} id={`${rootId}-${it.id}`} className={s.sellSheet} aria-label={it.name}>
          <div className={s.sell} data-product>
            <ProductBody d={it} blockId={block.id} uid={`${rootId}-${it.id}`} env={env} sizes="(max-width: 600px) 92vw, 480px" />
          </div>
          <button type="button" className={s.sellSheetClose} data-close-dialog aria-label="Close">
            <X aria-hidden />
          </button>
        </dialog>
      ))}
    </section>
  );
}

export function MarketplaceBlock({ block }: { block: BlockOf<"marketplace"> }) {
  const d = block.data;
  const stores = d.stores.filter((st) => MARKETPLACES[st.platform as MarketplacePlatform] && /^https?:/.test(safeHref(st.url) ?? ""));
  if (!stores.length) return null;
  return (
    <section className={s.sell} aria-label={d.title || "Buy on"}>
      <h3 className={s.sellLabel}>{d.title || "Also on"}</h3>
      <ul className={s.sellRows}>
        {stores.map((st) => {
          const m = MARKETPLACES[st.platform as MarketplacePlatform];
          return (
            <li key={st.platform}>
              <a className={s.sellRow} href={safeHref(st.url)} target="_blank" rel="noopener noreferrer" {...track(block.id, `marketplace:${st.platform}`)}>
                <BrandMark icon={m.icon} label={m.label} />
                <span>{m.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WhatsAppBlock({ block, env }: { block: BlockOf<"whatsapp">; env: PageEnv }) {
  const d = block.data;
  const form = d.order_form;
  if (form && form.fields.length) {
    return (
      <WaOrderIsland
        blockId={block.id}
        username={env.username}
        preview={env.preview}
        number={d.number}
        label={d.label}
        template={d.message_template}
        fields={form.fields}
        items={form.items ?? []}
        currency={form.currency}
      />
    );
  }
  const href = waLink(d.number, fillTemplate(d.message_template, {}));
  if (!href) return null;
  return (
    <a className={`${s.sellBtn} ${s.sellBtnWa} ${s.sellBtnSolo}`} href={href} target="_blank" rel="noopener noreferrer" {...track(block.id, "wa_chat")}>
      <WaGlyph />
      {d.label || "Chat on WhatsApp"}
    </a>
  );
}
