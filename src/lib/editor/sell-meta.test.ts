import { describe, expect, it } from "vitest";
import type { BlockDataMap } from "../types";
import { emptyShopItem, SELL_META } from "./sell-meta";

const v = <K extends keyof typeof SELL_META>(t: K, d: BlockDataMap[K]) => (SELL_META[t].validate as (x: BlockDataMap[K]) => { errors: Record<string, string>; data: BlockDataMap[K] })(d);

describe("sell validators", () => {
  it("product: required name, price relation, action per kind, keeps unknown fields", () => {
    const base = SELL_META.product.defaultData();
    expect(Object.keys(v("product", base).errors).sort()).toEqual(["action.wa_number", "name"]);
    const ok = v("product", {
      ...base,
      name: " Brownies ",
      price: 8500000,
      compare_at: 9500000,
      description: "",
      action: { kind: "whatsapp", wa_number: "+6281234567890", url: "stale" },
      future_field: 1,
    } as BlockDataMap["product"]);
    expect(ok.errors).toEqual({});
    expect(ok.data).toMatchObject({ name: "Brownies", future_field: 1, action: { kind: "whatsapp", wa_number: "+6281234567890" } });
    expect("description" in ok.data).toBe(false);
    expect("url" in ok.data.action).toBe(false);
    expect(v("product", { ...base, name: "x", price: 100, compare_at: 100, action: { kind: "url", url: "https://x.io" } }).errors).toEqual({ compare_at: expect.any(String) });
    expect(v("product", { ...base, name: "x", compare_at: 100, action: { kind: "url", url: "https://x.io" } }).errors.compare_at).toMatch(/price first/);
    expect(v("product", { ...base, name: "x", action: { kind: "marketplace", marketplace: "shopee", url: "https://www.tokopedia.com/a/b" } }).errors["action.url"]).toMatch(/another platform/);
    expect(v("product", { ...base, name: "x", images: Array(9).fill("/uploads/a.png"), action: { kind: "url", url: "https://x.io" } }).errors.images).toBeDefined();
  });

  it("product variants: names, distinct choices, empty groups dropped", () => {
    const d = { ...SELL_META.product.defaultData(), name: "x", action: { kind: "url" as const, url: "https://x.io" } };
    expect(v("product", { ...d, variants: [{ name: "", options: [] }] }).data.variants).toBeUndefined();
    expect(v("product", { ...d, variants: [{ name: "Size", options: ["S", "s"] }] }).errors["variants.0.options"]).toMatch(/different/);
    expect(v("product", { ...d, variants: [{ name: "", options: ["S"] }] }).errors["variants.0.name"]).toBeDefined();
  });

  it("shop: needs items, nests item errors, fixes ids and drops unknown categories", () => {
    expect(v("shop", { items: [] }).errors.items).toBeDefined();
    const a = { ...emptyShopItem(), name: "A", action: { kind: "url" as const, url: "https://x.io" }, category: "Gone" };
    const b = { ...a, id: a.id, name: "" };
    const r = v("shop", { categories: ["Prints", " "], items: [a, b] });
    expect(r.errors).toEqual({ "items.1.name": expect.any(String) });
    expect(r.data.categories).toEqual(["Prints"]);
    expect(r.data.items[0].category).toBeUndefined();
    expect(r.data.items[0].id).not.toBe(r.data.items[1].id);
  });

  it("marketplace: platform once, url must match", () => {
    const r = v("marketplace", { stores: [{ platform: "shopee", url: "https://shopee.co.id/x" }, { platform: "shopee", url: "https://shopee.co.id/y" }] });
    expect(r.errors).toEqual({ "stores.1.platform": "Already added" });
    expect(v("marketplace", { stores: [] }).errors.stores).toBeDefined();
  });

  it("whatsapp: order form needs items and {items}", () => {
    const base = { label: "Order", number: "+6281234567890", message_template: "Hi" };
    expect(v("whatsapp", base).errors).toEqual({});
    const r = v("whatsapp", { ...base, order_form: { fields: ["items", "name", "name"], items: [] } });
    expect(r.errors).toMatchObject({ "order_form.items": expect.any(String), message_template: expect.stringMatching(/\{items\}/) });
    expect(r.data.order_form?.fields).toEqual(["items", "name"]);
    const ok = v("whatsapp", { ...base, message_template: "Order:\n{items}", order_form: { fields: ["name"], items: [{ name: "x" }] } });
    expect(ok.errors).toEqual({});
    expect(ok.data.order_form?.items).toBeUndefined();
  });

  it("price_list, store_info, payment, tip_jar, reviews", () => {
    expect(v("price_list", SELL_META.price_list.defaultData()).errors).toEqual({ "sections.0.items.0.name": expect.any(String) });
    expect(v("price_list", { sections: [{ title: "", items: [{ name: "Cut", price_from: true }] }] }).data.sections[0].items[0]).toEqual({ name: "Cut" });

    expect(v("store_info", SELL_META.store_info.defaultData()).errors).toEqual({});
    expect(v("store_info", { hours: [{ day: "fri", open: "22:00", close: "02:00" }], tz: "Asia/Jakarta" }).errors).toEqual({});
    expect(v("store_info", { hours: [{ day: "fri", open: "9", close: "09:00" }], tz: "Mars/Base" }).errors).toMatchObject({ "hours.0.open": expect.any(String), tz: expect.any(String) });

    expect(v("payment", { accounts: [] }).errors.accounts).toBeDefined();
    expect(v("payment", { accounts: [], qris_image_url: "/uploads/q.png" }).errors).toEqual({});
    expect(v("payment", { accounts: [{ bank: "BCA", name: "Sekar", number: "731" }], confirm: { kind: "whatsapp", target: "0812" } }).errors).toEqual({ "confirm.target": expect.any(String) });

    expect(v("tip_jar", SELL_META.tip_jar.defaultData()).errors.platforms).toBeDefined();
    expect(v("tip_jar", { title: "x", amounts: [1000000, 0], platforms: [{ platform: "saweria", url: "https://saweria.co/me" }] }).errors).toEqual({ "amounts.1": expect.any(String) });

    expect(v("reviews", { items: [] }).errors.items).toBeDefined();
    const r = v("reviews", { average: 4.86, distribution: [0, 0, 0, 0, 0], items: [] });
    expect(r.errors).toEqual({});
    expect(r.data).toEqual({ average: 4.9, items: [] });
    expect(v("reviews", { items: [{ stars: 0, quote: "", author: "" }] }).errors).toMatchObject({ "items.0.stars": expect.any(String), "items.0.quote": expect.any(String) });
  });
});

describe("sell links are http(s) only", () => {
  it("rejects mailto/tel for buy links but allows /uploads images", () => {
    const d = { ...SELL_META.product.defaultData(), name: "x" };
    expect(v("product", { ...d, action: { kind: "url", url: "mailto:a@b.co" } }).errors["action.url"]).toMatch(/https/);
    expect(v("product", { ...d, images: ["/uploads/a.png", "https://cdn.x/a.png"], action: { kind: "url", url: "https://x.io" } }).errors).toEqual({});
    expect(v("product", { ...d, images: ["tel:123"], action: { kind: "url", url: "https://x.io" } }).errors["images.0"]).toBeDefined();
  });
});
