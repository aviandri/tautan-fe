/**
 * P3-A Sell cards: editor metadata and client validation mirroring SPEC "P3-A data contract".
 * Like block-meta.ts, validators keep fields they don't own and only trim/compact their own.
 * Errors are keyed by path ("items.3.price", "action.url") as the forms expect.
 */
import { Clock, HandCoins, MessageCircle, ReceiptText, ShoppingBag, ShoppingCart, Star, Store, Wallet } from "lucide-react";
import type {
  BlockDataMap,
  MarketplacePlatform,
  ProductAction,
  ProductData,
  ShopItem,
} from "../types";
import { COURIERS, MARKETPLACE_PLATFORMS, TIP_PLATFORMS, WA_ORDER_FIELDS } from "../constants";
import { urlError } from "../url";
import { compact, maxLen, plural, put, required, withSchedule, type BlockMeta, type FieldErrors } from "./meta-core";
import { moneyError } from "../sell/money";
import { e164Error } from "../sell/phone";
import { detectMarketplace, detectTipPlatform, MARKETPLACES, TIPS } from "../sell/platforms-meta";

export const LIMITS = {
  images: 8,
  variants: 3,
  variantOptions: 20,
  shopItems: 60,
  categories: 12,
  stores: 9,
  waItems: 30,
  sections: 10,
  sectionItems: 40,
  hours: 21,
  accounts: 6,
  amounts: 4,
  tipPlatforms: 5,
  reviews: 20,
} as const;

const trim = (s: string | undefined) => (s ?? "").trim();
const HHMM = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const HHMM_CLOSE = /^(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)$/;

/** Sell links are http(s) only on the BE (no mailto:, tel:, javascript:). */
export function httpUrlError(raw: string | undefined, required: boolean): string | null {
  const s = (raw ?? "").trim();
  const e = urlError(s, required);
  if (e) return e === "Required" ? "Add the link" : e;
  if (s && !/^https?:\/\//i.test(s)) return "Use a web link starting with https://";
  return null;
}

/** Image fields: http(s) or an /uploads/ path. */
export function imageUrlError(raw: string | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s.startsWith("/uploads/")) return null;
  return httpUrlError(s, false);
}

/** Prefix every key of `inner` with `prefix.` into `out`. */
function nest(out: FieldErrors, prefix: string, inner: FieldErrors) {
  for (const [k, v] of Object.entries(inner)) out[`${prefix}.${k}`] = v;
}

/** URL for a known platform: required, valid, and not obviously another platform's link. */
function platformUrlError<K extends string>(url: string, platform: K, detect: (u: string) => K | null, label: string): string | null {
  const e = httpUrlError(url, true);
  if (e) return e;
  const found = detect(url);
  return found && found !== platform ? `That looks like a link for another platform, not ${label}` : null;
}

export function validTz(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function browserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta";
  } catch {
    return "Asia/Jakarta";
  }
}

// ---------- product (also used for shop items) ----------

function validateAction(a: ProductAction): { errors: FieldErrors; data: ProductAction } {
  const e: FieldErrors = {};
  const label = trim(a.label);
  put(e, "label", maxLen(label, 40));
  const out: ProductAction = { kind: a.kind, ...(label ? { label } : {}) };
  if (a.kind === "url") {
    out.url = trim(a.url);
    put(e, "url", httpUrlError(out.url, true));
  } else if (a.kind === "whatsapp") {
    out.wa_number = trim(a.wa_number);
    put(e, "wa_number", e164Error(out.wa_number));
    const t = trim(a.wa_template);
    put(e, "wa_template", maxLen(t, 500));
    if (t) out.wa_template = t;
  } else {
    out.marketplace = a.marketplace;
    out.url = trim(a.url);
    if (!a.marketplace) put(e, "marketplace", "Pick a marketplace");
    else put(e, "url", platformUrlError(out.url, a.marketplace, detectMarketplace, MARKETPLACES[a.marketplace].label));
  }
  return { errors: e, data: out };
}

