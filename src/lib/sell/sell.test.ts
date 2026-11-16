import { describe, expect, it } from "vitest";
import { formatMoney, inputToMinor, minorToInput, moneyError } from "./money";
import { e164Error, prettyPhone, toE164 } from "./phone";
import { detectMarketplace, detectTipPlatform, isProductUrl } from "./platforms";

describe("money", () => {
  it("parses Rupiah in the ways people type it", () => {
    for (const [raw, want] of [
      ["85.000", 8500000],
      ["85,000", 8500000],
      ["Rp 85 000", 8500000],
      ["85000", 8500000],
      ["85rb", 8500000],
      ["85k", 8500000],
      ["1,5jt", 150000000],
      ["1.5jt", 150000000],
      ["", undefined],
      ["  ", undefined],
    ] as const)
      expect(inputToMinor(raw, "IDR"), raw).toBe(want);
    expect(inputToMinor("abc", "IDR")).toBeNaN();
  });
  it("parses decimals for 2-digit currencies", () => {
    expect(inputToMinor("12.5", "USD")).toBe(1250);
    expect(inputToMinor("1,234.56", "USD")).toBe(123456);
    expect(inputToMinor("12", "USD")).toBe(1200);
  });
  it("formats minor units", () => {
    expect(formatMoney(8500000, "IDR").replace(/\s/g, " ")).toBe("Rp 85.000");
    expect(minorToInput(undefined)).toBe("");
    expect(minorToInput(1250, "USD")).toBe("12.5");
  });
  it("round-trips", () => {
    for (const n of [0, 100, 4900000, 123456700]) expect(inputToMinor(minorToInput(n, "IDR"), "IDR")).toBe(n);
  });
  it("flags bad amounts", () => {
    expect(moneyError(NaN)).toBeTruthy();
    expect(moneyError(-1)).toBeTruthy();
    expect(moneyError(1e15)).toBeTruthy();
    expect(moneyError(undefined)).toBeNull();
    expect(moneyError(500)).toBeNull();
  });
});

describe("phone", () => {
  it("normalises Indonesian numbers to E.164", () => {
    for (const [raw, want] of [
      ["0812-3456-7890", "+6281234567890"],
      ["62 812 3456 7890", "+6281234567890"],
      ["+62 812 3456 7890", "+6281234567890"],
      ["81234567890", "+6281234567890"],
      ["0065 9123 4567", "+6591234567"],
      ["+1 (415) 555-0100", "+14155550100"],
      ["", ""],
    ] as const)
      expect(toE164(raw), raw).toBe(want);
  });
  it("validates", () => {
    expect(e164Error("+6281234567890")).toBeNull();
    expect(e164Error("+62812")).toBeTruthy();
    expect(e164Error("")).toBeTruthy();
    expect(e164Error("", false)).toBeNull();
    expect(prettyPhone("+6281234567890")).toBe("+62 812-3456-7890");
  });
});

describe("platforms", () => {
  it("detects marketplaces by host", () => {
    expect(detectMarketplace("https://shopee.co.id/dapurnara")).toBe("shopee");
    expect(detectMarketplace("shp.ee/abc")).toBe("shopee");
    expect(detectMarketplace("https://www.tokopedia.com/dapurnara/brownies")).toBe("tokopedia");
    expect(detectMarketplace("https://shop.tiktok.com/view/product/123")).toBe("tiktok_shop");
    expect(detectMarketplace("https://www.tiktok.com/@someone")).toBeNull();
    expect(detectMarketplace("https://evil-shopee.co.id.example.com")).toBeNull();
    expect(detectTipPlatform("https://saweria.co/sekar")).toBe("saweria");
  });
  it("tells products from stores", () => {
    expect(isProductUrl("shopee", "https://shopee.co.id/Fudgy-Brownies-i.12345.67890")).toBe(true);
    expect(isProductUrl("shopee", "https://shopee.co.id/dapurnara")).toBe(false);
    expect(isProductUrl("tokopedia", "https://www.tokopedia.com/dapurnara/brownies-20x20")).toBe(true);
    expect(isProductUrl("tokopedia", "https://www.tokopedia.com/dapurnara")).toBe(false);
    expect(isProductUrl("tiktok_shop", "https://shop.tiktok.com/view/product/1729")).toBe(true);
  });
});
