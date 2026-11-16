import { describe, expect, it } from "vitest";
import type { Profile } from "../types";
import { isTempUsername, readAnnouncement, readSettings } from "../page-extras";

const prof = (extra: Partial<Profile>): Profile =>
  ({ id: "p", user_id: "u", username: "a", display_name: "A", bio: "", avatar_url: null, theme: null, seo: {}, is_published: true, created_at: "", updated_at: "", ...extra }) as unknown as Profile;

describe("readSettings", () => {
  it("keeps only well-formed IDs, since they are interpolated into scripts", () => {
    expect(readSettings(prof({ settings: { ga4_id: "G-AB12CD34", meta_pixel_id: "1234567890", language: "pt-BR", show_share: true } }))).toEqual({
      ga4_id: "G-AB12CD34",
      meta_pixel_id: "1234567890",
      language: "pt-BR",
      show_share: true,
    });
    const evil = readSettings(prof({ settings: { ga4_id: "G-1');alert(1);//", meta_pixel_id: "12;alert(1)", language: "en\"><script>", show_save_contact: "yes" as never } }));
    expect(evil).toEqual({});
  });
  it("handles a missing settings object", () => {
    expect(readSettings(prof({}))).toEqual({});
  });
});

describe("readAnnouncement", () => {
  it("needs an id and a title, defaults to banner, and checks URLs and colours", () => {
    expect(readAnnouncement(prof({ announcement: { title: "Hi" } }))).toBeNull();
    expect(readAnnouncement(prof({ announcement: null }))).toBeNull();
    const a = readAnnouncement(
      prof({ announcement: { id: "x1", title: "Sale", cta: { label: "Shop", url: "javascript:alert(1)" }, bg_color: "red;x", text_color: "#fff" } }),
    );
    expect(a).toMatchObject({ id: "x1", layout: "banner", title: "Sale", text_color: "#fff" });
    expect(a?.cta).toBeUndefined();
    expect(a?.bg_color).toBeUndefined();
    expect(readAnnouncement(prof({ announcement: { id: "x", title: "Join", layout: "popup", cta: { label: "Go", form_block_id: "b1" } } }))?.cta).toEqual({
      label: "Go",
      url: undefined,
      form_block_id: "b1",
    });
  });
  it("flags temporary usernames", () => {
    expect(isTempUsername("tmp.ab12")).toBe(true);
    expect(isTempUsername("studio")).toBe(false);
  });
});
