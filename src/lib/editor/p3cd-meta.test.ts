import { describe, expect, it } from "vitest";
import { getMeta } from "./block-meta";
import { parseCoords } from "./layout-meta";

describe("engage meta", () => {
  it("poll: client ids, 2-5 answers, strips read-only keys", () => {
    const m = getMeta("poll");
    const d = m.defaultData();
    expect(d.options).toHaveLength(2);
    expect(d.options[0].id).toMatch(/^[a-z0-9_-]{1,40}$/);
    expect(d.options[0].id).not.toBe(d.options[1].id);
    const ok = m.validate({ ...d, question: " Which? ", options: [{ id: "a", label: "A" }, { id: "b", label: "B" }], results: { counts: { a: 1 }, total: 1 }, closed: false });
    expect(ok.errors).toEqual({});
    expect(ok.data).not.toHaveProperty("results");
    expect(ok.data).not.toHaveProperty("closed");
    expect(ok.data.question).toBe("Which?");
    expect(m.validate({ ...d, question: "q", options: [{ id: "a", label: "A" }] }).errors.options).toBeTruthy();
    expect(m.validate({ ...d, question: "q", options: [{ id: "a", label: "A" }, { id: "a", label: "B" }] }).errors["options.1.id"]).toBeTruthy();
  });

  it("lead magnet needs a file; giveaway steps need web links and strips state", () => {
    expect(getMeta("lead_magnet").validate({ title: "x", file_url: "" }).errors.file_url).toBeTruthy();
    expect(getMeta("lead_magnet").validate({ title: "x", file_url: "/uploads/a.pdf" }).errors).toEqual({});
    const g = getMeta("giveaway").validate({
      title: "Win",
      prize: "Tote",
      ends_at: "2030-01-01T00:00:00Z",
      steps: [{ label: "Follow", url: "mailto:x@y.z" }],
      ended: true,
      entry_count: 3,
      winner: { display: "A.", drawn_at: "x" },
    });
    expect(g.errors["steps.0.url"]).toBeTruthy();
    expect(g.data).not.toHaveProperty("winner");
    expect(g.data).not.toHaveProperty("entry_count");
  });
});

describe("layout meta", () => {
  it("timeline allows one highlight; resume end after start, dropped when current", () => {
    const t = getMeta("timeline").validate({ items: [{ title: "a", highlight: true }, { title: "b", highlight: true }] });
    expect(t.errors["items.1.highlight"]).toBeTruthy();
    const r = getMeta("resume");
    expect(r.validate({ items: [{ role: "x", company: "y", start: "2024-05", end: "2023-01" }] }).errors["items.0.end"]).toBeTruthy();
    const cur = r.validate({ items: [{ role: "x", company: "y", start: "2024-05", end: "2025-01", current: true }] });
    expect(cur.errors).toEqual({});
    expect(cur.data.items[0]).not.toHaveProperty("end");
  });

  it("map requires a location and never saves links", () => {
    const m = getMeta("map");
    expect(m.validate(m.defaultData()).errors.lat).toBeTruthy();
    const ok = m.validate({ lat: -6.9, lng: 107.6, zoom: 15, links: { google: "g", apple: "a", osm: "o" } });
    expect(ok.errors).toEqual({});
    expect(ok.data).not.toHaveProperty("links");
  });

  it("parses coordinates from map links", () => {
    expect(parseCoords("https://www.google.com/maps/place/X/@-6.9174639,107.6098111,17z/data=!3m1")).toEqual({ lat: -6.9174639, lng: 107.6098111 });
    expect(parseCoords("https://www.google.com/maps/place/X/data=!4m6!3m5!1s0x0:0x0!8m2!3d-6.91746!4d107.60981")).toEqual({ lat: -6.91746, lng: 107.60981 });
    expect(parseCoords("https://maps.google.com/?q=-6.2,106.8")).toEqual({ lat: -6.2, lng: 106.8 });
    expect(parseCoords("https://maps.apple.com/?ll=1.29,103.85&q=Pin")).toEqual({ lat: 1.29, lng: 103.85 });
    expect(parseCoords("https://www.openstreetmap.org/?mlat=-6.9&mlon=107.6#map=15/-6.9/107.6")).toEqual({ lat: -6.9, lng: 107.6 });
    expect(parseCoords("-6.9175, 107.6191")).toEqual({ lat: -6.9175, lng: 107.6191 });
    expect(parseCoords("https://maps.app.goo.gl/abc")).toBeNull();
    expect(parseCoords("0,0")).toBeNull();
    expect(parseCoords("95, 10")).toBeNull();
  });
});

describe("P3-D additions", () => {
  it("text style, discount codes, donate variant", () => {
    expect(getMeta("text").validate({ content: "x", style: "sticky_note" }).errors).toEqual({});
    const dc = getMeta("discount_code").validate({ code: "", codes: [{ code: " a10 " }, { code: "" }] });
    expect(dc.errors["codes.1.code"]).toBeTruthy();
    expect(dc.data.codes?.[0].code).toBe("A10");
    const s = getMeta("social_icons");
    expect(s.validate({ variant: "donate", items: [{ platform: "instagram", url: "https://instagram.com/x" }] }).errors["items.0.platform"]).toBeTruthy();
    expect(s.validate({ variant: "icons", items: [] }).data).not.toHaveProperty("variant");
  });
});