/** Shared by product and shop items. Returns trimmed data without empty optionals. */
export function validateProductCore<T extends Omit<ProductData, "schedule">>(d: T): { errors: FieldErrors; data: T } {
  const e: FieldErrors = {};
  const images = d.images.map((u) => u.trim()).filter(Boolean);
  if (images.length > LIMITS.images) put(e, "images", `Up to ${LIMITS.images} photos`);
  images.forEach((u, i) => put(e, `images.${i}`, imageUrlError(u)));

  const name = trim(d.name);
  put(e, "name", required(name) ? "Add a product name" : maxLen(name, 100));
  const description = trim(d.description);
  put(e, "description", maxLen(description, 1000));
  put(e, "price", moneyError(d.price));
  put(e, "compare_at", moneyError(d.compare_at));
  if (d.compare_at != null && !Number.isNaN(d.compare_at)) {
    if (d.price == null) put(e, "compare_at", "Add the price first");
    else if (d.compare_at <= d.price) put(e, "compare_at", "Should be more than the price");
  }

  const variants = (d.variants ?? [])
    .map((v) => ({ name: trim(v.name), options: v.options.map((o) => o.trim()).filter(Boolean) }))
    .filter((v) => v.name || v.options.length);
  if (variants.length > LIMITS.variants) put(e, "variants", `Up to ${LIMITS.variants} option groups`);
  variants.forEach((v, i) => {
    put(e, `variants.${i}.name`, required(v.name) ? "Name this option, like Size" : maxLen(v.name, 30));
    if (!v.options.length) put(e, `variants.${i}.options`, "Add at least one choice");
    else if (v.options.length > LIMITS.variantOptions) put(e, `variants.${i}.options`, `Up to ${LIMITS.variantOptions} choices`);
    else if (v.options.some((o) => o.length > 30)) put(e, `variants.${i}.options`, "Each choice can be up to 30 characters");
    else if (new Set(v.options.map((o) => o.toLowerCase())).size !== v.options.length) put(e, `variants.${i}.options`, "Choices must be different");
  });

  const stock_note = trim(d.stock_note);
  put(e, "stock_note", maxLen(stock_note, 60));
  const action = validateAction(d.action);
  nest(e, "action", action.errors);

  const data = compact(
    { ...d, images, name, description, stock_note, variants: variants.length ? variants : undefined, action: action.data },
    ["description", "stock_note", "variants", "price", "compare_at", "badge"],
  );
  return { errors: e, data };
}

// ---------- shop ----------

let seq = 0;
/** Stable client id for a shop item: [a-z0-9_-]{1,40}. */
export function newItemId(taken: Iterable<string> = []): string {
  const used = new Set(taken);
  let id: string;
  do id = `p${Date.now().toString(36)}${(seq++).toString(36)}`;
  while (used.has(id));
  return id;
}

/** Starting WhatsApp message for a product's buy button. */
export const DEFAULT_PRODUCT_WA = "Hi! I'd like to order {name} {variant}.";

export function emptyShopItem(taken: Iterable<string> = []): ShopItem {
  return { id: newItemId(taken), images: [], name: "", action: { kind: "whatsapp", wa_template: DEFAULT_PRODUCT_WA } };
}

// ---------- the metas ----------

type SellType = "product" | "shop" | "marketplace" | "whatsapp" | "price_list" | "store_info" | "payment" | "tip_jar" | "reviews";

