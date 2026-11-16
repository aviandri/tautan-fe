import { describe, expect, it } from "vitest";
import { BLOCK_META } from "./block-meta";
import { ALL_TYPES, CATALOG, CATEGORIES, searchCards } from "./catalog";
import { BLOCK_TYPES } from "../constants";

const SELL = ["product", "shop", "whatsapp", "marketplace", "price_list", "payment", "store_info", "tip_jar", "reviews"];

describe("card catalog", () => {
  it("lists every non-hidden type once, sell first", () => {
    const visible = BLOCK_TYPES.filter((t) => !BLOCK_META[t].hidden);
    expect([...ALL_TYPES].sort()).toEqual([...visible].sort());
    expect(new Set(ALL_TYPES).size).toBe(ALL_TYPES.length);
    expect(CATEGORIES[0].label).toBe("Sell and book");
    expect(ALL_TYPES.slice(0, 3)).toEqual(["product", "shop", "whatsapp"]);
  });

  it("sample data passes each type's validator", () => {
    for (const t of BLOCK_TYPES) {
      const s = CATALOG[t].sample;
      if (!s) continue;
      const r = (BLOCK_META[t].validate as (d: unknown) => { errors: object })(s);
      expect(r.errors, t).toEqual({});
    }
  });

  it("finds sell cards with Indonesian and short synonyms", () => {
    expect(searchCards("wa")[0]).toBe("whatsapp");
    expect(searchCards("order")[0]).toBe("whatsapp");
    const toko = searchCards("toko");
    expect(toko.slice(0, 4)).toEqual(expect.arrayContaining(["shop", "product", "marketplace"]));
    const jual = searchCards("jual");
    expect(jual.every((t) => SELL.includes(t))).toBe(true);
    expect(jual).toEqual(expect.arrayContaining(["product", "shop"]));
    expect(searchCards("Tokopedia")[0]).toBe("marketplace");
    expect(searchCards("tiktok shop")[0]).toBe("marketplace");
    expect(searchCards("daftar harga")[0]).toBe("price_list");
    expect(searchCards("qris")[0]).toBe("payment");
    expect(searchCards("jam buka")[0]).toBe("store_info");
    expect(searchCards("saweria")[0]).toBe("tip_jar");
  });

  it("finds by label and prefix, requires every word", () => {
    expect(searchCards("Link")[0]).toBe("link");
    expect(searchCards("calendar")[0]).toBe("booking");
    expect(searchCards("prod")[0]).toBe("product");
    expect(searchCards("zzzz")).toEqual([]);
    expect(searchCards("product zzzz")).toEqual([]);
    expect(searchCards("  ")).toEqual([]);
  });
});

describe("creator synonyms", () => {
  it("finds creator cards", () => {
    expect(searchCards("media kit")[0]).toBe("media_kit");
    expect(searchCards("ratecard")[0]).toBe("rate_card");
    expect(searchCards("endorse").slice(0, 3)).toEqual(expect.arrayContaining(["media_kit", "rate_card"]));
    expect(searchCards("jadwal live")[0]).toBe("events");
    expect(searchCards("live")[0]).toBe("events");
    expect(searchCards("grup wa")[0]).toBe("community");
    expect(searchCards("telegram")[0]).toBe("community");
    expect(searchCards("portfolio")[0]).toBe("gallery");
  });
});
