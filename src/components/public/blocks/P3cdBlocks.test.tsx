import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/editor/catalog";
import type { Block, BlockType } from "@/lib/types";
import { BlockList, BlockRenderer, firstImageId } from "../BlockRenderer";
import { NO_ENV } from "../env";

const base = { id: "b1", profile_id: "p", tab_id: "t", parent_id: null, position: 0, is_visible: true, created_at: "", updated_at: "" };
const mk = (type: BlockType, data: unknown, extra: object = {}) => ({ ...base, type, data, ...extra }) as unknown as Block;
const html = (b: Block) => renderToStaticMarkup(<BlockRenderer block={b} opts={{ env: { ...NO_ENV, username: "u", preview: false }, now: Date.parse("2026-11-20T00:00:00Z") }} />);

describe("P3-C/D public renderers", () => {
  it("every new type renders its catalog sample without crashing", () => {
    for (const t of ["poll", "ask_me", "lead_magnet", "giveaway", "spotlight", "marquee", "timeline", "resume", "map"] as BlockType[]) {
      const sample = CATALOG[t].sample;
      expect(sample, t).toBeTruthy();
      expect(html(mk(t, sample)).length, t).toBeGreaterThan(50);
    }
    expect(html(mk("before_after", { before_url: "/uploads/a.jpg", after_url: "/uploads/b.jpg" }))).toContain('data-x="ba"');
  });

  it("poll: a form with radios; results only when show_results=always", () => {
    const opts = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
    const results = { counts: { a: 3, b: 1 }, total: 4 };
    const after = html(mk("poll", { question: "Q?", options: opts, show_results: "after_vote", results }));
    expect(after).toContain('data-x="poll"');
    expect(after).not.toContain("75%");
    expect(html(mk("poll", { question: "Q?", options: opts, show_results: "always", results }))).toContain("75%");
    const closed = html(mk("poll", { question: "Q?", options: opts, closed: true }));
    expect(closed).toContain("Voting has closed");
    expect(closed).not.toContain('data-x="poll"');
  });

  it("forms don't carry data-b (no click tracking on every radio)", () => {
    expect(html(mk("ask_me", { prompt: "Ask", public_answers: false }))).not.toMatch(/<form[^>]*data-b=/);
  });

  it("ask_me shows pinned answers only when public; giveaway shows the masked winner after the end", () => {
    const answers = [{ question: "Oven?", answer: "Deck oven", answered_at: "2026-11-01T00:00:00Z" }];
    expect(html(mk("ask_me", { prompt: "Ask", public_answers: true, answers }))).toContain("Deck oven");
    expect(html(mk("ask_me", { prompt: "Ask", public_answers: false, answers }))).not.toContain("Deck oven");
    const ended = html(mk("giveaway", { title: "Win", prize: "Tote", ends_at: "2026-01-01T00:00:00Z", steps: [], ended: true, winner: { display: "Budi S.", drawn_at: "x" } }));
    expect(ended).toContain("Budi S.");
    expect(ended).not.toContain('data-x="enter"');
  });

  it("locked cards render a stub with the right unlock form and nothing else", () => {
    const pw = html(mk("link", null, { locked: true, gate: { kind: "password", message: "Members only" } }));
    expect(pw).toContain('data-x-lock="b1"');
    expect(pw).toContain('type="password"');
    expect(pw).toContain("Members only");
    expect(html(mk("text", null, { locked: true, gate: { kind: "follow", follow: { platform: "instagram", url: "https://instagram.com/x" } } }))).toContain("instagram.com/x");
    // a child of a gated folder: no stub of its own
    expect(html(mk("link", null, { locked: true, parent_id: "f" }))).toBe("");
  });

  it("map: drawn SVG, server-built direction links, no external images", () => {
    const out = html(mk("map", { lat: -6.9, lng: 107.6, label: "Toko", links: { google: "https://www.google.com/maps/dir/?api=1&destination=-6.9,107.6", apple: "https://maps.apple.com/?daddr=-6.9,107.6", osm: "https://www.openstreetmap.org/?mlat=-6.9&mlon=107.6#map=15/-6.9/107.6" } }));
    expect(out).toContain("<svg");
    expect(out).toContain("Google Maps");
    expect(out).not.toMatch(/<img|<iframe/);
  });

  it("multi-code discount and donate variant", () => {
    const dc = html(mk("discount_code", { code: "A10", codes: [{ code: "B20" }] }));
    expect(dc).toContain('data-copy="A10"');
    expect(dc).toContain('data-copy="B20"');
    expect(dc).toContain("2 codes");
    expect(html(mk("social_icons", { variant: "donate", items: [{ platform: "saweria", url: "https://saweria.co/x" }] }))).toContain("Saweria");
  });

  it("a page with locked link/product stubs renders (no data access before the guard)", () => {
    const blocks = [
      mk("link", null, { id: "l1", locked: true, gate: { kind: "password" } }),
      mk("product", null, { id: "p1", locked: true, gate: { kind: "age_18" } }),
      mk("link", { title: "Open", url: "https://x.example", layout: "grid2" }, { id: "l2" }),
    ];
    const out = renderToStaticMarkup(<BlockList blocks={blocks} childrenOf={new Map()} opts={{ env: { ...NO_ENV, username: "u", preview: false }, now: 0 }} />);
    expect(out).toContain('data-x-lock="l1"');
    expect(out).toContain('data-x-lock="p1"');
    expect(out).toContain("Open");
    expect(firstImageId(blocks)).toBeUndefined();
  });

  it("an open folder with a gated child link renders that child's lock stub (no crash)", () => {
    const folder = mk("folder", { title: "More", style: "inline" }, { id: "f1" });
    const kids = [
      mk("link", null, { id: "c1", parent_id: "f1", locked: true, gate: { kind: "password" } }),
      mk("link", { title: "Open link", url: "https://x.example" }, { id: "c2", parent_id: "f1" }),
    ];
    const out = renderToStaticMarkup(<BlockList blocks={[folder]} childrenOf={new Map([["f1", kids]])} opts={{ env: { ...NO_ENV, username: "u", preview: false }, now: 0 }} />);
    expect(out).toContain('data-x-lock="c1"');
    expect(out).toContain("Open link");
    const collapsed = renderToStaticMarkup(<BlockList blocks={[mk("folder", { title: "More" }, { id: "f1" })]} childrenOf={new Map([["f1", kids]])} opts={{ env: { ...NO_ENV, username: "u", preview: false }, now: 0 }} />);
    expect(collapsed).toContain('data-x-lock="c1"');
  });
});