export const SELL_META: { [K in SellType]: BlockMeta<K> } = {
  product: {
    type: "product",
    label: "Product",
    description: "One item with photos, price and a buy button",
    icon: ShoppingBag,
    tint: "#c2410c",
    defaultData: () => ({ images: [], name: "", currency: "IDR", action: { kind: "whatsapp", wa_template: DEFAULT_PRODUCT_WA } }),
    needsInputFirst: true,
    summary: (d) => d.name || "Product",
    validate: withSchedule<"product">((d) => validateProductCore(d)),
  },

  shop: {
    type: "shop",
    label: "Shop",
    description: "A grid of products with categories",
    icon: Store,
    tint: "#c2410c",
    defaultData: () => ({ items: [] }),
    needsInputFirst: true,
    summary: (d) => [d.title, plural(d.items.length, "product")].filter(Boolean).join(" · "),
    validate: withSchedule<"shop">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 100));
      const categories = (d.categories ?? []).map((c) => c.trim()).filter(Boolean);
      if (categories.length > LIMITS.categories) put(e, "categories", `Up to ${LIMITS.categories} categories`);
      else if (categories.some((c) => c.length > 30)) put(e, "categories", "Each category can be up to 30 characters");
      else if (new Set(categories.map((c) => c.toLowerCase())).size !== categories.length) put(e, "categories", "Categories must be different");
      if (!d.items.length) put(e, "items", "Add at least one product");
      if (d.items.length > LIMITS.shopItems) put(e, "items", `Up to ${LIMITS.shopItems} products`);
      const ids = new Set<string>();
      const items = d.items.map((it, i) => {
        const r = validateProductCore(it);
        nest(e, `items.${i}`, r.errors);
        let id = it.id;
        if (!/^[a-z0-9_-]{1,40}$/.test(id) || ids.has(id)) id = newItemId(ids);
        ids.add(id);
        const out: ShopItem = { ...r.data, id };
        if (!out.category || !categories.includes(out.category)) delete out.category;
        return out;
      });
      return { errors: e, data: compact({ ...d, title, categories: categories.length ? categories : undefined, items }, ["title", "categories"]) };
    }),
  },

  marketplace: {
    type: "marketplace",
    label: "Marketplace",
    description: "Your Shopee, Tokopedia and other stores",
    icon: ShoppingCart,
    tint: "#c2410c",
    defaultData: () => ({ stores: [] }),
    needsInputFirst: true,
    summary: (d) => d.stores.map((s) => MARKETPLACES[s.platform]?.label ?? s.platform).join(", ") || "No stores yet",
    validate: withSchedule<"marketplace">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      if (!d.stores.length) put(e, "stores", "Add at least one store");
      if (d.stores.length > LIMITS.stores) put(e, "stores", `Up to ${LIMITS.stores} stores`);
      const seen = new Set<MarketplacePlatform>();
      const stores = d.stores.map((s, i) => {
        const url = trim(s.url);
        if (!MARKETPLACE_PLATFORMS.includes(s.platform)) put(e, `stores.${i}.platform`, "Pick a marketplace");
        else if (seen.has(s.platform)) put(e, `stores.${i}.platform`, "Already added");
        else put(e, `stores.${i}.url`, platformUrlError(url, s.platform, detectMarketplace, MARKETPLACES[s.platform].label));
        seen.add(s.platform);
        return { ...s, url };
      });
      return { errors: e, data: compact({ ...d, title, stores }, ["title"]) };
    }),
  },

  whatsapp: {
    type: "whatsapp",
    label: "WhatsApp order",
    description: "A chat button, or an order form sent as a WhatsApp message",
    icon: MessageCircle,
    tint: "#1d7a4a",
    defaultData: () => ({ label: "Chat on WhatsApp", number: "", message_template: "Hi! I found you on Tautan." }),
    needsInputFirst: true,
    summary: (d) => d.label || "WhatsApp",
    validate: withSchedule<"whatsapp">((d) => {
      const e: FieldErrors = {};
      const label = trim(d.label);
      put(e, "label", required(label) ? "Add the button text" : maxLen(label, 40));
      const number = trim(d.number);
      put(e, "number", e164Error(number));
      const message_template = trim(d.message_template);
      put(e, "message_template", required(message_template) ? "Write the message" : maxLen(message_template, 1000));
      const out: BlockDataMap["whatsapp"] = { ...d, label, number, message_template };
      if (d.order_form) {
        const fields = [...new Set(d.order_form.fields)].filter((f) => WA_ORDER_FIELDS.includes(f));
        if (!fields.length) put(e, "order_form.fields", "Pick at least one thing to ask");
        const items = (d.order_form.items ?? []).map((it) => ({ ...it, name: trim(it.name) }));
        if (fields.includes("items")) {
          if (!items.length) put(e, "order_form.items", "Add what people can order");
          if (items.length > LIMITS.waItems) put(e, "order_form.items", `Up to ${LIMITS.waItems} items`);
          items.forEach((it, i) => {
            put(e, `order_form.items.${i}.name`, required(it.name) ? "Name this item" : maxLen(it.name, 80));
            put(e, `order_form.items.${i}.price`, moneyError(it.price));
          });
          if (!message_template.includes("{items}")) put(e, "message_template", "Add {items} so the order shows in the message");
        }
        out.order_form = compact(
          { ...d.order_form, fields, items: fields.includes("items") ? items.map((it) => compact(it, ["price"])) : undefined },
          ["items", "currency"],
        );
      } else delete out.order_form;
      return { errors: e, data: out };
    }),
  },

  price_list: {
    type: "price_list",
    label: "Price list",
    description: "Services or a menu with prices",
    icon: ReceiptText,
    tint: "#c2410c",
    defaultData: () => ({ sections: [{ title: "", items: [{ name: "" }] }], currency: "IDR" }),
    needsInputFirst: true,
    summary: (d) => plural(d.sections.reduce((n, x) => n + x.items.length, 0), "item"),
    validate: withSchedule<"price_list">((d) => {
      const e: FieldErrors = {};
      if (!d.sections.length) put(e, "sections", "Add a section");
      if (d.sections.length > LIMITS.sections) put(e, "sections", `Up to ${LIMITS.sections} sections`);
      const sections = d.sections.map((s, i) => {
        const title = trim(s.title);
        put(e, `sections.${i}.title`, maxLen(title, 60));
        if (!s.items.length) put(e, `sections.${i}.items`, "Add at least one item");
        if (s.items.length > LIMITS.sectionItems) put(e, `sections.${i}.items`, `Up to ${LIMITS.sectionItems} items`);
        const items = s.items.map((it, j) => {
          const p = `sections.${i}.items.${j}`;
          const name = trim(it.name);
          const desc = trim(it.desc);
          const image_url = trim(it.image_url);
          put(e, `${p}.name`, required(name) ? "Name this item" : maxLen(name, 80));
          put(e, `${p}.desc`, maxLen(desc, 200));
          put(e, `${p}.price`, moneyError(it.price));
          put(e, `${p}.image_url`, imageUrlError(image_url));
          const out = compact({ ...it, name, desc, image_url }, ["desc", "image_url", "price"]);
          if (!out.price_from || out.price == null) delete out.price_from;
          return out;
        });
        return { ...s, title, items };
      });
      const note = trim(d.note);
      put(e, "note", maxLen(note, 300));
      const out: BlockDataMap["price_list"] = compact({ ...d, sections, note }, ["note"]);
      if (d.ask) {
        const label = trim(d.ask.label);
        const target = trim(d.ask.target);
        put(e, "ask.label", required(label) ? "Add the button text" : maxLen(label, 40));
        if (d.ask.kind === "whatsapp") put(e, "ask.target", e164Error(target));
        else put(e, "ask.target", httpUrlError(target, true));
        out.ask = { ...d.ask, label, target };
      }
      return { errors: e, data: out };
    }),
  },

  store_info: {
    type: "store_info",
    label: "Store info",
    description: "Opening hours, address and delivery",
    icon: Clock,
    tint: "#1d7a4a",
    defaultData: () => ({
      hours: (["mon", "tue", "wed", "thu", "fri", "sat"] as const).map((day) => ({ day, open: "09:00", close: "17:00" })),
      tz: browserTz(),
    }),
    needsInputFirst: false,
    summary: (d) => d.area || d.address || (d.hours.length ? `Open ${new Set(d.hours.map((h) => h.day)).size} days a week` : "Hours not set"),
    validate: withSchedule<"store_info">((d) => {
      const e: FieldErrors = {};
      if (d.hours.length > LIMITS.hours) put(e, "hours", `Up to ${LIMITS.hours} time slots`);
      d.hours.forEach((h, i) => {
        if (!HHMM.test(h.open)) put(e, `hours.${i}.open`, "Use a time like 09:00");
        if (!HHMM_CLOSE.test(h.close)) put(e, `hours.${i}.close`, "Use a time like 17:00");
        else if (h.close === h.open) put(e, `hours.${i}.close`, "Closing time must differ from opening");
      });
      if (!validTz(d.tz)) put(e, "tz", "Pick a time zone");
      const address = trim(d.address);
      const area = trim(d.area);
      const delivery_note = trim(d.delivery_note);
      put(e, "address", maxLen(address, 200));
      put(e, "area", maxLen(area, 100));
      put(e, "delivery_note", maxLen(delivery_note, 300));
      const couriers = [...new Set(d.couriers ?? [])].filter((c) => COURIERS.includes(c));
      return {
        errors: e,
        data: compact({ ...d, address, area, delivery_note, couriers: couriers.length ? couriers : undefined }, ["address", "area", "delivery_note", "couriers"]),
      };
    }),
  },

  payment: {
    type: "payment",
    label: "Payment",
    description: "QRIS and bank or e-wallet accounts to pay into",
    icon: Wallet,
    tint: "#1d7a4a",
    defaultData: () => ({ accounts: [] }),
    needsInputFirst: true,
    summary: (d) => [d.qris_image_url ? "QRIS" : "", d.accounts.length ? plural(d.accounts.length, "account") : ""].filter(Boolean).join(" · ") || "Nothing to pay into yet",
    validate: withSchedule<"payment">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", maxLen(title, 60));
      const qris_image_url = trim(d.qris_image_url);
      put(e, "qris_image_url", imageUrlError(qris_image_url));
      if (d.accounts.length > LIMITS.accounts) put(e, "accounts", `Up to ${LIMITS.accounts} accounts`);
      const accounts = d.accounts.map((a, i) => {
        const o = { bank: trim(a.bank), name: trim(a.name), number: trim(a.number) };
        put(e, `accounts.${i}.bank`, required(o.bank) ? "Bank or e-wallet" : maxLen(o.bank, 40));
        put(e, `accounts.${i}.name`, required(o.name) ? "Account holder" : maxLen(o.name, 60));
        put(e, `accounts.${i}.number`, required(o.number) ? "Account number" : maxLen(o.number, 40));
        return o;
      });
      if (!qris_image_url && !accounts.length) put(e, "accounts", "Add a QRIS image or at least one account");
      const note = trim(d.note);
      put(e, "note", maxLen(note, 300));
      const out: BlockDataMap["payment"] = compact({ ...d, title, qris_image_url, accounts, note }, ["title", "qris_image_url", "note"]);
      if (d.confirm) {
        const target = trim(d.confirm.target);
        const label = trim(d.confirm.label);
        put(e, "confirm.label", maxLen(label, 40));
        if (d.confirm.kind === "whatsapp") put(e, "confirm.target", e164Error(target));
        else if (d.confirm.kind === "url") put(e, "confirm.target", httpUrlError(target, true));
        else if (!target) put(e, "confirm.target", "Pick a form");
        out.confirm = compact({ ...d.confirm, target, label }, ["label"]);
      }
      return { errors: e, data: out };
    }),
  },

  tip_jar: {
    type: "tip_jar",
    label: "Tip jar",
    description: "Support links: Saweria, Trakteer, Ko-fi and more",
    icon: HandCoins,
    tint: "#c2410c",
    defaultData: () => ({ title: "Support my work", platforms: [] }),
    needsInputFirst: true,
    summary: (d) => d.title,
    validate: withSchedule<"tip_jar">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      put(e, "title", required(title) ? "Add a title" : maxLen(title, 100));
      const description = trim(d.description);
      put(e, "description", maxLen(description, 300));
      const amounts = (d.amounts ?? []).filter((a) => a != null);
      if (amounts.length > LIMITS.amounts) put(e, "amounts", `Up to ${LIMITS.amounts} amounts`);
      amounts.forEach((a, i) => put(e, `amounts.${i}`, a === 0 ? "Must be more than 0" : moneyError(a)));
      if (!d.platforms.length) put(e, "platforms", "Add at least one place to send support");
      if (d.platforms.length > LIMITS.tipPlatforms) put(e, "platforms", `Up to ${LIMITS.tipPlatforms} platforms`);
      const seen = new Set<string>();
      const platforms = d.platforms.map((p, i) => {
        const url = trim(p.url);
        if (!TIP_PLATFORMS.includes(p.platform)) put(e, `platforms.${i}.platform`, "Pick a platform");
        else if (seen.has(p.platform)) put(e, `platforms.${i}.platform`, "Already added");
        else put(e, `platforms.${i}.url`, platformUrlError(url, p.platform, detectTipPlatform, TIPS[p.platform].label));
        seen.add(p.platform);
        return { ...p, url };
      });
      return {
        errors: e,
        data: compact({ ...d, title, description, amounts: amounts.length ? amounts : undefined, platforms }, ["description", "amounts"]),
      };
    }),
  },

  reviews: {
    type: "reviews",
    label: "Reviews",
    description: "Your star rating and what customers say",
    icon: Star,
    tint: "#c2410c",
    defaultData: () => ({ items: [] }),
    needsInputFirst: true,
    summary: (d) => (d.average != null ? `${d.average.toFixed(1)} ★${d.count ? ` · ${d.count} reviews` : ""}` : plural(d.items.length, "review")),
    validate: withSchedule<"reviews">((d) => {
      const e: FieldErrors = {};
      const title = trim(d.title);
      const source = trim(d.source);
      put(e, "title", maxLen(title, 60));
      put(e, "source", maxLen(source, 40));
      let average = d.average;
      if (average != null) {
        if (Number.isNaN(average) || average < 0 || average > 5) put(e, "average", "Between 0 and 5");
        else average = Math.round(average * 10) / 10;
      }
      if (d.count != null && (!Number.isInteger(d.count) || d.count < 0)) put(e, "count", "A whole number");
      const distribution = d.distribution && d.distribution.some((n) => n > 0) ? d.distribution : undefined;
      if (distribution && (distribution.length !== 5 || distribution.some((n) => !Number.isInteger(n) || n < 0)))
        put(e, "distribution", "Whole numbers for 5★ to 1★");
      if (d.items.length > LIMITS.reviews) put(e, "items", `Up to ${LIMITS.reviews} reviews`);
      const items = d.items.map((it, i) => {
        const o = { ...it, quote: trim(it.quote), author: trim(it.author), source_url: trim(it.source_url) };
        if (!(o.stars >= 1 && o.stars <= 5)) put(e, `items.${i}.stars`, "Pick 1 to 5 stars");
        put(e, `items.${i}.quote`, required(o.quote) ? "Add what they said" : maxLen(o.quote, 500));
        put(e, `items.${i}.author`, required(o.author) ? "Who said it" : maxLen(o.author, 60));
        put(e, `items.${i}.source_url`, httpUrlError(o.source_url, false));
        return compact(o, ["source_url"]);
      });
      if (average == null && !items.length) put(e, "items", "Add your rating or at least one review");
      return {
        errors: e,
        data: compact({ ...d, title, source, average, distribution, items }, ["title", "source", "average", "count", "distribution"]),
      };
    }),
  },
};
