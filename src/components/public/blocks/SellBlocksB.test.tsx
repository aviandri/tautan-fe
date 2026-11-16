import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/editor/catalog";
import type { Block } from "@/lib/types";
import { NO_ENV } from "../env";
import { openStatus, PaymentBlock, PriceListBlock, ReviewsBlock, StoreInfoBlock, TipJarBlock } from "./SellBlocksB";

const hours = (["mon", "tue", "wed", "thu", "fri", "sat"] as const).map((day) => ({ day, open: "09:00", close: "21:00" }));
// 2026-11-20 is a Friday. Jakarta is UTC+7.
const at = (iso: string) => new Date(iso);

describe("openStatus", () => {
  it("open during hours, with the closing time", () => {
    expect(openStatus(hours, "Asia/Jakarta", at("2026-11-20T05:00:00Z"))).toEqual({ open: true, until: "21:00" }); // Fri 12:00
  });
  it("closed after hours → opens tomorrow; Sunday → Monday", () => {
    expect(openStatus(hours, "Asia/Jakarta", at("2026-11-20T15:00:00Z"))).toEqual({ open: false, opens: { day: "sat", time: "09:00", today: false } }); // Fri 22:00
    expect(openStatus(hours, "Asia/Jakarta", at("2026-11-22T05:00:00Z"))).toEqual({ open: false, opens: { day: "mon", time: "09:00", today: false } }); // Sun
    expect(openStatus(hours, "Asia/Jakarta", at("2026-11-20T00:30:00Z"))).toEqual({ open: false, opens: { day: "fri", time: "09:00", today: true } }); // Fri 07:30
  });
  it("overnight slots stay open past midnight", () => {
    const late = [{ day: "fri" as const, open: "20:00", close: "02:00" }];
    expect(openStatus(late, "Asia/Jakarta", at("2026-11-20T18:30:00Z"))).toEqual({ open: true, until: "02:00" }); // Sat 01:30
    expect(openStatus(late, "Asia/Jakarta", at("2026-11-20T19:30:00Z"))?.open).toBe(false); // Sat 02:30
  });
  it("uses the store's zone, not the visitor's", () => {
    // 15:00 UTC: Jakarta 22:00 (closed), Makassar 23:00 (closed), London 15:00 (open)
    expect(openStatus(hours, "Europe/London", at("2026-11-20T15:00:00Z"))?.open).toBe(true);
    expect(openStatus(hours, "Asia/Jakarta", at("2026-11-20T15:00:00Z"))?.open).toBe(false);
  });
  it("no hours or a bad zone → no badge", () => {
    expect(openStatus([], "Asia/Jakarta", new Date())).toBeNull();
    expect(openStatus(hours, "Nope/Zone", new Date())).toBeNull();
  });
});

const block = <T extends Block["type"]>(type: T) => ({ id: "b1", type, data: CATALOG[type].sample, tab_id: "t", parent_id: null, position: 0, is_visible: true, profile_id: "p", created_at: "", updated_at: "" }) as Extract<Block, { type: T }>;

describe("sell (b) renderers (server HTML)", () => {
  it("render the catalog samples with tracking hooks and no client code", () => {
    const html = [
      renderToStaticMarkup(<PriceListBlock block={block("price_list")} env={NO_ENV} />),
      renderToStaticMarkup(<StoreInfoBlock block={block("store_info")} now={Date.parse("2026-11-20T05:00:00Z")} />),
      renderToStaticMarkup(<PaymentBlock block={block("payment")} env={NO_ENV} />),
      renderToStaticMarkup(<TipJarBlock block={block("tip_jar")} />),
      renderToStaticMarkup(<ReviewsBlock block={block("reviews")} />),
    ].join("\n");
    expect(html).toContain("Rp");
    expect(html).toContain("250.000");
    expect(html).toContain("Open now · until 21:00");
    expect(html).toContain('data-copy="7310228841"');
    expect(html).toContain('data-a="copy_account"');
    expect(html).toContain('data-a="tip:saweria"');
    expect(html).toContain("Support on Saweria");
    expect(html).toContain("Rated 4.9 out of 5");
    expect(html).toContain("google.com/maps/search");
    expect(html).not.toMatch(/javascript:/);
  });
  it("payment confirm variants", () => {
    const b = block("payment");
    const wa = renderToStaticMarkup(<PaymentBlock block={{ ...b, data: { ...b.data, confirm: { kind: "whatsapp", target: "+6281234567890" } } }} env={NO_ENV} />);
    expect(wa).toContain("https://wa.me/6281234567890?text=");
    expect(wa).toContain('data-a="wa_confirm"');
    const form = renderToStaticMarkup(<PaymentBlock block={{ ...b, data: { ...b.data, confirm: { kind: "form", target: "f1", label: "Send receipt" } } }} env={NO_ENV} />);
    expect(form).toContain('data-goto-form="f1"');
    expect(form).toContain("Send receipt");
  });
});
