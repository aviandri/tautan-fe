import { describe, expect, it } from "vitest";
import type { BlockDataMap } from "../types";
import { CREATOR_META } from "./creator-meta";

const v = <K extends keyof typeof CREATOR_META>(t: K, d: BlockDataMap[K]) =>
  (CREATOR_META[t].validate as (x: BlockDataMap[K]) => { errors: Record<string, string>; data: BlockDataMap[K] })(d);

describe("creator validators", () => {
  it("media kit: handle, counts, audience sums, date", () => {
    const base = CREATOR_META.media_kit.defaultData();
    expect(v("media_kit", base).errors).toEqual({ "platforms.0.handle": expect.any(String) });
    const r = v("media_kit", {
      ...base,
      platforms: [{ platform: "tiktok", handle: "@sekar", followers: 212000, engagement: 6.8, url: "" }],
      audience: { age: [{ label: "18–24", pct: 54 }, { label: "25–34", pct: 50 }], gender: [{ label: "", pct: NaN }] },
    });
    expect(r.errors).toEqual({ "audience.age": expect.stringMatching(/104%/) });
    expect(r.data.platforms[0]).toEqual({ platform: "tiktok", handle: "sekar", followers: 212000, engagement: 6.8 });
    expect(r.data.audience?.gender).toBeUndefined();
    expect(v("media_kit", { ...base, platforms: [{ platform: "x", handle: "a", followers: NaN }], updated_at: "2026-02-30" }).errors).toMatchObject({ "platforms.0.followers": expect.any(String), updated_at: expect.any(String) });
  });

  it("rate card: package name and deliverables", () => {
    expect(v("rate_card", CREATOR_META.rate_card.defaultData()).errors).toEqual({ "packages.0.name": expect.any(String), "packages.0.deliverables": expect.any(String) });
    const ok = v("rate_card", { packages: [{ name: "Reel", price_from: 350000000, deliverables: ["1 Reel", " "], turnaround: "" }], currency: "IDR", note: "" });
    expect(ok.errors).toEqual({});
    expect(ok.data).toEqual({ packages: [{ name: "Reel", price_from: 350000000, deliverables: ["1 Reel"] }], currency: "IDR" });
  });

  it("brands, gallery, community", () => {
    expect(v("brands", { logos: [{ image_url: "", name: "" }] }).errors).toMatchObject({ "logos.0.image_url": expect.any(String), "logos.0.name": expect.any(String) });
    expect(v("gallery", { images: [{ url: "/uploads/a.png", link_url: "mailto:x@y.z" }], layout: "grid" }).errors).toEqual({ "images.0.link_url": expect.any(String) });
    expect(v("community", { platform: "telegram", url: "https://chat.whatsapp.com/x", title: "Club" }).errors).toEqual({ url: expect.stringMatching(/Telegram/) });
    expect(v("community", { platform: "whatsapp_group", url: "https://chat.whatsapp.com/x", title: "Club" }).errors).toEqual({});
  });

  it("events: drops the other mode and server-only computed", () => {
    const dates = v("events", { mode: "dates", tz: "Asia/Jakarta", dates: [{ date: "2026-12-07", time: "", city: "Bandung" }], weekly: [{ days: ["fri"], start: "20:00", duration_min: 60 }], computed: { computed_at: "x" } });
    expect(dates.errors).toEqual({});
    expect(dates.data).toEqual({ mode: "dates", tz: "Asia/Jakarta", dates: [{ date: "2026-12-07", city: "Bandung" }] });
    const weekly = v("events", { mode: "weekly", tz: "Asia/Jakarta", weekly: [{ days: ["sun", "fri", "fri"], start: "20:00", duration_min: 60, platform: "tiktok" }] });
    expect(weekly.errors).toEqual({});
    expect(weekly.data.weekly?.[0].days).toEqual(["fri", "sun"]);
    expect(v("events", { mode: "weekly", tz: "Nope/Zone", weekly: [{ days: [], start: "25:00", duration_min: 1 }] }).errors).toMatchObject({
      tz: expect.any(String), "weekly.0.days": expect.any(String), "weekly.0.start": expect.any(String), "weekly.0.duration_min": expect.any(String),
    });
  });
});
