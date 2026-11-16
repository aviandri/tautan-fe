import { describe, expect, it } from "vitest";
import { compactSettings, settingsErrors } from "./settings";

describe("page settings", () => {
  it("validates like the BE", () => {
    expect(settingsErrors({ ga4_id: "G-ABC1234", meta_pixel_id: "1234567", language: "pt-BR", contact_phone: "+62 812-3456" })).toEqual({});
    expect(Object.keys(settingsErrors({ ga4_id: "UA-123", meta_pixel_id: "12ab", language: "english", contact_email: "x" })).sort()).toEqual(
      ["contact_email", "ga4_id", "language", "meta_pixel_id"],
    );
  });
  it("compacts: drops empties and false toggles, uppercases GA4", () => {
    expect(compactSettings({ ga4_id: " g-abc1234 ", language: "", show_share: false, show_save_contact: true, contact_email: "" })).toEqual({
      ga4_id: "G-ABC1234",
      show_save_contact: true,
    });
  });
});
