import { describe, expect, it } from "vitest";
import { allowedIntervals, parseQuery, serializeQuery, valueLabel, withFilter } from "../analytics-query";
import { toParams } from "../analytics-api";
import { fmtRangeLabel } from "@/components/analytics/format";

describe("analytics URL state", () => {
  it("round-trips range, interval and filters (including an empty referrer = direct)", () => {
    const q = parseQuery(new URLSearchParams("range=custom&from=2026-10-01&to=2026-10-31&interval=week&f_country=ID&f_referrer="));
    expect(q).toEqual({ range: "custom", from: "2026-10-01", to: "2026-10-31", interval: "week", filters: { country: "ID", referrer: "" } });
    expect(parseQuery(new URLSearchParams(serializeQuery(q).slice(1)))).toEqual(q);
  });
  it("falls back to 30d for junk and inverted custom ranges", () => {
    expect(parseQuery(new URLSearchParams("range=forever")).range).toBe("30d");
    expect(parseQuery(new URLSearchParams("range=custom&from=2026-10-31&to=2026-10-01")).range).toBe("30d");
    expect(serializeQuery({ range: "30d" })).toBe("");
  });
  it("only allows hour up to 7 days and day up to a year", () => {
    expect(allowedIntervals({ range: "7d" })).toEqual(["hour", "day", "week"]);
    expect(allowedIntervals({ range: "30d" })).toEqual(["day", "week"]);
    expect(allowedIntervals({ range: "custom", from: "2024-01-01", to: "2025-12-31" })).toEqual(["week"]);
  });
  it("toggles filters", () => {
    const q = withFilter({ range: "7d" }, "channel", "social");
    expect(q.filters).toEqual({ channel: "social" });
    expect(withFilter(q, "channel", undefined).filters).toBeUndefined();
  });
  it("sends API params with tz and raw filter names", () => {
    const p = new URLSearchParams(toParams({ range: "7d", interval: "day", tz: "Asia/Jakarta", filters: { referrer: "" } }, { dimension: "country" }));
    expect(Object.fromEntries(p)).toEqual({ range: "7d", interval: "day", tz: "Asia/Jakarta", referrer: "", dimension: "country" });
  });
  it("labels values", () => {
    expect(valueLabel("referrer", "")).toBe("Direct or unknown");
    expect(valueLabel("country", "ID")).toBe("Indonesia");
    expect(valueLabel("channel", "qr")).toBe("QR code");
  });
});

describe("fmtRangeLabel", () => {
  it("treats the BE's range.to as exclusive", () => {
    expect(fmtRangeLabel("2026-11-10T00:00:00+08:00", "2026-11-17T00:00:00+08:00")).toBe("10 Nov – 16 Nov");
    expect(fmtRangeLabel("2026-11-16T00:00:00Z", "2026-11-17T00:00:00Z")).toBe("16 Nov");
  });
});
