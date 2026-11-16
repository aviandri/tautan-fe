import { DIMENSIONS, RANGES, type AnalyticsQuery, type Dimension, type Interval, type RangeKey } from "./analytics-api";

// The analytics page keeps its whole state in the URL, so a filtered view can be shared or reloaded.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseQuery(sp: URLSearchParams): AnalyticsQuery {
  const r = sp.get("range");
  const range: RangeKey = (RANGES as readonly string[]).includes(r ?? "") ? (r as RangeKey) : "30d";
  const q: AnalyticsQuery = { range };
  if (range === "custom") {
    const from = sp.get("from") ?? "";
    const to = sp.get("to") ?? "";
    if (DATE.test(from) && DATE.test(to) && from <= to) Object.assign(q, { from, to });
    else q.range = "30d";
  }
  const iv = sp.get("interval");
  if (iv === "hour" || iv === "day" || iv === "week") q.interval = iv;
  const filters: AnalyticsQuery["filters"] = {};
  for (const d of DIMENSIONS) {
    const v = sp.get(`f_${d}`);
    if (v !== null) filters[d] = v;
  }
  if (Object.keys(filters).length) q.filters = filters;
  return q;
}

export function serializeQuery(q: AnalyticsQuery): string {
  const p = new URLSearchParams();
  if (q.range !== "30d") p.set("range", q.range);
  if (q.range === "custom" && q.from && q.to) {
    p.set("from", q.from);
    p.set("to", q.to);
  }
  if (q.interval) p.set("interval", q.interval);
  // f_ prefix keeps filters apart from other params (referrer= alone would be ambiguous)
  for (const [k, v] of Object.entries(q.filters ?? {})) if (v !== undefined) p.set(`f_${k}`, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

/** Length of the range in days (inclusive), used to decide which intervals are allowed. */
export function rangeDays(q: AnalyticsQuery, today = new Date()): number {
  switch (q.range) {
    case "today":
    case "yesterday":
      return 1;
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "month":
      return today.getDate();
    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);
      return Math.floor((today.getTime() - start.getTime()) / 864e5) + 1;
    }
    case "custom":
      return q.from && q.to ? Math.round((Date.parse(q.to) - Date.parse(q.from)) / 864e5) + 1 : 30;
  }
}

/** SPEC: hour only up to 7 days, day up to a year, week always. */
export function allowedIntervals(q: AnalyticsQuery, today?: Date): Interval[] {
  const d = rangeDays(q, today);
  return (["hour", "day", "week"] as Interval[]).filter((i) => (i === "hour" ? d <= 7 : i === "day" ? d <= 366 : true));
}

export function withFilter(q: AnalyticsQuery, d: Dimension, value: string | undefined): AnalyticsQuery {
  const filters = { ...q.filters };
  if (value === undefined) delete filters[d];
  else filters[d] = value;
  return { ...q, filters: Object.keys(filters).length ? filters : undefined };
}

export const DIMENSION_LABELS: Record<Dimension, string> = {
  referrer: "Referrer",
  channel: "Channel",
  country: "Country",
  device: "Device",
  browser: "Browser",
  os: "OS",
  utm_source: "UTM source",
  utm_medium: "UTM medium",
  utm_campaign: "UTM campaign",
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  month: "This month",
  year: "This year",
  custom: "Custom",
};

const CHANNELS: Record<string, string> = {
  social: "Social",
  search: "Search",
  email: "Email",
  qr: "QR code",
  paid: "Paid",
  referral: "Other sites",
  direct: "Direct",
};

/** How a breakdown value reads in the table ("" referrer = direct, country codes as names). */
export function valueLabel(d: Dimension, v: string): string {
  if (d === "referrer") return v ? v : "Direct or unknown";
  if (!v) return "Unknown";
  if (d === "country") {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(v.toUpperCase()) ?? v;
    } catch {
      return v;
    }
  }
  if (d === "channel") return CHANNELS[v] ?? v;
  if (d === "device") return v.charAt(0).toUpperCase() + v.slice(1);
  return v;
}
