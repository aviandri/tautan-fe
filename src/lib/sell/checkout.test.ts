import { describe, expect, it } from "vitest";
import { getMeta } from "../editor/block-meta";
import { validateProductCore } from "../editor/sell-meta";
import { isOwnUpload, isPrivateUpload, paidPriceError } from "./checkout";

describe("paidPriceError", () => {
  it("accepts whole-rupiah IDR and USD cents", () => {
    expect(paidPriceError(8500000, "IDR")).toBeNull();
    expect(paidPriceError(1999, "USD")).toBeNull();
    expect(paidPriceError(8500000, undefined)).toBeNull();
  });
  it("explains what's wrong", () => {
    expect(paidPriceError(undefined, "IDR")).toMatch(/Add a price/);
    expect(paidPriceError(Number.NaN, "IDR")).toMatch(/amount/);
    expect(paidPriceError(0, "IDR")).toMatch(/more than 0/);
    expect(paidPriceError(150, "IDR")).toMatch(/whole rupiah/);
    expect(paidPriceError(1000, "SGD")).toMatch(/IDR or USD/);
  });
});

describe("isPrivateUpload", () => {
  it("recognises private deliverables only", () => {
    expect(isPrivateUpload("https://api.example/uploads/p_0123456789abcdef0123456789abcdef.pdf")).toBe(true);
    expect(isPrivateUpload("https://api.example/uploads/0123456789abcdef0123456789abcdef.pdf")).toBe(false);
    expect(isPrivateUpload("https://files.example/p_book.pdf")).toBe(false);
    expect(isPrivateUpload(undefined)).toBe(false);
  });
});

describe("file card with a price", () => {
  const meta = getMeta("file");
  it("requires a valid price and defaults the currency", () => {
    const ok = meta.validate({ title: "Presets", url: "https://api.example/uploads/x.zip", price: 8500000 });
    expect(ok.errors).toEqual({});
    expect(ok.data).toMatchObject({ price: 8500000, currency: "IDR" });
    expect(meta.validate({ title: "Presets", url: "u", price: Number.NaN }).errors.price).toBeTruthy();
  });
  it("drops the currency on a free file", () => {
    const free = meta.validate({ title: "Guide", url: "https://x.example/a.pdf", currency: "USD" });
    expect(free.data).not.toHaveProperty("currency");
    expect(free.data).not.toHaveProperty("price");
  });
});

describe("checkout product", () => {
  const base = { images: [], name: "E-book", action: { kind: "checkout" as const } };
  it("needs a price and a file", () => {
    const r = validateProductCore(base);
    expect(r.errors.price).toMatch(/Add a price/);
    expect(r.errors["action.download.url"]).toMatch(/Upload/);
  });
  it("keeps the download for checkout only", () => {
    const r = validateProductCore({ ...base, price: 1999, currency: "USD", action: { kind: "checkout", download: { url: " https://api.example/uploads/p_0123456789abcdef0123456789abcdef.pdf " } } });
    expect(r.errors).toEqual({});
    expect(r.data.action.download?.url).toBe("https://api.example/uploads/p_0123456789abcdef0123456789abcdef.pdf");
    const url = validateProductCore({ ...base, price: 1999, action: { kind: "url", url: "https://x.example", download: { url: "https://f" } } });
    expect(url.data.action.download).toBeUndefined();
  });
});

describe("isOwnUpload", () => {
  it("only trusts our API origin", () => {
    expect(isOwnUpload("https://api.example/uploads/a.pdf", "https://api.example")).toBe(true);
    expect(isOwnUpload("/uploads/a.pdf", "https://api.example")).toBe(true);
    expect(isOwnUpload("https://blog.example/wp-content/uploads/a.pdf", "https://api.example")).toBe(false);
    expect(isOwnUpload("https://bucket.s3.amazonaws.com/uploads/a.pdf", "https://api.example")).toBe(false);
  });
});

describe("free file with a private upload", () => {
  it("is rejected with a way out", () => {
    const r = getMeta("file").validate({ title: "x", url: "https://api.example/uploads/p_0123456789abcdef0123456789abcdef.pdf" });
    expect(r.errors.url).toMatch(/Upload it again/);
  });
});
